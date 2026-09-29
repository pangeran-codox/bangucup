import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthQuery } from '@/hooks/useAuthQuery'
import { assetsApi } from '@/services/api/assets'
import { formatDate } from '@/lib/utils'
import type { Asset, AssetPayload, AssetListParams, AssetMovement, PaginatedResponse } from '@/types'

const PER_PAGE = 20

// ─── Stock bar ────────────────────────────────────────────────────
function StockIndicator({ qty }: { qty: number }) {
  const color = qty === 0 ? '#f87171' : qty <= 5 ? '#f5a524' : '#4ade80'
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}` }} />
      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 14, fontWeight: 600, color }}>{qty}</span>
    </div>
  )
}

// ─── Skeleton row ─────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr>
      {[150, 90, 70, 60, 60, 80].map((w, i) => (
        <td key={i} style={{ padding: '14px 18px' }}>
          <div style={{ height: 12, width: w, borderRadius: 6, background: 'rgba(255,255,255,.06)', animation: 'as-shimmer 1.4s ease infinite' }} />
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

// ─── Form Modal (add / edit) ──────────────────────────────────────
const EMPTY_FORM: AssetPayload = { name: '', category: '', sku: '', stock_qty: 0, unit: 'pcs' }

function AssetFormModal({ open, onClose, asset }: {
  open: boolean; onClose: () => void; asset?: Asset | null
}) {
  const qc     = useQueryClient()
  const isEdit = !!asset
  const nameRef = useRef<HTMLInputElement>(null)
  const [form, setForm]     = useState<AssetPayload>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (asset) {
      setForm({ name: asset.name, category: asset.category, sku: asset.sku ?? '', stock_qty: asset.stock_qty, unit: asset.unit ?? 'pcs' })
    } else {
      setForm(EMPTY_FORM)
    }
    setErrors({})
  }, [asset, open])

  useEffect(() => { if (open) setTimeout(() => nameRef.current?.focus(), 80) }, [open])

  const saveMutation = useMutation({
    mutationFn: (p: AssetPayload) => isEdit ? assetsApi.update(asset!.id, p) : assetsApi.create(p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets'] }); onClose() },
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
    if (!form.category.trim()) errs.category = 'Kategori wajib diisi'
    if (Object.keys(errs).length) { setErrors(errs); return }
    saveMutation.mutate({ ...form, sku: form.sku || null, unit: form.unit || null })
  }

  function f<K extends keyof AssetPayload>(key: K, val: AssetPayload[K]) {
    setForm(p => ({ ...p, [key]: val }))
    if (errors[key]) setErrors(p => { const n = { ...p }; delete n[key]; return n })
  }

  if (!open) return null
  const busy = saveMutation.isPending

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'as-fi .15s ease' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#121317', border: '1px solid rgba(245,165,36,.2)', borderRadius: 20, width: '100%', maxWidth: 500, boxShadow: '0 24px 80px rgba(0,0,0,.7)', animation: 'as-su .18s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid rgba(245,165,36,.1)' }}>
          <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 17, fontWeight: 600, color: '#e2e2e8', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 19, color: '#f5a524' }}>{isEdit ? 'edit' : 'add_box'}</span>
            {isEdit ? 'Edit Aset' : 'Tambah Aset'}
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', color: '#d7c3ae', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Nama */}
            <Field label="Nama Aset *" error={errors.name}>
              <input ref={nameRef} value={form.name} onChange={e => f('name', e.target.value)} placeholder="Contoh: ONU ZTE F670L" maxLength={150} disabled={busy}
                style={inputStyle(!!errors.name)} />
            </Field>

            {/* Kategori & SKU */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Kategori *" error={errors.category}>
                <input value={form.category} onChange={e => f('category', e.target.value)} placeholder="Contoh: ONU, Kabel, Switch" maxLength={50} disabled={busy}
                  style={inputStyle(!!errors.category)} />
              </Field>
              <Field label="SKU">
                <input value={form.sku ?? ''} onChange={e => f('sku', e.target.value)} placeholder="Kode produk (opsional)" maxLength={50} disabled={busy}
                  style={inputStyle(false)} />
              </Field>
            </div>

            {/* Stok & Satuan */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Stok Awal">
                <input type="number" min={0} value={form.stock_qty ?? 0} onChange={e => f('stock_qty', Number(e.target.value))} disabled={busy || isEdit}
                  style={{ ...inputStyle(false), opacity: isEdit ? 0.5 : 1 }} />
                {isEdit && <span style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontFamily: 'Inter,sans-serif' }}>Ubah stok lewat mutasi</span>}
              </Field>
              <Field label="Satuan">
                <input value={form.unit ?? ''} onChange={e => f('unit', e.target.value)} placeholder="pcs, meter, unit…" maxLength={20} disabled={busy}
                  style={inputStyle(false)} />
              </Field>
            </div>

            {saveMutation.isError && !Object.keys(errors).length && (
              <div style={{ background: 'rgba(255,80,80,.08)', border: '1px solid rgba(255,80,80,.25)', borderRadius: 10, padding: '10px 14px', color: '#ff8080', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>error</span>
                {(saveMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Terjadi kesalahan, coba lagi.'}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '0 24px 20px' }}>
            <button type="button" onClick={onClose} disabled={busy} style={{ padding: '9px 18px', borderRadius: 9, cursor: 'pointer', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#d7c3ae', fontSize: 13, fontFamily: 'Inter,sans-serif' }}>Batal</button>
            <button type="submit" disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 9, background: '#f5a524', border: 'none', color: '#000', fontSize: 13, fontWeight: 600, fontFamily: 'Inter,sans-serif', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
              {busy ? <><Spinner dark />Menyimpan…</> : <><span className="material-symbols-outlined" style={{ fontSize: 14 }}>save</span>{isEdit ? 'Simpan' : 'Tambah'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Movement Modal (in / out) ────────────────────────────────────
function MovementModal({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const qc = useQueryClient()
  const [type, setType] = useState<'in' | 'out'>('in')
  const [qty, setQty]   = useState(1)
  const [note, setNote] = useState('')
  const [err, setErr]   = useState('')

  const mutation = useMutation({
    mutationFn: () => assetsApi.addMovement(asset.id, { type, qty, note: note || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] })
      qc.invalidateQueries({ queryKey: ['asset-movements', asset.id] })
      onClose()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setErr(msg ?? 'Terjadi kesalahan')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    if (qty < 1) { setErr('Jumlah minimal 1'); return }
    if (type === 'out' && qty > asset.stock_qty) { setErr(`Stok tidak cukup. Tersedia: ${asset.stock_qty} ${asset.unit ?? ''}`); return }
    mutation.mutate()
  }

  const busy = mutation.isPending

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 65, background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#121317', border: '1px solid rgba(245,165,36,.2)', borderRadius: 20, width: '100%', maxWidth: 420, boxShadow: '0 24px 80px rgba(0,0,0,.7)', animation: 'as-su .18s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid rgba(245,165,36,.1)' }}>
          <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 16, fontWeight: 600, color: '#e2e2e8', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 19, color: '#f5a524' }}>swap_vert</span>
            Mutasi Stok
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', color: '#d7c3ae', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Asset info */}
            <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#e2e2e8', fontFamily: 'Inter,sans-serif' }}>{asset.name}</div>
                <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'Inter,sans-serif' }}>{asset.category}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono,monospace', marginBottom: 2 }}>STOK</div>
                <StockIndicator qty={asset.stock_qty} />
                {asset.unit && <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'Inter,sans-serif' }}>{asset.unit}</div>}
              </div>
            </div>

            {/* Tipe */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(['in', 'out'] as const).map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  style={{ padding: '10px 0', borderRadius: 10, cursor: 'pointer', border: `1px solid ${type === t ? (t === 'in' ? 'rgba(74,222,128,.4)' : 'rgba(248,113,113,.4)') : 'rgba(255,255,255,.08)'}`, background: type === t ? (t === 'in' ? 'rgba(74,222,128,.1)' : 'rgba(248,113,113,.1)') : 'rgba(255,255,255,.03)', color: type === t ? (t === 'in' ? '#4ade80' : '#f87171') : '#64748b', fontFamily: 'Inter,sans-serif', fontSize: 13, fontWeight: type === t ? 600 : 400, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{t === 'in' ? 'add_circle' : 'remove_circle'}</span>
                  {t === 'in' ? 'Masuk' : 'Keluar'}
                </button>
              ))}
            </div>

            {/* Jumlah */}
            <Field label="Jumlah">
              <input type="number" min={1} value={qty} onChange={e => setQty(Number(e.target.value))} disabled={busy}
                style={inputStyle(false)} />
            </Field>

            {/* Catatan */}
            <Field label="Catatan">
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Keterangan mutasi (opsional)" maxLength={255} disabled={busy}
                style={inputStyle(false)} />
            </Field>

            {err && (
              <div style={{ background: 'rgba(255,80,80,.08)', border: '1px solid rgba(255,80,80,.25)', borderRadius: 10, padding: '10px 14px', color: '#ff8080', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>error</span>{err}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '0 24px 20px' }}>
            <button type="button" onClick={onClose} disabled={busy} style={{ padding: '9px 18px', borderRadius: 9, cursor: 'pointer', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#d7c3ae', fontSize: 13, fontFamily: 'Inter,sans-serif' }}>Batal</button>
            <button type="submit" disabled={busy}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 9, background: type === 'in' ? '#16a34a' : '#dc2626', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'Inter,sans-serif', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
              {busy ? <><Spinner />Menyimpan…</> : <><span className="material-symbols-outlined" style={{ fontSize: 14 }}>{type === 'in' ? 'add_circle' : 'remove_circle'}</span>{type === 'in' ? 'Catat Masuk' : 'Catat Keluar'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Delete Confirm ───────────────────────────────────────────────
function DeleteConfirm({ asset, onConfirm, onCancel, isPending }: {
  asset: Asset; onConfirm: () => void; onCancel: () => void; isPending: boolean
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,.78)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div style={{ background: '#121317', border: '1px solid rgba(255,80,80,.25)', borderRadius: 18, padding: '26px 22px', width: '100%', maxWidth: 380, boxShadow: '0 24px 80px rgba(0,0,0,.7)' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,80,80,.1)', border: '1px solid rgba(255,80,80,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#ff6060' }}>delete</span>
          </div>
          <div>
            <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontWeight: 600, fontSize: 15, color: '#e2e2e8' }}>Hapus Aset</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>Tidak dapat dibatalkan</div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: '#d7c3ae', lineHeight: 1.6, marginBottom: 20 }}>
          Yakin hapus aset <strong style={{ color: '#e2e2e8' }}>{asset.name}</strong>?
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} disabled={isPending} style={{ padding: '8px 16px', borderRadius: 9, cursor: 'pointer', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#d7c3ae', fontSize: 13, fontFamily: 'Inter,sans-serif' }}>Batal</button>
          <button onClick={onConfirm} disabled={isPending} style={{ padding: '8px 16px', borderRadius: 9, cursor: 'pointer', background: '#dc2626', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'Inter,sans-serif', opacity: isPending ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            {isPending ? <><Spinner />Menghapus…</> : <><span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>Hapus</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Movement History Panel ───────────────────────────────────────
function MovementPanel({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useAuthQuery<PaginatedResponse<AssetMovement>>({
    queryKey: ['asset-movements', asset.id, page],
    queryFn: () => assetsApi.movements(asset.id, page),
    staleTime: 0,
  })

  const movements  = data?.data ?? []
  const totalPages = data?.meta?.last_page ?? 1

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 62, background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#0e0f13', borderLeft: '1px solid rgba(245,165,36,.15)', width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', animation: 'as-slide-in .2s ease' }}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 15, fontWeight: 600, color: '#e2e2e8' }}>Riwayat Mutasi</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, fontFamily: 'Inter,sans-serif' }}>{asset.name}</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,.03)', borderRadius: 10, padding: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,.06)', animation: 'as-shimmer 1.4s ease infinite', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ height: 11, width: '50%', borderRadius: 5, background: 'rgba(255,255,255,.06)', animation: 'as-shimmer 1.4s ease infinite' }} />
                  <div style={{ height: 10, width: '70%', borderRadius: 5, background: 'rgba(255,255,255,.04)', animation: 'as-shimmer 1.4s ease infinite' }} />
                </div>
              </div>
            ))
            : movements.length === 0
              ? <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: 13, fontFamily: 'Inter,sans-serif' }}>Belum ada riwayat mutasi</div>
              : movements.map(m => (
                <div key={m.id} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: m.type === 'in' ? 'rgba(74,222,128,.1)' : 'rgba(248,113,113,.1)', border: `1px solid ${m.type === 'in' ? 'rgba(74,222,128,.2)' : 'rgba(248,113,113,.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 17, color: m.type === 'in' ? '#4ade80' : '#f87171' }}>
                      {m.type === 'in' ? 'add_circle' : 'remove_circle'}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 13, fontWeight: 700, color: m.type === 'in' ? '#4ade80' : '#f87171' }}>
                        {m.type === 'in' ? '+' : '−'}{m.qty}
                      </span>
                      <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'Inter,sans-serif' }}>{asset.unit ?? 'pcs'}</span>
                    </div>
                    {m.note && <div style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'Inter,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.note}</div>}
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'Inter,sans-serif', whiteSpace: 'nowrap', flexShrink: 0 }}>{formatDate(m.created_at)}</span>
                </div>
              ))
          }
        </div>

        {totalPages > 1 && (
          <div style={{ padding: '12px 22px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', gap: 6, justifyContent: 'center' }}>
            <button className="as-pg-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Sebelumnya">
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>chevron_left</span>
            </button>
            <span style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'Inter,sans-serif', alignSelf: 'center' }}>{page} / {totalPages}</span>
            <button className="as-pg-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} aria-label="Berikutnya">
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>chevron_right</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Small helpers ────────────────────────────────────────────────
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: '#d7c3ae' }}>{label}</label>
      {children}
      {error && <span style={{ fontSize: 11, color: '#ff8080' }}>{error}</span>}
    </div>
  )
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return { background: 'rgba(255,255,255,.04)', border: `1px solid ${hasError ? 'rgba(255,100,100,.6)' : 'rgba(255,255,255,.1)'}`, borderRadius: 10, padding: '9px 13px', color: '#e2e2e8', fontFamily: 'Inter,sans-serif', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }
}

function Spinner({ dark }: { dark?: boolean }) {
  return <div style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${dark ? 'rgba(0,0,0,.3)' : 'rgba(255,255,255,.3)'}`, borderTopColor: dark ? '#000' : '#fff', animation: 'as-spin .6s linear infinite' }} />
}

// ─── Main Page ────────────────────────────────────────────────────
export default function AssetsPage() {
  const qc = useQueryClient()

  const [search, setSearch]         = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [page, setPage]             = useState(1)

  const [formOpen, setFormOpen]         = useState(false)
  const [editTarget, setEditTarget]     = useState<Asset | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null)
  const [movementTarget, setMovementTarget] = useState<Asset | null>(null)
  const [historyTarget, setHistoryTarget]   = useState<Asset | null>(null)

  const params: AssetListParams = {
    ...(search         ? { search }                     : {}),
    ...(categoryFilter ? { category: categoryFilter }   : {}),
    page, per_page: PER_PAGE,
  }

  const { data, isLoading, isError } = useAuthQuery<PaginatedResponse<Asset>>({
    queryKey: ['assets', params],
    queryFn: () => assetsApi.list(params),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => assetsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets'] }); setDeleteTarget(null) },
  })

  const assets     = data?.data ?? []
  const meta       = data?.meta
  const totalPages = meta?.last_page ?? 1
  const totalItems = meta?.total ?? 0
  const rangeStart = totalItems === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const rangeEnd   = Math.min(page * PER_PAGE, totalItems)
  const hasFilter  = !!(search || categoryFilter)

  // Kumpulkan kategori unik dari data yang ada untuk filter dropdown
  const categories = [...new Set(assets.map(a => a.category))].sort()

  return (
    <>
      <style>{`
        @keyframes as-shimmer{0%,100%{opacity:.5}50%{opacity:1}}
        @keyframes as-spin{to{transform:rotate(360deg)}}
        @keyframes as-fi{from{opacity:0}to{opacity:1}}
        @keyframes as-su{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes as-slide-in{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}
        .as-wrap{max-width:1280px;margin:0 auto;padding:32px 32px 64px}
        .as-header{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:24px}
        .as-title{font-family:'Space Grotesk',sans-serif;font-size:26px;font-weight:700;color:#e2e2e8;display:flex;align-items:center;gap:12px}
        .as-icon{width:42px;height:42px;border-radius:12px;background:rgba(245,165,36,.12);border:1px solid rgba(245,165,36,.25);display:flex;align-items:center;justify-content:center}
        .as-subtitle{font-size:14px;color:#94a3b8;margin-top:4px}
        .as-add-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:10px;background:#f5a524;border:none;color:#000;font-family:'Inter',sans-serif;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 0 16px rgba(245,165,36,.3);transition:opacity .15s,transform .1s;white-space:nowrap}
        .as-add-btn:hover{opacity:.88}.as-add-btn:active{transform:scale(.97)}
        .as-toolbar{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px;align-items:center}
        .as-search-wrap{display:flex;align-items:center;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:10px;overflow:hidden;flex:1;min-width:200px;max-width:320px;transition:border-color .15s}
        .as-search-wrap:focus-within{border-color:rgba(245,165,36,.4)}
        .as-search-icon{padding:0 11px;color:#94a3b8;display:flex;align-items:center}
        .as-search-inp{flex:1;background:transparent;border:none;outline:none;color:#e2e2e8;font-family:'Inter',sans-serif;font-size:13px;padding:9px 0}
        .as-search-inp::placeholder{color:#64748b}
        .as-search-btn{padding:0 12px;height:100%;background:rgba(245,165,36,.1);border:none;border-left:1px solid rgba(255,255,255,.08);color:#f5a524;cursor:pointer;font-size:12px;font-family:'Inter',sans-serif;font-weight:500;display:flex;align-items:center}
        .as-search-btn:hover{background:rgba(245,165,36,.18)}
        .as-select{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px 14px;color:#e2e2e8;font-size:13px;font-family:'Inter',sans-serif;cursor:pointer;outline:none}
        .as-select:focus{border-color:rgba(245,165,36,.4)}.as-select option{background:#1e2024}
        .as-reset{display:inline-flex;align-items:center;gap:5px;padding:9px 14px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:#94a3b8;font-size:13px;cursor:pointer;font-family:'Inter',sans-serif}
        .as-reset:hover{color:#e2e2e8}
        .as-card{background:rgba(18,19,23,.8);border:1px solid rgba(245,165,36,.1);border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,.3)}
        table.as-table{width:100%;border-collapse:collapse;min-width:680px}
        .as-table thead tr{background:rgba(255,255,255,.03);border-bottom:1px solid rgba(255,255,255,.06)}
        .as-table th{padding:12px 18px;text-align:left;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;letter-spacing:.13em;text-transform:uppercase;color:#64748b;white-space:nowrap}
        .as-table tbody tr{border-bottom:1px solid rgba(255,255,255,.04);transition:background .12s}
        .as-table tbody tr:last-child{border-bottom:none}
        .as-table tbody tr:hover{background:rgba(245,165,36,.03)}
        .as-table td{padding:12px 18px;font-size:13px;color:#e2e2e8;font-family:'Inter',sans-serif;vertical-align:middle}
        .as-footer{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:14px 18px;border-top:1px solid rgba(255,255,255,.06)}
        .as-footer-info{font-size:13px;color:#64748b;font-family:'Inter',sans-serif}
        .as-pg-btn{min-width:32px;height:32px;padding:0 7px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:#d7c3ae;font-size:13px;font-family:'Inter',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center}
        .as-pg-btn:hover:not(:disabled){border-color:rgba(245,165,36,.3);color:#f5a524}
        .as-pg-btn.active{background:rgba(245,165,36,.15);border-color:rgba(245,165,36,.4);color:#f5a524;font-weight:600}
        .as-pg-btn:disabled{opacity:.3;cursor:not-allowed}
        .as-action{width:32px;height:32px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
        .as-action.mut:hover{border-color:rgba(245,165,36,.3);color:#f5a524;background:rgba(245,165,36,.08)}
        .as-action.hist:hover{border-color:rgba(96,165,250,.3);color:#60a5fa;background:rgba(96,165,250,.08)}
        .as-action.edit:hover{border-color:rgba(245,165,36,.3);color:#f5a524;background:rgba(245,165,36,.08)}
        .as-action.del:hover{border-color:rgba(239,68,68,.3);color:#f87171;background:rgba(239,68,68,.08)}
      `}</style>

      <div className="as-wrap">
        {/* Header */}
        <div className="as-header">
          <div>
            <div className="as-title">
              <div className="as-icon"><span className="material-symbols-outlined" style={{ fontSize: 22, color: '#f5a524' }}>inventory</span></div>
              Inventori Aset
            </div>
            <div className="as-subtitle">{isLoading ? 'Memuat data…' : `${totalItems} aset terdaftar`}</div>
          </div>
          <button className="as-add-btn" onClick={() => { setEditTarget(null); setFormOpen(true) }}>
            <span className="material-symbols-outlined" style={{ fontSize: 17 }}>add_box</span>
            Tambah Aset
          </button>
        </div>

        {/* Toolbar */}
        <div className="as-toolbar">
          <div className="as-search-wrap">
            <span className="as-search-icon"><span className="material-symbols-outlined" style={{ fontSize: 17 }}>search</span></span>
            <input className="as-search-inp" placeholder="Cari nama aset…"
              value={searchInput} onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput.trim()); setPage(1) } }} />
            <button className="as-search-btn" onClick={() => { setSearch(searchInput.trim()); setPage(1) }}>Cari</button>
          </div>

          {categories.length > 0 && (
            <select className="as-select" value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}>
              <option value="">Semua Kategori</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {hasFilter && (
            <button className="as-reset" onClick={() => { setSearch(''); setSearchInput(''); setCategoryFilter(''); setPage(1) }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>filter_alt_off</span>Reset
            </button>
          )}
        </div>

        {/* Table */}
        <div className="as-card">
          {isError ? (
            <div style={{ padding: '60px 32px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#f87171', display: 'block', marginBottom: 10 }}>wifi_off</span>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e2e8', fontFamily: 'Space Grotesk,sans-serif', marginBottom: 5 }}>Gagal memuat data</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>Periksa koneksi atau refresh halaman</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="as-table" aria-label="Tabel Aset">
                <thead>
                  <tr>
                    <th>Nama Aset</th>
                    <th>Kategori</th>
                    <th>SKU</th>
                    <th>Stok</th>
                    <th>Satuan</th>
                    <th style={{ textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                    : assets.length === 0
                      ? (
                        <tr><td colSpan={6}>
                          <div style={{ padding: '60px 32px', textAlign: 'center' }}>
                            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#64748b' }}>{hasFilter ? 'search_off' : 'inventory'}</span>
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e2e8', fontFamily: 'Space Grotesk,sans-serif', marginBottom: 5 }}>{hasFilter ? 'Tidak ada hasil' : 'Belum ada aset'}</div>
                            <div style={{ fontSize: 13, color: '#64748b', marginBottom: hasFilter ? 0 : 18 }}>{hasFilter ? 'Coba ubah kata kunci atau filter' : 'Tambahkan peralatan jaringan ke inventori'}</div>
                            {!hasFilter && <button className="as-add-btn" style={{ margin: '0 auto' }} onClick={() => { setEditTarget(null); setFormOpen(true) }}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_box</span>Tambah Aset Pertama</button>}
                          </div>
                        </td></tr>
                      )
                      : assets.map(a => (
                        <tr key={a.id}>
                          <td>
                            <div style={{ fontWeight: 500, color: '#e2e2e8' }}>{a.name}</div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>#{a.id}</div>
                          </td>
                          <td>
                            <span style={{ fontSize: 12, color: '#d7c3ae', background: 'rgba(255,255,255,.05)', padding: '3px 8px', borderRadius: 6 }}>{a.category}</span>
                          </td>
                          <td>
                            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 12, color: a.sku ? '#94a3b8' : '#3f4a57' }}>{a.sku ?? '—'}</span>
                          </td>
                          <td><StockIndicator qty={a.stock_qty} /></td>
                          <td>
                            <span style={{ fontSize: 12, color: '#64748b' }}>{a.unit ?? '—'}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button className="as-action mut" title="Mutasi stok" onClick={() => setMovementTarget(a)}>
                                <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#94a3b8' }}>swap_vert</span>
                              </button>
                              <button className="as-action hist" title="Riwayat mutasi" onClick={() => setHistoryTarget(a)}>
                                <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#94a3b8' }}>history</span>
                              </button>
                              <button className="as-action edit" title="Edit aset" onClick={() => { setEditTarget(a); setFormOpen(true) }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#94a3b8' }}>edit</span>
                              </button>
                              <button className="as-action del" title="Hapus aset" onClick={() => setDeleteTarget(a)}>
                                <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#94a3b8' }}>delete</span>
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

          {!isLoading && !isError && totalItems > 0 && (
            <div className="as-footer">
              <span className="as-footer-info">{rangeStart}–{rangeEnd} dari {totalItems} aset</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button className="as-pg-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Sebelumnya">
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>chevron_left</span>
                </button>
                {getPaginationRange(page, totalPages).map((p, i) =>
                  p === '…'
                    ? <span key={`e${i}`} style={{ color: '#64748b', padding: '0 4px', fontSize: 13 }}>…</span>
                    : <button key={p} className={`as-pg-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p as number)}>{p}</button>
                )}
                <button className="as-pg-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} aria-label="Berikutnya">
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AssetFormModal open={formOpen} onClose={() => { setFormOpen(false); setEditTarget(null) }} asset={editTarget} />
      {movementTarget && <MovementModal asset={movementTarget} onClose={() => setMovementTarget(null)} />}
      {historyTarget  && <MovementPanel  asset={historyTarget}  onClose={() => setHistoryTarget(null)} />}
      {deleteTarget   && <DeleteConfirm asset={deleteTarget} onConfirm={() => deleteMutation.mutate(deleteTarget.id)} onCancel={() => setDeleteTarget(null)} isPending={deleteMutation.isPending} />}
    </>
  )
}
