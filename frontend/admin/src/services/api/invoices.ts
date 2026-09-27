import { apiClient } from './client'
import type { Invoice, InvoiceListParams, PaginatedResponse } from '@/types'

export const invoicesApi = {
  list: async (params: InvoiceListParams = {}): Promise<PaginatedResponse<Invoice>> => {
    const { data } = await apiClient.get('/invoices', {
      params: {
        ...(params.customer_id ? { customer_id: params.customer_id } : {}),
        ...(params.status      ? { status: params.status }           : {}),
        ...(params.from        ? { from: params.from }               : {}),
        ...(params.to          ? { to: params.to }                   : {}),
        ...(params.page        ? { page: params.page }               : {}),
        ...(params.per_page    ? { per_page: params.per_page }       : {}),
      },
    })
    return data.data as PaginatedResponse<Invoice>
  },

  show: async (id: number): Promise<Invoice> => {
    const { data } = await apiClient.get(`/invoices/${id}`)
    return data.data as Invoice
  },

  markPaid: async (id: number): Promise<Invoice> => {
    const { data } = await apiClient.post(`/invoices/${id}/mark-paid`)
    return data.data as Invoice
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/invoices/${id}`)
  },
}
