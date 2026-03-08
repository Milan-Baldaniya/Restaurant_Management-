import './globals.css'
import type { Metadata } from 'next'
import { CartProvider } from '@/store/cart.store'

export const metadata: Metadata = {
    title: 'Supabase Connection Test',
    description: 'Minimal starter for Supabase',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body suppressHydrationWarning>
                <CartProvider>
                    {children}
                </CartProvider>
            </body>
        </html>
    )
}
