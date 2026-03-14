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
        <html lang="en" className="dark" suppressHydrationWarning>
            <head>
                <link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&amp;display=swap" rel="stylesheet"/>
                <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@100..700,0..1&amp;display=swap" rel="stylesheet"/>
                <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
            </head>
            <body suppressHydrationWarning>
                <CartProvider>
                    {children}
                </CartProvider>
            </body>
        </html>
    )
}
