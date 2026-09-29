import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthQuery } from '@/hooks/useAuthQuery'
import { devicesApi } from '@/services/api/devices'
import { formatDate } from '@/lib/utils'
import type { Device, DeviceStatus, DeviceListParams, PaginatedResponse } from '@/types'

// ─── Config ───────────────────────────────────────────────────────
const STATUS_CFG: Record<DeviceStatus, { label: string; color: string; bg: string; dot: string }> = {
  online:  { label: 'Online',  color: '#4ade80', bg: 'rgba(74,222,128,.1)',   dot: '#4ade80' },
  offline: { label: 'Offline', color: '#f87171', bg: 'rgba(248,113,113,.1)',  dot: '#f87171' },
  unknown: { label: 'Unknown', color: '#94a3b8', bg: 'rgba(148,163,184,.1)',  dot: '#94a3b8' },
}

const PER_PAGE = 20

// ─── Helpers ──────────────────────────────────────────────────────
function StatusBadge({ status }: { status: DeviceStatus }) {
  const c = STATUS_CFG[status]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 9999, background: c.bg, color: c.color, fontSize: 12, fontWeight: 600, fontFamily: 'Inter,sans-serif', whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot, boxShadow: status === 'online' ? `0 0 5px ${c.dot}` : 'none' }} />
      {c.label}
    </span>
  )
}

function RxPowerBar({ rx }: { rx: number | string | null }) {
  if (rx === null || rx === undefined) return <span style={{ color: '#64748b', fontSize: 12 }}>—</span>
  // Pastikan rx adalah number (API bisa return string)
  const rxNum = typeof rx === 'string' ? parseFloat(rx) : rx
  if (isNaN(rxNum)) return <span style={{ color: '#64748b', fontSize: 12 }}>—</span>
  // Typical ONU rx_power: -8 dBm (excellent) to -27 dBm (poor)
  const pct   = Math.max(0, Math.min(100, ((rxNum + 8) / 19) * 100))
  const color = rxNum >= -20 ? '#4ade80' : rxNum >= -24 ? '#f5a524' : '#f87171'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
      <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width .3s' }} />
      </div>
      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color, whiteSpace: 'nowrap', minWidth: 60 }}>
        {rxNum.toFixed(1)} dBm
      </span>
    </div>
  )
}

function SkeletonRow() {
  return (
    <tr>
      {[100, 130, 110, 80, 120, 90, 80].map((w, i) => (
        <td key={i} style={{ padding: '13px 16px' }}>
          <div style={{ height: 12, width: w, borderRadius: 6, background: 'rgba(255,255,255,.06)', animation: 'dv-shimmer 1.4s ease infinite' }} />
        </td>
      ))}
    </tr>
  )
}

function getPaginationRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '…')[] = [1]
  if (current > 3) pages.push('…')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p)
  if (current < total - 2) pages.push('…')
  pages.push(total)
  return pages
}

// ─── Detail Panel (slide-in) ──────────────────────────────────────
function DeviceDetail({ device, onClose, onRefresh, refreshing }: {
  device: Device
  onClose: () => void
  onRefresh: () => void
  refreshing: boolean
}) {
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'GenieACS ID',    value: <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 12, wordBreak: 'break-all' }}>{device.genieacs_device_id}</span> },
    { label: 'Serial Number',  value: device.serial_number ?? '—' },
    { label: 'Brand / Model',  value: device.brand_model ?? '—' },
    { label: 'SSID',           value: device.ssid ?? '—' },
    { label: 'RX Power',       value: <RxPowerBar rx={device.rx_power} /> },
    { label: 'Last Inform',    value: device.last_inform_at ? formatDate(device.last_inform_at) : '—' },
    { label: 'Last Updated',   value: formatDate(device.updated_at) },
    { label: 'Pelanggan',      value: device.customer?.name ?? `#${device.customer_id}` },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#0e0f13', borderLeft: '1px solid rgba(245,165,36,.15)', width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', animation: 'dv-slide-in .2s ease' }}>
        {/* Header */}
        <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(245,165,36,.1)', border: '1px solid rgba(245,165,36,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#f5a524' }}>device_hub</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 15, fontWeight: 600, color: '#e2e2e8', marginBottom: 5 }}>
              {device.brand_model ?? device.serial_number ?? device.genieacs_device_id}
            </div>
            <StatusBadge status={device.last_status} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={onRefresh} disabled={refreshing} title="Refresh dari GenieACS"
              style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(245,165,36,.2)', background: 'rgba(245,165,36,.08)', color: '#f5a524', cursor: refreshing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: refreshing ? 0.6 : 1 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 15, animation: refreshing ? 'dv-spin .8s linear infinite' : 'none' }}>refresh</span>
            </button>
            <button onClick={onClose}
              style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
            </button>
          </div>
        </div>

        {/* Detail rows */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {rows.map(r => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
              <div style={{ width: 120, flexShrink: 0, fontFamily: 'JetBrains Mono,monospace', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: '#64748b' }}>{r.label}</div>
              <div style={{ flex: 1, fontSize: 13, color: '#d7c3ae', fontFamily: 'Inter,sans-serif' }}>{r.value}</div>
            </div>
          ))}
        </div>

        {refreshing && (
          <div style={{ padding: '12px 22px', background: 'rgba(245,165,36,.05)', borderTop: '1px solid rgba(245,165,36,.1)', fontSize: 12, color: '#f5a524', fontFamily: 'Inter,sans-serif', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(245,165,36,.3)', borderTopColor: '#f5a524', animation: 'dv-spin .7s linear infinite' }} />
            Mengirim perintah refresh ke GenieACS…
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
export default function DevicesPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | ''>('')
  const [page, setPage]       = useState(1)
  const [selected, setSelected] = useState<Device | null>(null)
  const [refreshingId, setRefreshingId] = useState<number | null>(null)

  const params: DeviceListParams = {
    ...(statusFilter ? { status: statusFilter } : {}),
    page, per_page: PER_PAGE,
  }

  const { data, isLoading, isError } = useAuthQuery<PaginatedResponse<Device>>({
    queryKey: ['devices', params],
    queryFn: () => devicesApi.list(params),
  })

  const refreshMutation = useMutation({
    mutationFn: (id: number) => devicesApi.refresh(id),
    onMutate: (id) => setRefreshingId(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['devices'] })
      setRefreshingId(null)
    },
  })

  const devices    = data?.data ?? []
  const meta       = data?.meta
  const totalPages = meta?.last_page ?? 1
  const totalItems = meta?.total ?? 0
  const rangeStart = totalItems === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const rangeEnd   = Math.min(page * PER_PAGE, totalItems)

  const onlineCount  = devices.filter(d => d.last_status === 'online').length
  const offlineCount = devices.filter(d => d.last_status === 'offline').length

  return (
    <>
      <style>{`
        @keyframes dv-shimmer{0%,100%{opacity:.5}50%{opacity:1}}
        @keyframes dv-spin{to{transform:rotate(360deg)}}
        @keyframes dv-slide-in{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}
        .dv-wrap{max-width:1280px;margin:0 auto;padding:32px 32px 64px}
        .dv-header{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:24px}
        .dv-title{font-family:'Space Grotesk',sans-serif;font-size:26px;font-weight:700;color:#e2e2e8;display:flex;align-items:center;gap:12px}
        .dv-icon{width:42px;height:42px;border-radius:12px;background:rgba(245,165,36,.12);border:1px solid rgba(245,165,36,.25);display:flex;align-items:center;justify-content:center}
        .dv-subtitle{font-size:14px;color:#94a3b8;margin-top:4px}
        .dv-stats{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}
        .dv-stat{display:flex;align-items:center;gap:8px;padding:10px 16px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;font-size:13px;color:#94a3b8;font-family:'Inter',sans-serif}
        .dv-stat strong{color:#e2e2e8;font-weight:600}
        .dv-toolbar{display:flex;gap:10px;margin-bottom:18px;align-items:center;flex-wrap:wrap}
        .dv-select{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px 14px;color:#e2e2e8;font-size:13px;font-family:'Inter',sans-serif;cursor:pointer;outline:none}
        .dv-select:focus{border-color:rgba(245,165,36,.4)}.dv-select option{background:#1e2024}
        .dv-reset{display:inline-flex;align-items:center;gap:5px;padding:9px 14px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:#94a3b8;font-size:13px;cursor:pointer;font-family:'Inter',sans-serif}
        .dv-reset:hover{color:#e2e2e8}
        .dv-card{background:rgba(18,19,23,.8);border:1px solid rgba(245,165,36,.1);border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,.3)}
        table.dv-table{width:100%;border-collapse:collapse;min-width:780px}
        .dv-table thead tr{background:rgba(255,255,255,.03);border-bottom:1px solid rgba(255,255,255,.06)}
        .dv-table th{padding:12px 16px;text-align:left;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;letter-spacing:.13em;text-transform:uppercase;color:#64748b;white-space:nowrap}
        .dv-table tbody tr{border-bottom:1px solid rgba(255,255,255,.04);transition:background .12s;cursor:pointer}
        .dv-table tbody tr:last-child{border-bottom:none}
        .dv-table tbody tr:hover{background:rgba(245,165,36,.04)}
        .dv-table td{padding:12px 16px;font-size:13px;color:#e2e2e8;font-family:'Inter',sans-serif;vertical-align:middle}
        .dv-footer{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:14px 18px;border-top:1px solid rgba(255,255,255,.06)}
        .dv-footer-info{font-size:13px;color:#64748b;font-family:'Inter',sans-serif}
        .dv-pg-btn{min-width:34px;height:34px;padding:0 8px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:#d7c3ae;font-size:13px;font-family:'Inter',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center}
        .dv-pg-btn:hover:not(:disabled){border-color:rgba(245,165,36,.3);color:#f5a524}
        .dv-pg-btn.active{background:rgba(245,165,36,.15);border-color:rgba(245,165,36,.4);color:#f5a524;font-weight:600}
        .dv-pg-btn:disabled{opacity:.3;cursor:not-allowed}
      `}</style>

      <div className="dv-wrap">
        {/* Header */}
        <div className="dv-header">
          <div>
            <div className="dv-title">
              <div className="dv-icon"><span className="material-symbols-outlined" style={{ fontSize: 22, color: '#f5a524' }}>device_hub</span></div>
              Perangkat CPE/ONU
            </div>
            <div className="dv-subtitle">{isLoading ? 'Memuat data…' : `${totalItems} perangkat terdaftar`}</div>
          </div>
        </div>

        {/* Stats */}
        {!isLoading && devices.length > 0 && (
          <div className="dv-stats">
            <div className="dv-stat">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
              <span><strong>{onlineCount}</strong> online</span>
            </div>
            <div className="dv-stat">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171' }} />
              <span><strong>{offlineCount}</strong> offline</span>
            </div>
            <div className="dv-stat">
              <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#94a3b8' }}>help</span>
              <span><strong>{devices.length - onlineCount - offlineCount}</strong> unknown</span>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="dv-toolbar">
          <select className="dv-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value as DeviceStatus | ''); setPage(1) }}>
            <option value="">Semua Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="unknown">Unknown</option>
          </select>
          {statusFilter && (
            <button className="dv-reset" onClick={() => { setStatusFilter(''); setPage(1) }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>filter_alt_off</span>Reset
            </button>
          )}
        </div>

        {/* Table */}
        <div className="dv-card">
          {isError ? (
            <div style={{ padding: '60px 32px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#f87171', display: 'block', marginBottom: 10 }}>wifi_off</span>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e2e8', fontFamily: 'Space Grotesk,sans-serif', marginBottom: 5 }}>Gagal memuat data</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>Periksa koneksi atau refresh halaman</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="dv-table" aria-label="Tabel Perangkat">
                <thead>
                  <tr>
                    <th>Serial / Model</th>
                    <th>Pelanggan</th>
                    <th>SSID</th>
                    <th>RX Power</th>
                    <th>Last Inform</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                    : devices.length === 0
                      ? (
                        <tr><td colSpan={7}>
                          <div style={{ padding: '60px 32px', textAlign: 'center' }}>
                            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#64748b' }}>{statusFilter ? 'search_off' : 'device_hub'}</span>
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e2e8', fontFamily: 'Space Grotesk,sans-serif', marginBottom: 5 }}>{statusFilter ? 'Tidak ada hasil' : 'Belum ada perangkat'}</div>
                            <div style={{ fontSize: 13, color: '#64748b' }}>
                              {statusFilter ? 'Coba ubah filter' : 'Perangkat akan muncul setelah sync dari GenieACS'}
                            </div>
                          </div>
                        </td></tr>
                      )
                      : devices.map(d => (
                        <tr key={d.id} onClick={() => setSelected(d)}>
                          <td>
                            <div style={{ fontWeight: 500, color: '#e2e2e8' }}>{d.brand_model ?? '—'}</div>
                            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: '#64748b', marginTop: 1 }}>{d.serial_number ?? d.genieacs_device_id}</div>
                          </td>
                          <td>
                            <span style={{ fontSize: 13, color: '#d7c3ae' }}>{d.customer?.name ?? `#${d.customer_id}`}</span>
                          </td>
                          <td>
                            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 12, color: d.ssid ? '#d7c3ae' : '#64748b' }}>{d.ssid ?? '—'}</span>
                          </td>
                          <td><RxPowerBar rx={d.rx_power} /></td>
                          <td>
                            <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                              {d.last_inform_at ? formatDate(d.last_inform_at) : '—'}
                            </span>
                          </td>
                          <td><StatusBadge status={d.last_status} /></td>
                          <td>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <button
                                onClick={e => { e.stopPropagation(); refreshMutation.mutate(d.id) }}
                                disabled={refreshingId === d.id}
                                title="Refresh dari GenieACS"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, cursor: 'pointer', background: 'rgba(245,165,36,.08)', border: '1px solid rgba(245,165,36,.2)', color: '#f5a524', fontSize: 11, fontWeight: 600, fontFamily: 'Inter,sans-serif', opacity: refreshingId === d.id ? 0.6 : 1, whiteSpace: 'nowrap' }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 13, animation: refreshingId === d.id ? 'dv-spin .8s linear infinite' : 'none' }}>refresh</span>
                                Refresh
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && !isError && totalItems > 0 && (
            <div className="dv-footer">
              <span className="dv-footer-info">{rangeStart}–{rangeEnd} dari {totalItems} perangkat</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button className="dv-pg-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Sebelumnya">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span>
                </button>
                {getPaginationRange(page, totalPages).map((p, i) =>
                  p === '…'
                    ? <span key={`e${i}`} style={{ color: '#64748b', padding: '0 4px', fontSize: 13 }}>…</span>
                    : <button key={p} className={`dv-pg-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p as number)}>{p}</button>
                )}
                <button className="dv-pg-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} aria-label="Berikutnya">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <DeviceDetail
          device={selected}
          onClose={() => setSelected(null)}
          onRefresh={() => refreshMutation.mutate(selected.id)}
          refreshing={refreshingId === selected.id}
        />
      )}
    </>
  )
}
