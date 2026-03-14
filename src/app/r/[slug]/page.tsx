'use client'

import { useEffect, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useRestaurant } from '@/providers/RestaurantProvider'
import { FoodLoader } from '@/components/ui/FoodLoader'

function EntryContent() {
    const { slug } = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const { setRestaurant } = useRestaurant()

    useEffect(() => {
        const validate = async () => {
            const { data } = await supabase
                .from('restaurants')
                .select('id,name,slug,logo_url,is_active')
                .eq('slug', slug)
                .single()

            if (!data || !data.is_active) {
                router.replace('/not-found')
                return
            }

            setRestaurant(data)

            // Table Binding Logic
            const tableParam = searchParams.get('table')
            if (tableParam) {
                const parsedNumber = tableParam === 'parcel' ? 0 : parseInt(tableParam, 10)

                if (!isNaN(parsedNumber)) {
                    const { data: tableData, error: tableError } = await supabase
                        .from('tables')
                        .select('id')
                        .eq('restaurant_id', data.id)
                        .eq('table_number', parsedNumber)
                        .single()

                    if (tableData && !tableError) {
                        sessionStorage.setItem('table_id', tableData.id)
                    } else if (tableError) {
                        console.error("Error fetching table:", tableError)
                    } else {
                        console.warn("Table not found in database for number:", parsedNumber)
                    }
                    
                    // Always set the table number for the UI, so it correctly displays Table 3, Table 7, etc.
                    // Even if table doesn't exist in the DB (for testing/demo purposes), we want the UI to respect the URL param.
                    sessionStorage.setItem('table_number', parsedNumber.toString())
                }
            } else {
                // If there's no table parameter in the URL (e.g., standard visit to /r/restaurant), 
                // we rigorously clear any inherited table parameters to force Parcel mode.
                sessionStorage.setItem('table_number', '0')
                sessionStorage.removeItem('table_id')
            }

            router.replace(`/r/${slug}/customer`)
        }

        validate()
    }, [slug, router, searchParams, setRestaurant])

    return <FoodLoader text="Preparing your restaurant experience..." />
}

export default function Page() {
    return (
        <Suspense fallback={<FoodLoader text="Preparing your restaurant experience..." />}>
            <EntryContent />
        </Suspense>
    )
}

