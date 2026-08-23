import { Navigate, Outlet, useNavigate } from 'react-router'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasHydrated     = useAuthStore((s) => s._hasHydrated)

  // Belum hydrate — tampilkan loading, jangan redirect dulu
  if (!hasHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export function GuestRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasHydrated     = useAuthStore((s) => s._hasHydrated)

  if (!hasHydrated) {
    return null
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

// Hook untuk logout yang pakai React Router navigate
export function useLogout() {
  const navigate  = useNavigate()
  const logoutFn  = useAuthStore((s) => s.logout)

  return () => {
    logoutFn()
    navigate('/login', { replace: true })
  }
}
