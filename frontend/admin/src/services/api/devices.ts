import { apiClient } from './client'
import type { Device, DeviceListParams, PaginatedResponse } from '@/types'

export const devicesApi = {
  list: async (params: DeviceListParams = {}): Promise<PaginatedResponse<Device>> => {
    const { data } = await apiClient.get('/devices', {
      params: {
        ...(params.customer_id ? { customer_id: params.customer_id } : {}),
        ...(params.status      ? { status: params.status }           : {}),
        ...(params.page        ? { page: params.page }               : {}),
        ...(params.per_page    ? { per_page: params.per_page }       : {}),
      },
    })
    return data.data as PaginatedResponse<Device>
  },

  show: async (id: number): Promise<Device> => {
    const { data } = await apiClient.get(`/devices/${id}`)
    return data.data as Device
  },

  /** Kirim perintah refresh ke GenieACS */
  refresh: async (id: number): Promise<void> => {
    await apiClient.post(`/devices/${id}/refresh`)
  },
}
