import { useState } from 'react'
import { Link } from 'react-router'
import { TrafficChart } from '@/components/charts/TrafficChart'
import { useTrafficSocket } from '@/hooks/useTrafficSocket'
import { useAuthQuery } from '@/hooks/useAuthQuery'
import { apiClient } from '@/services/api/client'
import { formatBps } from '@/lib/utils'
import type { MikrotikRouter } from '@/types'
import type { RouterSnapshot } from '@/types/realtime'

// ─── Router Card ──────────────────────────────────────────────────
function RouterCard({ router, history }: { router: MikrotikRouter; history: RouterSnapshot[] }) {
  const [selectedIface, setSelectedIface] = useState<string | null>(null)

  const latest    = history[history.length - 1]
  const isOnline  = latest?.status === 'online'
  const interfaces = latest?.interfaces ?? []

  const activeIface = selectedIface
    ?? interfaces.find(i => !i.name.startsWith('lo') && !i.name.startsWith('bridge'))?.name
    ?? interfaces[0]?.name
    ?? null

  const ifd = interfaces.find(i => i.name === activeIface)

  // Total RX/TX across all interfaces for summary
  const totalRx = interfaces.reduce((s, i) => s + i.rx_bps, 0)
  const totalTx = interfaces.reduce((s, i) => s + i.tx_bps, 0)

  return (
    <div style={{
      background: 'rgba(18,19,23,.85)',
      border: `1px solid ${isOnline ? 'rgba(74,222,128,.2)' : 'rgba(248,113,113,.15)'}`,
      borderRadius: 18,
      overflow: 'hidden',
      boxShadow: isOnline ? '0 4px 32px rgba(74,222,128,.06)' : '0 4px 24px rgba(0,0,0,.3)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Card header */}
      <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: isOnline ? 'rgba(74,222,128,.1)' : 'rgba(248,113,113,.1)', border: `1px solid ${isOnline ? 'rgba(74,222,128,.25)' : 'rgba(248,113,113,.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: isOnline ? '#4ade80' : '#f87171' }}>
              {isOnline ? 'wifi' : 'wifi_off'}
            </span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 15, fontWeight: 600, color: '#e2e2e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{router.name}</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: '#64748b', marginTop: 1 }}>{router.host}</div>
          </div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 9999, background: isOnline ? 'rgba(74,222,128,.1)' : 'rgba(248,113,113,.1)', color: isOnline ? '#4ade80' : '#f87171', fontSize: 11, fontWeight: 600, fontFamily: 'Inter,sans-serif', flexShrink: 0 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: isOnline ? '#4ade80' : '#f87171', boxShadow: isOnline ? '0 0 6px #4ade80' : 'none' }} />
          {latest ? (isOnline ? 'Online' : 'Offline') : 'Waiting…'}
        </span>
      </div>

      {/* RX / TX summary */}
      {isOnline && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'rgba(255,255,255,.04)' }}>
          <div style={{ padding: '14px 20px', background: 'rgba(18,19,23,.9)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#f5a524' }}>arrow_downward</span>
              <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: '#64748b' }}>Download (RX)</span>
            </div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 20, fontWeight: 700, color: '#f5a524', lineHeight: 1 }}>
              {formatBps(ifd ? ifd.rx_bps : totalRx)}
            </div>
          </div>
          <div style={{ padding: '14px 20px', background: 'rgba(18,19,23,.9)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#40c5e5' }}>arrow_upward</span>
              <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: '#64748b' }}>Upload (TX)</span>
            </div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 20, fontWeight: 700, color: '#40c5e5', lineHeight: 1 }}>
              {formatBps(ifd ? ifd.tx_bps : totalTx)}
            </div>
          </div>
        </div>
      )}

      {/* Interface selector */}
      {interfaces.length > 0 && (
        <div style={{ padding: '12px 20px 0', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {interfaces.map(iface => (
            <button
              key={iface.name}
              onClick={() => setSelectedIface(iface.name)}
              style={{
                padding: '3px 10px', borderRadius: 7, cursor: 'pointer',
                fontFamily: 'JetBrains Mono,monospace', fontSize: 11,
                border: `1px solid ${activeIface === iface.name ? 'rgba(245,165,36,.5)' : 'rgba(255,255,255,.08)'}`,
                background: activeIface === iface.name ? 'rgba(245,165,36,.12)' : 'rgba(255,255,255,.04)',
                color: activeIface === iface.name ? '#f5a524' : '#64748b',
                transition: 'all .15s',
              }}
            >
              {iface.name}
            </button>
          ))}
        </div>
      )}

      {/* Chart */}
      <div style={{ padding: '12px 16px 16px', flex: 1 }}>
        {activeIface && history.length > 1 ? (
          <TrafficChart history={history} interfaceName={activeIface} height={160} />
        ) : (
          <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#3f4a57' }}>
              {!isOnline && latest ? 'wifi_off' : 'show_chart'}
            </span>
            <span style={{ fontSize: 12, color: '#3f4a57', fontFamily: 'Inter,sans-serif' }}>
              {!isOnline && latest ? 'Router offline' : 'Menunggu data…'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
export default function MonitoringPage() {
  const { data: routers, isLoading } = useAuthQuery<MikrotikRouter[]>({
    queryKey: ['routers'],
    queryFn: async () => {
      const { data } = await apiClient.get('/routers')
      return data.data
    },
  })

  const routerIds = routers?.map(r => r.id) ?? []
  const { status, data: trafficData } = useTrafficSocket({ routerIds })

  const onlineCount = Array.from(trafficData.values()).filter(s => s.latest?.status === 'online').length
  const totalRouters = routers?.length ?? 0

  const wsColors = {
    connected:    { color: '#4ade80', bg: 'rgba(74,222,128,.1)',   label: 'Live' },
    connecting:   { color: '#f5a524', bg: 'rgba(245,165,36,.1)',   label: 'Connecting…' },
    disconnected: { color: '#f87171', bg: 'rgba(248,113,113,.1)',  label: 'Disconnected' },
  }
  const wsCfg = wsColors[status]

  return (
    <>
      <style>{`
        @keyframes mn-shimmer{0%,100%{opacity:.5}50%{opacity:1}}
        .mn-wrap{max-width:1280px;margin:0 auto;padding:32px 32px 64px}
        .mn-header{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:28px}
        .mn-title{font-family:'Space Grotesk',sans-serif;font-size:26px;font-weight:700;color:#e2e2e8;display:flex;align-items:center;gap:12px}
        .mn-icon{width:42px;height:42px;border-radius:12px;background:rgba(245,165,36,.12);border:1px solid rgba(245,165,36,.25);display:flex;align-items:center;justify-content:center}
        .mn-subtitle{font-size:14px;color:#94a3b8;margin-top:4px}
        .mn-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:28px}
        .mn-stat{background:rgba(18,19,23,.85);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:16px 18px;display:flex;align-items:center;gap:12px}
        .mn-stat-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .mn-stat-val{font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700;color:#e2e2e8;line-height:1}
        .mn-stat-lbl{font-size:11px;color:#64748b;margin-top:3px;font-family:'Inter',sans-serif}
        .mn-grid{display:grid;gap:20px;grid-template-columns:repeat(auto-fill,minmax(380px,1fr))}
        .mn-skel{background:rgba(18,19,23,.85);border:1px solid rgba(255,255,255,.07);border-radius:18px;height:360px;animation:mn-shimmer 1.4s ease infinite}
        .mn-empty{background:rgba(18,19,23,.8);border:1px solid rgba(245,165,36,.1);border-radius:16px;padding:72px 32px;text-align:center}
      `}</style>

      <div className="mn-wrap">
        {/* Header */}
        <div className="mn-header">
          <div>
            <div className="mn-title">
              <div className="mn-icon"><span className="material-symbols-outlined" style={{ fontSize: 22, color: '#f5a524' }}>monitoring</span></div>
              Monitoring
            </div>
            <div className="mn-subtitle">Traffic realtime semua router MikroTik</div>
          </div>
          {/* WS status */}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: wsCfg.bg, color: wsCfg.color, fontSize: 12, fontWeight: 600, fontFamily: 'Inter,sans-serif', border: `1px solid ${wsCfg.color}30` }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: wsCfg.color, boxShadow: status === 'connected' ? `0 0 6px ${wsCfg.color}` : 'none' }} />
            {wsCfg.label}
          </span>
        </div>

        {/* Stats bar */}
        {!isLoading && totalRouters > 0 && (
          <div className="mn-stats">
            {[
              { label: 'Total Router',  value: String(totalRouters),               icon: 'router',   color: '#c084fc', bg: 'rgba(192,132,252,.1)' },
              { label: 'Online',        value: String(onlineCount),                icon: 'wifi',     color: '#4ade80', bg: 'rgba(74,222,128,.1)'  },
              { label: 'Offline',       value: String(totalRouters - onlineCount), icon: 'wifi_off', color: '#f87171', bg: 'rgba(248,113,113,.1)' },
              { label: 'Update tiap',   value: '5 detik',                          icon: 'refresh',  color: '#60a5fa', bg: 'rgba(96,165,250,.1)'  },
            ].map(s => (
              <div key={s.label} className="mn-stat">
                <div className="mn-stat-icon" style={{ background: s.bg, border: `1px solid ${s.color}30` }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: s.color }}>{s.icon}</span>
                </div>
                <div>
                  <div className="mn-stat-val" style={{ color: s.color }}>{s.value}</div>
                  <div className="mn-stat-lbl">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="mn-grid">
            {[1, 2].map(i => <div key={i} className="mn-skel" />)}
          </div>
        ) : !routers || routers.length === 0 ? (
          <div className="mn-empty">
            <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#3f4a57', display: 'block', marginBottom: 14 }}>wifi_off</span>
            <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 17, fontWeight: 600, color: '#e2e2e8', marginBottom: 8 }}>Belum ada router yang dikonfigurasi</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Tambahkan router MikroTik untuk mulai monitoring traffic realtime</div>
            <Link to="/routers" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: '#f5a524', color: '#000', fontSize: 13, fontWeight: 600, fontFamily: 'Inter,sans-serif', textDecoration: 'none' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_circle</span>
              Tambah Router
            </Link>
          </div>
        ) : (
          <div className="mn-grid">
            {routers.map(router => {
              const state = trafficData.get(router.id)
              return (
                <RouterCard key={router.id} router={router} history={state?.history ?? []} />
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
