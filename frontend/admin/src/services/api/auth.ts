import { apiClient } from './client'
import type { LoginCredentials, AuthResponse } from '@/types'

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await apiClient.post('/auth/login', credentials)
    // Laravel returns { data: { token, user }, message }
    return data.data as AuthResponse
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },

  me: async () => {
    const { data } = await apiClient.get('/auth/me')
    return data.data
  },
}
