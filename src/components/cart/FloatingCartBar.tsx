'use client'

import { useCart } from '@/store/cart.store'
import { useRouter, useParams } from 'next/navigation'

export default function FloatingCartBar() {
    const { cart } = useCart()
    const router = useRouter()
    const params = useParams()
    const slug = params.slug as string

    // Calculate total items and price
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0)
    const totalPrice = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)

    if (totalItems === 0) {
        return null
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 dock-3d z-50">
            <div className="max-w-2xl mx-auto">
                <button 
                    onClick={() => router.push(`/r/${slug}/cart`)}
                    className="glossy-3d-btn w-full flex items-center justify-between p-4 rounded-2xl active:scale-[0.98]"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-black/20 border border-white/10 px-2 py-1 rounded-md text-xs font-bold text-white">
                            {totalItems} ITEM{totalItems !== 1 ? 'S' : ''}
                        </div>
                        <div className="flex flex-col items-start text-white">
                            <p className="text-sm font-bold leading-none">View Cart</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-white">
                        <p className="text-lg font-bold">₹{totalPrice.toFixed(2)}</p>
                        <span className="material-symbols-outlined">arrow_forward_ios</span>
                    </div>
                </button>
            </div>
        </div>
    )
}
