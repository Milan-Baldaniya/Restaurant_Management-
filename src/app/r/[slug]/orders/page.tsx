'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useRestaurant } from '@/providers/RestaurantProvider'
import { normalizeMobile } from '@/lib/normalizeMobile'
import { FoodLoader } from '@/components/ui/FoodLoader'

type Order = {
    id: string
    status: string
    total_amount: number
    created_at: string
}

type OrderItem = {
    name: string
    quantity: number
    price: number
}

const statusLabels: Record<string, string> = {
    pending: 'Order Received',
    preparing: 'Preparing Items',
    ready: 'Ready for Pickup',
    completed: 'Order Completed'
}

const statusDescriptions: Record<string, string> = {
    pending: 'Waiting for kitchen confirmation',
    preparing: 'Chef is working on your order',
    ready: 'Your order is ready to be served',
    completed: 'Enjoy your meal!'
}

const parseSupabaseDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    return dateStr.endsWith('Z') || dateStr.includes('+') ? new Date(dateStr) : new Date(dateStr + 'Z');
};

export default function OrdersPage() {
    const router = useRouter()
    const params = useParams()
    const slug = params.slug as string
    const { restaurant } = useRestaurant()

    const [customerMobile, setCustomerMobile] = useState<string | null>(null)
    const [activeOrders, setActiveOrders] = useState<Order[]>([])
    const [pastOrders, setPastOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)

    // View State
    const [viewMode, setViewMode] = useState<'list' | 'tracking'>('list')
    const [activeListTab, setActiveListTab] = useState<'active' | 'previous'>('active')
    
    // Tracking State
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
    const [trackingItems, setTrackingItems] = useState<OrderItem[]>([])
    const [trackingLoading, setTrackingLoading] = useState(false)

    // STEP 1 — identify customer
    useEffect(() => {
        const raw = sessionStorage.getItem('customer_mobile')
        if (!raw) {
            router.replace(`/r/${slug}/customer`)
            return
        }
        setCustomerMobile(normalizeMobile(raw))
    }, [router, slug])

    // STEP 2 — load all active orders + history (Initial Fetch)
    useEffect(() => {
        if (!customerMobile || !restaurant) return

        const loadOrders = async () => {
            setLoading(true)

            // Fetch ALL active (unfinished) orders
            const { data: activeData } = await supabase
                .from('orders')
                .select('id, status, total_amount, created_at')
                .eq('restaurant_id', restaurant.id)
                .eq('customer_mobile', customerMobile)
                .neq('status', 'completed')
                .order('created_at', { ascending: false })

            if (activeData) setActiveOrders(activeData as Order[])

            // Fetch completed orders
            const { data: historyData } = await supabase
                .from('orders')
                .select('id, status, total_amount, created_at')
                .eq('restaurant_id', restaurant.id)
                .eq('customer_mobile', customerMobile)
                .eq('status', 'completed')
                .order('created_at', { ascending: false })

            if (historyData) setPastOrders(historyData as Order[])

            setLoading(false)
        }

        loadOrders()
    }, [customerMobile, restaurant])

    // STEP 3 — polling for ALL active orders
    useEffect(() => {
        if (!restaurant || !customerMobile) return

        const pollActiveOrders = async () => {
            const { data } = await supabase
                .from('orders')
                .select('id, status, total_amount, created_at')
                .eq('restaurant_id', restaurant.id)
                .eq('customer_mobile', customerMobile)
                .neq('status', 'completed')
                .order('created_at', { ascending: false })

            if (data) {
                // Determine if any order changed from active to complete and refresh history
                const currentActiveIds = data.map(o => o.id)
                const prevActiveIds = activeOrders.map(o => o.id)
                const hasOrderCompleted = prevActiveIds.length > 0 && prevActiveIds.some(id => !currentActiveIds.includes(id))

                setActiveOrders(data as Order[])

                if (hasOrderCompleted || pastOrders.length === 0) {
                    const { data: historyData } = await supabase
                        .from('orders')
                        .select('id, status, total_amount, created_at')
                        .eq('restaurant_id', restaurant.id)
                        .eq('customer_mobile', customerMobile)
                        .eq('status', 'completed')
                        .order('created_at', { ascending: false })
                    
                    if (historyData) setPastOrders(historyData as Order[])
                }
            }
        }

        const intervalId = setInterval(pollActiveOrders, 5000)
        return () => clearInterval(intervalId)
    }, [customerMobile, restaurant, activeOrders, pastOrders.length])

    const handleTrackOrder = async (orderId: string) => {
        setSelectedOrderId(orderId)
        setViewMode('tracking')
        setTrackingLoading(true)
        
        const { data } = await supabase
            .from('order_items')
            .select('name, quantity, price')
            .eq('order_id', orderId)

        setTrackingItems((data as OrderItem[]) || [])
        setTrackingLoading(false)
    }

    if (!customerMobile) return null

    if (loading) {
        return <FoodLoader text="Fetching your orders..." />
    }

    if (viewMode === 'tracking' && selectedOrderId) {
        const order = [...activeOrders, ...pastOrders].find(o => o.id === selectedOrderId)
        if (!order) {
            return (
                <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center font-display text-slate-900 dark:text-white p-6">
                    <p className="mb-4">Order not found.</p>
                    <button onClick={() => setViewMode('list')} className="text-primary font-bold">Back to Orders</button>
                </div>
            )
        }

        const statusSequence = ['pending', 'preparing', 'ready', 'completed']
        let statusIndex = statusSequence.indexOf(order.status)
        // Guard against unknown statuses gracefully
        if (statusIndex === -1) statusIndex = 0

        const progressPercentage = statusIndex === 0 ? 25 : statusIndex === 1 ? 50 : statusIndex === 2 ? 75 : 100

        // Helper to render stepper icon based on status
        const getStepIcon = (step: string, index: number) => {
            const isCompleted = statusIndex > index
            const isActive = statusIndex === index

            const iconMap: Record<string, string> = {
                pending: 'receipt',
                preparing: 'restaurant',
                ready: 'concierge',
                completed: 'check_circle'
            }
            const iconName = iconMap[step] || 'check'

            if (isCompleted) {
                return (
                    <div className="flex flex-col items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-background-dark shadow-[0_4px_0_rgb(180,110,10)] transition-all">
                            <span className="material-symbols-outlined text-sm font-bold">check</span>
                        </div>
                        {index < 3 && <div className="w-0.5 bg-primary h-12"></div>}
                    </div>
                )
            } else if (isActive) {
                return (
                    <div className="flex flex-col items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 border border-primary/50 text-primary shadow-[0_4px_15px_rgba(242,147,13,0.4)] animate-pulse">
                            <span className="material-symbols-outlined font-variation-settings-['FILL'_1]">{iconName}</span>
                        </div>
                        {index < 3 && <div className="w-0.5 bg-slate-300 dark:bg-slate-700 h-12"></div>}
                    </div>
                )
            } else {
                return (
                    <div className="flex flex-col items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 text-slate-500 shadow-inner">
                            <span className="material-symbols-outlined">{iconName}</span>
                        </div>
                        {index < 3 && <div className="w-0.5 bg-slate-200 dark:bg-slate-800 h-12"></div>}
                    </div>
                )
            }
        }

        return (
            <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-display">
                <header className="sticky top-0 z-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-primary/10">
                    <div className="flex items-center p-4 justify-between max-w-2xl mx-auto w-full">
                        <button onClick={() => setViewMode('list')} className="flex items-center justify-center p-2 rounded-full hover:bg-primary/10 transition-colors">
                            <span className="material-symbols-outlined text-primary">arrow_back</span>
                        </button>
                        <h1 className="text-lg font-bold tracking-tight text-center flex-1">Order Status</h1>
                        <div className="w-10"></div>
                    </div>
                </header>

                <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-8">
                    {/* Header Details */}
                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-primary font-medium text-sm uppercase tracking-wider">Current Order</p>
                            <h2 className="text-3xl font-bold">{restaurant?.name}</h2>
                        </div>
                        <div className="text-right">
                            <p className="text-slate-500 dark:text-slate-400 text-xs">Order ID</p>
                            <p className="font-mono font-medium">#{order.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                    </div>

                    {/* Progress Bar & Stepper */}
                    <section className="backdrop-blur-xl bg-white/5 dark:bg-white/5 rounded-xl p-6 border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
                        <div className="flex justify-between items-center mb-4">
                            <p className="font-semibold text-lg">{statusLabels[order.status] || order.status}</p>
                            <span className="text-primary font-bold">{progressPercentage}%</span>
                        </div>

                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden mb-6">
                            <div className="bg-slate-900/50 h-full w-full rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] relative overflow-hidden">
                                <div className="bg-gradient-to-r from-primary/80 to-primary h-full rounded-full shadow-[0_0_15px_rgba(242,147,13,0.8)] relative transition-all duration-1000 ease-out" style={{ width: `${progressPercentage}%` }}>
                                    <div className="absolute inset-0 bg-white/20 h-1/2 rounded-full"></div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-0">
                            {statusSequence.map((step, idx) => (
                                <div key={step} className="flex gap-4">
                                    {getStepIcon(step, idx)}
                                    <div className="pt-1 pb-4">
                                        <p className={`font-bold ${statusIndex === idx ? 'text-primary' : statusIndex > idx ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>
                                            {statusLabels[step]}
                                        </p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {statusIndex >= idx ? statusDescriptions[step] : 'Pending'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Items List */}
                    <section className="space-y-4">
                        <h3 className="text-xl font-bold border-b border-primary/10 pb-2">Order Summary</h3>
                        <div className="space-y-4">
                            {trackingLoading ? (
                                <p className="text-slate-500">Loading items...</p>
                            ) : trackingItems.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-4 rounded-xl backdrop-blur-md bg-white/5 border border-white/10 shadow-lg hover:bg-white/10 transition-all">
                                    <div className="w-16 h-16 rounded-lg bg-slate-200 dark:bg-slate-800 flex-shrink-0 text-primary flex items-center justify-center">
                                        <span className="material-symbols-outlined text-3xl">restaurant_menu</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold">{item.name}</h4>
                                            <p className="font-semibold text-primary">₹{(item.price * item.quantity).toFixed(2)}</p>
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Quantity: {item.quantity} • ₹{item.price.toFixed(2)} each</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="bg-gradient-to-br from-primary to-[#d9840c] rounded-2xl p-6 text-background-dark shadow-[0_20px_50px_rgba(242,147,13,0.3)] border-t border-white/30 mb-8 mt-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm font-medium opacity-80 uppercase tracking-tight">Total Bill</p>
                                <p className="text-3xl font-bold">₹{order.total_amount.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        )
    }

    // LIST VIEW
    const displayOrders = activeListTab === 'active' ? activeOrders : pastOrders

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col perspective-1000">
            <header className="sticky top-0 z-30 bg-background-light/60 dark:bg-background-dark/60 backdrop-blur-xl border-b border-primary/10">
                <div className="flex items-center p-4 justify-between max-w-lg mx-auto w-full">
                    <button onClick={() => router.push(`/r/${slug}/menu`)} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 transition-all">
                        <span className="material-symbols-outlined text-slate-900 dark:text-white">arrow_back</span>
                    </button>
                    <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center text-slate-900 dark:text-white">My Orders</h2>
                    <div className="h-10 w-10"></div>
                </div>
                
                <div className="px-4 pb-4 max-w-lg mx-auto w-full">
                    <div className="relative flex p-1 bg-slate-200/50 dark:bg-white/5 rounded-xl border border-primary/10 dark:border-white/10 backdrop-blur-md shadow-inner">
                        <div 
                            className="absolute inset-y-1 left-1 w-[calc(50%-4px)] bg-primary rounded-lg shadow-lg transform transition-transform duration-300 ease-out z-0" 
                            style={{ transform: activeListTab === 'active' ? 'translateX(0)' : 'translateX(100%)' }}
                        ></div>
                        <button 
                            className={`relative z-10 flex-1 py-2 text-sm font-bold text-center transition-colors ${activeListTab === 'active' ? 'text-background-dark' : 'text-slate-500 dark:text-white/60'}`}
                            onClick={() => setActiveListTab('active')}
                        >
                            Active
                        </button>
                        <button 
                            className={`relative z-10 flex-1 py-2 text-sm font-bold text-center transition-colors ${activeListTab === 'previous' ? 'text-background-dark' : 'text-slate-500 dark:text-white/60'}`}
                            onClick={() => setActiveListTab('previous')}
                        >
                            Previous
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full">
                {displayOrders.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4 opacity-50">🍽️</div>
                        <h3 className="text-xl font-bold mb-2">No {activeListTab} orders</h3>
                        <p className="text-slate-500">When you place an order, it will appear here.</p>
                        {activeListTab === 'active' && (
                            <button 
                                onClick={() => router.push(`/r/${slug}/menu`)}
                                className="mt-8 bg-primary text-background-dark px-6 py-3 rounded-xl font-bold shadow-[0_4px_15px_rgba(242,147,13,0.4)]"
                            >
                                Browse Menu
                            </button>
                        )}
                    </div>
                ) : (
                    displayOrders.map((order) => (
                        <div key={order.id} className="group relative rounded-2xl bg-white/50 dark:bg-white/5 border border-primary/10 dark:border-white/10 p-1 shadow-md dark:shadow-3d-depth transform transition-all duration-500 hover:-translate-y-1">
                            <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 to-transparent rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            
                            <div className="relative flex flex-col rounded-xl bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden border border-white/20 dark:border-white/5 p-5 space-y-4">
                                <div className="absolute top-4 left-4 bg-primary/20 border border-primary/50 text-primary text-[10px] font-black uppercase px-3 py-1.5 rounded-full shadow-sm dark:shadow-lg backdrop-blur-md">
                                    {statusLabels[order.status] || order.status}
                                </div>
                                
                                <div className="pt-8 flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Order #{order.id.slice(0, 8).toUpperCase()}</h3>
                                        <p className="text-xs text-slate-500 dark:text-white/40 uppercase tracking-widest mt-1">
                                            {parseSupabaseDate(order.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <span className="text-2xl font-black text-primary">₹{order.total_amount.toFixed(2)}</span>
                                </div>
                                
                                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-white/60">
                                    <span className="material-symbols-outlined text-primary text-sm">schedule</span>
                                    <span>
                                        {parseSupabaseDate(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                                
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => handleTrackOrder(order.id)}
                                        className="btn-3d-press flex-1 bg-primary py-3 rounded-xl font-black text-sm text-white uppercase tracking-tighter"
                                    >
                                        {activeListTab === 'active' ? 'Track Order' : 'View Details'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div className="h-10"></div>
            </main>
        </div>
    )
}
