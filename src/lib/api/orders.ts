import { supabase } from '@/lib/supabase/client'

export async function updateOrderStatus(orderId: string, status: 'preparing' | 'ready' | 'completed') {
    const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .select()
        .single()

    if (error) {
        console.error('Error updating order status:', error)
        throw error
    }

    return data
}
