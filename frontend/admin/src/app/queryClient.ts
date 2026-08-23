import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 menit
      retry: false,              // Jangan retry — kalau 401, langsung fail
      refetchOnWindowFocus: false,
      refetchOnMount: false,     // Jangan re-fetch saat component mount ulang
    },
  },
})
