export function normalizeMobile(mobile: string): string {
    return mobile.replace(/\D/g, '').slice(-10)
}
