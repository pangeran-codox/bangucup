import { apiClient } from './client'
import type { MikrotikRouter, RouterPayload, RouterTrafficResponse } from '@/types'

export const routersApi = {
  /** Semua router — tidak paginasi, langsung array */
  list: async (): Promise<MikrotikRouter[]> => {
    const { data } = await apiClient.get('/routers')
    return data.data as MikrotikRouter[]
  },

  show: async (id: number): Promise<MikrotikRouter> => {
    const { data } = await apiClient.get(`/routers/${id}`)
    return data.data as MikrotikRouter
  },

  create: async (payload: RouterPayload): Promise<MikrotikRouter> => {
    const { data } = await apiClient.post('/routers', payload)
    return data.data as MikrotikRouter
  },

  update: async (id: number, payload: Partial<RouterPayload>): Promise<MikrotikRouter> => {
    const { data } = await apiClient.put(`/routers/${id}`, payload)
    return data.data as MikrotikRouter
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/routers/${id}`)
  },

  /** Test koneksi RouterOS API ke router. Returns true = online */
  testConnection: async (id: number): Promise<boolean> => {
    try {
      await apiClient.post(`/routers/${id}/test-connection`)
      return true
    } catch {
      return false
    }
  },

  /** Snapshot traffic interface dari router (1x poll langsung ke MikroTik) */
  traffic: async (id: number): Promise<RouterTrafficResponse> => {
    const { data } = await apiClient.get(`/routers/${id}/traffic`)
    return data.data as RouterTrafficResponse
  },
}
