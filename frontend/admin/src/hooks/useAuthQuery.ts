import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'

/**
 * Wrapper useQuery yang otomatis disabled kalau belum login.
 * Pakai ini sebagai pengganti useQuery untuk semua request yang butuh auth.
 */
export function useAuthQuery<T>(options: UseQueryOptions<T>) {
  const token       = useAuthStore((s) => s.token)
  const hasHydrated = useAuthStore((s) => s._hasHydrated)

  return useQuery<T>({
    ...options,
    enabled: hasHydrated && !!token && (options.enabled !== false),
  })
}
