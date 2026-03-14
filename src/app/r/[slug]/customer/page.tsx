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
    const [tableNumber, setTableNumber] = useState(() => {
        if (typeof window !== 'undefined') {
            return sessionStorage.getItem('table_number') || '0'
        }
        return '0'
    })

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const existingMobile = sessionStorage.getItem('customer_mobile')
            if (existingMobile) {
                router.replace(`/r/${slug}/menu`)
                return
            }
            const tb = sessionStorage.getItem('table_number')
            if (tb) {
                setTableNumber(tb)
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

    const isParcel = tableNumber === '0'
    const displayTableText = isParcel ? 'Parcel' : `Table ${tableNumber}`

    return (
        <div className="relative flex h-[100dvh] max-h-[100dvh] w-full flex-col max-w-md mx-auto overflow-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 transition-colors duration-300">
            {/* Header Section */}
            <div className="flex items-center p-3 pb-1 justify-between shrink-0">
                <div 
                    className="text-primary flex size-12 shrink-0 items-center justify-start cursor-pointer"
                    onClick={() => router.back()}
                >
                    <span className="material-symbols-outlined text-3xl">arrow_back</span>
                </div>
                <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">
                    {restaurant.name || 'Pizza Palace'}
                </h2>
            </div>

            {/* Content Wrapper perfectly balances the space vertically */}
            <div className="flex-1 flex flex-col justify-center overflow-hidden pb-4">
                {/* Hero Card */}
                <div className="@container px-4 py-2 shrink-0">
                    <div 
                        className="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden bg-primary/10 rounded-xl h-[22vh] min-h-[140px] max-h-[220px] relative shadow-lg mx-auto" 
                        title="A delicious wood-fired artisanal pizza on a wooden table" 
                        style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuA_Irgl0JYhxrfI6yc542MeyLRdLVzbaJf8qjtAqo__-qiOrEmrro1InRgxz5Mg8Q_MXB_0QRxupuJz7bkFMFWkPXj6eAZmt3nuDW2qjwbe0ZcRegfqr3wnULphLwS2aic41ZVelvZBpAEiSrS5basagFR7oeGq4XCowngJeIyi9LBvpBVdz5WID0TKG4H4HLIqKArG7uexCYKa09vV75VhChb8KDBzXpdHxaX5OMgJQo0ahgpsfskmhYwJwYy9-AqsSsjufjvdRAo")' }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-background-dark/90 to-transparent"></div>
                        <div className="relative z-10 p-4">
                            <span className="bg-primary text-white px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-1 inline-block">Digital Menu</span>
                            <h1 className="text-white text-2xl font-bold leading-tight">{displayTableText}</h1>
                            <p className="text-white/80 text-xs font-medium mt-0.5">Ready for something delicious?</p>
                        </div>
                    </div>
                </div>

                {/* Welcome Text */}
                <div className="px-6 py-3 text-center animate-in fade-in slide-in-from-top-4 duration-700 shrink-0">
                    <h2 className="text-slate-900 dark:text-slate-100 tracking-tight text-xl font-bold leading-tight pb-1">Welcome to {displayTableText}</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm font-normal leading-relaxed mb-2">Please enter your details to browse our menu and start your dining experience.</p>
                </div>

                {/* Form Section */}
                <form onSubmit={handleSubmit} className="flex flex-col shrink-0 w-full">
                    <div className="flex flex-col gap-4 px-6 py-2">
                        <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <label className="flex flex-col w-full">
                                <p className="text-slate-600 dark:text-slate-300 text-xs font-semibold leading-normal pb-1.5 px-1">Full Name</p>
                                <div className="relative flex items-center group">
                                    <span className="material-symbols-outlined absolute left-4 text-slate-400 group-focus-within:text-primary transition-colors">person</span>
                                    <input 
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="form-input flex w-full rounded-2xl text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/30 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 backdrop-blur-xl h-12 placeholder:text-slate-500 pl-12 pr-4 text-sm font-normal shadow-sm dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] transition-all hover:bg-slate-100 dark:hover:bg-white/10" 
                                        placeholder="e.g. John Doe" 
                                        type="text"
                                    />
                                </div>
                            </label>
                        </div>
                        
                        <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                            <label className="flex flex-col w-full">
                                <p className="text-slate-600 dark:text-slate-300 text-xs font-semibold leading-normal pb-1.5 px-1">Mobile Number</p>
                                <div className="relative flex items-center group">
                                    <span className="material-symbols-outlined absolute left-4 text-slate-400 group-focus-within:text-primary transition-colors">smartphone</span>
                                    <input 
                                        required
                                        value={mobile}
                                        onChange={(e) => setMobile(e.target.value)}
                                        className="form-input flex w-full rounded-2xl text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/30 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 backdrop-blur-xl h-12 placeholder:text-slate-500 pl-12 pr-4 text-sm font-normal shadow-sm dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] transition-all hover:bg-slate-100 dark:hover:bg-white/10" 
                                        placeholder="+1 (555) 000-0000" 
                                        type="tel"
                                    />
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Call to Action */}
                    <div className="mt-5 px-6 flex flex-col justify-end">
                        <button 
                            type="submit"
                            className="group relative w-full h-14 bg-primary rounded-2xl btn-3d-press overflow-hidden flex items-center justify-center gap-2 text-white font-bold text-base animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 shrink-0"
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                            <span className="relative flex items-center gap-2">
                                Start Ordering
                                <span className="material-symbols-outlined">restaurant_menu</span>
                            </span>
                            <div className="absolute -inset-1 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </button>
                        <p className="text-center text-slate-500 dark:text-slate-400 text-[10px] mt-3">
                            By continuing, you agree to our Terms of Service
                        </p>
                    </div>
                </form>
            </div>
        </div>
    )
}
