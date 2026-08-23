import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 30_000,
})

// Attach token ke setiap request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 — clear auth state, biarkan React Router redirect via ProtectedRoute
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const { _hasHydrated, isAuthenticated } = useAuthStore.getState()
      if (_hasHydrated && isAuthenticated) {
        // Hanya clear state — navigate ditangani ProtectedRoute
        useAuthStore.getState().logout()
      }
    }
    return Promise.reject(error)
  }
)
