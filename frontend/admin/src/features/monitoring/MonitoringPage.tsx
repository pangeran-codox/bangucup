import { useState } from 'react'
import { Link } from 'react-router'
import {
  Wifi, WifiOff, Activity, ArrowDown, ArrowUp,
  RefreshCw, Radio,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrafficChart } from '@/components/charts/TrafficChart'
import { useTrafficSocket } from '@/hooks/useTrafficSocket'
import { useAuthQuery } from '@/hooks/useAuthQuery'
import { apiClient } from '@/services/api/client'
import { formatBps } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { MikrotikRouter } from '@/types'

// ─── Status badge ─────────────────────────────────────────────────
function ConnectionBadge({ status }: { status: 'connecting' | 'connected' | 'disconnected' }) {
  return (
    <div className={cn(
      'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
      status === 'connected'    && 'bg-green-500/10 text-green-500',
      status === 'connecting'   && 'bg-yellow-500/10 text-yellow-500',
      status === 'disconnected' && 'bg-red-500/10 text-red-500',
    )}>
      <span className={cn(
        'h-1.5 w-1.5 rounded-full',
        status === 'connected'    && 'bg-green-500 animate-pulse',
        status === 'connecting'   && 'bg-yellow-500 animate-pulse',
        status === 'disconnected' && 'bg-red-500',
      )} />
      {status === 'connected'    && 'Live'}
      {status === 'connecting'   && 'Connecting...'}
      {status === 'disconnected' && 'Disconnected'}
    </div>
  )
}

// ─── Stat tile ────────────────────────────────────────────────────
function StatTile({
  label, value, icon: Icon, color,
}: {
  label: string
  value: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
      <div className={cn('rounded-md p-2', color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold font-mono">{value}</p>
      </div>
    </div>
  )
}

// ─── Router card ──────────────────────────────────────────────────
function RouterCard({
  router,
  history,
}: {
  router: MikrotikRouter
  history: import('@/types/realtime').RouterSnapshot[]
}) {
  const [selectedIface, setSelectedIface] = useState<string | null>(null)

  const latest = history[history.length - 1]
  const isOnline = latest?.status === 'online'
  const interfaces = latest?.interfaces ?? []

  // Auto-select interface pertama yang bukan loopback
  const activeIface = selectedIface
    ?? interfaces.find((i) => !i.name.startsWith('lo') && !i.name.startsWith('bridge'))?.name
    ?? interfaces[0]?.name
    ?? null

  const activeIfaceData = interfaces.find((i) => i.name === activeIface)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              'flex h-8 w-8 items-center justify-center rounded-md',
              isOnline ? 'bg-green-500/10' : 'bg-red-500/10'
            )}>
              {isOnline
                ? <Wifi className="h-4 w-4 text-green-500" />
                : <WifiOff className="h-4 w-4 text-red-500" />
              }
            </div>
            <div>
              <CardTitle className="text-sm">{router.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{router.host}</p>
            </div>
          </div>
          <span className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            isOnline ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
          )}>
            {latest ? (isOnline ? 'Online' : 'Offline') : 'Waiting...'}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current traffic untuk interface aktif */}
        {activeIfaceData && (
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              label="Download (RX)"
              value={formatBps(activeIfaceData.rx_bps)}
              icon={ArrowDown}
              color="bg-green-500/10 text-green-500"
            />
            <StatTile
              label="Upload (TX)"
              value={formatBps(activeIfaceData.tx_bps)}
              icon={ArrowUp}
              color="bg-blue-500/10 text-blue-500"
            />
          </div>
        )}

        {/* Interface selector */}
        {interfaces.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {interfaces.map((iface) => (
              <button
                key={iface.name}
                onClick={() => setSelectedIface(iface.name)}
                className={cn(
                  'rounded px-2 py-0.5 text-xs font-mono transition-colors',
                  (activeIface === iface.name)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                )}
              >
                {iface.name}
              </button>
            ))}
          </div>
        )}

        {/* Chart */}
        {activeIface && history.length > 1 ? (
          <TrafficChart
            history={history}
            interfaceName={activeIface}
            height={160}
          />
        ) : (
          <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
            <Activity className="mr-2 h-4 w-4" />
            {!isOnline && latest ? 'Router offline' : 'Menunggu data...'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main page ────────────────────────────────────────────────────
export default function MonitoringPage() {
  const { data: routers, isLoading } = useAuthQuery<MikrotikRouter[]>({
    queryKey: ['routers'],
    queryFn: async () => {
      const { data } = await apiClient.get('/routers')
      return data.data
    },
  })

  const routerIds = routers?.map((r) => r.id) ?? []
  const { status, data: trafficData } = useTrafficSocket({ routerIds })

  const onlineCount = Array.from(trafficData.values()).filter(
    (s) => s.latest?.status === 'online'
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Monitoring</h2>
          <p className="text-sm text-muted-foreground">
            Traffic realtime semua router MikroTik
          </p>
        </div>
        <ConnectionBadge status={status} />
      </div>

      {/* Summary */}
      {routers && routers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile
            label="Total Router"
            value={String(routers.length)}
            icon={Radio}
            color="bg-purple-500/10 text-purple-500"
          />
          <StatTile
            label="Online"
            value={String(onlineCount)}
            icon={Wifi}
            color="bg-green-500/10 text-green-500"
          />
          <StatTile
            label="Offline"
            value={String(routers.length - onlineCount)}
            icon={WifiOff}
            color="bg-red-500/10 text-red-500"
          />
          <StatTile
            label="Update tiap"
            value="5 detik"
            icon={RefreshCw}
            color="bg-blue-500/10 text-blue-500"
          />
        </div>
      )}

      {/* Router cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-64" />
            </Card>
          ))}
        </div>
      ) : routers && routers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {routers.map((router) => {
            const state = trafficData.get(router.id)
            return (
              <RouterCard
                key={router.id}
                router={router}
                history={state?.history ?? []}
              />
            )
          })}
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/30 p-12 text-center">
          <WifiOff className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Belum ada router yang dikonfigurasi.
          </p>
          <Link to="/routers" className="mt-2 inline-block text-sm text-primary hover:underline">
            Tambah router →
          </Link>
        </div>
      )}
    </div>
  )
}
