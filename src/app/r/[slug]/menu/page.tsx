'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRestaurant } from '@/providers/RestaurantProvider'
import { supabase } from '@/lib/supabase/client'
import { useCart } from '@/store/cart.store'
import FloatingCartBar from '@/components/cart/FloatingCartBar'
import { FoodLoader } from '@/components/ui/FoodLoader'


export default function MenuPage() {
    const { restaurant } = useRestaurant()
    const router = useRouter()
    const params = useParams()
    const slug = params.slug as string

    const [customerName, setCustomerName] = useState<string | null>(null)
    const [tableNumber, setTableNumber] = useState('5')
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
            const tb = sessionStorage.getItem('table_number')
            if (!mobile) {
                router.replace(`/r/${slug}/customer`)
            } else {
                setCustomerName(name || 'Guest')
                if (tb) setTableNumber(tb)
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
        return <FoodLoader text="Preparing our menu for you..." />
    }

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen transition-colors duration-300">
            {/* Top App Bar */}
            <header className="sticky top-0 z-40 bg-background-light dark:bg-background-dark pt-4 pb-2 w-full border-b border-black/5 dark:border-white/5">
                <div className="max-w-2xl mx-auto px-4 w-full">
                    <div className="glass-pane rounded-2xl p-4 flex items-center justify-between w-full shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="size-10 shrink-0 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-white/10">
                                <span className="text-primary font-bold text-lg">{restaurant.name?.[0] || 'R'}</span>
                            </div>
                            <div>
                                <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight">{restaurant.name}</h2>
                                <p className="text-primary text-xs font-semibold">Welcome, {customerName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-3 py-1 rounded-full">
                                <p className="text-primary text-sm font-bold tracking-wide">
                                    Table {tableNumber}
                                </p>
                            </div>
                            <button
                                onClick={() => setMenuOpen(!menuOpen)}
                                className="text-slate-900 dark:text-white flex items-center justify-center size-8 rounded-full bg-black/5 dark:bg-white/5"
                            >
                                <span className="material-symbols-outlined">menu</span>
                            </button>
                        </div>
                    </div>
                    
                    {/* Categories Tab Bar */}
                    {categories.length > 0 && (
                        <div className="mt-4 flex gap-6 overflow-x-auto no-scrollbar px-2">
                            {categories.map((cat, idx) => (
                                <a 
                                    key={cat.id} 
                                    className={`flex flex-col items-center justify-center border-b-2 ${idx === 0 ? 'border-primary' : 'border-transparent'} pb-1 shrink-0 transition-colors`} 
                                    href={`#category-${cat.id}`}
                                >
                                    <p className={`${idx === 0 ? 'text-primary' : 'text-slate-500 dark:text-slate-400'} text-sm font-bold transition-colors`}>{cat.name}</p>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            <main className="p-4 max-w-2xl mx-auto pb-40 relative">
                
                {/* Drawer Menu */}
                {menuOpen && (
                    <div
                        onClick={() => setMenuOpen(false)}
                        className="fixed inset-0 bg-black/40 z-[200] backdrop-blur-sm"
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="fixed top-0 right-0 bottom-0 w-[260px] bg-white dark:bg-background-dark shadow-[-4px_0_12px_rgba(0,0,0,0.1)] p-6 flex flex-col gap-0 z-[201]"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="m-0 text-lg text-slate-900 dark:text-white font-bold">Menu</h2>
                                <button
                                    onClick={() => setMenuOpen(false)}
                                    className="bg-transparent border-none text-2xl cursor-pointer text-slate-500"
                                >
                                    ×
                                </button>
                            </div>
                            <button
                                onClick={() => { setMenuOpen(false); router.push(`/r/${slug}/orders`) }}
                                className="bg-transparent border-none border-b border-slate-200 dark:border-white/10 py-4 text-base text-left cursor-pointer text-slate-700 dark:text-slate-300 flex items-center gap-3 font-medium hover:bg-black/5 dark:hover:bg-white/5 px-2 rounded-t-lg transition-colors"
                            >
                                <span className="material-symbols-outlined text-[20px]">package</span> My Orders
                            </button>
                            <button
                                onClick={() => {
                                    setMenuOpen(false)
                                    sessionStorage.removeItem('customer_mobile')
                                    sessionStorage.removeItem('customer_name')
                                    router.replace(`/r/${slug}/customer`)
                                }}
                                className="bg-transparent border-none py-4 text-base text-left cursor-pointer text-red-500 flex items-center gap-3 font-medium hover:bg-black/5 dark:hover:bg-white/5 px-2 rounded-b-lg transition-colors mt-2"
                            >
                                <span className="material-symbols-outlined text-[20px]">logout</span> Logout
                            </button>
                        </div>
                    </div>
                )}

                {/* Section: Active Order Items */}
                {cart.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">In Your Order</h3>
                        <div className="space-y-3">
                            {cart.map(cartItem => (
                                <div key={cartItem.id} className="flex items-center gap-4 bg-white/50 dark:bg-black/40 backdrop-blur-md px-4 py-4 rounded-2xl border border-black/5 dark:border-white/10 shadow-sm dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
                                    <div className="bg-primary/20 aspect-square rounded-lg size-14 shrink-0 flex items-center justify-center text-primary font-bold text-xl border border-black/5 dark:border-white/10">
                                        {cartItem.name[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-slate-900 dark:text-slate-100 text-base font-bold truncate">{cartItem.name}</p>
                                        <p className="text-primary text-sm font-medium">₹{(cartItem.price * cartItem.quantity).toFixed(2)}</p>
                                    </div>
                                    <div className="shrink-0">
                                        <div className="flex items-center gap-3 bg-white dark:bg-background-dark p-1 rounded-full border border-primary/20 dark:border-primary/10">
                                            <button 
                                                onClick={() => decrease(cartItem.id)}
                                                className="text-slate-900 dark:text-slate-100 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20 hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-sm">remove</span>
                                            </button>
                                            <span className="text-base font-bold w-4 text-center text-slate-900 dark:text-white">{cartItem.quantity}</span>
                                            <button 
                                                onClick={() => increase(cartItem.id)}
                                                className="text-slate-900 dark:text-slate-100 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20 hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-sm">add</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Menu List */}
                <div className="space-y-8">
                    {categories.map((category) => (
                        <div key={category.id} id={`category-${category.id}`} className="space-y-4 pt-4">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white capitalize px-2">{category.name}</h3>
                            <div className="flex flex-col gap-4">
                                {category.menu_items?.map((item: any) => {
                                    const cartItem = cart.find((c) => c.id === item.id)
                                    const quantity = cartItem ? cartItem.quantity : 0

                                    if (!item.is_available) return null;

                                    return (
                                        <div key={item.id} className="glass-pane flex items-stretch justify-between gap-4 rounded-2xl p-4 bg-white/50 dark:bg-white/5 shadow-sm dark:shadow-none border border-black/5 dark:border-white/10 transition-transform active:scale-[0.98]">
                                            <div className="flex flex-[2_2_0px] flex-col justify-between py-1">
                                                <div className="flex flex-col gap-1">
                                                    <p className="text-slate-900 dark:text-slate-100 text-base font-bold">{item.name}</p>
                                                    {item.description && (
                                                        <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2">{item.description}</p>
                                                    )}
                                                    <p className="text-primary text-base font-bold mt-1">₹{item.price}</p>
                                                </div>
                                                
                                                <div className="mt-3">
                                                    {quantity === 0 ? (
                                                        <button 
                                                            onClick={() => addItem({
                                                                id: item.id,
                                                                name: item.name,
                                                                price: item.price,
                                                                quantity: 1
                                                            })}
                                                            className="glossy-3d-btn flex min-w-[100px] items-center justify-center rounded-xl h-9 px-4 text-white gap-1 text-sm font-bold w-fit"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">add</span>
                                                            <span>Add</span>
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center gap-3 bg-white dark:bg-background-dark p-1 rounded-full border border-primary/20 dark:border-primary/10 w-fit">
                                                            <button 
                                                                onClick={() => decrease(item.id)}
                                                                className="text-slate-900 dark:text-slate-100 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20 hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">remove</span>
                                                            </button>
                                                            <span className="text-sm font-bold w-4 text-center text-slate-900 dark:text-white">{quantity}</span>
                                                            <button 
                                                                onClick={() => increase(item.id)}
                                                                className="text-slate-900 dark:text-slate-100 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20 hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">add</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="w-28 h-28 bg-primary/5 dark:bg-primary/10 rounded-xl shrink-0 food-3d-pop border border-black/5 dark:border-white/10 flex items-center justify-center shadow-inner overflow-hidden">
                                                {/* Fallback image style or actual image if you add URLs to db later */}
                                                <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary text-4xl font-black">
                                                    {item.name[0]}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                    
                    {categories.length === 0 && (
                        <div className="text-center py-10 bg-white/50 dark:bg-black/20 rounded-2xl border border-black/5 dark:border-white/10 mt-6 backdrop-blur-md">
                            <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">restaurant</span>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">No menu items found.</p>
                        </div>
                    )}
                </div>
            </main>

            <FloatingCartBar />
        </div>
    )
}
