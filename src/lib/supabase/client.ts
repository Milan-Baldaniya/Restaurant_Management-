import { createClient } from '@supabase/supabase-js'
import { normalizeMobile } from '@/lib/normalizeMobile'

function getCustomerMobile(): string {
    if (typeof window !== 'undefined') {
        return normalizeMobile(sessionStorage.getItem('customer_mobile') || '')
    }
    return ''
}

export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
)
