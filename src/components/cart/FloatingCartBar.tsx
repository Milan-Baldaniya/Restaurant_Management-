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
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '70px',
            backgroundColor: 'white',
            boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 20px',
            zIndex: 50,
            borderTop: '1px solid #e5e7eb'
        }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{totalItems} items</span>
                <span style={{ fontSize: '14px', color: '#666' }}>₹{totalPrice.toFixed(2)}</span>
            </div>

            <button
                onClick={() => router.push(`/r/${slug}/cart`)}
                style={{
                    backgroundColor: '#10b981', // green-500
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                }}
            >
                View Cart →
            </button>
        </div>
    )
}
