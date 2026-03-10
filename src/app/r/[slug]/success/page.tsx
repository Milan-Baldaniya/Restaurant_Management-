'use client'

import { useSearchParams, useParams, useRouter } from 'next/navigation'
import { useRestaurant } from '@/providers/RestaurantProvider'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Order = {
    id: string
    status: string
    total_amount: number
    created_at: string
}

export default function SuccessPage() {
    const { restaurant } = useRestaurant()
    const searchParams = useSearchParams()
    const router = useRouter()
    const params = useParams()
    const slug = params.slug as string

    const [isClient, setIsClient] = useState(false)
    const [activeOrderId, setActiveOrderId] = useState<string | null>(null)
    const [order, setOrder] = useState<Order | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setIsClient(true)

        const id = searchParams.get('order')
        if (!id) {
            router.replace(`/r/${slug}`)
            return
        }
        setActiveOrderId(id)
    }, [])

    useEffect(() => {
        if (!activeOrderId) return

        const fetchOrder = async () => {
            setLoading(true)
            const { data, error: fetchError } = await supabase
                .from('orders')
                .select('id, status, total_amount, created_at')
                .eq('id', activeOrderId)
                .single()

            if (fetchError || !data) {
                setError('Order not found')
            } else {
                setOrder(data as Order)
            }
            setLoading(false)
        }

        fetchOrder()
    }, [activeOrderId])

    useEffect(() => {
        if (!activeOrderId) return

        const channel = supabase
            .channel(`order-tracking-${activeOrderId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `id=eq.${activeOrderId}`
                },
                (payload) => {
                    setOrder(prev => prev ? { ...prev, ...(payload.new as Partial<Order>) } as Order : payload.new as Order)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [activeOrderId])

    const orderId = searchParams.get('order')

    useEffect(() => {
        if (!isClient) return

        if (!restaurant) {
            router.replace(`/r/${slug}`)
            return
        }

        if (!orderId) {
            router.replace(`/r/${slug}/menu`)
        }

    }, [restaurant, orderId, slug, router, isClient])

    if (!isClient || !restaurant || !orderId) {
        return null
    }

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
                Loading order...
            </div>
        )
    }

    if (error) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'system-ui, sans-serif',
                textAlign: 'center',
                padding: '20px'
            }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                <h2 style={{ fontSize: '20px', color: '#111827', margin: '0 0 10px 0' }}>{error}</h2>
                <button
                    onClick={() => router.push(`/r/${slug}/menu`)}
                    style={{
                        marginTop: '20px',
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
            </div>
        )
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
            backgroundColor: '#f9fafb'
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '40px 30px',
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                maxWidth: '400px',
                width: '100%'
            }}>
                <div style={{ fontSize: '64px', marginBottom: '20px', lineHeight: 1 }}>
                    ✅
                </div>

                <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 10px 0', color: '#111827' }}>
                    Order Confirmed!
                </h1>

                <p style={{ fontSize: '16px', color: '#6b7280', margin: '0 0 20px 0' }}>
                    {restaurant.name}
                </p>

                <div style={{
                    backgroundColor: '#f3f4f6',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Order ID</p>
                    <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '18px', color: '#374151' }}>
                        #{orderId.slice(0, 8).toUpperCase()}
                    </p>
                </div>

                {order && (
                    <div style={{
                        backgroundColor: '#f3f4f6',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '20px'
                    }}>
                        <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Status</p>
                        <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '18px', color: '#374151', textTransform: 'capitalize' }}>
                            {order.status}
                        </p>
                    </div>
                )}

                <p style={{ fontSize: '16px', color: '#374151', margin: 0, lineHeight: 1.5 }}>
                    {order?.status === 'completed'
                        ? 'Your order is ready! Please collect it.'
                        : 'Please wait, the kitchen is preparing your order.'}
                </p>

                <button
                    onClick={() => router.push(`/r/${slug}/menu`)}
                    style={{
                        marginTop: '30px',
                        backgroundColor: 'black',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px 24px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        width: '100%'
                    }}
                >
                    Back to Menu
                </button>
            </div>
        </div>
    )
}
