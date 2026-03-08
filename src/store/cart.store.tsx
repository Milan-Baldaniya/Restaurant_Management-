'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type CartItem = {
    id: string
    name: string
    price: number
    quantity: number
}

type CartContextType = {
    cart: CartItem[]
    addItem: (item: CartItem) => void
    removeItem: (id: string) => void
    increase: (id: string) => void
    decrease: (id: string) => void
    clearCart: () => void
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([])
    const [isLoaded, setIsLoaded] = useState(false)

    // Load from SessionStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = sessionStorage.getItem("cart")
            if (stored) {
                try {
                    setCart(JSON.parse(stored))
                } catch (e) {
                    console.error("Failed to parse cart", e)
                }
            }
        }
        setIsLoaded(true)
    }, [])

    // Save to SessionStorage whenever cart changes
    useEffect(() => {
        if (isLoaded && typeof window !== 'undefined') {
            sessionStorage.setItem("cart", JSON.stringify(cart))
        }
    }, [cart, isLoaded])

    const addItem = (newItem: CartItem) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === newItem.id)
            if (existing) {
                return prev.map(item =>
                    item.id === newItem.id
                        ? { ...item, quantity: item.quantity + newItem.quantity }
                        : item
                )
            }
            return [...prev, newItem]
        })
    }

    const removeItem = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id))
    }

    const increase = (id: string) => {
        setCart(prev => prev.map(item =>
            item.id === id ? { ...item, quantity: item.quantity + 1 } : item
        ))
    }

    const decrease = (id: string) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                return item.quantity > 1
                    ? { ...item, quantity: item.quantity - 1 }
                    : item
            }
            return item
        }).filter(item => item.quantity > 0)) // Optional: remove if 0? Requirement didn't specify, but usually decrease(1) -> 0 means remove or stay at 1. 
        // Let's stick to simple logic: decrease quantity. If it goes to 0, usually we remove it. 
        // Actually, let's keep it simple: if quantity > 1 decrease, else remove? Or just stay 1?
        // Requirement says "decrease(id)". Implicitly usually means decr by 1.
        // Let's safe guard to stay at 1 or remove?
        // Let's assume standard cart behavior: decrease -> if 1 -> remove.
        // Wait, "decrease" usually means decrement.
        // Let's implement: if > 1 decrement. If 1, remove?
        // Re-reading requirements: just "decrease(id)".
        // I will implement: if > 1, decrement. If = 1, remove.
    }

    // Correction on decrease:
    // Implementation above:
    // .filter(item => item.quantity > 0)
    // inside map: if id matches, return new qty or item.
    // simpler:
    /*
    const decrease = (id: string) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === id)
            if (!existing) return prev
            
            if (existing.quantity === 1) {
                return prev.filter(i => i.id !== id)
            }
            
            return prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i)
        })
    }
    */

    // I will use that logic.

    const clearCart = () => {
        setCart([])
    }

    return (
        <CartContext.Provider value={{
            cart, addItem, removeItem, increase, decrease: (id) => {
                setCart(prev => {
                    const existing = prev.find(i => i.id === id)
                    if (!existing) return prev

                    if (existing.quantity === 1) {
                        return prev.filter(i => i.id !== id)
                    }

                    return prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i)
                })
            }, clearCart
        }}>
            {children}
        </CartContext.Provider>
    )
}

export function useCart() {
    const ctx = useContext(CartContext)
    if (!ctx) throw new Error('useCart must be used within CartProvider')
    return ctx
}
