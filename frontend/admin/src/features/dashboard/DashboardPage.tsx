import { useAuthQuery } from '@/hooks/useAuthQuery'
import { Link } from 'react-router'
import {
  Users,
  FileText,
  Wifi,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiClient } from '@/services/api/client'
import { formatCurrency } from '@/lib/utils'
import type { DashboardStats } from '@/types'

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconClassName,
  loading,
}: {
  title: string
  value: string | number
  description?: string
  icon: React.ElementType
  iconClassName?: string
  loading?: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`rounded-md p-2 ${iconClassName ?? 'bg-primary/10'}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <>
            <p className="text-2xl font-bold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useAuthQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await apiClient.get('/dashboard/stats')
      return data.data
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground text-sm">
          Ringkasan operasional ISP hari ini
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Pelanggan"
          value={stats?.total_customers ?? 0}
          description={`${stats?.active_customers ?? 0} aktif`}
          icon={Users}
          iconClassName="bg-blue-100 text-blue-600"
          loading={isLoading}
        />
        <StatCard
          title="Pendapatan Bulan Ini"
          value={isLoading ? '...' : formatCurrency(stats?.total_revenue_this_month ?? 0)}
          description="Dari invoice terbayar"
          icon={TrendingUp}
          iconClassName="bg-green-100 text-green-600"
          loading={isLoading}
        />
        <StatCard
          title="Invoice Belum Bayar"
          value={stats?.unpaid_invoices ?? 0}
          description={`${stats?.overdue_invoices ?? 0} jatuh tempo`}
          icon={FileText}
          iconClassName="bg-orange-100 text-orange-600"
          loading={isLoading}
        />
        <StatCard
          title="Router Online"
          value={`${stats?.online_routers ?? 0}/${stats?.total_routers ?? 0}`}
          description="Status jaringan"
          icon={Wifi}
          iconClassName="bg-purple-100 text-purple-600"
          loading={isLoading}
        />
      </div>

      {/* Status row */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Status Pelanggan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Aktif</span>
              </div>
              <span className="font-medium">{isLoading ? '...' : stats?.active_customers ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span>Suspended</span>
              </div>
              <span className="font-medium">{isLoading ? '...' : stats?.suspended_customers ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-muted-foreground" />
                <span>Non-aktif</span>
              </div>
              <span className="font-medium">
                {isLoading
                  ? '...'
                  : (stats?.total_customers ?? 0) -
                    (stats?.active_customers ?? 0) -
                    (stats?.suspended_customers ?? 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Aksi Cepat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Tambah Pelanggan', to: '/customers' },
                { label: 'Buat Invoice', to: '/billing/invoices' },
                { label: 'Lihat Router', to: '/routers' },
                { label: 'Monitor Traffic', to: '/monitoring' },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center justify-center rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
