import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { normalizeMobile } from '@/lib/normalizeMobile'

function getCustomerMobile(): string {
    if (typeof window !== 'undefined') {
        return normalizeMobile(sessionStorage.getItem('customer_mobile') || '')
    }
    return ''
}

let _supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
    if (!_supabase) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if (!url || !key) {
            throw new Error(
                'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars'
            )
        }
        _supabase = createClient(url, key, {
            global: {
                // Use a custom fetch wrapper to inject the x-customer-mobile header
                // at REQUEST TIME (not at client construction time).
                // supabase-js spreads global.headers during createClient(), freezing values.
                // A fetch wrapper evaluates dynamically on every request.
                fetch: (url, options) => {
                    const mobile = getCustomerMobile()
                    const init = options || {}
                    const headers = new Headers(init.headers as HeadersInit)
                    if (mobile) {
                        headers.set('x-customer-mobile', mobile)
                    }
                    return fetch(url, { ...init, headers })
                }
            }
        })
    }
    return _supabase
}

// Backwards-compatible export: a proxy that lazily initialises the client
// on first property access (i.e. at runtime, never at build/import time).
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
    get(_target, prop, receiver) {
        const client = getSupabase()
        const value = Reflect.get(client, prop, receiver)
        if (typeof value === 'function') {
            return value.bind(client)
        }
        return value
    }
})
