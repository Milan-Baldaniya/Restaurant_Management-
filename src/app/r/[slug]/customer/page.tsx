'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRestaurant } from '@/providers/RestaurantProvider'
import { normalizeMobile } from '@/lib/normalizeMobile'

export default function CustomerEntryPage() {
    const { restaurant } = useRestaurant()
    const router = useRouter()
    const params = useParams()
    const slug = params.slug as string

    const [name, setName] = useState('')
    const [mobile, setMobile] = useState('')

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const existingMobile = sessionStorage.getItem('customer_mobile')
            if (existingMobile) {
                router.replace(`/r/${slug}/menu`)
                return
            }
        }

        if (!restaurant) {
            router.replace(`/r/${slug}`)
        }
    }, [restaurant, router, slug])

    if (!restaurant) {
        return null
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const normalized = normalizeMobile(mobile)
        sessionStorage.setItem('customer_mobile', normalized)
        sessionStorage.setItem('customer_name', name)
        router.replace(`/r/${slug}/menu`)
    }

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            backgroundColor: '#f3f4f6',
            padding: '20px',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '2.5rem',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                width: '100%',
                maxWidth: '400px',
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: '#111827',
                        margin: 0
                    }}>
                        {restaurant.name}
                    </h1>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label
                            htmlFor="name"
                            style={{
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: '#374151'
                            }}
                        >
                            Your Name
                        </label>
                        <input
                            id="name"
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="John Doe"
                            style={{
                                padding: '0.75rem',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                fontSize: '1rem',
                                width: '100%',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label
                            htmlFor="mobile"
                            style={{
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: '#374151'
                            }}
                        >
                            Mobile Number
                        </label>
                        <input
                            id="mobile"
                            type="tel"
                            required
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value)}
                            placeholder="+1 234 567 8900"
                            style={{
                                padding: '0.75rem',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                fontSize: '1rem',
                                width: '100%',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        style={{
                            backgroundColor: '#000000',
                            color: 'white',
                            padding: '0.75rem',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '1rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            marginTop: '0.5rem'
                        }}
                    >
                        Continue
                    </button>
                </form>
            </div>
        </div>
    )
}
