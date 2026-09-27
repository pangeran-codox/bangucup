import { apiClient } from './client'
import type { Payment, PaymentListParams, PaginatedResponse } from '@/types'

export const paymentsApi = {
  list: async (params: PaymentListParams = {}): Promise<PaginatedResponse<Payment>> => {
    const { data } = await apiClient.get('/payments', {
      params: {
        ...(params.invoice_id ? { invoice_id: params.invoice_id } : {}),
        ...(params.status     ? { status: params.status }         : {}),
        ...(params.page       ? { page: params.page }             : {}),
        ...(params.per_page   ? { per_page: params.per_page }     : {}),
      },
    })
    return data.data as PaginatedResponse<Payment>
  },

  show: async (id: number): Promise<Payment> => {
    const { data } = await apiClient.get(`/payments/${id}`)
    return data.data as Payment
  },
}
