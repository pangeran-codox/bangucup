import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { useAuthQuery } from '@/hooks/useAuthQuery'
import { routersApi } from '@/services/api/routers'
import { formatBps } from '@/lib/utils'
import type { MikrotikRouter, RouterPayload, RouterTrafficResponse } from '@/types'
import type { InterfaceTraffic } from '@/types/realtime'

// ─── Form Modal ───────────────────────────────────────────────────
const EMPTY_FORM: RouterPayload = {
  name: '', host: '', api_port: 8728, username: 'admin', password: '', is_active: true, notes: '',
}

function RouterFormModal({ open, onClose, router }: {
  open: boolean; onClose: () => void; router?: MikrotikRouter | null
}) {
  const qc     = useQueryClient()
  const isEdit = !!router
  const nameRef = useRef<HTMLInputElement>(null)
  const [form, setForm]     = useState<RouterPayload>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPwd, setShowPwd] = useState(false)

  useEffect(() => {
    if (router) {
      setForm({ name: router.name, host: router.host, api_port: router.api_port ?? 8728, username: router.username, password: '', is_active: router.is_active, notes: router.notes ?? '' })
    } else {
      setForm(EMPTY_FORM)
    }
    setErrors({})
    setShowPwd(false)
  }, [router, open])

  useEffect(() => { if (open) setTimeout(() => nameRef.current?.focus(), 80) }, [open])

  const saveMutation = useMutation({
    mutationFn: (p: RouterPayload) => isEdit ? routersApi.update(router!.id, p) : routersApi.create(p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['routers'] }); onClose() },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { errors?: Record<string, string[]> } } }
      if (e?.response?.data?.errors) {
        const flat: Record<string, string> = {}
        Object.entries(e.response.data.errors).forEach(([k, v]) => { flat[k] = v[0] })
        setErrors(flat)
      }
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.name.trim())     errs.name     = 'Nama wajib diisi'
    if (!form.host.trim())     errs.host     = 'Host/IP wajib diisi'
    if (!form.username.trim()) errs.username = 'Username wajib diisi'
    if (!isEdit && !form.password.trim()) errs.password = 'Password wajib diisi saat tambah router baru'
    if (Object.keys(errs).length) { setErrors(errs); return }
    // Kalau edit dan password kosong, jangan kirim password
    const payload: RouterPayload = { ...form }
    if (isEdit && !form.password) delete (payload as Partial<RouterPayload>).password
    saveMutation.mutate(payload)
  }

  function f<K extends keyof RouterPayload>(key: K, val: RouterPayload[K]) {
    setForm(p => ({ ...p, [key]: val }))
    if (errors[key]) setErrors(p => { const n = { ...p }; delete n[key]; return n })
  }

  if (!open) return null
  const busy = saveMutation.isPending

  return (
    <>
      <style>{`
        .rfm-ov{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.72);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;animation:rfm-fi .15s ease}
        @keyframes rfm-fi{from{opacity:0}to{opacity:1}}
        .rfm-panel{background:#121317;border:1px solid rgba(245,165,36,.2);border-radius:20px;width:100%;max-width:540px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,.7);animation:rfm-su .18s ease}
        @keyframes rfm-su{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
        .rfm-hd{display:flex;align-items:center;justify-content:space-between;padding:22px 26px 18px;border-bottom:1px solid rgba(245,165,36,.1)}
        .rfm-title{font-family:'Space Grotesk',sans-serif;font-size:17px;font-weight:600;color:#e2e2e8;display:flex;align-items:center;gap:10px}
        .rfm-x{width:30px;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:#d7c3ae;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s}
        .rfm-x:hover{background:rgba(255,255,255,.1)}
        .rfm-body{padding:22px 26px 8px;display:flex;flex-direction:column;gap:16px}
        .rfm-row{display:grid;gap:12px}.rfm-row.two{grid-template-columns:1fr 1fr}
        .rfm-field{display:flex;flex-direction:column;gap:5px}
        .rfm-lbl{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#d7c3ae}
        .rfm-inp,.rfm-ta{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px 13px;color:#e2e2e8;font-family:'Inter',sans-serif;font-size:14px;width:100%;outline:none;transition:border-color .15s;box-sizing:border-box}
        .rfm-inp:focus,.rfm-ta:focus{border-color:rgba(245,165,36,.5);box-shadow:0 0 0 3px rgba(245,165,36,.08)}
        .rfm-inp.e,.rfm-ta.e{border-color:rgba(255,100,100,.6)}
        .rfm-ta{resize:vertical;min-height:64px}
        .rfm-err{font-size:11px;color:#ff8080;margin-top:2px}
        .rfm-hint{font-size:11px;color:rgba(215,195,174,.45);margin-top:2px}
        .rfm-pwd-wrap{position:relative}
        .rfm-pwd-eye{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:#64748b;cursor:pointer;display:flex;align-items:center;padding:4px}
        .rfm-pwd-eye:hover{color:#d7c3ae}
        .rfm-toggle{display:flex;align-items:center;gap:10px;padding:11px 14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;cursor:pointer;user-select:none}
        .rfm-knob{width:38px;height:20px;border-radius:10px;transition:background .2s;position:relative;flex-shrink:0}
        .rfm-knob::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .2s}
        .rfm-knob.on{background:#f5a524}.rfm-knob.on::after{transform:translateX(18px)}
        .rfm-knob.off{background:rgba(255,255,255,.15)}
        .rfm-divider{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(215,195,174,.35);display:flex;align-items:center;gap:10px}
        .rfm-divider::before,.rfm-divider::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.05)}
        .rfm-footer{display:flex;gap:10px;justify-content:flex-end;padding:18px 26px 22px}
        .rfm-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:10px;font-family:'Inter',sans-serif;font-size:13px;font-weight:500;cursor:pointer;border:none;transition:opacity .15s,transform .1s}
        .rfm-btn:active{transform:scale(.97)}.rfm-btn:disabled{opacity:.5;cursor:not-allowed}
        .rfm-btn-c{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#d7c3ae}.rfm-btn-c:hover:not(:disabled){background:rgba(255,255,255,.1)}
        .rfm-btn-s{background:#f5a524;color:#000;font-weight:600;box-shadow:0 0 14px rgba(245,165,36,.3)}.rfm-btn-s:hover:not(:disabled){opacity:.88}
        .rfm-spin{width:13px;height:13px;border-radius:50%;border:2px solid rgba(0,0,0,.3);border-top-color:#000;animation:rfm-spin .6s linear infinite}
        @keyframes rfm-spin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="rfm-ov" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="rfm-panel" role="dialog" aria-modal="true">
          <div className="rfm-hd">
            <div className="rfm-title">
              <span className="material-symbols-outlined" style={{ fontSize: 19, color: '#f5a524' }}>{isEdit ? 'edit' : 'add_circle'}</span>
              {isEdit ? 'Edit Router' : 'Tambah Router'}
            </div>
            <button className="rfm-x" onClick={onClose}><span className="material-symbols-outlined" style={{ fontSize: 17 }}>close</span></button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="rfm-body">
              {/* Nama */}
              <div className="rfm-field">
                <label className="rfm-lbl">Nama Router *</label>
                <input ref={nameRef} className={`rfm-inp${errors.name ? ' e' : ''}`} value={form.name} onChange={e => f('name', e.target.value)} placeholder="Contoh: Router Utama Kantor" maxLength={100} disabled={busy} />
                {errors.name && <span className="rfm-err">{errors.name}</span>}
              </div>

              {/* Host & Port */}
              <div className="rfm-row two">
                <div className="rfm-field">
                  <label className="rfm-lbl">Host / IP *</label>
                  <input className={`rfm-inp${errors.host ? ' e' : ''}`} value={form.host} onChange={e => f('host', e.target.value)} placeholder="192.168.1.1" disabled={busy} />
                  {errors.host && <span className="rfm-err">{errors.host}</span>}
                </div>
                <div className="rfm-field">
                  <label className="rfm-lbl">API Port</label>
                  <input className="rfm-inp" type="number" min={1} max={65535} value={form.api_port ?? 8728} onChange={e => f('api_port', Number(e.target.value))} disabled={busy} />
                  <span className="rfm-hint">Default: 8728</span>
                </div>
              </div>

              <div className="rfm-divider">Kredensial</div>

              {/* Username & Password */}
              <div className="rfm-row two">
                <div className="rfm-field">
                  <label className="rfm-lbl">Username *</label>
                  <input className={`rfm-inp${errors.username ? ' e' : ''}`} value={form.username} onChange={e => f('username', e.target.value)} placeholder="admin" disabled={busy} />
                  {errors.username && <span className="rfm-err">{errors.username}</span>}
                </div>
                <div className="rfm-field">
                  <label className="rfm-lbl">Password {!isEdit && '*'}</label>
                  <div className="rfm-pwd-wrap">
                    <input
                      className={`rfm-inp${errors.password ? ' e' : ''}`}
                      type={showPwd ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => f('password', e.target.value)}
                      placeholder={isEdit ? 'Kosongkan jika tidak diubah' : '••••••••'}
                      disabled={busy}
                      style={{ paddingRight: 36 }}
                    />
                    <button type="button" className="rfm-pwd-eye" onClick={() => setShowPwd(v => !v)} tabIndex={-1}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{showPwd ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                  {errors.password && <span className="rfm-err">{errors.password}</span>}
                </div>
              </div>

              {/* Notes */}
              <div className="rfm-field">
                <label className="rfm-lbl">Catatan</label>
                <textarea className="rfm-ta" value={form.notes ?? ''} onChange={e => f('notes', e.target.value)} placeholder="Lokasi, keterangan, dll." disabled={busy} />
              </div>

              {/* Toggle aktif */}
              <div className="rfm-toggle" role="switch" aria-checked={form.is_active}
                onClick={() => !busy && f('is_active', !form.is_active)}
                tabIndex={0} onKeyDown={e => e.key === ' ' && !busy && f('is_active', !form.is_active)}>
                <div className={`rfm-knob ${form.is_active ? 'on' : 'off'}`} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e2e8', fontFamily: 'Inter,sans-serif' }}>{form.is_active ? 'Router Aktif' : 'Router Nonaktif'}</div>
                  <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'Inter,sans-serif', marginTop: 1 }}>
                    {form.is_active ? 'Akan di-monitor oleh collector' : 'Tidak akan di-poll oleh collector'}
                  </div>
                </div>
              </div>

              {/* Server error */}
              {saveMutation.isError && !Object.keys(errors).length && (
                <div style={{ background: 'rgba(255,80,80,.08)', border: '1px solid rgba(255,80,80,.25)', borderRadius: 10, padding: '10px 14px', color: '#ff8080', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>error</span>
                  {(saveMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Terjadi kesalahan, coba lagi.'}
                </div>
              )}
            </div>

            <div className="rfm-footer">
              <button type="button" className="rfm-btn rfm-btn-c" onClick={onClose} disabled={busy}>Batal</button>
              <button type="submit" className="rfm-btn rfm-btn-s" disabled={busy}>
                {busy ? <><div className="rfm-spin" />Menyimpan…</> : <><span className="material-symbols-outlined" style={{ fontSize: 15 }}>save</span>{isEdit ? 'Simpan' : 'Tambah Router'}</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

// ─── Delete Confirm ───────────────────────────────────────────────
function DeleteConfirm({ router, onConfirm, onCancel, isPending }: {
  router: MikrotikRouter; onConfirm: () => void; onCancel: () => void; isPending: boolean
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,.78)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div style={{ background: '#121317', border: '1px solid rgba(255,80,80,.25)', borderRadius: 18, padding: '26px 22px', width: '100%', maxWidth: 380, boxShadow: '0 24px 80px rgba(0,0,0,.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,80,80,.1)', border: '1px solid rgba(255,80,80,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#ff6060' }}>delete</span>
          </div>
          <div>
            <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontWeight: 600, fontSize: 15, color: '#e2e2e8' }}>Hapus Router</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>Tidak dapat dibatalkan</div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: '#d7c3ae', lineHeight: 1.6, marginBottom: 20 }}>
          Yakin hapus router <strong style={{ color: '#e2e2e8' }}>{router.name}</strong>?
          Semua langganan yang terhubung ke router ini perlu dikonfigurasi ulang.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} disabled={isPending} style={{ padding: '8px 16px', borderRadius: 9, cursor: 'pointer', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#d7c3ae', fontSize: 13, fontFamily: 'Inter,sans-serif' }}>Batal</button>
          <button onClick={onConfirm} disabled={isPending} style={{ padding: '8px 16px', borderRadius: 9, cursor: 'pointer', background: '#dc2626', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'Inter,sans-serif', opacity: isPending ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            {isPending ? <><div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'rfm-spin .6s linear infinite' }} />Menghapus…</> : <><span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>Hapus</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Traffic Panel ────────────────────────────────────────────────
function TrafficPanel({ routerId, onClose }: { routerId: number; onClose: () => void }) {
  const token       = useAuthStore(s => s.token)
  const hasHydrated = useAuthStore(s => s._hasHydrated)

  const { data, isLoading, isError, refetch, isFetching } = useQuery<RouterTrafficResponse>({
    queryKey: ['router-traffic', routerId],
    queryFn: () => routersApi.traffic(routerId),
    enabled: hasHydrated && !!token,
    staleTime: 0,
    refetchInterval: 5000,  // auto-refresh tiap 5 detik
  })

  const interfaces: InterfaceTraffic[] = data?.interfaces ?? []

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 65, background: 'rgba(0,0,0,.78)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#121317', border: '1px solid rgba(245,165,36,.2)', borderRadius: 20, width: '100%', maxWidth: 600, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,.7)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid rgba(245,165,36,.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#f5a524' }}>monitoring</span>
            <div>
              <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 16, fontWeight: 600, color: '#e2e2e8' }}>Live Traffic</div>
              {data && <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono,monospace', marginTop: 1 }}>{data.router} · auto-refresh 5s</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isFetching && <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(245,165,36,.3)', borderTopColor: '#f5a524', animation: 'rfm-spin .7s linear infinite' }} />}
            <button onClick={() => refetch()} title="Refresh sekarang" style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
            </button>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', color: '#d7c3ae', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,.04)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ height: 12, width: '40%', borderRadius: 6, background: 'rgba(255,255,255,.08)', animation: 'bl-shimmer 1.4s ease infinite' }} />
                <div style={{ height: 8, width: '80%', borderRadius: 6, background: 'rgba(255,255,255,.06)', animation: 'bl-shimmer 1.4s ease infinite' }} />
                <div style={{ height: 8, width: '70%', borderRadius: 6, background: 'rgba(255,255,255,.06)', animation: 'bl-shimmer 1.4s ease infinite' }} />
              </div>
            ))
          ) : isError ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#f87171', display: 'block', marginBottom: 10 }}>wifi_off</span>
              <div style={{ fontSize: 14, color: '#f87171', fontFamily: 'Inter,sans-serif' }}>Gagal mengambil data traffic</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontFamily: 'Inter,sans-serif' }}>Router mungkin offline atau tidak bisa dijangkau</div>
            </div>
          ) : interfaces.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: 13, fontFamily: 'Inter,sans-serif' }}>Tidak ada interface yang ditemukan</div>
          ) : (
            interfaces.map(iface => {
              const maxBps = Math.max(iface.rx_bps, iface.tx_bps, 1)
              return (
                <div key={iface.name} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: '16px 18px' }}>
                  {/* Interface name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#64748b' }}>cable</span>
                    <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 13, fontWeight: 600, color: '#d7c3ae' }}>{iface.name}</span>
                  </div>

                  {/* RX */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f5a524', display: 'inline-block' }} />
                        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: '#94a3b8', letterSpacing: '.1em', textTransform: 'uppercase' }}>RX</span>
                      </div>
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 13, fontWeight: 600, color: '#f5a524' }}>{formatBps(iface.rx_bps)}</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, (iface.rx_bps / maxBps) * 100)}%`, background: 'linear-gradient(90deg,#f5a524,#fbbf24)', borderRadius: 3, transition: 'width .4s ease' }} />
                    </div>
                  </div>

                  {/* TX */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#40c5e5', display: 'inline-block' }} />
                        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: '#94a3b8', letterSpacing: '.1em', textTransform: 'uppercase' }}>TX</span>
                      </div>
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 13, fontWeight: 600, color: '#40c5e5' }}>{formatBps(iface.tx_bps)}</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, (iface.tx_bps / maxBps) * 100)}%`, background: 'linear-gradient(90deg,#40c5e5,#67e8f9)', borderRadius: 3, transition: 'width .4s ease' }} />
                    </div>
                  </div>

                  {/* PPS */}
                  <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                    <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: '#64748b' }}>RX {iface.rx_pps} pps</span>
                    <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: '#64748b' }}>TX {iface.tx_pps} pps</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Router Card ──────────────────────────────────────────────────
function RouterCard({ router, onEdit, onDelete, onTraffic, testing, testResult }: {
  router: MikrotikRouter
  onEdit: () => void
  onDelete: () => void
  onTraffic: () => void
  testing: boolean
  testResult: 'online' | 'offline' | null
}) {
  const displayStatus = testResult ?? (router.is_active ? 'unknown' : 'inactive')
  const statusMap = {
    online:   { label: 'Online',    color: '#4ade80', dot: '#4ade80', bg: 'rgba(74,222,128,.08)'  },
    offline:  { label: 'Offline',   color: '#f87171', dot: '#f87171', bg: 'rgba(248,113,113,.08)' },
    unknown:  { label: 'Unknown',   color: '#94a3b8', dot: '#94a3b8', bg: 'rgba(148,163,184,.08)' },
    inactive: { label: 'Nonaktif',  color: '#64748b', dot: '#64748b', bg: 'rgba(100,116,139,.08)' },
  }
  const sc = statusMap[displayStatus]

  return (
    <div style={{
      background: 'rgba(18,19,23,.85)',
      border: `1px solid ${router.is_active ? 'rgba(245,165,36,.15)' : 'rgba(255,255,255,.06)'}`,
      borderRadius: 16, padding: 22,
      display: 'flex', flexDirection: 'column', gap: 0,
      boxShadow: router.is_active ? '0 4px 20px rgba(245,165,36,.06)' : 'none',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(245,165,36,.1)', border: '1px solid rgba(245,165,36,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#f5a524' }}>router</span>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 9999, background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 600, fontFamily: 'Inter,sans-serif' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot, boxShadow: testResult === 'online' ? `0 0 6px ${sc.dot}` : 'none' }} />
          {sc.label}
        </span>
      </div>

      {/* Name */}
      <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 16, fontWeight: 700, color: '#e2e2e8', marginBottom: 6 }}>{router.name}</div>

      {/* Host */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#64748b' }}>dns</span>
        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 12, color: '#d7c3ae' }}>{router.host}</span>
        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: '#64748b' }}>:{router.api_port ?? 8728}</span>
      </div>

      {/* Username */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: router.notes ? 4 : 16 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#64748b' }}>person</span>
        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 12, color: '#94a3b8' }}>{router.username}</span>
      </div>

      {/* Notes */}
      {router.notes && (
        <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'Inter,sans-serif', marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {router.notes}
        </div>
      )}

      <div style={{ height: 1, background: 'rgba(255,255,255,.06)', marginBottom: 14 }} />

      {/* Actions */}
      <div style={{ display: 'flex', gap: 7 }}>
        {/* Test connection */}
        <button
          onClick={onTraffic}
          title="Lihat live traffic"
          style={{ flex: 1, padding: '7px 0', borderRadius: 9, cursor: 'pointer', background: 'rgba(64,197,229,.08)', border: '1px solid rgba(64,197,229,.2)', color: '#40c5e5', fontSize: 12, fontWeight: 600, fontFamily: 'Inter,sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>monitoring</span>
          Traffic
        </button>

        <button
          onClick={onEdit}
          disabled={testing}
          title="Edit router"
          style={{ width: 34, height: 34, borderRadius: 8, cursor: 'pointer', background: 'rgba(245,165,36,.08)', border: '1px solid rgba(245,165,36,.2)', color: '#f5a524', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>edit</span>
        </button>

        <button
          onClick={onDelete}
          title="Hapus router"
          style={{ width: 34, height: 34, borderRadius: 8, cursor: 'pointer', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
        </button>
      </div>

      {/* Test connection button — full width di bawah */}
      <button
        onClick={onDelete}
        style={{ display: 'none' }}
        aria-hidden
      />
      <button
        onClick={() => {/* handled via prop */ }}
        style={{ display: 'none' }}
        aria-hidden
      />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
export default function RoutersPage() {
  const qc = useQueryClient()
  const [formOpen, setFormOpen]         = useState(false)
  const [editTarget, setEditTarget]     = useState<MikrotikRouter | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MikrotikRouter | null>(null)
  const [trafficId, setTrafficId]       = useState<number | null>(null)
  const [testingId, setTestingId]       = useState<number | null>(null)
  const [testResults, setTestResults]   = useState<Record<number, 'online' | 'offline'>>({})

  const { data: routers = [], isLoading, isError } = useAuthQuery<MikrotikRouter[]>({
    queryKey: ['routers'],
    queryFn: () => routersApi.list(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => routersApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['routers'] }); setDeleteTarget(null) },
  })

  async function handleTestConnection(router: MikrotikRouter) {
    setTestingId(router.id)
    const ok = await routersApi.testConnection(router.id)
    setTestResults(prev => ({ ...prev, [router.id]: ok ? 'online' : 'offline' }))
    setTestingId(null)
  }

  const activeCount = routers.filter(r => r.is_active).length

  return (
    <>
      <style>{`
        @keyframes bl-shimmer{0%,100%{opacity:.5}50%{opacity:1}}
        .rp-wrap{max-width:1280px;margin:0 auto;padding:32px 32px 64px}
        .rp-header{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:24px}
        .rp-title{font-family:'Space Grotesk',sans-serif;font-size:26px;font-weight:700;color:#e2e2e8;display:flex;align-items:center;gap:12px}
        .rp-title-icon{width:42px;height:42px;border-radius:12px;background:rgba(245,165,36,.12);border:1px solid rgba(245,165,36,.25);display:flex;align-items:center;justify-content:center}
        .rp-subtitle{font-size:14px;color:#94a3b8;margin-top:4px}
        .rp-add-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:10px;background:#f5a524;border:none;color:#000;font-family:'Inter',sans-serif;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 0 16px rgba(245,165,36,.3);transition:opacity .15s,transform .1s;white-space:nowrap}
        .rp-add-btn:hover{opacity:.88}.rp-add-btn:active{transform:scale(.97)}
        .rp-stats{display:flex;gap:10px;margin-bottom:24px;flex-wrap:wrap}
        .rp-stat{display:flex;align-items:center;gap:8px;padding:10px 16px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;font-family:'Inter',sans-serif;font-size:13px;color:#94a3b8}
        .rp-stat strong{color:#e2e2e8;font-weight:600}
        .rp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:18px}
        .rp-skel{background:rgba(18,19,23,.85);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:22px;display:flex;flex-direction:column;gap:12px}
        .rp-skel-ln{border-radius:6px;background:rgba(255,255,255,.06);animation:bl-shimmer 1.4s ease infinite}
        .rp-empty{background:rgba(18,19,23,.8);border:1px solid rgba(245,165,36,.1);border-radius:16px;padding:64px 32px;text-align:center}
      `}</style>

      <div className="rp-wrap">
        {/* Header */}
        <div className="rp-header">
          <div>
            <div className="rp-title">
              <div className="rp-title-icon">
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#f5a524' }}>router</span>
              </div>
              Router MikroTik
            </div>
            <div className="rp-subtitle">{isLoading ? 'Memuat data…' : `${routers.length} router terdaftar`}</div>
          </div>
          <button className="rp-add-btn" onClick={() => { setEditTarget(null); setFormOpen(true) }}>
            <span className="material-symbols-outlined" style={{ fontSize: 17 }}>add_circle</span>
            Tambah Router
          </button>
        </div>

        {/* Stats */}
        {!isLoading && routers.length > 0 && (
          <div className="rp-stats">
            <div className="rp-stat">
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#4ade80' }}>check_circle</span>
              <span><strong>{activeCount}</strong> aktif</span>
            </div>
            <div className="rp-stat">
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#94a3b8' }}>cancel</span>
              <span><strong>{routers.length - activeCount}</strong> nonaktif</span>
            </div>
            {Object.values(testResults).some(r => r === 'online') && (
              <div className="rp-stat">
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#4ade80' }}>wifi</span>
                <span><strong>{Object.values(testResults).filter(r => r === 'online').length}</strong> online (test)</span>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        {isError ? (
          <div className="rp-empty">
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#f87171', display: 'block', marginBottom: 10 }}>wifi_off</span>
            <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 16, fontWeight: 600, color: '#e2e2e8', marginBottom: 6 }}>Gagal memuat data</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>Periksa koneksi atau refresh halaman</div>
          </div>
        ) : isLoading ? (
          <div className="rp-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rp-skel">
                <div className="rp-skel-ln" style={{ width: 44, height: 44, borderRadius: 13 }} />
                <div className="rp-skel-ln" style={{ width: '55%', height: 14 }} />
                <div className="rp-skel-ln" style={{ width: '75%', height: 11 }} />
                <div className="rp-skel-ln" style={{ width: '60%', height: 11 }} />
                <div style={{ height: 1, background: 'rgba(255,255,255,.05)' }} />
                <div className="rp-skel-ln" style={{ height: 32, borderRadius: 9 }} />
              </div>
            ))}
          </div>
        ) : routers.length === 0 ? (
          <div className="rp-empty">
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#64748b', display: 'block', marginBottom: 10 }}>router</span>
            <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 16, fontWeight: 600, color: '#e2e2e8', marginBottom: 6 }}>Belum ada router</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Tambahkan router MikroTik pertama untuk mulai monitoring</div>
            <button className="rp-add-btn" style={{ margin: '0 auto' }} onClick={() => { setEditTarget(null); setFormOpen(true) }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_circle</span>
              Tambah Router Pertama
            </button>
          </div>
        ) : (
          <div className="rp-grid">
            {routers.map(r => (
              <div key={r.id}>
                {/* Test connection strip */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <button
                    onClick={() => handleTestConnection(r)}
                    disabled={testingId === r.id}
                    style={{
                      flex: 1, padding: '6px 12px', borderRadius: 8, cursor: testingId === r.id ? 'not-allowed' : 'pointer',
                      background: testResults[r.id] === 'online' ? 'rgba(74,222,128,.08)' : testResults[r.id] === 'offline' ? 'rgba(248,113,113,.08)' : 'rgba(255,255,255,.04)',
                      border: `1px solid ${testResults[r.id] === 'online' ? 'rgba(74,222,128,.2)' : testResults[r.id] === 'offline' ? 'rgba(248,113,113,.2)' : 'rgba(255,255,255,.08)'}`,
                      color: testResults[r.id] === 'online' ? '#4ade80' : testResults[r.id] === 'offline' ? '#f87171' : '#94a3b8',
                      fontSize: 12, fontWeight: 500, fontFamily: 'Inter,sans-serif',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      opacity: testingId === r.id ? 0.7 : 1,
                    }}
                  >
                    {testingId === r.id
                      ? <><div style={{ width: 11, height: 11, borderRadius: '50%', border: '2px solid rgba(255,255,255,.2)', borderTopColor: '#94a3b8', animation: 'rfm-spin .6s linear infinite' }} />Testing…</>
                      : testResults[r.id] === 'online'
                        ? <><span className="material-symbols-outlined" style={{ fontSize: 13 }}>check_circle</span>Online</>
                        : testResults[r.id] === 'offline'
                          ? <><span className="material-symbols-outlined" style={{ fontSize: 13 }}>cancel</span>Offline</>
                          : <><span className="material-symbols-outlined" style={{ fontSize: 13 }}>network_check</span>Test Koneksi</>
                    }
                  </button>
                </div>

                <RouterCard
                  router={r}
                  onEdit={() => { setEditTarget(r); setFormOpen(true) }}
                  onDelete={() => setDeleteTarget(r)}
                  onTraffic={() => setTrafficId(r.id)}
                  testing={testingId === r.id}
                  testResult={testResults[r.id] ?? null}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      <RouterFormModal open={formOpen} onClose={() => { setFormOpen(false); setEditTarget(null) }} router={editTarget} />

      {/* Delete Confirm */}
      {deleteTarget && (
        <DeleteConfirm
          router={deleteTarget}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          isPending={deleteMutation.isPending}
        />
      )}

      {/* Traffic Panel */}
      {trafficId !== null && (
        <TrafficPanel routerId={trafficId} onClose={() => setTrafficId(null)} />
      )}
    </>
  )
}
