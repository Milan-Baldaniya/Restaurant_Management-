'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Restaurant = {
    id: string
    name: string
    slug: string
    logo_url: string | null
}

type RestaurantContextType = {
    restaurant: Restaurant | null
    setRestaurant: (r: Restaurant) => void
}

const RestaurantContext = createContext<RestaurantContextType | null>(null)

export function RestaurantProvider({ children }: { children: ReactNode }) {
    const [restaurant, setRestaurantState] = useState<Restaurant | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = sessionStorage.getItem("restaurant")
            if (stored) {
                try {
                    setRestaurantState(JSON.parse(stored))
                } catch (e) {
                    // Ignore parse error
                }
            }
        }
        setIsLoaded(true)
    }, [])

    const setRestaurant = (r: Restaurant) => {
        setRestaurantState(r)
        if (typeof window !== 'undefined') {
            sessionStorage.setItem("restaurant", JSON.stringify(r))
        }
    }

    if (!isLoaded) return null

    return (
        <RestaurantContext.Provider value={{ restaurant, setRestaurant }}>
            {children}
        </RestaurantContext.Provider>
    )
}

export function useRestaurant() {
    const ctx = useContext(RestaurantContext)
    if (!ctx) throw new Error('useRestaurant must be inside RestaurantProvider')
    return ctx
}
