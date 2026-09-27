import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthQuery } from '@/hooks/useAuthQuery'
import { packagesApi } from '@/services/api/packages'
import { formatCurrency } from '@/lib/utils'
import type { Package, PackagePayload } from '@/types'

// ─── Form Modal ───────────────────────────────────────────────────
const EMPTY_FORM: PackagePayload = {
  name: '',
  speed_mbps: 10,
  price: 0,
  mikrotik_profile_name: '',
  is_active: true,
}

function PackageFormModal({
  open,
  onClose,
  pkg,
}: {
  open: boolean
  onClose: () => void
  pkg?: Package | null
}) {
  const qc     = useQueryClient()
  const isEdit = !!pkg
  const inputRef = useRef<HTMLInputElement>(null)

  const [form, setForm]     = useState<PackagePayload>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (pkg) {
      setForm({
        name:                  pkg.name,
        speed_mbps:            pkg.speed_mbps,
        price:                 pkg.price,
        mikrotik_profile_name: pkg.mikrotik_profile_name,
        is_active:             pkg.is_active,
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setErrors({})
  }, [pkg, open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

  const saveMutation = useMutation({
    mutationFn: (payload: PackagePayload) =>
      isEdit ? packagesApi.update(pkg!.id, payload) : packagesApi.create(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['packages'] }); onClose() },
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
    if (!form.name.trim())                  errs.name                  = 'Nama wajib diisi'
    if (form.speed_mbps < 1)               errs.speed_mbps            = 'Kecepatan minimal 1 Mbps'
    if (form.price < 0)                    errs.price                 = 'Harga tidak boleh negatif'
    if (!form.mikrotik_profile_name.trim()) errs.mikrotik_profile_name = 'Nama profil MikroTik wajib diisi'
    if (Object.keys(errs).length) { setErrors(errs); return }
    saveMutation.mutate(form)
  }

  function field<K extends keyof PackagePayload>(key: K, value: PackagePayload[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  if (!open) return null
  const busy = saveMutation.isPending

  return (
    <>
      <style>{`
        .pfm-overlay{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.72);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;animation:pfm-fi .15s ease}
        @keyframes pfm-fi{from{opacity:0}to{opacity:1}}
        .pfm-panel{background:#121317;border:1px solid rgba(245,165,36,.2);border-radius:20px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,.7);animation:pfm-su .18s ease}
        @keyframes pfm-su{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
        .pfm-header{display:flex;align-items:center;justify-content:space-between;padding:24px 28px 20px;border-bottom:1px solid rgba(245,165,36,.1)}
        .pfm-title{font-family:'Space Grotesk',sans-serif;font-size:18px;font-weight:600;color:#e2e2e8;display:flex;align-items:center;gap:10px}
        .pfm-close{width:32px;height:32px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:#d7c3ae;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s}
        .pfm-close:hover{background:rgba(255,255,255,.1)}
        .pfm-body{padding:24px 28px 8px;display:flex;flex-direction:column;gap:18px}
        .pfm-row{display:grid;gap:14px}
        .pfm-row.two{grid-template-columns:1fr 1fr}
        .pfm-field{display:flex;flex-direction:column;gap:6px}
        .pfm-label{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#d7c3ae}
        .pfm-input,.pfm-select{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 14px;color:#e2e2e8;font-family:'Inter',sans-serif;font-size:14px;width:100%;outline:none;transition:border-color .15s;box-sizing:border-box}
        .pfm-input:focus,.pfm-select:focus{border-color:rgba(245,165,36,.5);box-shadow:0 0 0 3px rgba(245,165,36,.08)}
        .pfm-input.err,.pfm-select.err{border-color:rgba(255,100,100,.6)}
        .pfm-select{cursor:pointer}.pfm-select option{background:#1e2024}
        .pfm-hint{font-size:11px;color:rgba(215,195,174,.5);margin-top:2px}
        .pfm-error{font-size:12px;color:#ff8080;margin-top:2px}
        .pfm-toggle{display:flex;align-items:center;gap:12px;padding:12px 16px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;cursor:pointer}
        .pfm-toggle-knob{width:40px;height:22px;border-radius:11px;transition:background .2s;position:relative;flex-shrink:0}
        .pfm-toggle-knob::after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .2s}
        .pfm-toggle-knob.on{background:#f5a524;box-shadow:0 0 10px rgba(245,165,36,.4)}
        .pfm-toggle-knob.on::after{transform:translateX(18px)}
        .pfm-toggle-knob.off{background:rgba(255,255,255,.15)}
        .pfm-footer{display:flex;gap:12px;justify-content:flex-end;padding:20px 28px 24px}
        .pfm-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:10px;font-family:'Inter',sans-serif;font-size:14px;font-weight:500;cursor:pointer;border:none;transition:opacity .15s,transform .1s}
        .pfm-btn:active{transform:scale(.97)}.pfm-btn:disabled{opacity:.5;cursor:not-allowed}
        .pfm-btn-cancel{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#d7c3ae}
        .pfm-btn-cancel:hover:not(:disabled){background:rgba(255,255,255,.1)}
        .pfm-btn-save{background:#f5a524;color:#000;font-weight:600;box-shadow:0 0 16px rgba(245,165,36,.35)}
        .pfm-btn-save:hover:not(:disabled){opacity:.88}
        .pfm-spin{width:14px;height:14px;border-radius:50%;border:2px solid rgba(0,0,0,.3);border-top-color:#000;animation:pfm-spin .6s linear infinite}
        @keyframes pfm-spin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="pfm-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="pfm-panel" role="dialog" aria-modal="true">
          <div className="pfm-header">
            <div className="pfm-title">
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#f5a524' }}>
                {isEdit ? 'edit' : 'add_box'}
              </span>
              {isEdit ? 'Edit Paket' : 'Tambah Paket'}
            </div>
            <button className="pfm-close" onClick={onClose}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="pfm-body">
              {/* Nama */}
              <div className="pfm-field">
                <label className="pfm-label">Nama Paket *</label>
                <input
                  ref={inputRef}
                  className={`pfm-input${errors.name ? ' err' : ''}`}
                  value={form.name}
                  onChange={e => field('name', e.target.value)}
                  placeholder="Contoh: Paket 20 Mbps"
                  maxLength={100}
                  disabled={busy}
                />
                {errors.name && <span className="pfm-error">{errors.name}</span>}
              </div>

              {/* Speed & Harga */}
              <div className="pfm-row two">
                <div className="pfm-field">
                  <label className="pfm-label">Kecepatan (Mbps) *</label>
                  <input
                    className={`pfm-input${errors.speed_mbps ? ' err' : ''}`}
                    type="number" min={1} step={1}
                    value={form.speed_mbps}
                    onChange={e => field('speed_mbps', Number(e.target.value))}
                    disabled={busy}
                  />
                  {errors.speed_mbps && <span className="pfm-error">{errors.speed_mbps}</span>}
                </div>
                <div className="pfm-field">
                  <label className="pfm-label">Harga (IDR) *</label>
                  <input
                    className={`pfm-input${errors.price ? ' err' : ''}`}
                    type="number" min={0} step={1000}
                    value={form.price}
                    onChange={e => field('price', Number(e.target.value))}
                    disabled={busy}
                  />
                  {errors.price && <span className="pfm-error">{errors.price}</span>}
                  {form.price > 0 && (
                    <span className="pfm-hint">{formatCurrency(form.price)}</span>
                  )}
                </div>
              </div>

              {/* MikroTik Profile */}
              <div className="pfm-field">
                <label className="pfm-label">Nama Profil MikroTik *</label>
                <input
                  className={`pfm-input${errors.mikrotik_profile_name ? ' err' : ''}`}
                  value={form.mikrotik_profile_name}
                  onChange={e => field('mikrotik_profile_name', e.target.value)}
                  placeholder="Contoh: paket-20mbps"
                  maxLength={100}
                  disabled={busy}
                />
                {errors.mikrotik_profile_name
                  ? <span className="pfm-error">{errors.mikrotik_profile_name}</span>
                  : <span className="pfm-hint">Nama PPPoE profile di RouterOS (case-sensitive)</span>
                }
              </div>

              {/* Toggle aktif */}
              <div
                className="pfm-toggle"
                role="switch"
                aria-checked={form.is_active}
                onClick={() => !busy && field('is_active', !form.is_active)}
                tabIndex={0}
                onKeyDown={e => e.key === ' ' && !busy && field('is_active', !form.is_active)}
              >
                <div className={`pfm-toggle-knob ${form.is_active ? 'on' : 'off'}`} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#e2e2e8', fontFamily: 'Inter,sans-serif' }}>
                    {form.is_active ? 'Paket Aktif' : 'Paket Nonaktif'}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'Inter,sans-serif', marginTop: 2 }}>
                    {form.is_active ? 'Dapat dipilih saat buat langganan' : 'Disembunyikan dari pilihan langganan'}
                  </div>
                </div>
              </div>

              {/* Server error */}
              {saveMutation.isError && !Object.keys(errors).length && (
                <div style={{ background: 'rgba(255,80,80,.08)', border: '1px solid rgba(255,80,80,.25)', borderRadius: 10, padding: '12px 16px', color: '#ff8080', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                  {(saveMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Terjadi kesalahan, coba lagi.'}
                </div>
              )}
            </div>

            <div className="pfm-footer">
              <button type="button" className="pfm-btn pfm-btn-cancel" onClick={onClose} disabled={busy}>Batal</button>
              <button type="submit" className="pfm-btn pfm-btn-save" disabled={busy}>
                {busy
                  ? <><div className="pfm-spin" />Menyimpan…</>
                  : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>{isEdit ? 'Simpan' : 'Tambah Paket'}</>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

// ─── Delete Confirm ───────────────────────────────────────────────
function DeleteConfirm({ pkg, onConfirm, onCancel, isPending }: {
  pkg: Package; onConfirm: () => void; onCancel: () => void; isPending: boolean
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,.78)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div style={{ background: '#121317', border: '1px solid rgba(255,80,80,.25)', borderRadius: 18, padding: '28px 24px', width: '100%', maxWidth: 380, boxShadow: '0 24px 80px rgba(0,0,0,.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,80,80,.1)', border: '1px solid rgba(255,80,80,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#ff6060' }}>delete</span>
          </div>
          <div>
            <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontWeight: 600, fontSize: 16, color: '#e2e2e8' }}>Hapus Paket</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Tidak dapat dibatalkan</div>
          </div>
        </div>
        <p style={{ fontSize: 14, color: '#d7c3ae', lineHeight: 1.6, marginBottom: 22 }}>
          Yakin hapus paket <strong style={{ color: '#e2e2e8' }}>{pkg.name}</strong>?
          Langganan aktif yang menggunakan paket ini tidak akan terhapus.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} disabled={isPending} style={{ padding: '9px 16px', borderRadius: 9, cursor: 'pointer', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#d7c3ae', fontSize: 13, fontFamily: 'Inter,sans-serif' }}>Batal</button>
          <button onClick={onConfirm} disabled={isPending} style={{ padding: '9px 16px', borderRadius: 9, cursor: 'pointer', background: '#dc2626', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'Inter,sans-serif', opacity: isPending ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            {isPending
              ? <><div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'pfm-spin .6s linear infinite' }} />Menghapus…</>
              : <><span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>Hapus</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Package Card ─────────────────────────────────────────────────
function PackageCard({ pkg, onEdit, onDelete, onToggle, toggling }: {
  pkg: Package
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
  toggling: boolean
}) {
  return (
    <div style={{
      background: 'rgba(18,19,23,.85)',
      border: `1px solid ${pkg.is_active ? 'rgba(245,165,36,.2)' : 'rgba(255,255,255,.07)'}`,
      borderRadius: 16,
      padding: '24px',
      display: 'flex', flexDirection: 'column', gap: 0,
      position: 'relative', overflow: 'hidden',
      transition: 'border-color .2s, box-shadow .2s',
      boxShadow: pkg.is_active ? '0 4px 24px rgba(245,165,36,.08)' : 'none',
    }}>
      {/* Status pill */}
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
          background: pkg.is_active ? 'rgba(74,222,128,.1)' : 'rgba(148,163,184,.1)',
          color: pkg.is_active ? '#4ade80' : '#94a3b8',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: pkg.is_active ? '#4ade80' : '#94a3b8' }} />
          {pkg.is_active ? 'Aktif' : 'Nonaktif'}
        </span>
      </div>

      {/* Speed icon */}
      <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(245,165,36,.1)', border: '1px solid rgba(245,165,36,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#f5a524' }}>speed</span>
      </div>

      {/* Name */}
      <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 17, fontWeight: 700, color: '#e2e2e8', marginBottom: 6, paddingRight: 80 }}>
        {pkg.name}
      </div>

      {/* Speed */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 12 }}>
        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 36, fontWeight: 700, color: '#f5a524', lineHeight: 1, textShadow: '0 0 20px rgba(245,165,36,.4)' }}>
          {pkg.speed_mbps}
        </span>
        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 13, color: 'rgba(245,165,36,.6)', fontWeight: 600 }}>Mbps</span>
      </div>

      {/* Price */}
      <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 20, fontWeight: 600, color: '#e2e2e8', marginBottom: 8 }}>
        {formatCurrency(pkg.price)}
        <span style={{ fontSize: 13, fontWeight: 400, color: '#64748b', marginLeft: 4 }}>/bulan</span>
      </div>

      {/* MikroTik profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#64748b' }}>router</span>
        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: '#64748b' }}>{pkg.mikrotik_profile_name}</span>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,.06)', marginBottom: 16 }} />

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        {/* Toggle aktif */}
        <button
          onClick={onToggle}
          disabled={toggling}
          title={pkg.is_active ? 'Nonaktifkan' : 'Aktifkan'}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 9, cursor: 'pointer',
            background: pkg.is_active ? 'rgba(148,163,184,.08)' : 'rgba(74,222,128,.08)',
            border: `1px solid ${pkg.is_active ? 'rgba(148,163,184,.15)' : 'rgba(74,222,128,.2)'}`,
            color: pkg.is_active ? '#94a3b8' : '#4ade80',
            fontSize: 12, fontWeight: 600, fontFamily: 'Inter,sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            opacity: toggling ? 0.5 : 1, transition: 'opacity .15s',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            {pkg.is_active ? 'toggle_off' : 'toggle_on'}
          </span>
          {pkg.is_active ? 'Nonaktifkan' : 'Aktifkan'}
        </button>

        {/* Edit */}
        <button
          onClick={onEdit}
          title="Edit paket"
          style={{ width: 36, height: 36, borderRadius: 9, cursor: 'pointer', background: 'rgba(245,165,36,.08)', border: '1px solid rgba(245,165,36,.2)', color: '#f5a524', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
        </button>

        {/* Delete */}
        <button
          onClick={onDelete}
          title="Hapus paket"
          style={{ width: 36, height: 36, borderRadius: 9, cursor: 'pointer', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
export default function PackagesPage() {
  const qc = useQueryClient()

  const [formOpen, setFormOpen]         = useState(false)
  const [editTarget, setEditTarget]     = useState<Package | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Package | null>(null)
  const [togglingId, setTogglingId]     = useState<number | null>(null)

  const { data: packages = [], isLoading, isError } = useAuthQuery<Package[]>({
    queryKey: ['packages'],
    queryFn: () => packagesApi.list(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => packagesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['packages'] }); setDeleteTarget(null) },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      packagesApi.update(id, { is_active }),
    onMutate: ({ id }) => setTogglingId(id),
    onSettled: () => { qc.invalidateQueries({ queryKey: ['packages'] }); setTogglingId(null) },
  })

  const activeCount   = packages.filter(p => p.is_active).length
  const inactiveCount = packages.length - activeCount

  return (
    <>
      <style>{`
        .pp-wrap{max-width:1280px;margin:0 auto;padding:32px 32px 64px}
        .pp-header{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:28px}
        .pp-title{font-family:'Space Grotesk',sans-serif;font-size:26px;font-weight:700;color:#e2e2e8;display:flex;align-items:center;gap:12px}
        .pp-title-icon{width:42px;height:42px;border-radius:12px;background:rgba(245,165,36,.12);border:1px solid rgba(245,165,36,.25);display:flex;align-items:center;justify-content:center}
        .pp-subtitle{font-size:14px;color:#94a3b8;margin-top:4px}
        .pp-add-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:10px;background:#f5a524;border:none;color:#000;font-family:'Inter',sans-serif;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 0 16px rgba(245,165,36,.3);transition:opacity .15s,transform .1s;white-space:nowrap}
        .pp-add-btn:hover{opacity:.88}.pp-add-btn:active{transform:scale(.97)}
        .pp-stats{display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap}
        .pp-stat{display:flex;align-items:center;gap:8px;padding:10px 16px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;font-family:'Inter',sans-serif;font-size:13px;color:#94a3b8}
        .pp-stat strong{color:#e2e2e8;font-weight:600}
        .pp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px}
        .pp-empty{background:rgba(18,19,23,.8);border:1px solid rgba(245,165,36,.12);border-radius:16px;padding:72px 32px;text-align:center}
        .pp-empty-icon{width:64px;height:64px;border-radius:18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
        .pp-skeleton{background:rgba(18,19,23,.85);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:12px}
        .pp-skel-line{height:12px;border-radius:6px;background:rgba(255,255,255,.06);animation:pp-shimmer 1.4s ease infinite}
        @keyframes pp-shimmer{0%,100%{opacity:.5}50%{opacity:1}}
      `}</style>

      <div className="pp-wrap">
        {/* Header */}
        <div className="pp-header">
          <div>
            <div className="pp-title">
              <div className="pp-title-icon">
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#f5a524' }}>inventory_2</span>
              </div>
              Paket Internet
            </div>
            <div className="pp-subtitle">
              {isLoading ? 'Memuat data…' : `${packages.length} paket terdaftar`}
            </div>
          </div>
          <button className="pp-add-btn" onClick={() => { setEditTarget(null); setFormOpen(true) }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_box</span>
            Tambah Paket
          </button>
        </div>

        {/* Stats */}
        {!isLoading && packages.length > 0 && (
          <div className="pp-stats">
            <div className="pp-stat">
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#4ade80' }}>check_circle</span>
              <span><strong>{activeCount}</strong> aktif</span>
            </div>
            <div className="pp-stat">
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#94a3b8' }}>cancel</span>
              <span><strong>{inactiveCount}</strong> nonaktif</span>
            </div>
            <div className="pp-stat">
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#f5a524' }}>speed</span>
              <span>
                {packages.length > 0
                  ? `${Math.min(...packages.map(p => p.speed_mbps))}–${Math.max(...packages.map(p => p.speed_mbps))} Mbps`
                  : '—'
                }
              </span>
            </div>
          </div>
        )}

        {/* Content */}
        {isError ? (
          <div className="pp-empty">
            <div className="pp-empty-icon">
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#f87171' }}>wifi_off</span>
            </div>
            <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 17, fontWeight: 600, color: '#e2e2e8', marginBottom: 6 }}>Gagal memuat data</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>Periksa koneksi atau coba refresh halaman</div>
          </div>
        ) : isLoading ? (
          <div className="pp-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="pp-skeleton">
                <div className="pp-skel-line" style={{ width: 48, height: 48, borderRadius: 14 }} />
                <div className="pp-skel-line" style={{ width: '60%' }} />
                <div className="pp-skel-line" style={{ width: '40%', height: 32 }} />
                <div className="pp-skel-line" style={{ width: '50%' }} />
                <div className="pp-skel-line" style={{ width: '70%' }} />
              </div>
            ))}
          </div>
        ) : packages.length === 0 ? (
          <div className="pp-empty">
            <div className="pp-empty-icon">
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#64748b' }}>inventory_2</span>
            </div>
            <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 17, fontWeight: 600, color: '#e2e2e8', marginBottom: 6 }}>Belum ada paket</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Tambahkan paket internet pertama untuk mulai membuat langganan</div>
            <button
              className="pp-add-btn"
              style={{ margin: '0 auto' }}
              onClick={() => { setEditTarget(null); setFormOpen(true) }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_box</span>
              Tambah Paket Pertama
            </button>
          </div>
        ) : (
          <div className="pp-grid">
            {packages.map(pkg => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                onEdit={() => { setEditTarget(pkg); setFormOpen(true) }}
                onDelete={() => setDeleteTarget(pkg)}
                onToggle={() => toggleMutation.mutate({ id: pkg.id, is_active: !pkg.is_active })}
                toggling={togglingId === pkg.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      <PackageFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null) }}
        pkg={editTarget}
      />

      {/* Delete Confirm */}
      {deleteTarget && (
        <DeleteConfirm
          pkg={deleteTarget}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          isPending={deleteMutation.isPending}
        />
      )}
    </>
  )
}
