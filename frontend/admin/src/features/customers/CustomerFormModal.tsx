import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { customersApi } from '@/services/api/customers'
import type { Customer, CustomerPayload, CustomerStatus } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  /** Kalau diisi = mode edit, kosong = mode tambah */
  customer?: Customer | null
}

const STATUS_OPTIONS: { value: CustomerStatus; label: string }[] = [
  { value: 'active',   label: 'Aktif' },
  { value: 'isolir',   label: 'Isolir' },
  { value: 'inactive', label: 'Tidak Aktif' },
  { value: 'pending',  label: 'Pending' },
]

const EMPTY: CustomerPayload = {
  name:           '',
  phone:          '',
  email:          '',
  address:        '',
  coordinate_lat: null,
  coordinate_lng: null,
  status:         'active',
  joined_at:      null,
}

export function CustomerFormModal({ open, onClose, customer }: Props) {
  const qc         = useQueryClient()
  const inputRef   = useRef<HTMLInputElement>(null)
  const isEdit     = !!customer

  const [form, setForm]     = useState<CustomerPayload>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Sync form saat customer berubah (buka edit)
  useEffect(() => {
    if (customer) {
      setForm({
        name:           customer.name,
        phone:          customer.phone,
        email:          customer.email ?? '',
        address:        customer.address,
        coordinate_lat: customer.coordinate_lat ? Number(customer.coordinate_lat) : null,
        coordinate_lng: customer.coordinate_lng ? Number(customer.coordinate_lng) : null,
        status:         customer.status,
        joined_at:      customer.joined_at ?? null,
      })
    } else {
      setForm(EMPTY)
    }
    setErrors({})
  }, [customer, open])

  // Auto-focus nama saat buka
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

  const saveMutation = useMutation({
    mutationFn: (payload: CustomerPayload) =>
      isEdit
        ? customersApi.update(customer!.id, payload)
        : customersApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      onClose()
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }
      if (e?.response?.data?.errors) {
        const flat: Record<string, string> = {}
        Object.entries(e.response.data.errors).forEach(([k, v]) => { flat[k] = v[0] })
        setErrors(flat)
      }
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    // Validasi sederhana client-side
    const errs: Record<string, string> = {}
    if (!form.name.trim())    errs.name    = 'Nama wajib diisi'
    if (!form.phone.trim())   errs.phone   = 'Nomor telepon wajib diisi'
    if (!form.address.trim()) errs.address = 'Alamat wajib diisi'
    if (Object.keys(errs).length) { setErrors(errs); return }

    const payload: CustomerPayload = {
      ...form,
      email:          form.email     || null,
      coordinate_lat: form.coordinate_lat || null,
      coordinate_lng: form.coordinate_lng || null,
      joined_at:      form.joined_at || null,
    }
    saveMutation.mutate(payload)
  }

  function field(key: keyof CustomerPayload, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  if (!open) return null

  const isPending = saveMutation.isPending

  return (
    <>
      <style>{`
        .cfm-overlay {
          position: fixed; inset: 0; z-index: 60;
          background: rgba(0,0,0,0.72);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          animation: cfm-fade-in 0.15s ease;
        }
        @keyframes cfm-fade-in {
          from { opacity: 0 }
          to   { opacity: 1 }
        }
        .cfm-panel {
          background: #121317;
          border: 1px solid rgba(245,165,36,0.2);
          border-radius: 20px;
          width: 100%; max-width: 560px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(245,165,36,0.08);
          animation: cfm-slide-up 0.18s ease;
        }
        @keyframes cfm-slide-up {
          from { transform: translateY(16px); opacity: 0 }
          to   { transform: translateY(0);    opacity: 1 }
        }
        .cfm-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 24px 28px 20px;
          border-bottom: 1px solid rgba(245,165,36,0.1);
        }
        .cfm-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 18px; font-weight: 600; color: #e2e2e8;
          display: flex; align-items: center; gap: 10px;
        }
        .cfm-close {
          width: 32px; height: 32px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: #d7c3ae; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; transition: background 0.15s;
        }
        .cfm-close:hover { background: rgba(255,255,255,0.1); }
        .cfm-body { padding: 24px 28px 28px; display: flex; flex-direction: column; gap: 20px; }
        .cfm-row { display: grid; gap: 16px; }
        .cfm-row.two { grid-template-columns: 1fr 1fr; }
        .cfm-field { display: flex; flex-direction: column; gap: 6px; }
        .cfm-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: #d7c3ae;
        }
        .cfm-input, .cfm-select, .cfm-textarea {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 10px 14px;
          color: #e2e2e8;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          width: 100%;
          outline: none;
          transition: border-color 0.15s;
          box-sizing: border-box;
        }
        .cfm-input:focus, .cfm-select:focus, .cfm-textarea:focus {
          border-color: rgba(245,165,36,0.5);
          box-shadow: 0 0 0 3px rgba(245,165,36,0.08);
        }
        .cfm-input.error, .cfm-select.error, .cfm-textarea.error {
          border-color: rgba(255,100,100,0.6);
        }
        .cfm-select { cursor: pointer; }
        .cfm-select option { background: #1e2024; }
        .cfm-textarea { resize: vertical; min-height: 80px; }
        .cfm-error { font-size: 12px; color: #ff8080; margin-top: 2px; }
        .cfm-hint  { font-size: 11px; color: rgba(215,195,174,0.5); margin-top: 2px; }
        .cfm-footer {
          display: flex; gap: 12px; justify-content: flex-end;
          padding: 0 28px 24px;
        }
        .cfm-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 20px; border-radius: 10px;
          font-family: 'Inter', sans-serif;
          font-size: 14px; font-weight: 500;
          cursor: pointer; border: none;
          transition: opacity 0.15s, transform 0.1s;
        }
        .cfm-btn:active { transform: scale(0.97); }
        .cfm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .cfm-btn-cancel {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: #d7c3ae;
        }
        .cfm-btn-cancel:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
        .cfm-btn-save {
          background: #f5a524;
          color: #000;
          font-weight: 600;
          box-shadow: 0 0 16px rgba(245,165,36,0.35);
        }
        .cfm-btn-save:hover:not(:disabled) { opacity: 0.88; }
        .cfm-divider {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase;
          color: rgba(215,195,174,0.4);
          display: flex; align-items: center; gap: 12px;
        }
        .cfm-divider::before, .cfm-divider::after {
          content: ''; flex: 1;
          height: 1px; background: rgba(255,255,255,0.06);
        }
        .cfm-spin {
          width: 14px; height: 14px; border-radius: 50%;
          border: 2px solid rgba(0,0,0,0.3);
          border-top-color: #000;
          animation: cfm-spin 0.6s linear infinite;
        }
        @keyframes cfm-spin { to { transform: rotate(360deg) } }
      `}</style>

      <div className="cfm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div className="cfm-panel" role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit Pelanggan' : 'Tambah Pelanggan'}>

          {/* Header */}
          <div className="cfm-header">
            <div className="cfm-title">
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#f5a524' }}>
                {isEdit ? 'edit' : 'person_add'}
              </span>
              {isEdit ? 'Edit Pelanggan' : 'Tambah Pelanggan'}
            </div>
            <button className="cfm-close" onClick={onClose} aria-label="Tutup">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="cfm-body">

              {/* Nama & Status */}
              <div className="cfm-row two">
                <div className="cfm-field">
                  <label className="cfm-label">Nama Lengkap *</label>
                  <input
                    ref={inputRef}
                    className={`cfm-input${errors.name ? ' error' : ''}`}
                    value={form.name}
                    onChange={e => field('name', e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    maxLength={150}
                    disabled={isPending}
                  />
                  {errors.name && <span className="cfm-error">{errors.name}</span>}
                </div>
                <div className="cfm-field">
                  <label className="cfm-label">Status</label>
                  <select
                    className="cfm-select"
                    value={form.status}
                    onChange={e => field('status', e.target.value)}
                    disabled={isPending}
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Telepon & Email */}
              <div className="cfm-row two">
                <div className="cfm-field">
                  <label className="cfm-label">Nomor Telepon *</label>
                  <input
                    className={`cfm-input${errors.phone ? ' error' : ''}`}
                    value={form.phone}
                    onChange={e => field('phone', e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    maxLength={20}
                    type="tel"
                    disabled={isPending}
                  />
                  {errors.phone && <span className="cfm-error">{errors.phone}</span>}
                </div>
                <div className="cfm-field">
                  <label className="cfm-label">Email</label>
                  <input
                    className={`cfm-input${errors.email ? ' error' : ''}`}
                    value={form.email ?? ''}
                    onChange={e => field('email', e.target.value)}
                    placeholder="budi@email.com"
                    type="email"
                    disabled={isPending}
                  />
                  {errors.email && <span className="cfm-error">{errors.email}</span>}
                </div>
              </div>

              {/* Alamat */}
              <div className="cfm-field">
                <label className="cfm-label">Alamat *</label>
                <textarea
                  className={`cfm-textarea${errors.address ? ' error' : ''}`}
                  value={form.address}
                  onChange={e => field('address', e.target.value)}
                  placeholder="Jl. Contoh No. 1, RT 01/RW 02, Kelurahan..."
                  disabled={isPending}
                />
                {errors.address && <span className="cfm-error">{errors.address}</span>}
              </div>

              {/* Tanggal Bergabung */}
              <div className="cfm-row two">
                <div className="cfm-field">
                  <label className="cfm-label">Tanggal Bergabung</label>
                  <input
                    className="cfm-input"
                    type="date"
                    value={form.joined_at ?? ''}
                    onChange={e => field('joined_at', e.target.value)}
                    disabled={isPending}
                  />
                </div>
              </div>

              {/* Koordinat — opsional */}
              <div className="cfm-divider">Koordinat GPS (opsional)</div>
              <div className="cfm-row two">
                <div className="cfm-field">
                  <label className="cfm-label">Latitude</label>
                  <input
                    className={`cfm-input${errors.coordinate_lat ? ' error' : ''}`}
                    type="number"
                    step="any"
                    value={form.coordinate_lat ?? ''}
                    onChange={e => setForm(prev => ({ ...prev, coordinate_lat: e.target.value ? Number(e.target.value) : null }))}
                    placeholder="-7.2575"
                    disabled={isPending}
                  />
                  {errors.coordinate_lat && <span className="cfm-error">{errors.coordinate_lat}</span>}
                </div>
                <div className="cfm-field">
                  <label className="cfm-label">Longitude</label>
                  <input
                    className={`cfm-input${errors.coordinate_lng ? ' error' : ''}`}
                    type="number"
                    step="any"
                    value={form.coordinate_lng ?? ''}
                    onChange={e => setForm(prev => ({ ...prev, coordinate_lng: e.target.value ? Number(e.target.value) : null }))}
                    placeholder="112.7521"
                    disabled={isPending}
                  />
                  {errors.coordinate_lng && <span className="cfm-error">{errors.coordinate_lng}</span>}
                </div>
              </div>

              {/* Server error */}
              {saveMutation.isError && !Object.keys(errors).length && (
                <div style={{
                  background: 'rgba(255,80,80,0.08)',
                  border: '1px solid rgba(255,80,80,0.25)',
                  borderRadius: 10, padding: '12px 16px',
                  color: '#ff8080', fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                  {(saveMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Terjadi kesalahan, coba lagi.'}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="cfm-footer">
              <button type="button" className="cfm-btn cfm-btn-cancel" onClick={onClose} disabled={isPending}>
                Batal
              </button>
              <button type="submit" className="cfm-btn cfm-btn-save" disabled={isPending}>
                {isPending ? <><div className="cfm-spin" /> Menyimpan…</> : <>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>
                  {isEdit ? 'Simpan Perubahan' : 'Tambah Pelanggan'}
                </>}
              </button>
            </div>
          </form>

        </div>
      </div>
    </>
  )
}
