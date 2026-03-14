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
        <div className="relative mx-auto flex min-h-screen max-w-md flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased transition-colors duration-300">
            {/* Top App Bar */}
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-primary/20 bg-background-light/90 dark:bg-background-dark/90 px-4 py-4 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => router.back()}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="text-xl font-bold tracking-tight">Checkout</h1>
                </div>
                <button 
                    onClick={clearCart}
                    className="text-primary hover:underline text-sm font-semibold"
                >
                    Clear
                </button>
            </header>

            <main className="flex-1 px-4 py-6">
                {/* Items Section */}
                <section className="mb-8">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Your Items</h2>
                        <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary uppercase border border-primary/10">
                            {cart.length} Item{cart.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="space-y-4">
                        {cart.map((item) => (
                            <div key={item.id} className="glass-tile flex items-center gap-4 rounded-xl p-4 transition-transform hover:scale-[1.02] bg-white/50 dark:bg-white/5 shadow-sm dark:shadow-none">
                                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg shadow-inner ring-1 ring-black/5 dark:ring-white/10 bg-primary/10 flex items-center justify-center text-primary text-3xl font-black">
                                    {item.name[0]}
                                </div>
                                <div className="flex flex-1 flex-col justify-between">
                                    <div className="flex justify-between items-start gap-2">
                                        <p className="font-semibold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">{item.name}</p>
                                        <p className="font-bold text-primary text-lg sm:text-xl shrink-0">₹{(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">₹{item.price.toFixed(2)} / unit</p>
                                        <div className="flex items-center gap-3 sm:gap-4 stepper-3d rounded-full bg-slate-200 dark:bg-black/40 px-3 py-1.5 border border-black/5 dark:border-white/5">
                                            <button 
                                                onClick={() => decrease(item.id)}
                                                className="btn-3d-press flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary"
                                            >
                                                <span className="material-symbols-outlined text-sm font-bold">remove</span>
                                            </button>
                                            <span className="text-sm font-bold w-4 text-center text-slate-900 dark:text-white">{item.quantity}</span>
                                            <button 
                                                onClick={() => increase(item.id)}
                                                className="btn-3d-press flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white"
                                            >
                                                <span className="material-symbols-outlined text-sm font-bold">add</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Payment Method Section */}
                <section className="mb-8">
                    <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Payment Method</h2>
                    <div className="grid grid-cols-2 gap-4">
                        {/* UPI / Online Option */}
                        <label className={`glass-tile relative flex cursor-pointer flex-col items-center gap-3 rounded-2xl p-6 text-center transition-all bg-white/50 dark:bg-white/5 shadow-sm dark:shadow-none
                            ${paymentMethod === 'upi' ? 'shadow-xl ring-2 ring-primary opacity-100 grayscale-0' : 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100'}`}
                        >
                            <input 
                                checked={paymentMethod === 'upi'}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="hidden" 
                                name="payment" 
                                type="radio"
                                value="upi"
                            />
                            <div className={`flex h-14 w-14 items-center justify-center rounded-full ${paymentMethod === 'upi' ? 'bg-primary/20 shadow-[0_10px_20px_rgba(242,147,13,0.3)]' : 'bg-slate-200 dark:bg-slate-700/50'}`}>
                                <span className={`material-symbols-outlined text-4xl ${paymentMethod === 'upi' ? 'text-primary' : 'text-slate-500 dark:text-slate-300'}`}>account_balance_wallet</span>
                            </div>
                            <span className="text-sm font-bold text-slate-900 dark:text-white">UPI / Online</span>
                            {paymentMethod === 'upi' && (
                                <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary shadow-lg ring-2 ring-white dark:ring-background-dark">
                                    <span className="material-symbols-outlined text-sm font-black text-white">check</span>
                                </span>
                            )}
                        </label>
                        
                        {/* Cash Option */}
                        <label className={`glass-tile relative flex cursor-pointer flex-col items-center gap-3 rounded-2xl p-6 text-center transition-all bg-white/50 dark:bg-white/5 shadow-sm dark:shadow-none
                            ${paymentMethod === 'cash' ? 'shadow-xl ring-2 ring-primary opacity-100 grayscale-0' : 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100'}`}
                        >
                            <input 
                                checked={paymentMethod === 'cash'}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="hidden" 
                                name="payment" 
                                type="radio"
                                value="cash"
                            />
                            <div className={`flex h-14 w-14 items-center justify-center rounded-full ${paymentMethod === 'cash' ? 'bg-primary/20 shadow-[0_10px_20px_rgba(242,147,13,0.3)]' : 'bg-slate-200 dark:bg-slate-700/50'}`}>
                                <span className={`material-symbols-outlined text-4xl ${paymentMethod === 'cash' ? 'text-primary' : 'text-slate-500 dark:text-slate-300'}`}>payments</span>
                            </div>
                            <span className="text-sm font-bold text-slate-900 dark:text-white">Cash Delivery</span>
                            {paymentMethod === 'cash' && (
                                <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary shadow-lg ring-2 ring-white dark:ring-background-dark">
                                    <span className="material-symbols-outlined text-sm font-black text-white">check</span>
                                </span>
                            )}
                        </label>
                    </div>
                </section>

                {/* Summary Section */}
                <section className="glass-tile rounded-2xl p-5 mb-6 bg-white/50 dark:bg-white/5 shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                            <span>Subtotal</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-200">₹{totalPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                            <span>Delivery Fee</span>
                            <span className="text-green-600 dark:text-green-400 font-bold tracking-wide">FREE</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                            <span>Taxes</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-200">₹{(totalPrice * 0.05).toFixed(2)}</span>
                        </div>
                        <div className="my-2 border-t border-primary/20 pt-3 flex justify-between items-end">
                            <span className="text-lg font-bold text-slate-900 dark:text-white">Total Amount</span>
                            <div className="flex flex-col items-end">
                                <span className="text-xs text-slate-500 mb-1">Incl. taxes (5%)</span>
                                <span className="text-xl font-bold text-primary">₹{(totalPrice * 1.05).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Bottom CTA */}
            <footer className="sticky bottom-0 bg-background-light/90 dark:bg-background-dark/80 backdrop-blur-md p-6 pb-10 border-t border-black/5 dark:border-white/5 z-20">
                <button 
                    onClick={handlePlaceOrder}
                    disabled={loading}
                    className={`animate-pulse-3d btn-3d-press group flex w-full items-center justify-between rounded-2xl bg-primary px-6 sm:px-8 py-5 font-black text-white transition-all 
                               ${loading ? 'opacity-70 cursor-not-allowed scale-95' : 'hover:scale-[1.02] active:scale-95'}`}
                >
                    <div className="flex flex-col items-start min-w-0 pr-2">
                        <span className="text-[10px] sm:text-xs uppercase tracking-widest opacity-80 shrink-0">
                            {loading ? 'Processing...' : 'Confirm order'}
                        </span>
                        <span className="text-lg sm:text-xl truncate">
                            {loading ? 'Placing...' : 'Place Order'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div className="h-10 border-l border-white/20 mx-1"></div>
                        <span className="text-xl sm:text-2xl font-bold">₹{(totalPrice * 1.05).toFixed(2)}</span>
                        <span className="material-symbols-outlined text-2xl sm:text-3xl transition-transform group-hover:translate-x-1">
                            {loading ? 'hourglass_empty' : 'chevron_right'}
                        </span>
                    </div>
                </button>
            </footer>
        </div>
    )
}
