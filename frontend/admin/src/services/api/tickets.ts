import { apiClient } from './client'
import type { Ticket, TicketPayload, TicketListParams, TicketReply, PaginatedResponse } from '@/types'

export const ticketsApi = {
  list: async (params: TicketListParams = {}): Promise<PaginatedResponse<Ticket>> => {
    const { data } = await apiClient.get('/tickets', {
      params: {
        ...(params.status   ? { status: params.status }     : {}),
        ...(params.priority ? { priority: params.priority } : {}),
        ...(params.page     ? { page: params.page }         : {}),
        ...(params.per_page ? { per_page: params.per_page } : {}),
      },
    })
    return data.data as PaginatedResponse<Ticket>
  },

  /** Show dengan replies + user di tiap reply */
  show: async (id: number): Promise<Ticket> => {
    const { data } = await apiClient.get(`/tickets/${id}`)
    return data.data as Ticket
  },

  create: async (payload: TicketPayload): Promise<Ticket> => {
    const { data } = await apiClient.post('/tickets', payload)
    return data.data as Ticket
  },

  /** Update status / priority / assigned_to */
  update: async (id: number, payload: Partial<{ status: string; priority: string; assigned_to: number | null; resolved_at: string | null }>): Promise<Ticket> => {
    const { data } = await apiClient.put(`/tickets/${id}`, payload)
    return data.data as Ticket
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/tickets/${id}`)
  },

  reply: async (id: number, message: string): Promise<TicketReply> => {
    const { data } = await apiClient.post(`/tickets/${id}/replies`, { message })
    return data.data as TicketReply
  },
}
