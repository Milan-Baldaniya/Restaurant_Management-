'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRestaurant } from '@/providers/RestaurantProvider'
import { useCart } from '@/store/cart.store'
import { supabase } from '@/lib/supabase/client'
import { normalizeMobile } from '@/lib/normalizeMobile'

export default function CartPage() {
    const { restaurant } = useRestaurant()
    const { cart, increase, decrease, removeItem, clearCart } = useCart()
    const router = useRouter()
    const params = useParams()
    const slug = params.slug as string

    // Prevent hydration mismatch by waiting for client load
    const [isClient, setIsClient] = useState(false)
    const [loading, setLoading] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState('cash')
    const isPlacingOrder = useRef(false)

    useEffect(() => {
        setIsClient(true)
    }, [])

    useEffect(() => {
        if (!isClient) return

        if (!restaurant) {
            router.replace(`/r/${slug}`)
            return
        }

        if (cart.length === 0 && !isPlacingOrder.current) {
            router.replace(`/r/${slug}/menu`)
        }
    }, [restaurant, cart, router, slug, isClient])

    if (!isClient || !restaurant || cart.length === 0) {
        return null
    }

    const totalPrice = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)

    const handlePlaceOrder = async () => {
        setLoading(true)
        isPlacingOrder.current = true
        try {
            const rawMobile = sessionStorage.getItem("customer_mobile")
            const customerName = sessionStorage.getItem("customer_name")
            const tableId = sessionStorage.getItem('table_id')

            if (!rawMobile) {
                alert("Customer session lost. Please login again.")
                router.push(`/r/${slug}/customer`)
                return
            }
            const mobile = normalizeMobile(rawMobile)

            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    restaurant_id: restaurant.id,
                    customer_name: customerName || 'Guest',
                    customer_mobile: mobile,
                    total_amount: totalPrice,
                    payment_method: paymentMethod,
                    table_id: tableId ? tableId : null
                })
                .select()
                .single()

            if (orderError) throw orderError

            const orderItems = cart.map(item => ({
                order_id: order.id,
                menu_item_id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity
            }))

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems)

            if (itemsError) throw itemsError

            clearCart()
            router.push(`/r/${slug}/success?order=${order.id}`)

        } catch (error) {
            console.error("Order failed:", error)
            alert("Failed to place order. Please try again.")
            isPlacingOrder.current = false
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            padding: '20px',
            fontFamily: 'system-ui, sans-serif',
            maxWidth: '600px',
            margin: '0 auto',
            paddingBottom: '100px' // Space for fixed bottom bar
        }}>
            <div style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                <h1 style={{ fontSize: '24px', margin: '0 0 5px 0' }}>{restaurant.name}</h1>
                <h2 style={{ fontSize: '18px', color: '#666', margin: 0 }}>Your Order</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {cart.map((item) => (
                    <div key={item.id} style={{
                        border: '1px solid #eee',
                        padding: '15px',
                        borderRadius: '8px',
                        backgroundColor: '#fff',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span style={{ fontWeight: '600', fontSize: '16px' }}>{item.name}</span>
                            <span style={{ fontWeight: 'bold' }}>₹{(item.price * item.quantity).toFixed(2)}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button
                                onClick={() => removeItem(item.id)}
                                style={{
                                    border: 'none',
                                    background: 'none',
                                    color: '#ef4444', // red-500
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    padding: '5px'
                                }}
                            >
                                Remove
                            </button>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px',
                                backgroundColor: '#f3f4f6',
                                padding: '5px 15px',
                                borderRadius: '20px',
                                fontSize: '16px',
                                fontWeight: 'bold'
                            }}>
                                <button
                                    onClick={() => decrease(item.id)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '18px',
                                        padding: '0 5px',
                                        color: '#374151'
                                    }}
                                >
                                    −
                                </button>
                                <span>{item.quantity}</span>
                                <button
                                    onClick={() => increase(item.id)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '18px',
                                        padding: '0 5px',
                                        color: '#374151'
                                    }}
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: 'white',
                borderTop: '1px solid #e5e7eb',
                padding: '20px',
                boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 50
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                    {/* Payment Method Selection */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151' }}>Payment Method</span>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="payment_method"
                                    value="cash"
                                    checked={paymentMethod === 'cash'}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    style={{ cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '14px' }}>Cash</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="payment_method"
                                    value="upi"
                                    checked={paymentMethod === 'upi'}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    style={{ cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '14px' }}>UPI</span>
                            </label>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '14px', color: '#666' }}>Total</span>
                            <span style={{ fontSize: '24px', fontWeight: 'bold' }}>₹{totalPrice.toFixed(2)}</span>
                        </div>

                        <button
                            onClick={handlePlaceOrder}
                            disabled={loading}
                            style={{
                                backgroundColor: loading ? '#9ca3af' : 'black',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '12px 24px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loading ? 'Processing...' : 'Place Order'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
