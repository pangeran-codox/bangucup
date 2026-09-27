import { apiClient } from './client'
import type { Customer, CustomerPayload, CustomerListParams, PaginatedResponse } from '@/types'

export const customersApi = {
  /**
   * Ambil daftar pelanggan dengan filter & pagination.
   * API response: { data: { data: Customer[], meta: {...} } }
   */
  list: async (params: CustomerListParams = {}): Promise<PaginatedResponse<Customer>> => {
    const { data } = await apiClient.get('/customers', {
      params: {
        ...(params.search   ? { search: params.search }   : {}),
        ...(params.status   ? { status: params.status }   : {}),
        ...(params.page     ? { page: params.page }       : {}),
        ...(params.per_page ? { per_page: params.per_page } : {}),
      },
    })
    // Laravel returns { data: { data: [...], meta: {...} } }
    return data.data as PaginatedResponse<Customer>
  },

  /** Ambil satu pelanggan beserta subscriptions-nya. */
  show: async (id: number): Promise<Customer> => {
    const { data } = await apiClient.get(`/customers/${id}`)
    return data.data as Customer
  },

  /** Tambah pelanggan baru. */
  create: async (payload: CustomerPayload): Promise<Customer> => {
    const { data } = await apiClient.post('/customers', payload)
    return data.data as Customer
  },

  /** Update pelanggan. */
  update: async (id: number, payload: Partial<CustomerPayload>): Promise<Customer> => {
    const { data } = await apiClient.put(`/customers/${id}`, payload)
    return data.data as Customer
  },

  /** Hapus pelanggan. */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/customers/${id}`)
  },
}
