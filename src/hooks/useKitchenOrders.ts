import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'

export type KitchenOrder = {
    id: string
    customer_name: string
    customer_mobile: string
    status: string
    total_amount: number
    created_at: string
    payment_method: string
    order_items: {
        id: string
        name: string
        quantity: number
        price: number
    }[]
    tables?: {
        table_number: number
    } | null
}

export function useKitchenOrders(isAuthenticated: boolean, onOrderInsert?: (order: KitchenOrder) => void) {
    const [orders, setOrders] = useState<KitchenOrder[]>([])
    const [loading, setLoading] = useState(true)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const onOrderInsertRef = useRef(onOrderInsert)

    useEffect(() => {
        onOrderInsertRef.current = onOrderInsert
    }, [onOrderInsert])

    useEffect(() => {
        audioRef.current = new Audio('/sounds/new-order.mp3')
        audioRef.current.volume = 1.0
    }, [])

    useEffect(() => {
        if (!isAuthenticated) return

        let isMounted = true
        let channel: ReturnType<typeof supabase.channel> | null = null

        const fetchInitialOrders = async () => {
            // Wait for session to be fully available
            const { data: { session } } = await supabase.auth.getSession()
            if (!session || !isMounted) return

            const { data, error } = await supabase
                .from('orders')
                .select('*, order_items(*), tables(table_number)')
                .neq('status', 'completed')
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching initial orders:', error)
            } else if (isMounted && data) {
                setOrders(data as KitchenOrder[])
            }
            if (isMounted) setLoading(false)
        }

        const setupRealtime = async () => {
            await fetchInitialOrders()

            if (!isMounted) return

            channel = supabase
                .channel(`kitchen-orders-${Date.now()}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'orders'
                    },
                    async (payload) => {
                        if (payload.eventType === 'INSERT') {
                            // Play notification sound
                            if (audioRef.current) {
                                audioRef.current.currentTime = 0
                                audioRef.current.play().catch((err) => {
                                    console.log('Audio play failed:', err)
                                    // Recover from NotSupportedError (stale source) or others by reloading
                                    if (err.name === 'NotSupportedError' || err.name === 'NotAllowedError') {
                                        audioRef.current = new Audio('/sounds/new-order.mp3')
                                        audioRef.current.play().catch(e => console.error("Recovery failed:", e))
                                    }
                                })
                            }

                            // Fetch full order details including items, ensuring session exists
                            const { data: { session } } = await supabase.auth.getSession()
                            if (!session) return

                            const { data: newOrder } = await supabase
                                .from('orders')
                                .select('*, order_items(*), tables(table_number)')
                                .eq('id', payload.new.id)
                                .single()

                            if (newOrder) {
                                const kitchenOrder = newOrder as KitchenOrder
                                onOrderInsertRef.current?.(kitchenOrder)

                                setOrders((prev) => {
                                    if (prev.some((o) => o.id === kitchenOrder.id)) return prev
                                    return [kitchenOrder, ...prev]
                                })
                            }
                        } else if (payload.eventType === 'UPDATE') {
                            // Fetch updated order to get latest items/status if needed
                            const { data: { session } } = await supabase.auth.getSession()
                            if (!session) return

                            // For updates we might not strictly need to refetch items if we assume they don't change
                            // but to be safe and consistent with the requested logic, we can refetch or just use payload if items aren't needed.
                            // However, the prompt specifically asked to "ensure this applies inside realtime subscription handler".
                            // Since payload.new DOES NOT contain relations, we MUST fetch if we want up-to-date items.
                            // But usually items don't change on status update.
                            // I will stick to using payload.new for status updates to avoid unnecessary fetches,
                            // UNLESS the update is about items which is unlikely for 'orders' table events.
                            // Wait, if I use payload.new, I lose order_items from the state if I replace the object!
                            // So I MUST merge or refetch. Refetching is safer.

                            const { data: updatedOrderData } = await supabase
                                .from('orders')
                                .select('*, order_items(*), tables(table_number)')
                                .eq('id', payload.new.id)
                                .single()

                            if (!updatedOrderData) return
                            const updatedOrder = updatedOrderData as KitchenOrder

                            if (updatedOrder.status === 'completed') {
                                setOrders((prev) =>
                                    prev.filter((o) => o.id !== updatedOrder.id)
                                )
                            } else {
                                setOrders((prev) =>
                                    prev.map((order) =>
                                        order.id === updatedOrder.id
                                            ? updatedOrder
                                            : order
                                    )
                                )
                            }
                        } else if (payload.eventType === 'DELETE') {
                            const deletedOrder = payload.old as { id: string }
                            setOrders((prev) =>
                                prev.filter((o) => o.id !== deletedOrder.id)
                            )
                        }
                    }
                )
                .subscribe()
        }

        setupRealtime()

        return () => {
            isMounted = false
            if (channel) supabase.removeChannel(channel)
        }
    }, [isAuthenticated])

    return { orders, loading }
}
