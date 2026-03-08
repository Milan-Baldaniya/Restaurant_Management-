'use client'

import { useEffect, useState } from 'react'
import { RestaurantProvider } from '@/providers/RestaurantProvider'
import { supabase } from '@/lib/supabase/client'

export default function Layout({ children }: { children: React.ReactNode }) {
    const [isReady, setIsReady] = useState(false)

    useEffect(() => {
        // Wait for Supabase client to finish loading any session from localStorage
        // (INITIAL_SESSION event), THEN sign out to clear stale kitchen tokens,
        // THEN allow children to render. This prevents the 401 race condition.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event) => {
                if (event === 'INITIAL_SESSION') {
                    await supabase.auth.signOut()
                    setIsReady(true)
                    subscription.unsubscribe()
                }
            }
        )

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    if (!isReady) {
        return null
    }

    return <RestaurantProvider>{children}</RestaurantProvider>
}
