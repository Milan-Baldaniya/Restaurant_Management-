'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useKitchenOrders } from '@/hooks/useKitchenOrders'
import { updateOrderStatus } from '@/lib/api/orders'
import { supabase } from '@/lib/supabase/client'
import { FoodLoader } from '@/components/ui/FoodLoader'

const parseSupabaseDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    // If Supabase returns timestamp without time zone, it lacks the 'Z'.
    // We force it to parse as UTC by appending 'Z' if it's missing.
    return dateStr.endsWith('Z') || dateStr.includes('+') ? new Date(dateStr) : new Date(dateStr + 'Z');
};

const getTimeElapsedMins = (createdStr: string) => {
    const diff = Date.now() - parseSupabaseDate(createdStr).getTime();
    return Math.floor(Math.max(0, diff) / 60000);
};

export default function KitchenPage() {
    const [session, setSession] = useState<any>(null)
    const [loadingAuth, setLoadingAuth] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const [viewMode, setViewMode] = useState<'queue' | 'table' | 'history'>('queue')
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'preparing' | 'ready'>('all')
    const [selectedOrder, setSelectedOrder] = useState<any>(null)
    const [historyOrders, setHistoryOrders] = useState<any[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [analyticsData, setAnalyticsData] = useState<{
        todayCount: number;
        avgPrepMins: number | null;
        peakHourLabel: string;
        peakHourChange: string;
        topItem: string;
        topItemCount: number;
    }>({
        todayCount: 0,
        avgPrepMins: null,
        peakHourLabel: '—',
        peakHourChange: '—',
        topItem: '—',
        topItemCount: 0,
    })

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setSession(session)
            setLoadingAuth(false)
        }
        checkSession()
    }, [])

    useEffect(() => {
        if (viewMode === 'history' && session) {
            const fetchHistory = async () => {
                setLoadingHistory(true)

                // Fetch last 100 completed orders with items + table
                const { data: completedOrders } = await supabase
                    .from('orders')
                    .select('*, order_items (*), tables (table_number)')
                    .eq('status', 'completed')
                    .order('created_at', { ascending: false })
                    .limit(100)

                if (completedOrders) {
                    setHistoryOrders(completedOrders)

                    // --- Analytics computations on client side ---

                    // 1. Today's count
                    const todayStart = new Date();
                    todayStart.setHours(0, 0, 0, 0);
                    const todayCount = completedOrders.filter((o: any) => parseSupabaseDate(o.created_at) >= todayStart).length;

                    // 2. Avg prep time (using updated_at - created_at)
                    const withTimes = completedOrders.filter((o: any) => o.updated_at);
                    const avgPrepMins = withTimes.length > 0
                        ? Math.round(withTimes.reduce((acc: number, o: any) => {
                            return acc + (parseSupabaseDate(o.updated_at).getTime() - parseSupabaseDate(o.created_at).getTime()) / 60000;
                          }, 0) / withTimes.length)
                        : null;

                    // 3. Peak hour: count orders per hour slot across today's orders
                    const todayOrders = completedOrders.filter((o: any) => parseSupabaseDate(o.created_at) >= todayStart);
                    const hourBuckets: Record<number, number> = {};
                    todayOrders.forEach((o: any) => {
                        const h = parseSupabaseDate(o.created_at).getHours();
                        hourBuckets[h] = (hourBuckets[h] || 0) + 1;
                    });
                    let peakHourLabel = '—';
                    let peakHourChange = '—';
                    if (Object.keys(hourBuckets).length > 0) {
                        const peakHour = Number(Object.entries(hourBuckets).sort(([,a],[,b]) => b - a)[0][0]);
                        const fmt = (h: number) => {
                            const d = new Date(); d.setHours(h, 0, 0, 0);
                            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        };
                        peakHourLabel = `${fmt(peakHour)} – ${fmt(peakHour + 1)}`;
                        const avgPerHour = todayOrders.length / Math.max(Object.keys(hourBuckets).length, 1);
                        const pct = Math.round(((hourBuckets[peakHour] - avgPerHour) / Math.max(avgPerHour, 1)) * 100);
                        peakHourChange = pct >= 0 ? `+${pct}%` : `${pct}%`;
                    }

                    // 4. Top item across all fetched orders
                    const itemCounts: Record<string, number> = {};
                    completedOrders.forEach((o: any) => {
                        (o.order_items || []).forEach((item: any) => {
                            if (item.name) itemCounts[item.name] = (itemCounts[item.name] || 0) + (item.quantity || 1);
                        });
                    });
                    const topEntry = Object.entries(itemCounts).sort(([,a],[,b]) => b - a)[0];
                    const topItem = topEntry ? topEntry[0] : '—';
                    const topItemCount = topEntry ? topEntry[1] : 0;

                    setAnalyticsData({ todayCount, avgPrepMins, peakHourLabel, peakHourChange, topItem, topItemCount });
                }

                setLoadingHistory(false)
            }
            fetchHistory()
        }
    }, [viewMode, session])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) alert(error.message)
        else setSession(data.session)
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        setSession(null)
    }

    const [newOrders, setNewOrders] = useState<Set<string>>(new Set())

    const { orders, loading } = useKitchenOrders(!!session, (newOrder) => {
        setNewOrders(prev => {
            const next = new Set(prev)
            next.add(newOrder.id)
            return next
        })
        setTimeout(() => {
            setNewOrders(prev => {
                const next = new Set(prev)
                next.delete(newOrder.id)
                return next
            })
        }, 6000)
    })

    const [localOverrides, setLocalOverrides] = useState<Record<string, string>>({})

    const handleStatusUpdate = useCallback(async (orderId: string, status: 'preparing' | 'ready' | 'completed') => {
        setLocalOverrides(prev => ({ ...prev, [orderId]: status }))
        try {
            await updateOrderStatus(orderId, status)
            if (status === 'completed' && selectedOrder?.id === orderId) {
                setSelectedOrder(null)
            }
        } catch (error) {
            console.error("Failed to update status:", error)
            alert("Failed to update status")
            setLocalOverrides(prev => {
                const newState = { ...prev }
                delete newState[orderId]
                return newState
            })
        }
    }, [selectedOrder])

    const rawDisplayOrders = useMemo(() => {
        return orders.map(order => ({
            ...order,
            status: localOverrides[order.id] || order.status
        })).filter(order => order.status !== 'completed')
    }, [orders, localOverrides])

    const displayOrders = useMemo(() => {
        return rawDisplayOrders
            .filter(order => filterStatus === 'all' || order.status === filterStatus)
            .sort((a, b) => parseSupabaseDate(a.created_at).getTime() - parseSupabaseDate(b.created_at).getTime())
    }, [rawDisplayOrders, filterStatus])

    const sortedGroupedOrders = useMemo(() => {
        const grouped = displayOrders.reduce((acc, order) => {
            const tableNumber = order.tables?.table_number === 0 ? '0' : (order.tables?.table_number?.toString() ?? 'parcel');
            if (!acc[tableNumber]) acc[tableNumber] = [];
            acc[tableNumber].push(order);
            return acc;
        }, {} as Record<string, typeof displayOrders>);

        return Object.entries(grouped).sort(([a], [b]) => {
            if (a === '0') return -1;
            if (b === '0') return 1;
            if (a === 'parcel' && b !== '0') return -1;
            if (b === 'parcel' && a !== '0') return 1;
            return Number(a) - Number(b);
        });
    }, [displayOrders]);

    if (loadingAuth) {
        return <FoodLoader text="Initialising Kitchen Portal..." fullScreen={true} />
    }

    if (!session) {
        return (
            <div className="font-display bg-background-light dark:bg-[#120e0a] min-h-screen flex flex-col">
              <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-[#120e0a] via-[#120e0a]/95 to-primary/20"></div>
                <div className="absolute inset-0 opacity-40 mix-blend-overlay bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCUCRhuPNxNR43FoLLynzkpiHRhBGwELCmpTXwJAHqGo8Y328Q--A5OWvYcAyHtIm4Hz1cZ9L9klf8YDrmspqIhWO0tdiWOTZhJeWdqUs1Vi4CJhZU4TcdEqeEkJak4wIOkOj5R1R-VkS9l346q3WVnQR7tdSwlT4KxrFlkM_AY4O6haUZ6lgBydG0d3-3lHvZlAyPmiSqji7xwCVwPnixLCH79gnwGtgPngUwLZkpQUf7Y77x-1G3OncY3nvRrLRXiUgZCaWq50EA')" }}></div>
              </div>
              <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
                <div className="flex items-center gap-3 text-slate-100">
                   <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                      <span className="material-symbols-outlined text-[#120e0a] font-bold text-2xl">restaurant_menu</span>
                   </div>
                   <div className="flex flex-col">
                      <h2 className="text-xl font-bold leading-none tracking-tight">KitchenSync</h2>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Enterprise SaaS</span>
                   </div>
                </div>
              </header>
              <main className="relative z-10 flex-1 flex items-center justify-center p-6">
                <div className="kds-login-glass w-full max-w-[480px] rounded-xl p-8 md:p-12 flex flex-col gap-8">
                   <div className="text-center">
                      <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-2">Staff Portal</h1>
                      <p className="text-slate-400 text-sm md:text-base">Secure access for kitchen operations</p>
                   </div>
                   <form onSubmit={handleLogin} className="flex flex-col gap-6">
                      <div className="flex flex-col gap-2">
                         <label className="text-xs font-bold uppercase tracking-widest text-primary/80 ml-1">Email Address</label>
                         <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">mail</span>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="kds-login-input w-full pl-12 pr-4 py-4 rounded-lg text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all bg-transparent" placeholder="chef@restaurant.com" />
                         </div>
                      </div>
                      <div className="flex flex-col gap-2">
                         <div className="flex justify-between items-center ml-1">
                            <label className="text-xs font-bold uppercase tracking-widest text-primary/80">Access Code</label>
                         </div>
                         <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">lock</span>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="kds-login-input w-full pl-12 pr-4 py-4 rounded-lg text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all bg-transparent" placeholder="••••••••" />
                         </div>
                      </div>
                      <button type="submit" className="kds-login-glow-btn w-full py-4 bg-primary hover:bg-primary/90 text-[#120e0a] font-bold text-lg rounded-lg flex items-center justify-center gap-2 transition-transform active:scale-[0.98]">
                         <span>Enter Kitchen</span>
                         <span className="material-symbols-outlined">login</span>
                      </button>
                   </form>
                   <div className="pt-4 border-t border-slate-100/10 flex flex-col items-center gap-4">
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">Powered by KitchenSync Cloud</p>
                      <div className="flex gap-4">
                         <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">System Online</span>
                         </div>
                      </div>
                   </div>
                </div>
              </main>
            </div>
        )
    }

    if (selectedOrder) {
        const order = selectedOrder
        const mins = getTimeElapsedMins(order.created_at)
        return (
            <div className="relative flex min-h-screen w-full flex-col bg-[#120e0a] overflow-hidden text-slate-100 font-display">
                <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
                
                <div className="flex h-full grow flex-col relative z-10 pb-10">
                    <header className="flex flex-wrap gap-4 items-center justify-between whitespace-nowrap border-b border-white/10 px-6 md:px-10 py-4 kds-glass-panel">
                        <div className="flex items-center gap-4 cursor-pointer" onClick={() => setSelectedOrder(null)}>
                            <div className="bg-primary/20 p-2 rounded-lg hover:bg-primary/30 transition-colors">
                                <span className="material-symbols-outlined text-primary text-3xl">arrow_back</span>
                            </div>
                            <div>
                                <h2 className="text-slate-100 text-2xl font-black leading-tight tracking-tight">ORDER #{order.id.slice(0,6).toUpperCase()}</h2>
                                <p className="text-primary text-xs font-bold uppercase tracking-widest">Received {mins}m ago</p>
                            </div>
                        </div>
                    </header>
                    
                    <main className="flex flex-col md:flex-row flex-1 overflow-visible p-4 md:p-8 gap-8">
                        <div className="flex flex-col w-full md:w-1/3 gap-8 overflow-y-auto">
                            <div className="kds-glass-panel p-8 rounded-xl flex flex-col gap-6 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span className="material-symbols-outlined text-8xl">person</span>
                                </div>
                                <div>
                                    <span className="bg-primary text-[#120e0a] text-sm font-black px-3 py-1 rounded-full uppercase mb-4 inline-block">
                                        {!order.tables?.table_number || order.tables.table_number === 0 ? 'PARCEL' : 'DINE-IN'}
                                    </span>
                                    <h1 className="text-white text-4xl lg:text-6xl font-black leading-none mb-2">
                                        {!order.tables?.table_number || order.tables.table_number === 0 ? 'Parcel' : `Table ${order.tables.table_number.toString().padStart(2, '0')}`}
                                    </h1>
                                    <p className="text-slate-100 text-xl lg:text-2xl font-bold">{order.customer_name || 'Guest'}</p>
                                    {order.customer_mobile && (
                                        <p className="text-slate-400 text-lg flex items-center gap-2 mt-2">
                                            <span className="material-symbols-outlined text-primary">call</span>
                                            {order.customer_mobile}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="kds-glass-panel p-8 rounded-xl flex-1 flex flex-col kds-inner-glow border-l-4 border-l-primary min-h-[200px]">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="material-symbols-outlined text-primary text-3xl">priority_high</span>
                                    <h2 className="text-white text-xl lg:text-2xl font-bold">System Note</h2>
                                </div>
                                <div className="bg-primary/10 p-6 rounded-lg border border-primary/20">
                                    <p className="text-slate-100 text-lg font-medium leading-relaxed italic">
                                        No special instructions provided by the customer for this order.
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col flex-1 kds-glass-panel rounded-xl overflow-hidden shadow-2xl">
                            <div className="p-6 md:p-8 border-b border-white/10 flex justify-between items-center bg-white/5">
                                <h2 className="text-white text-xl lg:text-3xl font-black tracking-tight flex items-center gap-4">
                                    ORDER ITEMS
                                    <span className="text-sm lg:text-lg font-bold bg-slate-700 px-3 py-1 rounded-lg text-slate-300">
                                        {order.order_items?.reduce((sum: number, i: any) => sum + i.quantity, 0) || 0} ITEMS
                                    </span>
                                </h2>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 max-h-[50vh] md:max-h-none">
                                {order.order_items?.map((item: any, idx: number) => (
                                    <label key={idx} className="flex items-center gap-4 md:gap-6 p-4 md:p-6 kds-glass-card rounded-xl hover:bg-white/5 transition-all group border-l-4 border-transparent">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-4">
                                                <span className="text-2xl md:text-4xl font-black text-primary">{item.quantity}x</span>
                                                <p className="text-xl md:text-3xl font-bold text-slate-100 group-hover:text-white transition-colors">{item.name}</p>
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            
                            <div className="p-4 md:p-8 bg-[#120e0a]/80 border-t border-white/10 flex flex-wrap gap-4">
                                {order.status === 'pending' && (
                                    <button onClick={() => handleStatusUpdate(order.id, 'preparing')} className="flex-1 h-16 md:h-20 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-lg md:text-2xl font-black flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg uppercase tracking-wider">
                                        <span className="material-symbols-outlined text-2xl md:text-3xl">fire_truck</span>
                                        Start Prep
                                    </button>
                                )}
                                {order.status === 'preparing' && (
                                    <button onClick={() => handleStatusUpdate(order.id, 'ready')} className="flex-[1.5] h-16 md:h-20 bg-primary hover:brightness-110 text-[#120e0a] rounded-xl text-xl md:text-3xl font-black flex items-center justify-center gap-4 transition-all active:scale-95 shadow-[0_0_30px_rgba(242,147,13,0.3)] uppercase tracking-widest">
                                        <span className="material-symbols-outlined text-3xl md:text-4xl">room_service</span>
                                        Mark Ready
                                    </button>
                                )}
                                {order.status === 'ready' && (
                                    <button onClick={() => handleStatusUpdate(order.id, 'completed')} className="flex-[1.5] h-16 md:h-20 bg-green-500 hover:bg-green-400 text-white rounded-xl text-xl md:text-3xl font-black flex items-center justify-center gap-4 transition-all active:scale-95 uppercase tracking-widest">
                                        <span className="material-symbols-outlined text-3xl md:text-4xl">check_circle</span>
                                        Complete
                                    </button>
                                )}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-[#120e0a] dark:bg-[#120e0a] font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col overflow-x-hidden">
            <header className="sticky top-0 z-40 kds-glass-nav px-6 py-4 md:px-10">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-start">
                        <div className="flex items-center gap-3 text-primary">
                            <span className="material-symbols-outlined text-3xl">restaurant_menu</span>
                            <h1 className="text-xl font-bold tracking-tight text-slate-100 uppercase hidden sm:block">KitchenSync KDS</h1>
                        </div>
                        <button onClick={handleLogout} className="md:hidden flex items-center justify-center p-2 rounded-xl bg-white/5 border border-white/10 text-red-400 hover:bg-red-500/20">
                            <span className="material-symbols-outlined">logout</span>
                        </button>
                    </div>
                    <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                        <nav className="flex items-center gap-2 bg-primary/10 p-1 rounded-xl border border-primary/20 shrink-0">
                            <button onClick={() => setViewMode('queue')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'queue' ? 'bg-primary text-[#120e0a] shadow-lg' : 'text-slate-300 hover:bg-primary/20'}`}>Queue</button>
                            <button onClick={() => setViewMode('table')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'table' ? 'bg-primary text-[#120e0a] shadow-lg' : 'text-slate-300 hover:bg-primary/20'}`}>Tables</button>
                            <button onClick={() => setViewMode('history')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'history' ? 'bg-primary text-[#120e0a] shadow-lg' : 'text-slate-300 hover:bg-primary/20'}`}>History</button>
                        </nav>
                        <div className="hidden lg:flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-2 bg-primary/20 text-primary px-4 py-2 rounded-xl border border-primary/30">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                </span>
                                <span className="text-xs font-bold uppercase tracking-wider">Connected</span>
                            </div>
                            <button onClick={handleLogout} className="flex items-center justify-center p-2 rounded-xl bg-white/5 border border-white/10 text-red-400 hover:bg-red-500/20" title="Logout">
                                <span className="material-symbols-outlined">logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {(viewMode === 'queue' || viewMode === 'table') && (
                <div className="px-6 py-4 lg:px-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/5">
                    <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                        <button onClick={() => setFilterStatus('all')} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm ${filterStatus === 'all' ? 'bg-primary text-[#120e0a]' : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'}`}>
                            All Orders <span className={`px-2 py-0.5 rounded-lg text-xs ${filterStatus === 'all' ? 'bg-[#120e0a]/20' : 'bg-white/10'}`}>{rawDisplayOrders.length}</span>
                        </button>
                        <button onClick={() => setFilterStatus('pending')} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm ${filterStatus === 'pending' ? 'bg-primary text-[#120e0a]' : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'}`}>
                            Pending <span className={`px-2 py-0.5 rounded-lg text-xs ${filterStatus === 'pending' ? 'bg-[#120e0a]/20' : 'bg-white/10'}`}>{rawDisplayOrders.filter(o => o.status === 'pending').length}</span>
                        </button>
                        <button onClick={() => setFilterStatus('preparing')} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm ${filterStatus === 'preparing' ? 'bg-primary text-[#120e0a]' : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'}`}>
                            Preparing <span className={`px-2 py-0.5 rounded-lg text-xs ${filterStatus === 'preparing' ? 'bg-[#120e0a]/20' : 'bg-white/10'}`}>{rawDisplayOrders.filter(o => o.status === 'preparing').length}</span>
                        </button>
                        <button onClick={() => setFilterStatus('ready')} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm ${filterStatus === 'ready' ? 'bg-primary text-[#120e0a]' : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'}`}>
                            Ready <span className={`px-2 py-0.5 rounded-lg text-xs ${filterStatus === 'ready' ? 'bg-[#120e0a]/20' : 'bg-white/10'}`}>{rawDisplayOrders.filter(o => o.status === 'ready').length}</span>
                        </button>
                    </div>
                    <div className="hidden lg:flex items-center gap-4 text-sm text-slate-400 font-medium">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> Over 30m</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> Preparing</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500"></span> Ready</span>
                    </div>
                </div>
            )}

            {(viewMode === 'queue' || viewMode === 'table') && (
                <main className="flex-1 px-4 py-6 md:px-10 md:pb-10">
                    {loading ? (
                        <div className="text-center p-10 font-bold text-primary animate-pulse">Syncing orders...</div>
                    ) : displayOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[60vh] opacity-50 text-center">
                            <span className="material-symbols-outlined text-6xl mb-4 text-green-500">check_circle</span>
                            <h2 className="text-2xl font-bold">All caught up!</h2>
                            <p className="max-w-xs mt-2">No active orders in the queue. Take a breather!</p>
                        </div>
                    ) : viewMode === 'queue' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                            {displayOrders.map(order => (
                                <OrderCard key={order.id} order={order} handleStatusUpdate={handleStatusUpdate} isNew={newOrders.has(order.id)} onSelect={setSelectedOrder} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-8">
                            {sortedGroupedOrders.map(([tableNumber, tableOrders]) => (
                                <div key={tableNumber} className="kds-glass-panel p-6 rounded-2xl">
                                    <h2 className="text-2xl font-black text-white border-b border-white/10 pb-4 mb-6">
                                        {tableNumber === '0' || tableNumber === 'parcel' ? 'PARCEL' : `Table ${tableNumber}`}
                                    </h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {tableOrders.map(order => (
                                            <OrderCard key={order.id} order={order} handleStatusUpdate={handleStatusUpdate} isNew={newOrders.has(order.id)} onSelect={setSelectedOrder} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            )}

            {viewMode === 'history' && (
                <main className="flex-1 px-4 py-8 md:px-10 max-w-7xl mx-auto w-full space-y-8">
                    {/* Page Header */}
                    <div className="flex items-start justify-between flex-wrap gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight">Kitchen Analytics</h1>
                            <p className="text-slate-400 font-medium mt-1">Historical Performance</p>
                        </div>
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-sm text-slate-300">
                            <span className="material-symbols-outlined text-primary text-sm">calendar_today</span>
                            {new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                    </div>

                    {/* Analytics Cards */}
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Total Orders */}
                        <div className="kds-glass-card p-6 rounded-2xl relative overflow-hidden group !border-2 !border-solid !border-primary/30 shadow-[0_0_20px_rgba(242,147,13,0.15)]">
                            <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-xl group-hover:bg-primary/20 transition-all"></div>
                            <div className="flex items-start justify-between mb-4">
                                <p className="text-slate-400 font-medium text-sm uppercase tracking-wider">Total Orders Today</p>
                                <span className="material-symbols-outlined text-primary text-2xl">receipt_long</span>
                            </div>
                            <h2 className="text-5xl font-black text-white mt-2">{analyticsData.todayCount}</h2>
                            <p className="text-slate-500 text-xs mt-2 font-medium">Completed today · {historyOrders.length} total loaded</p>
                        </div>

                        {/* Avg Prep Time */}
                        <div className="kds-glass-card p-6 rounded-2xl relative overflow-hidden group !border-2 !border-solid !border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                            <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all"></div>
                            <div className="flex items-start justify-between mb-4">
                                <p className="text-slate-400 font-medium text-sm uppercase tracking-wider">Avg. Prep Time</p>
                                <span className="material-symbols-outlined text-blue-400 text-2xl">timer</span>
                            </div>
                            <h2 className="text-5xl font-black text-white mt-2">
                                {analyticsData.avgPrepMins !== null ? `${analyticsData.avgPrepMins} m` : '— m'}
                            </h2>
                            <p className="text-slate-500 text-xs mt-2 font-medium">Average minutes from order to completion</p>
                        </div>

                        {/* System Status */}
                        <div className="kds-glass-card p-6 rounded-2xl relative overflow-hidden group !border-2 !border-solid !border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.15)]">
                            <div className="absolute -top-4 -right-4 w-24 h-24 bg-green-500/10 rounded-full blur-xl group-hover:bg-green-500/20 transition-all"></div>
                            <div className="flex items-start justify-between mb-4">
                                <p className="text-slate-400 font-medium text-sm uppercase tracking-wider">System Status</p>
                                <span className="material-symbols-outlined text-green-400 text-2xl">cloud_done</span>
                            </div>
                            <h2 className="text-5xl font-black text-green-400 mt-2 flex items-center gap-3">
                                <div className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_#10b981] animate-pulse flex-shrink-0"></div>
                                Online
                            </h2>
                            <p className="text-slate-500 text-xs mt-2 font-medium">All systems operational</p>
                        </div>
                    </section>

                    {/* Peak Hours & Insights */}
                    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="kds-glass-card p-6 rounded-2xl !border-2 !border-solid !border-white/10 col-span-1">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Peak Hours</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 rounded-xl bg-primary/10 border border-primary/20">
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Today's Peak Window</p>
                                        <p className="text-white font-bold mt-1">{analyticsData.peakHourLabel}</p>
                                    </div>
                                    <span className="text-green-400 font-black text-sm bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full whitespace-nowrap">{analyticsData.peakHourChange} vs avg</span>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Top Item</p>
                                        <p className="text-white font-bold mt-1 line-clamp-1">{analyticsData.topItem}</p>
                                    </div>
                                    <span className="text-blue-400 font-black text-sm bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full whitespace-nowrap">{analyticsData.topItemCount} sold</span>
                                </div>
                            </div>
                            <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-primary text-xs">lightbulb</span> Kitchen Tip
                                </p>
                                <p className="text-slate-300 text-xs leading-relaxed">
                                    {analyticsData.topItemCount > 0
                                        ? `"${analyticsData.topItem}" is your best seller with ${analyticsData.topItemCount} servings. Consider pre-prepping it during peak hours to reduce wait time.`
                                        : 'Start completing orders to get smart kitchen tips based on your real data.'}
                                </p>
                            </div>
                        </div>

                        {/* Orders Table */}
                        <div className="lg:col-span-2 kds-glass-panel rounded-2xl overflow-hidden !border-2 !border-solid !border-white/10">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Completed Orders</h3>
                                <span className="text-xs text-slate-500 font-medium">Showing {Math.min(historyOrders.length, 50)} of {historyOrders.length}</span>
                            </div>
                            {loadingHistory ? (
                                <div className="p-12 text-center text-primary animate-pulse text-lg font-bold">Querying Historical Data...</div>
                            ) : historyOrders.length === 0 ? (
                                <div className="p-12 text-center text-slate-500 font-medium flex flex-col items-center gap-4">
                                    <span className="material-symbols-outlined text-5xl text-slate-700">history</span>
                                    No order history available.
                                </div>
                            ) : (
                                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 z-10">
                                            <tr className="bg-[#1a1208] border-b border-white/10 text-xs uppercase tracking-widest text-slate-400">
                                                <th className="px-6 py-3 font-bold">Order ID</th>
                                                <th className="px-6 py-3 font-bold">Items</th>
                                                <th className="px-6 py-3 font-bold">Table</th>
                                                <th className="px-6 py-3 font-bold">Date</th>
                                                <th className="px-6 py-3 font-bold">Time</th>
                                                <th className="px-6 py-3 font-bold text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 text-sm">
                                            {historyOrders.map((order: any) => (
                                                <tr key={order.id} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setSelectedOrder(order)}>
                                                    <td className="px-6 py-4 font-mono font-bold text-primary text-xs">
                                                        #{order.id.slice(0, 6).toUpperCase()}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-300">
                                                        <div className="flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-sm text-slate-500">restaurant</span>
                                                            {order.order_items?.length || 0} items
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-slate-200">
                                                        {!order.tables?.table_number || order.tables.table_number === 0 ? 'Parcel' : `Table ${order.tables.table_number}`}
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-slate-400">
                                                        {parseSupabaseDate(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-slate-400">
                                                        {parseSupabaseDate(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 tracking-wider">COMPLETED</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </section>
                </main>
            )}
        </div>
    )
}

const OrderCard = memo(function OrderCard({ order, handleStatusUpdate, isNew, onSelect }: { order: any, handleStatusUpdate: any, isNew: boolean, onSelect: (order: any) => void }) {
    const [mins, setMins] = useState(() => getTimeElapsedMins(order.created_at));

    useEffect(() => {
        const intervalId = setInterval(() => {
            setMins(getTimeElapsedMins(order.created_at));
        }, 60000); // Update every minute
        return () => clearInterval(intervalId);
    }, [order.created_at]);
    
    let borderColor = '!border-primary' // Replaced border-2 with standard 1px border but clearly colored
    let glowClass = 'shadow-[0_0_20px_rgba(242,147,13,0.4)]' // Apply actual glowing shadow
    let waitStyle = 'text-primary'
    let waitLabel = 'Wait Time'
    let bgPulse = isNew ? 'animate-pulse' : ''
    
    if (order.status === 'ready' || order.status === 'completed') {
        borderColor = '!border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]'
        waitStyle = 'text-slate-500'
        waitLabel = 'Finished'
        glowClass = ''
    } else if (order.status === 'preparing') {
        borderColor = '!border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)]'
        glowClass = 'bg-primary/5'
        waitStyle = 'text-yellow-500'
        waitLabel = 'Wait Time'
    } else {
        // Pending
        if (mins >= 30) {
            borderColor = '!border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
            waitStyle = 'text-red-500'
            waitLabel = 'Critical'
            bgPulse = 'animate-pulse-subtle'
        }
    }

    const isCash = order.payment_method === 'cash' || order.payment_method === 'Cash'

    return (
        <div className={`kds-glass-card rounded-3xl p-6 flex flex-col !border-[3px] !border-solid ${borderColor} ${glowClass} ${bgPulse} group transition-all hover:bg-white/5 cursor-pointer relative overflow-hidden`} onClick={() => onSelect(order)}>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-4xl font-bold text-slate-100 line-clamp-1 tracking-tight">
                        {!order.tables?.table_number || order.tables.table_number === 0 ? 'Parcel' : `Table ${order.tables.table_number.toString().padStart(2, '0')}`}
                    </h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">ORDER #{order.id.slice(0,4).toUpperCase()}</p>
                </div>
                <div className="text-right flex-shrink-0 flex flex-col items-end">
                    <span className={`text-2xl font-bold ${waitStyle}`}>{mins}m</span>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-[#747474] mt-0.5">{waitLabel}</p>
                </div>
            </div>
            
            <div className="mb-4">
                {isCash ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 kds-glow-yellow uppercase tracking-widest">
                        <span className="material-symbols-outlined text-xs mr-1">payments</span> Cash Payment
                    </span>
                ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 kds-glow-blue uppercase tracking-widest">
                        <span className="material-symbols-outlined text-xs mr-1">payments</span> Online Payment
                    </span>
                )}
            </div>

            <div className="flex-1 space-y-3 py-4 border-y border-white/5">
                {order.order_items?.slice(0, 4).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center">
                        <span className="text-slate-200 font-medium">
                            <span className="text-primary font-bold mr-2">{item.quantity}x</span>
                            {item.name}
                        </span>
                    </div>
                ))}
                {order.order_items?.length > 4 && (
                    <div className="text-xs text-slate-500 font-bold mt-2 pt-2 border-t border-white/10">+{order.order_items.length - 4} more items</div>
                )}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2">
                {order.status === 'pending' && (
                    <button onClick={(e) => { e.stopPropagation(); handleStatusUpdate(order.id, 'preparing'); }} className="w-full bg-primary hover:bg-primary/90 text-[#120e0a] font-bold py-3 rounded-xl transition-all uppercase text-xs tracking-widest shadow-lg shadow-primary/10">
                        Start Preparing
                    </button>
                )}
                {order.status === 'preparing' && (
                    <button onClick={(e) => { e.stopPropagation(); handleStatusUpdate(order.id, 'ready'); }} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all uppercase text-[10px] tracking-widest shadow-lg shadow-green-900/20">
                        Ready
                    </button>
                )}
                {order.status === 'ready' && (
                    <button onClick={(e) => { e.stopPropagation(); handleStatusUpdate(order.id, 'completed'); }} className="w-full bg-green-500/20 border border-green-500/40 hover:bg-green-500/30 text-green-400 font-bold py-3 rounded-xl transition-all uppercase text-xs tracking-widest flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm align-middle mr-1">check_circle</span> Complete
                    </button>
                )}
            </div>
        </div>
    )
})
