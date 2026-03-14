'use client'

import { useSearchParams, useParams, useRouter } from 'next/navigation'
import { useRestaurant } from '@/providers/RestaurantProvider'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { FoodLoader } from '@/components/ui/FoodLoader'

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

        const fetchLatestStatus = async () => {
             const { data } = await supabase
                .from('orders')
                .select('id, status, total_amount, created_at')
                .eq('id', activeOrderId)
                .single()
            
             if (data) {
                 setOrder(prev => {
                     // Only update state if status changed to avoid unnecessary re-renders
                     if (prev && prev.status === data.status) return prev;
                     return { ...prev, ...(data as Order) }
                 })
             }
        }

        // Poll every 5 seconds
        const intervalId = setInterval(fetchLatestStatus, 5000)

        // Initial fetch is handled by the other useEffect, but let's do one immediately just in case
        fetchLatestStatus()

        return () => {
            clearInterval(intervalId)
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
        return <FoodLoader text="Confirming your order details..." />
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
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden relative transition-colors duration-300">
            {/* Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-72 h-72 bg-primary opacity-20 dark:opacity-10 blur-[100px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary opacity-10 dark:opacity-5 blur-[120px] rounded-full"></div>
            </div>

            <main className="w-full max-w-md z-10 animate-fade-in-up">
                <div className="glass-card rounded-[2rem] p-8 text-center relative overflow-hidden bg-white/40 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-xl dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.8)]">
                    
                    {/* 3D Success Animated Icon */}
                    <div className="success-icon-container flex justify-center mb-6">
                        <div className="success-checkmark-3d w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(242,147,13,0.4)] animate-glow-pulse">
                            <svg className="h-10 w-10 text-white dark:text-black" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"></path>
                            </svg>
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold mb-2 tracking-tight text-slate-900 dark:text-white">Order Received!</h1>
                    <p className="text-slate-500 dark:text-gray-400 mb-8 font-semibold">
                        {restaurant.name} • Order #{orderId.slice(0, 8).toUpperCase()}
                    </p>

                    <div className="space-y-4 mb-10">
                        <p className="text-lg text-slate-700 dark:text-gray-200">
                            {order?.status === 'completed'
                                ? 'Your order is ready! Please collect it.'
                                : 'Your meal is being prepared and will be served shortly.'}
                        </p>
                        
                        {/* Status Progress Bar */}
                        <div className="pt-4 pb-2">
                            <div className="h-1 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                                <div className={`h-full bg-primary transition-all duration-1000 ${order?.status === 'completed' ? 'w-full' : 'w-1/3 animate-[pulse_2s_infinite]'}`}></div>
                            </div>
                            <div className="flex justify-between text-xs mt-2 text-primary font-semibold uppercase tracking-widest">
                                <span>{order?.status || 'Preparing'}</span>
                                <span className="text-slate-400 dark:text-gray-500">
                                    {order?.status === 'completed' ? 'Done' : 'Serving'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 space-y-4">
                    <button 
                        onClick={() => router.push(`/r/${slug}/menu`)}
                        className="btn-3d-press w-full bg-primary text-white dark:text-black font-bold py-4 rounded-2xl text-lg flex items-center justify-center space-x-2"
                    >
                        <span className="material-symbols-outlined">restaurant_menu</span>
                        <span>Back to Menu</span>
                    </button>
                    
                    <button className="btn-3d-press w-full bg-white/50 dark:bg-white/5 text-slate-900 dark:text-white font-semibold py-4 rounded-2xl text-lg border border-black/10 dark:border-white/10 flex items-center justify-center space-x-2 shadow-sm">
                        <span className="material-symbols-outlined">receipt_long</span>
                        <span>View Receipt</span>
                    </button>
                </div>
                
                <footer className="mt-12 text-center text-slate-400 dark:text-gray-500 text-sm tracking-widest uppercase font-semibold">
                    {restaurant.name}
                </footer>
            </main>
        </div>
    )
}
