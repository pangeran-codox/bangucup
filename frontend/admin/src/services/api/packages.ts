import { apiClient } from './client'
import type { Package, PackagePayload } from '@/types'

export const packagesApi = {
  /**
   * Ambil semua paket. API tidak paginasi — langsung return array.
   * Response: { data: Package[] }
   */
  list: async (activeOnly = false): Promise<Package[]> => {
    const { data } = await apiClient.get('/packages', {
      params: activeOnly ? { active_only: true } : {},
    })
    // Laravel returns { data: PackageResource::collection } → array langsung
    return data.data as Package[]
  },

  show: async (id: number): Promise<Package> => {
    const { data } = await apiClient.get(`/packages/${id}`)
    return data.data as Package
  },

  create: async (payload: PackagePayload): Promise<Package> => {
    const { data } = await apiClient.post('/packages', payload)
    return data.data as Package
  },

  update: async (id: number, payload: Partial<PackagePayload>): Promise<Package> => {
    const { data } = await apiClient.put(`/packages/${id}`, payload)
    return data.data as Package
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/packages/${id}`)
  },
}
