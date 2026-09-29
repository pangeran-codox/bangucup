import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute, GuestRoute } from './ProtectedRoute'
import { Loader2 } from 'lucide-react'

// Lazy load pages
const LoginPage       = lazy(() => import('@/features/auth/LoginPage'))
const NotFoundPage    = lazy(() => import('@/features/auth/NotFoundPage'))
const LandingPage     = lazy(() => import('@/features/landing/LandingPage'))
const DashboardPage   = lazy(() => import('@/features/dashboard/DashboardPage'))
const CustomersPage   = lazy(() => import('@/features/customers/CustomersPage'))
const RoutersPage     = lazy(() => import('@/features/routers/RoutersPage'))
const MonitoringPage  = lazy(() => import('@/features/monitoring/MonitoringPage'))
const PackagesPage    = lazy(() => import('@/features/packages/PackagesPage'))
const BillingPage     = lazy(() => import('@/features/billing/BillingPage'))
const TicketsPage     = lazy(() => import('@/features/tickets/TicketsPage'))
const DevicesPage     = lazy(() => import('@/features/devices/DevicesPage'))
const AssetsPage      = lazy(() => import('@/features/assets/AssetsPage'))
const SettingsPage    = lazy(() => import('@/features/settings/SettingsPage'))

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

export const router = createBrowserRouter([
  // Landing page — publik, tidak butuh auth
  {
    path: '/',
    element: withSuspense(LandingPage),
  },

  // Guest routes — hanya bisa diakses kalau belum login
  {
    element: <GuestRoute />,
    children: [
      // Login pakai full-page layout sendiri (tidak pakai AuthLayout)
      { path: '/login', element: withSuspense(LoginPage) },
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
          { path: '/packages',            element: withSuspense(PackagesPage) },
          { path: '/billing',             element: withSuspense(BillingPage) },
          { path: '/billing/invoices',    element: withSuspense(BillingPage) },
          { path: '/billing/payments',    element: withSuspense(BillingPage) },
          { path: '/tickets',             element: withSuspense(TicketsPage) },
          { path: '/tickets/:id',         element: withSuspense(TicketsPage) },
          { path: '/assets',              element: withSuspense(AssetsPage) },
          { path: '/devices',             element: withSuspense(DevicesPage) },
          { path: '/settings',            element: withSuspense(SettingsPage) },
        ],
      },
    ],
  },

  // 404
  { path: '*', element: withSuspense(NotFoundPage) },
])
