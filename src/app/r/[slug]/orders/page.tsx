'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useRestaurant } from '@/providers/RestaurantProvider'
import { normalizeMobile } from '@/lib/normalizeMobile'

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
    pending: 'Waiting for kitchen confirmation',
    preparing: 'Cooking started 👨‍🍳',
    ready: 'Ready for pickup 🛎️',
    completed: 'Order completed — Enjoy your meal! 🍽️'
}

export default function OrdersPage() {
    const router = useRouter()
    const params = useParams()
    const slug = params.slug as string
    const { restaurant } = useRestaurant()

    const [customerMobile, setCustomerMobile] = useState<string | null>(null)
    const [activeOrders, setActiveOrders] = useState<Order[]>([])
    const [pastOrders, setPastOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)

    // Modal state for history details
    const [selectedHistoryOrderId, setSelectedHistoryOrderId] = useState<string | null>(null)
    const [historyItems, setHistoryItems] = useState<OrderItem[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)

    // STEP 1 — identify customer
    useEffect(() => {
        const raw = sessionStorage.getItem('customer_mobile')
        if (!raw) {
            router.replace(`/r/${slug}/customer`)
            return
        }
        setCustomerMobile(normalizeMobile(raw))
    }, [router, slug])

    // STEP 2 — load all active orders + history
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

            if (activeData) {
                setActiveOrders(activeData as Order[])
            }

            // Fetch completed orders
            const { data: historyData } = await supabase
                .from('orders')
                .select('id, status, total_amount, created_at')
                .eq('restaurant_id', restaurant.id)
                .eq('customer_mobile', customerMobile)
                .eq('status', 'completed')
                .order('created_at', { ascending: false })

            if (historyData) {
                setPastOrders(historyData as Order[])
            }

            setLoading(false)
        }

        loadOrders()
    }, [customerMobile, restaurant])

    // STEP 3 — polling for ALL active orders (fallback since realtime depends on REPLICA IDENTITY FULL)
    useEffect(() => {
        if (!restaurant || !customerMobile) return

        // We only poll if there is at least one active order or if we just want to keep checking
        // but polling continuously is fine as long as customer is on the page.
        const pollActiveOrders = async () => {
            const { data } = await supabase
                .from('orders')
                .select('id, status, total_amount, created_at')
                .eq('restaurant_id', restaurant.id)
                .eq('customer_mobile', customerMobile)
                .neq('status', 'completed')
                .order('created_at', { ascending: false })

            if (data) {
                setActiveOrders(data as Order[])
                
                // Also check if any active order we knew about became completed
                // This is a bit tricky with polling.  If an order is completed, it simply vanishes from the `activeData`.
                // For a seamless UX, let's refresh history as well if activeOrders count dropped.
                // A simpler way: just refetch history on interval too.
                const { data: historyData } = await supabase
                    .from('orders')
                    .select('id, status, total_amount, created_at')
                    .eq('restaurant_id', restaurant.id)
                    .eq('customer_mobile', customerMobile)
                    .eq('status', 'completed')
                    .order('created_at', { ascending: false })
                
                if (historyData) {
                    setPastOrders(historyData as Order[])
                }
            }
        }

        const intervalId = setInterval(pollActiveOrders, 5000)

        return () => clearInterval(intervalId)
    }, [customerMobile, restaurant])

    // View history order items
    const handleViewHistoryOrder = async (orderId: string) => {
        setSelectedHistoryOrderId(orderId)
        setHistoryLoading(true)
        const { data } = await supabase
            .from('order_items')
            .select('name, quantity, price')
            .eq('order_id', orderId)

        setHistoryItems((data as OrderItem[]) || [])
        setHistoryLoading(false)
    }

    if (!customerMobile) return null

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '18px',
                color: '#6b7280'
            }}>
                Loading orders...
            </div>
        )
    }

    return (
        <div style={{
            minHeight: '100vh',
            padding: '20px',
            fontFamily: 'system-ui, sans-serif',
            maxWidth: '600px',
            margin: '0 auto'
        }}>
            <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>My Orders</h1>

            {/* ACTIVE ORDERS — Live Tracking */}
            {activeOrders.length > 0 ? (
                <div style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '18px', marginBottom: '12px', color: '#111827' }}>Active Orders</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {activeOrders.map((order) => (
                            <div key={order.id} style={{
                                backgroundColor: 'white',
                                padding: '20px',
                                borderRadius: '12px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151' }}>
                                        #{order.id.slice(0, 8).toUpperCase()}
                                    </span>
                                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                                        {new Date(order.created_at).toLocaleTimeString('en-IN', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                </div>

                                <div style={{
                                    backgroundColor: '#f3f4f6',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    marginBottom: '10px'
                                }}>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Status</p>
                                    <p style={{
                                        margin: '4px 0 0 0',
                                        fontWeight: 'bold',
                                        fontSize: '16px',
                                        color: '#374151'
                                    }}>
                                        {statusLabels[order.status] || order.status}
                                    </p>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ fontSize: '13px', color: '#6b7280' }}>Total</span>
                                    <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#111827' }}>
                                        ₹{order.total_amount.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div style={{
                    backgroundColor: 'white',
                    padding: '24px',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    marginBottom: '20px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>🍽️</div>
                    <p style={{ margin: 0, fontSize: '16px', color: '#6b7280' }}>No active orders</p>
                    <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#9ca3af' }}>
                        Place an order from the menu to track it here.
                    </p>
                </div>
            )}

            <button
                onClick={() => router.push(`/r/${slug}/menu`)}
                style={{
                    width: '100%',
                    backgroundColor: 'black',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                }}
            >
                Back to Menu
            </button>

            {/* PREVIOUS ORDERS */}
            {pastOrders.length > 0 && (
                <div style={{ marginTop: '40px' }}>
                    <h2 style={{ fontSize: '20px', marginBottom: '15px', color: '#111827' }}>Previous Orders</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {pastOrders.map((past) => (
                            <div
                                key={past.id}
                                onClick={() => handleViewHistoryOrder(past.id)}
                                style={{
                                    backgroundColor: 'white',
                                    padding: '15px',
                                    borderRadius: '10px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    transition: 'box-shadow 0.2s'
                                }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#374151' }}>
                                        #{past.id.slice(0, 8).toUpperCase()}
                                    </p>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                                        {new Date(past.created_at).toLocaleDateString('en-IN', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px', color: '#111827' }}>
                                        ₹{past.total_amount.toFixed(2)}
                                    </p>
                                    <span style={{ color: '#9ca3af', fontSize: '14px' }}>›</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* HISTORY ORDER DETAIL MODAL */}
            {selectedHistoryOrderId && (
                <div
                    onClick={() => setSelectedHistoryOrderId(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        zIndex: 100,
                        padding: '20px'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '16px 16px 0 0',
                            padding: '24px',
                            width: '100%',
                            maxWidth: '500px',
                            maxHeight: '70vh',
                            overflowY: 'auto'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>
                                Order #{selectedHistoryOrderId.slice(0, 8).toUpperCase()}
                            </h3>
                            <button
                                onClick={() => setSelectedHistoryOrderId(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    color: '#6b7280',
                                    padding: '0 4px'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {historyLoading ? (
                            <p style={{ textAlign: 'center', color: '#6b7280' }}>Loading items...</p>
                        ) : historyItems.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#6b7280' }}>No items found.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {historyItems.map((item, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '12px',
                                        backgroundColor: '#f9fafb',
                                        borderRadius: '8px'
                                    }}>
                                        <div>
                                            <p style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#111827' }}>
                                                {item.name}
                                            </p>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                                                {item.quantity} × ₹{item.price.toFixed(2)}
                                            </p>
                                        </div>
                                        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '15px', color: '#374151' }}>
                                            ₹{(item.quantity * item.price).toFixed(2)}
                                        </p>
                                    </div>
                                ))}

                                <div style={{
                                    borderTop: '1px solid #e5e7eb',
                                    paddingTop: '12px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px', color: '#111827' }}>Total</p>
                                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px', color: '#111827' }}>
                                        ₹{pastOrders.find(o => o.id === selectedHistoryOrderId)?.total_amount.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
