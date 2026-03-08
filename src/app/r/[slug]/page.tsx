'use client'

import { useEffect, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useRestaurant } from '@/providers/RestaurantProvider'

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
                        sessionStorage.setItem('table_number', parsedNumber.toString())
                    } else if (tableError) {
                        console.error("Error fetching table:", tableError)
                    }
                }
            }

            router.replace(`/r/${slug}/customer`)
        }

        validate()
    }, [slug, router, searchParams, setRestaurant])

    return <p>Validating restaurant...</p>
}

export default function Page() {
    return (
        <Suspense fallback={<p>Loading...</p>}>
            <EntryContent />
        </Suspense>
    )
}

