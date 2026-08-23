import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { router } from './app/router'
import { queryClient } from './app/queryClient'
import './index.css'

// Clear semua query cache saat app pertama kali load
// Mencegah cached query dari session sebelumnya di-fetch ulang sebelum token ter-load
queryClient.clear()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {(import.meta as { env?: { DEV?: boolean } }).env?.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>
)
