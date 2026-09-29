import { apiClient } from './client'
import type { Asset, AssetPayload, AssetListParams, AssetMovement, PaginatedResponse } from '@/types'

export const assetsApi = {
  list: async (params: AssetListParams = {}): Promise<PaginatedResponse<Asset>> => {
    const { data } = await apiClient.get('/assets', {
      params: {
        ...(params.search   ? { search: params.search }     : {}),
        ...(params.category ? { category: params.category } : {}),
        ...(params.page     ? { page: params.page }         : {}),
        ...(params.per_page ? { per_page: params.per_page } : {}),
      },
    })
    return data.data as PaginatedResponse<Asset>
  },

  show: async (id: number): Promise<Asset> => {
    const { data } = await apiClient.get(`/assets/${id}`)
    return data.data as Asset
  },

  create: async (payload: AssetPayload): Promise<Asset> => {
    const { data } = await apiClient.post('/assets', payload)
    return data.data as Asset
  },

  update: async (id: number, payload: Partial<AssetPayload>): Promise<Asset> => {
    const { data } = await apiClient.put(`/assets/${id}`, payload)
    return data.data as Asset
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/assets/${id}`)
  },

  addMovement: async (id: number, payload: { type: 'in' | 'out'; qty: number; note?: string | null }): Promise<{ movement: AssetMovement; stock_qty: number }> => {
    const { data } = await apiClient.post(`/assets/${id}/movements`, payload)
    return data.data as { movement: AssetMovement; stock_qty: number }
  },

  movements: async (id: number, page = 1): Promise<PaginatedResponse<AssetMovement>> => {
    const { data } = await apiClient.get(`/assets/${id}/movements`, { params: { page, per_page: 20 } })
    return data.data as PaginatedResponse<AssetMovement>
  },
}
