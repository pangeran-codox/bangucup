import { apiClient } from './client'
import type { User } from '@/types'

export interface UserDetail extends User {
  created_at: string
}

export interface CreateUserPayload {
  name: string
  email: string
  password: string
  roles?: string[]
}

export interface UpdateUserPayload {
  name?: string
  email?: string
  password?: string | null
}

export const usersApi = {
  list: async (): Promise<UserDetail[]> => {
    const { data } = await apiClient.get('/users')
    return data.data as UserDetail[]
  },

  create: async (payload: CreateUserPayload): Promise<UserDetail> => {
    const { data } = await apiClient.post('/users', payload)
    return data.data as UserDetail
  },

  update: async (id: number, payload: UpdateUserPayload): Promise<UserDetail> => {
    const { data } = await apiClient.put(`/users/${id}`, payload)
    return data.data as UserDetail
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/users/${id}`)
  },

  syncRoles: async (id: number, roles: string[]): Promise<UserDetail> => {
    const { data } = await apiClient.post(`/users/${id}/roles`, { roles })
    return data.data as UserDetail
  },

  /** Update profil diri sendiri via /users/{id} */
  updateProfile: async (id: number, payload: UpdateUserPayload): Promise<UserDetail> => {
    const { data } = await apiClient.put(`/users/${id}`, payload)
    return data.data as UserDetail
  },
}
