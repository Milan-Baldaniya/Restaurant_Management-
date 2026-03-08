'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRestaurant } from '@/providers/RestaurantProvider'
import { supabase } from '@/lib/supabase/client'
import { useCart } from '@/store/cart.store'
import FloatingCartBar from '@/components/cart/FloatingCartBar'


export default function MenuPage() {
    const { restaurant } = useRestaurant()
    const router = useRouter()
    const params = useParams()
    const slug = params.slug as string

    const [customerName, setCustomerName] = useState<string | null>(null)
    const [isSessionChecked, setIsSessionChecked] = useState(false)

    const { cart, addItem, increase, decrease } = useCart()

    const [categories, setCategories] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [menuOpen, setMenuOpen] = useState(false)

    // Check sessions
    useEffect(() => {
        if (!restaurant) {
            router.replace(`/r/${slug}`)
            return
        }

        if (typeof window !== 'undefined') {
            const mobile = sessionStorage.getItem('customer_mobile')
            const name = sessionStorage.getItem('customer_name')
            if (!mobile) {
                router.replace(`/r/${slug}/customer`)
            } else {
                setCustomerName(name || 'Guest')
            }
        }

        setIsSessionChecked(true)
    }, [restaurant, router, slug])

    // Fetch Menu
    useEffect(() => {
        if (!restaurant || !isSessionChecked || !customerName) return

        const fetchMenu = async () => {
            try {
                const { data, error } = await supabase
                    .from('categories')
                    .select(`
                        id,
                        name,
                        sort_order,
                        menu_items (
                            id,
                            name,
                            description,
                            price,
                            is_available
                        )
                    `)
                    .eq('restaurant_id', restaurant.id)
                    .order('sort_order', { ascending: true })

                if (error) {
                    console.error('Error fetching menu:', error)
                } else {
                    setCategories(data || [])
                }
            } catch (err) {
                console.error('Unexpected error:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchMenu()
    }, [restaurant, isSessionChecked, customerName])

    if (!restaurant || !isSessionChecked || !customerName) {
        return null
    }

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <p>Loading menu...</p>
            </div>
        )
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '24px', margin: '0 0 5px 0' }}>{restaurant.name}</h1>
                    <p style={{ margin: 0, color: '#666' }}>Welcome, {customerName}</p>
                </div>
                <button
                    onClick={() => setMenuOpen(true)}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '28px',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        color: '#374151'
                    }}
                >
                    ☰
                </button>
            </div>

            {menuOpen && (
                <div
                    onClick={() => setMenuOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        zIndex: 200
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'fixed',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            width: '260px',
                            backgroundColor: 'white',
                            boxShadow: '-4px 0 12px rgba(0,0,0,0.1)',
                            padding: '24px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>Menu</h2>
                            <button
                                onClick={() => setMenuOpen(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    color: '#6b7280'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <button
                            onClick={() => { setMenuOpen(false); router.push(`/r/${slug}/orders`) }}
                            style={{
                                background: 'none',
                                border: 'none',
                                borderBottom: '1px solid #f3f4f6',
                                padding: '14px 0',
                                fontSize: '16px',
                                textAlign: 'left',
                                cursor: 'pointer',
                                color: '#374151',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}
                        >
                            📦 My Orders
                        </button>

                        <button
                            onClick={() => {
                                setMenuOpen(false)
                                sessionStorage.removeItem('customer_mobile')
                                sessionStorage.removeItem('customer_name')
                                router.replace(`/r/${slug}/customer`)
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                borderBottom: '1px solid #f3f4f6',
                                padding: '14px 0',
                                fontSize: '16px',
                                textAlign: 'left',
                                cursor: 'pointer',
                                color: '#ef4444',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}
                        >
                            🚨 Logout
                        </button>
                    </div>
                </div>
            )}


            {categories.map((category) => (
                <div key={category.id} style={{ marginBottom: '30px' }}>
                    <h2 style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        marginBottom: '15px',
                        borderBottom: '2px solid #ddd',
                        paddingBottom: '5px'
                    }}>
                        {category.name}
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {category.menu_items?.map((item: any) => {
                            const cartItem = cart.find((c) => c.id === item.id)
                            const quantity = cartItem ? cartItem.quantity : 0

                            return (
                                item.is_available && (
                                    <div key={item.id} style={{
                                        border: '1px solid #eee',
                                        padding: '15px',
                                        borderRadius: '8px',
                                        backgroundColor: '#fff',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '15px'
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '5px' }}>
                                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{item.name}</h3>
                                                <span style={{ fontWeight: 'bold' }}>${item.price}</span>
                                            </div>
                                            {item.description && (
                                                <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>{item.description}</p>
                                            )}
                                        </div>

                                        <div style={{ minWidth: '80px', display: 'flex', justifyContent: 'flex-end' }}>
                                            {quantity === 0 ? (
                                                <button
                                                    onClick={() => addItem({
                                                        id: item.id,
                                                        name: item.name,
                                                        price: item.price,
                                                        quantity: 1
                                                    })}
                                                    style={{
                                                        backgroundColor: 'black',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '20px',
                                                        padding: '8px 20px',
                                                        fontSize: '14px',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    ADD
                                                </button>
                                            ) : (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    backgroundColor: '#f3f4f6',
                                                    padding: '5px 10px',
                                                    borderRadius: '20px',
                                                    fontSize: '14px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    <button
                                                        onClick={() => decrease(item.id)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            fontSize: '16px',
                                                            padding: '0 5px'
                                                        }}
                                                    >
                                                        -
                                                    </button>
                                                    <span>{quantity}</span>
                                                    <button
                                                        onClick={() => increase(item.id)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            fontSize: '16px',
                                                            padding: '0 5px'
                                                        }}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            )
                        })}
                    </div>
                </div>
            ))}

            {categories.length === 0 && (
                <p style={{ textAlign: 'center', color: '#666' }}>No menu items found.</p>
            )}

            <FloatingCartBar />
        </div>
    )
}
