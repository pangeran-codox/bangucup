import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { ProtectedRoute, GuestRoute } from './ProtectedRoute'
import { Loader2 } from 'lucide-react'

// Lazy load pages
const LoginPage       = lazy(() => import('@/features/auth/LoginPage'))
const NotFoundPage    = lazy(() => import('@/features/auth/NotFoundPage'))
const DashboardPage   = lazy(() => import('@/features/dashboard/DashboardPage'))
const CustomersPage   = lazy(() => import('@/features/customers/CustomersPage'))
const RoutersPage     = lazy(() => import('@/features/routers/RoutersPage'))
const MonitoringPage  = lazy(() => import('@/features/monitoring/MonitoringPage'))
const ComingSoonPage  = lazy(() => import('@/features/shared/ComingSoonPage'))

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}

function withSuspense(Component: React.LazyExoticComponent<(props: unknown) => React.ReactElement>) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  )
}

// Helper untuk halaman coming soon dengan props
function comingSoon(title: string, description?: string) {
  const Page = () => (
    <Suspense fallback={<PageLoader />}>
      <ComingSoonPage title={title} description={description} />
    </Suspense>
  )
  return <Page />
}

export const router = createBrowserRouter([
  // Redirect root
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },

  // Guest routes — hanya bisa diakses kalau belum login
  {
    element: <GuestRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: withSuspense(LoginPage) },
        ],
      },
    ],
  },

  // Protected routes — harus login
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard',  element: withSuspense(DashboardPage) },
          { path: '/customers',  element: withSuspense(CustomersPage) },
          { path: '/customers/:id', element: withSuspense(CustomersPage) },
          { path: '/routers',    element: withSuspense(RoutersPage) },
          { path: '/monitoring', element: withSuspense(MonitoringPage) },

          // Halaman yang belum diimplementasi — placeholder statis, tidak ada query
          { path: '/packages',            element: comingSoon('Paket Internet', 'Manajemen paket layanan ISP') },
          { path: '/billing',             element: comingSoon('Billing', 'Manajemen invoice dan pembayaran') },
          { path: '/billing/invoices',    element: comingSoon('Invoice', 'Daftar invoice pelanggan') },
          { path: '/billing/invoices/:id',element: comingSoon('Detail Invoice') },
          { path: '/billing/payments',    element: comingSoon('Pembayaran', 'Riwayat pembayaran') },
          { path: '/tickets',             element: comingSoon('Tiket', 'Manajemen tiket support') },
          { path: '/tickets/:id',         element: comingSoon('Detail Tiket') },
          { path: '/assets',              element: comingSoon('Aset', 'Inventori peralatan jaringan') },
          { path: '/devices',             element: comingSoon('Perangkat', 'Monitoring perangkat CPE/ONU') },
          { path: '/settings',            element: comingSoon('Pengaturan', 'Konfigurasi aplikasi') },
        ],
      },
    ],
  },

  // 404
  { path: '*', element: withSuspense(NotFoundPage) },
])
