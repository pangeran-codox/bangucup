import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthQuery } from '@/hooks/useAuthQuery'
import { customersApi } from '@/services/api/customers'
import { CustomerFormModal } from './CustomerFormModal'
import { formatDate } from '@/lib/utils'
import type { Customer, CustomerStatus, CustomerListParams, PaginatedResponse } from '@/types'

// ─── Status config ────────────────────────────────────────────────
const STATUS_CONFIG: Record<CustomerStatus, { label: string; color: string; bg: string; dot: string }> = {
  active:   { label: 'Aktif',       color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  dot: '#4ade80' },
  isolir:   { label: 'Isolir',      color: '#f97316', bg: 'rgba(249,115,22,0.1)',  dot: '#f97316' },
  inactive: { label: 'Tidak Aktif', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', dot: '#94a3b8' },
  pending:  { label: 'Pending',     color: '#facc15', bg: 'rgba(250,204,21,0.1)',  dot: '#facc15' },
}

const STATUS_FILTER_OPTIONS = [
  { value: '',         label: 'Semua Status' },
  { value: 'active',   label: 'Aktif' },
  { value: 'isolir',   label: 'Isolir' },
  { value: 'inactive', label: 'Tidak Aktif' },
  { value: 'pending',  label: 'Pending' },
]

const PER_PAGE = 20

// ─── Sub-components ───────────────────────────────────────────────
function StatusBadge({ status }: { status: CustomerStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 9999,
      background: cfg.bg,
      color: cfg.color,
      fontSize: 12, fontWeight: 600,
      fontFamily: 'Inter, sans-serif',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

function SkeletonRow() {
  return (
    <tr>
      {[140, 110, 130, 70, 90, 80].map((w, i) => (
        <td key={i} style={{ padding: '16px 20px' }}>
          <div style={{
            height: 14, width: w, borderRadius: 6,
            background: 'rgba(255,255,255,0.06)',
            animation: 'cp-shimmer 1.4s ease infinite',
          }} />
        </td>
      ))}
    </tr>
  )
}

function DeleteConfirmModal({
  customer,
  onConfirm,
  onCancel,
  isPending,
}: {
  customer: Customer
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 70,
      background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div style={{
        background: '#121317',
        border: '1px solid rgba(255,80,80,0.25)',
        borderRadius: 18, padding: '32px 28px',
        width: '100%', maxWidth: 400,
        boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
        animation: 'cp-slide-up 0.18s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'rgba(255,80,80,0.1)',
            border: '1px solid rgba(255,80,80,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#ff6060' }}>
              delete
            </span>
          </div>
          <div>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, fontSize: 16, color: '#e2e2e8' }}>
              Hapus Pelanggan
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>Tindakan ini tidak dapat dibatalkan</div>
          </div>
        </div>
        <p style={{ fontSize: 14, color: '#d7c3ae', lineHeight: 1.6, marginBottom: 24 }}>
          Yakin ingin menghapus pelanggan <strong style={{ color: '#e2e2e8' }}>{customer.name}</strong>?
          Data yang terkait (langganan, invoice) juga akan terpengaruh.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={isPending}
            style={{
              padding: '9px 18px', borderRadius: 9, cursor: 'pointer',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#d7c3ae', fontSize: 14, fontFamily: 'Inter, sans-serif',
            }}
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            style={{
              padding: '9px 18px', borderRadius: 9, cursor: 'pointer',
              background: '#dc2626', border: 'none',
              color: '#fff', fontSize: 14, fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
              opacity: isPending ? 0.6 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {isPending
              ? <><div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'cp-spin 0.6s linear infinite' }} />Menghapus…</>
              : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>Hapus</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
export default function CustomersPage() {
  const qc = useQueryClient()

  // State filter & pagination
  const [search, setSearch]     = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | ''>('')
  const [page, setPage]         = useState(1)

  // Modal state
  const [formOpen, setFormOpen]         = useState(false)
  const [editTarget, setEditTarget]     = useState<Customer | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)

  // Query
  const params: CustomerListParams = {
    ...(search       ? { search }              : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    page,
    per_page: PER_PAGE,
  }

  const { data, isLoading, isFetching, isError } = useAuthQuery<PaginatedResponse<Customer>>({
    queryKey: ['customers', params],
    queryFn: () => customersApi.list(params),
  })

  const customers = data?.data ?? []
  const meta      = data?.meta

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => customersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      setDeleteTarget(null)
    },
  })

  // Search submit (enter / button)
  const handleSearch = useCallback(() => {
    setSearch(searchInput.trim())
    setPage(1)
  }, [searchInput])

  function openAdd() {
    setEditTarget(null)
    setFormOpen(true)
  }

  function openEdit(c: Customer) {
    setEditTarget(c)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditTarget(null)
  }

  // Pagination helpers
  const totalPages  = meta?.last_page ?? 1
  const totalItems  = meta?.total ?? 0
  const rangeStart  = totalItems === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const rangeEnd    = Math.min(page * PER_PAGE, totalItems)

  return (
    <>
      <style>{`
        @keyframes cp-shimmer {
          0%, 100% { opacity: 0.5 }
          50%       { opacity: 1   }
        }
        @keyframes cp-slide-up {
          from { transform: translateY(14px); opacity: 0 }
          to   { transform: translateY(0);    opacity: 1 }
        }
        @keyframes cp-spin { to { transform: rotate(360deg) } }

        .cp-wrap { max-width: 1280px; margin: 0 auto; padding: 32px 32px 64px; }

        /* Header */
        .cp-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          flex-wrap: wrap; gap: 16px; margin-bottom: 28px;
        }
        .cp-page-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 26px; font-weight: 700; color: #e2e2e8;
          display: flex; align-items: center; gap: 12px;
        }
        .cp-page-title-icon {
          width: 42px; height: 42px; border-radius: 12px;
          background: rgba(245,165,36,0.12);
          border: 1px solid rgba(245,165,36,0.25);
          display: flex; align-items: center; justify-content: center;
        }
        .cp-subtitle { font-size: 14px; color: #94a3b8; margin-top: 4px; }

        /* Toolbar */
        .cp-toolbar {
          display: flex; flex-wrap: wrap; gap: 10px;
          margin-bottom: 20px; align-items: center;
        }
        .cp-search-wrap {
          display: flex; align-items: center;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; overflow: hidden;
          flex: 1; min-width: 220px; max-width: 360px;
          transition: border-color 0.15s;
        }
        .cp-search-wrap:focus-within {
          border-color: rgba(245,165,36,0.4);
          box-shadow: 0 0 0 3px rgba(245,165,36,0.07);
        }
        .cp-search-icon {
          padding: 0 12px; color: #94a3b8;
          display: flex; align-items: center; pointer-events: none;
        }
        .cp-search-input {
          flex: 1; background: transparent; border: none; outline: none;
          color: #e2e2e8; font-family: 'Inter', sans-serif; font-size: 14px;
          padding: 10px 0;
        }
        .cp-search-input::placeholder { color: #64748b; }
        .cp-search-btn {
          padding: 0 14px; height: 100%; background: rgba(245,165,36,0.1);
          border: none; border-left: 1px solid rgba(255,255,255,0.08);
          color: #f5a524; cursor: pointer; font-size: 13px;
          font-family: 'Inter', sans-serif; font-weight: 500;
          transition: background 0.15s;
          display: flex; align-items: center; gap: 4px;
        }
        .cp-search-btn:hover { background: rgba(245,165,36,0.18); }
        .cp-filter-select {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; padding: 10px 14px;
          color: #e2e2e8; font-size: 14px;
          font-family: 'Inter', sans-serif;
          cursor: pointer; outline: none;
          transition: border-color 0.15s;
        }
        .cp-filter-select:focus {
          border-color: rgba(245,165,36,0.4);
        }
        .cp-filter-select option { background: #1e2024; }
        .cp-add-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 18px; border-radius: 10px;
          background: #f5a524; border: none;
          color: #000; font-family: 'Inter', sans-serif;
          font-size: 14px; font-weight: 600;
          cursor: pointer; margin-left: auto;
          box-shadow: 0 0 16px rgba(245,165,36,0.3);
          transition: opacity 0.15s, transform 0.1s;
          white-space: nowrap;
        }
        .cp-add-btn:hover  { opacity: 0.88; }
        .cp-add-btn:active { transform: scale(0.97); }

        /* Table card */
        .cp-card {
          background: rgba(18,19,23,0.8);
          border: 1px solid rgba(245,165,36,0.12);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 32px rgba(0,0,0,0.35);
        }
        .cp-table-wrap { overflow-x: auto; }
        table.cp-table {
          width: 100%; border-collapse: collapse;
          min-width: 680px;
        }
        .cp-table thead tr {
          background: rgba(255,255,255,0.03);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .cp-table th {
          padding: 14px 20px; text-align: left;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: #64748b; white-space: nowrap;
        }
        .cp-table tbody tr {
          border-bottom: 1px solid rgba(255,255,255,0.04);
          transition: background 0.12s;
        }
        .cp-table tbody tr:last-child { border-bottom: none; }
        .cp-table tbody tr:hover { background: rgba(245,165,36,0.04); }
        .cp-table td {
          padding: 14px 20px; font-size: 14px; color: #e2e2e8;
          font-family: 'Inter', sans-serif; vertical-align: middle;
        }
        .cp-name-cell { display: flex; align-items: center; gap: 12px; }
        .cp-avatar {
          width: 36px; height: 36px; border-radius: 10px;
          background: rgba(245,165,36,0.1);
          border: 1px solid rgba(245,165,36,0.2);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 14px; font-weight: 700; color: #f5a524;
          flex-shrink: 0;
        }
        .cp-name  { font-weight: 500; color: #e2e2e8; }
        .cp-email { font-size: 12px; color: #64748b; margin-top: 1px; }
        .cp-phone { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #d7c3ae; }
        .cp-date  { font-size: 13px; color: #94a3b8; white-space: nowrap; }
        .cp-action-cell { display: flex; align-items: center; gap: 6px; }
        .cp-action-btn {
          width: 32px; height: 32px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: #94a3b8; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .cp-action-btn:hover.edit   { border-color: rgba(245,165,36,0.35); color: #f5a524; background: rgba(245,165,36,0.08); }
        .cp-action-btn:hover.delete { border-color: rgba(239,68,68,0.35);  color: #f87171; background: rgba(239,68,68,0.08); }

        /* Empty & error states */
        .cp-empty {
          padding: 72px 32px; text-align: center;
        }
        .cp-empty-icon {
          width: 64px; height: 64px; border-radius: 18px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 16px;
        }
        .cp-empty-title { font-family: 'Space Grotesk', sans-serif; font-size: 17px; font-weight: 600; color: #e2e2e8; margin-bottom: 6px; }
        .cp-empty-sub   { font-size: 13px; color: #64748b; }

        /* Footer / pagination */
        .cp-footer {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 12px;
          padding: 16px 20px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .cp-footer-info {
          font-size: 13px; color: #64748b;
          font-family: 'Inter', sans-serif;
        }
        .cp-pagination { display: flex; align-items: center; gap: 6px; }
        .cp-page-btn {
          min-width: 34px; height: 34px; padding: 0 8px;
          border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: #d7c3ae; font-size: 13px;
          font-family: 'Inter', sans-serif;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .cp-page-btn:hover:not(:disabled) {
          border-color: rgba(245,165,36,0.3); color: #f5a524;
        }
        .cp-page-btn.active {
          background: rgba(245,165,36,0.15);
          border-color: rgba(245,165,36,0.4);
          color: #f5a524; font-weight: 600;
        }
        .cp-page-btn:disabled {
          opacity: 0.3; cursor: not-allowed;
        }

        /* Loading overlay */
        .cp-loading-bar {
          height: 2px;
          background: linear-gradient(90deg, transparent, #f5a524, transparent);
          background-size: 200% 100%;
          animation: cp-loading-slide 1.2s ease infinite;
        }
        @keyframes cp-loading-slide {
          0%   { background-position: 200% 0 }
          100% { background-position: -200% 0 }
        }
      `}</style>

      {/* Loading bar saat refetch */}
      {isFetching && !isLoading && (
        <div className="cp-loading-bar" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }} />
      )}

      <div className="cp-wrap">
        {/* ─── Header ─── */}
        <div className="cp-header">
          <div>
            <div className="cp-page-title">
              <div className="cp-page-title-icon">
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#f5a524' }}>group</span>
              </div>
              Pelanggan
            </div>
            <div className="cp-subtitle">
              {isLoading ? 'Memuat data…' : `${totalItems} pelanggan terdaftar`}
            </div>
          </div>
          <button className="cp-add-btn" onClick={openAdd}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span>
            Tambah Pelanggan
          </button>
        </div>

        {/* ─── Toolbar ─── */}
        <div className="cp-toolbar">
          {/* Search */}
          <div className="cp-search-wrap">
            <span className="cp-search-icon">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>search</span>
            </span>
            <input
              className="cp-search-input"
              placeholder="Cari nama, telepon, email…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button className="cp-search-btn" onClick={handleSearch}>Cari</button>
          </div>

          {/* Status filter */}
          <select
            className="cp-filter-select"
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value as CustomerStatus | '')
              setPage(1)
            }}
          >
            {STATUS_FILTER_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Clear filters */}
          {(search || statusFilter) && (
            <button
              onClick={() => { setSearch(''); setSearchInput(''); setStatusFilter(''); setPage(1) }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#94a3b8', fontSize: 13, cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>filter_alt_off</span>
              Reset
            </button>
          )}
        </div>

        {/* ─── Table card ─── */}
        <div className="cp-card">
          {isError ? (
            <div className="cp-empty">
              <div className="cp-empty-icon">
                <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#f87171' }}>wifi_off</span>
              </div>
              <div className="cp-empty-title">Gagal memuat data</div>
              <div className="cp-empty-sub">Periksa koneksi atau coba refresh halaman</div>
            </div>
          ) : (
            <div className="cp-table-wrap">
              <table className="cp-table" aria-label="Tabel Pelanggan">
                <thead>
                  <tr>
                    <th>Pelanggan</th>
                    <th>Telepon</th>
                    <th>Alamat</th>
                    <th>Status</th>
                    <th>Bergabung</th>
                    <th style={{ textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                    : customers.length === 0
                      ? (
                        <tr>
                          <td colSpan={6}>
                            <div className="cp-empty">
                              <div className="cp-empty-icon">
                                <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#64748b' }}>
                                  {search || statusFilter ? 'search_off' : 'group'}
                                </span>
                              </div>
                              <div className="cp-empty-title">
                                {search || statusFilter ? 'Tidak ada hasil' : 'Belum ada pelanggan'}
                              </div>
                              <div className="cp-empty-sub">
                                {search || statusFilter
                                  ? 'Coba ubah kata kunci atau filter status'
                                  : 'Klik "Tambah Pelanggan" untuk menambahkan pelanggan pertama'}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                      : customers.map(c => (
                        <tr key={c.id}>
                          {/* Nama */}
                          <td>
                            <div className="cp-name-cell">
                              <div className="cp-avatar" aria-hidden="true">
                                {c.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="cp-name">{c.name}</div>
                                {c.email && <div className="cp-email">{c.email}</div>}
                              </div>
                            </div>
                          </td>
                          {/* Telepon */}
                          <td>
                            <span className="cp-phone">{c.phone}</span>
                          </td>
                          {/* Alamat */}
                          <td>
                            <span style={{
                              fontSize: 13, color: '#94a3b8',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              maxWidth: 220,
                            }}>
                              {c.address}
                            </span>
                          </td>
                          {/* Status */}
                          <td><StatusBadge status={c.status} /></td>
                          {/* Tanggal */}
                          <td>
                            <span className="cp-date">
                              {c.joined_at ? formatDate(c.joined_at) : '—'}
                            </span>
                          </td>
                          {/* Aksi */}
                          <td>
                            <div className="cp-action-cell" style={{ justifyContent: 'flex-end' }}>
                              <button
                                className="cp-action-btn edit"
                                title="Edit pelanggan"
                                aria-label={`Edit ${c.name}`}
                                onClick={() => openEdit(c)}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                              </button>
                              <button
                                className="cp-action-btn delete"
                                title="Hapus pelanggan"
                                aria-label={`Hapus ${c.name}`}
                                onClick={() => setDeleteTarget(c)}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
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

          {/* ─── Footer / Pagination ─── */}
          {!isLoading && !isError && totalItems > 0 && (
            <div className="cp-footer">
              <span className="cp-footer-info">
                Menampilkan {rangeStart}–{rangeEnd} dari {totalItems} pelanggan
              </span>
              <div className="cp-pagination" aria-label="Navigasi halaman">
                {/* Prev */}
                <button
                  className="cp-page-btn"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  aria-label="Halaman sebelumnya"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span>
                </button>

                {/* Page numbers */}
                {getPaginationRange(page, totalPages).map((p, i) =>
                  p === '…' ? (
                    <span key={`ellipsis-${i}`} style={{ color: '#64748b', padding: '0 4px', fontSize: 13 }}>…</span>
                  ) : (
                    <button
                      key={p}
                      className={`cp-page-btn${p === page ? ' active' : ''}`}
                      onClick={() => setPage(p as number)}
                      aria-label={`Halaman ${p}`}
                      aria-current={p === page ? 'page' : undefined}
                    >
                      {p}
                    </button>
                  )
                )}

                {/* Next */}
                <button
                  className="cp-page-btn"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  aria-label="Halaman berikutnya"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Form Modal (add / edit) ─── */}
      <CustomerFormModal
        open={formOpen}
        onClose={closeForm}
        customer={editTarget}
      />

      {/* ─── Delete Confirm Modal ─── */}
      {deleteTarget && (
        <DeleteConfirmModal
          customer={deleteTarget}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          isPending={deleteMutation.isPending}
        />
      )}
    </>
  )
}

// ─── Pagination range helper ──────────────────────────────────────
function getPaginationRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '…')[] = [1]

  if (current > 3)      pages.push('…')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p)
  }
  if (current < total - 2) pages.push('…')

  pages.push(total)
  return pages
}
