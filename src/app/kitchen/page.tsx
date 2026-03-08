'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useKitchenOrders } from '@/hooks/useKitchenOrders'
import { updateOrderStatus } from '@/lib/api/orders'
import { supabase } from '@/lib/supabase/client'

export default function KitchenPage() {
    const [session, setSession] = useState<any>(null)
    const [loadingAuth, setLoadingAuth] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setSession(session)
            setLoadingAuth(false)
        }
        checkSession()
    }, [])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })
        if (error) {
            alert(error.message)
        } else {
            setSession(data.session)
        }
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
    // Local state to track optimistic updates until realtime subscription handles UPDATE events
    const [localOverrides, setLocalOverrides] = useState<Record<string, string>>({})

    const handleStatusUpdate = async (orderId: string, status: 'preparing' | 'ready' | 'completed') => {
        // Optimistic update
        setLocalOverrides(prev => ({ ...prev, [orderId]: status }))

        try {
            await updateOrderStatus(orderId, status)
        } catch (error) {
            console.error("Failed to update status:", error)
            alert("Failed to update status")
            // Revert on error
            setLocalOverrides(prev => {
                const newState = { ...prev }
                delete newState[orderId]
                return newState
            })
        }
    }

    const [viewMode, setViewMode] = useState<'queue' | 'table'>('queue')

    // Merge hook data with local overrides
    const displayOrders = orders.map(order => ({
        ...order,
        status: localOverrides[order.id] || order.status
    })).filter(order => order.status !== 'completed')

    const groupedOrders = displayOrders.reduce((acc, order) => {
        const tableNumber = order.tables?.table_number === 0 ? '0' : (order.tables?.table_number?.toString() ?? 'parcel');

        if (!acc[tableNumber]) {
            acc[tableNumber] = [];
        }

        acc[tableNumber].push(order);
        return acc;
    }, {} as Record<string, typeof displayOrders>);

    const getTimeElapsed = (createdStr: string) => {
        const diff = Date.now() - new Date(createdStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        return `${hours}h ${mins % 60}m ago`;
    };

    const renderOrderCard = (order: any) => {
        const totalItems = order.order_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;

        return (
            <div key={order.id} className={newOrders.has(order.id) ? "animate-pulse" : ""} style={{
                backgroundColor: newOrders.has(order.id) ? '#fef9c3' : '#1f2937', // yellow-100 vs gray-800
                borderRadius: '16px',
                padding: '0',
                border: newOrders.has(order.id) ? '2px solid #facc15' : '1px solid #374151',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.5s ease',
                overflow: 'hidden',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}>
                {/* Header: Table / Parcel */}
                <div style={{
                    backgroundColor: order.tables && order.tables.table_number === 0 ? '#ef4444' : '#4f46e5', // Red for parcel, Indigo for table
                    color: 'white',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '1px' }}>
                        {order.tables && order.tables.table_number === 0
                            ? 'PARCEL'
                            : order.tables ? `TABLE ${order.tables.table_number}` : 'NO TABLE'}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', backgroundColor: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '20px' }}>
                        {getTimeElapsed(order.created_at)}
                    </span>
                </div>

                {/* Sub-header: Order ID & Status inline */}
                <div style={{ padding: '12px 16px', backgroundColor: '#374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#d1d5db' }}>#{order.id.slice(0, 4)}</span>
                        <span style={{ fontSize: '14px', color: '#9ca3af' }}>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor:
                            order.status === 'preparing' ? '#ca8a04' : // yellow-600
                                order.status === 'ready' ? '#16a34a' : // green-600
                                    '#4b5563', // gray-600 (pending)
                        color: 'white',
                        textTransform: 'uppercase'
                    }}>
                        {order.status}
                    </span>
                </div>

                {/* Items List - The most critical part for kitchen */}
                <div style={{ flex: 1, backgroundColor: '#111827', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {order.order_items && order.order_items.length > 0 ? (
                        <>
                            {order.order_items.map((item: any, idx: number) => (
                                <div key={idx} style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '15px',
                                    paddingBottom: '12px',
                                    borderBottom: idx < order.order_items.length - 1 ? '1px dashed #374151' : 'none'
                                }}>
                                    <div style={{
                                        backgroundColor: '#1f2937',
                                        color: '#fbbf24',
                                        fontSize: '22px',
                                        fontWeight: '900',
                                        padding: '6px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid #4b5563',
                                        minWidth: '55px',
                                        textAlign: 'center'
                                    }}>
                                        {item.quantity}x
                                    </div>
                                    <div style={{ flex: 1, paddingTop: '4px' }}>
                                        <span style={{ color: 'white', fontSize: '20px', fontWeight: '600', lineHeight: '1.3' }}>{item.name}</span>
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : (
                        <p style={{ color: '#6b7280', fontStyle: 'italic', margin: 0 }}>No items</p>
                    )}
                </div>

                {/* Footer Notes & Action Buttons */}
                <div style={{ backgroundColor: '#1f2937', padding: '16px', borderTop: '1px solid #374151', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#9ca3af', fontSize: '15px', fontWeight: '500' }}>
                            {totalItems} Item{totalItems !== 1 ? 's' : ''} total
                        </span>
                        {(order.customer_name || order.customer_mobile) && (
                            <span style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'right', fontStyle: 'italic' }}>
                                {order.customer_name} {order.customer_mobile && `- ${order.customer_mobile}`}
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                        {order.status === 'pending' && (
                            <button
                                onClick={() => handleStatusUpdate(order.id, 'preparing')}
                                style={{
                                    backgroundColor: '#2563eb', // blue-600
                                    color: 'white',
                                    border: 'none',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    transition: 'background-color 0.2s'
                                }}
                            >
                                Start Preparing
                            </button>
                        )}

                        {order.status === 'preparing' && (
                            <button
                                onClick={() => handleStatusUpdate(order.id, 'ready')}
                                style={{
                                    backgroundColor: '#eab308', // yellow-500
                                    color: 'black',
                                    border: 'none',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    fontSize: '18px',
                                    fontWeight: '900',
                                    cursor: 'pointer',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    transition: 'background-color 0.2s'
                                }}
                            >
                                Food is Ready
                            </button>
                        )}

                        {order.status === 'ready' && (
                            <button
                                onClick={() => handleStatusUpdate(order.id, 'completed')}
                                style={{
                                    backgroundColor: '#22c55e', // green-500
                                    color: 'white',
                                    border: 'none',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    transition: 'background-color 0.2s'
                                }}
                            >
                                Dispatch / Complete
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    if (loadingAuth) {
        return <div style={{ backgroundColor: '#111827', minHeight: '100vh', color: 'white', padding: '20px' }}>Checking authentication...</div>
    }

    if (!session) {
        return (
            <div style={{
                backgroundColor: '#111827',
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'system-ui, sans-serif'
            }}>
                <div style={{
                    backgroundColor: '#1f2937',
                    padding: '40px',
                    borderRadius: '12px',
                    width: '100%',
                    maxWidth: '400px',
                    border: '1px solid #374151'
                }}>
                    <h1 style={{ color: 'white', fontSize: '24px', marginBottom: '20px', textAlign: 'center' }}>Kitchen Login</h1>
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #374151', backgroundColor: '#111827', color: 'white' }}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #374151', backgroundColor: '#111827', color: 'white' }}
                            required
                        />
                        <button type="submit" style={{ padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                            Login
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    if (loading) {
        return <div style={{ backgroundColor: '#111827', minHeight: '100vh', color: 'white', padding: '20px' }}>Loading orders...</div>
    }

    return (
        <div style={{
            backgroundColor: '#111827', // gray-900
            minHeight: '100vh',
            color: 'white',
            padding: '20px',
            fontFamily: 'system-ui, sans-serif'
        }}>
            <h1 style={{ fontSize: '32px', marginBottom: '20px', borderBottom: '1px solid #374151', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Kitchen Live Dashboard
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '14px', color: '#9ca3af', fontWeight: 'normal' }}>Logged in as kitchen staff</span>
                    <button
                        onClick={handleLogout}
                        style={{
                            backgroundColor: '#ef4444', // red-500
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        Logout
                    </button>
                </div>
            </h1>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button
                    onClick={() => setViewMode('queue')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        backgroundColor: viewMode === 'queue' ? '#2563eb' : '#374151',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        transition: 'background-color 0.2s'
                    }}
                >
                    Queue View
                </button>
                <button
                    onClick={() => setViewMode('table')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        backgroundColor: viewMode === 'table' ? '#2563eb' : '#374151',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        transition: 'background-color 0.2s'
                    }}
                >
                    Table View
                </button>
            </div>

            {viewMode === 'queue' ? (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '20px'
                }}>
                    {[...displayOrders]
                        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                        .map(renderOrderCard)}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    {Object.entries(groupedOrders)
                        .sort(([a], [b]) => {
                            if (a === '0') return -1;
                            if (b === '0') return 1;
                            if (a === 'parcel' && b !== '0') return -1;
                            if (b === 'parcel' && a !== '0') return 1;
                            return Number(a) - Number(b);
                        })
                        .map(([tableNumber, tableOrders]) => (
                            <div key={tableNumber} style={{ backgroundColor: '#1f2937', padding: '20px', borderRadius: '12px' }}>
                                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: 'white', borderBottom: '1px solid #374151', paddingBottom: '10px' }}>
                                    {tableNumber === '0' || tableNumber === 'parcel' ? 'PARCEL' : `Table ${tableNumber}`}
                                </h2>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                    gap: '20px'
                                }}>
                                    {[...tableOrders]
                                        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                                        .map(renderOrderCard)}
                                </div>
                            </div>
                        ))}
                </div>
            )}

            {displayOrders.length === 0 && (
                <div style={{ textAlign: 'center', marginTop: '50px', color: '#9ca3af', fontSize: '24px' }}>
                    No active orders
                </div>
            )}
        </div>
    )
}
