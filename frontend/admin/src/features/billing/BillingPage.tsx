import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthQuery } from '@/hooks/useAuthQuery'
import { invoicesApi } from '@/services/api/invoices'
import { paymentsApi } from '@/services/api/payments'
import { formatCurrency, formatDate } from '@/lib/utils'
import type {
  Invoice, InvoiceStatus, InvoiceListParams, InvoiceType,
  Payment, PaymentStatus, PaymentListParams,
  PaginatedResponse,
} from '@/types'

// ─── Config maps ─────────────────────────────────────────────────
const INVOICE_STATUS: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  unpaid:  { label: 'Belum Bayar', color: '#facc15', bg: 'rgba(250,204,21,.12)'  },
  paid:    { label: 'Lunas',       color: '#4ade80', bg: 'rgba(74,222,128,.12)'  },
  overdue: { label: 'Jatuh Tempo', color: '#f87171', bg: 'rgba(248,113,113,.12)' },
}

const INVOICE_TYPE: Record<InvoiceType, string> = {
  installation: 'Instalasi',
  monthly:      'Bulanan',
  other:        'Lainnya',
}

const PAYMENT_STATUS: Record<PaymentStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending',  color: '#facc15', bg: 'rgba(250,204,21,.12)'  },
  success: { label: 'Sukses',   color: '#4ade80', bg: 'rgba(74,222,128,.12)'  },
  failed:  { label: 'Gagal',    color: '#f87171', bg: 'rgba(248,113,113,.12)' },
  expired: { label: 'Kedaluwarsa', color: '#94a3b8', bg: 'rgba(148,163,184,.12)' },
}

const PAYMENT_GATEWAY: Record<string, string> = {
  midtrans: 'Midtrans',
  xendit:   'Xendit',
  manual:   'Manual',
  other:    'Lainnya',
}

const PER_PAGE = 20

// ─── Shared helpers ───────────────────────────────────────────────
function StatusBadge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 9999,
      background: bg, color, fontSize: 12, fontWeight: 600,
      fontFamily: 'Inter,sans-serif', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
      {label}
    </span>
  )
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '14px 18px' }}>
          <div style={{ height: 13, width: [130, 90, 110, 70, 80, 80][i] ?? 80, borderRadius: 6, background: 'rgba(255,255,255,.06)', animation: 'bl-shimmer 1.4s ease infinite' }} />
        </td>
      ))}
    </tr>
  )
}

function Pagination({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  if (total <= 1) return null
  const range = getPaginationRange(page, total)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <PgBtn disabled={page <= 1} onClick={() => onPage(page - 1)} aria="Sebelumnya">
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span>
      </PgBtn>
      {range.map((p, i) =>
        p === '…'
          ? <span key={`e${i}`} style={{ color: '#64748b', padding: '0 4px', fontSize: 13 }}>…</span>
          : <PgBtn key={p} active={p === page} onClick={() => onPage(p as number)} aria={`Halaman ${p}`}>{p}</PgBtn>
      )}
      <PgBtn disabled={page >= total} onClick={() => onPage(page + 1)} aria="Berikutnya">
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
      </PgBtn>
    </div>
  )
}

function PgBtn({ children, disabled, active, onClick, aria }: {
  children: React.ReactNode; disabled?: boolean; active?: boolean
  onClick: () => void; aria: string
}) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      aria-label={aria} aria-current={active ? 'page' : undefined}
      style={{
        minWidth: 34, height: 34, padding: '0 8px', borderRadius: 8,
        border: `1px solid ${active ? 'rgba(245,165,36,.4)' : 'rgba(255,255,255,.08)'}`,
        background: active ? 'rgba(245,165,36,.15)' : 'rgba(255,255,255,.04)',
        color: active ? '#f5a524' : '#d7c3ae',
        fontSize: 13, fontFamily: 'Inter,sans-serif', fontWeight: active ? 600 : 400,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.3 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >{children}</button>
  )
}

// ─── Mark Paid Confirm ────────────────────────────────────────────
function MarkPaidConfirm({ invoice, onConfirm, onCancel, isPending }: {
  invoice: Invoice; onConfirm: () => void; onCancel: () => void; isPending: boolean
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,.78)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div style={{ background: '#121317', border: '1px solid rgba(74,222,128,.25)', borderRadius: 18, padding: '28px 24px', width: '100%', maxWidth: 400, boxShadow: '0 24px 80px rgba(0,0,0,.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#4ade80' }}>check_circle</span>
          </div>
          <div>
            <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontWeight: 600, fontSize: 16, color: '#e2e2e8' }}>Tandai Lunas</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Invoice {invoice.invoice_number}</div>
          </div>
        </div>
        <p style={{ fontSize: 14, color: '#d7c3ae', lineHeight: 1.6, marginBottom: 8 }}>
          Tandai invoice <strong style={{ color: '#e2e2e8' }}>{invoice.invoice_number}</strong> milik{' '}
          <strong style={{ color: '#e2e2e8' }}>{invoice.customer?.name ?? `Customer #${invoice.customer_id}`}</strong> sebagai lunas?
        </p>
        <div style={{ background: 'rgba(74,222,128,.06)', border: '1px solid rgba(74,222,128,.15)', borderRadius: 10, padding: '10px 14px', marginBottom: 22 }}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 2 }}>Total tagihan</div>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 18, fontWeight: 700, color: '#4ade80' }}>
            {formatCurrency(invoice.final_amount)}
          </div>
        </div>
        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 20, lineHeight: 1.5 }}>
          Jika langganan sedang di-isolir dan tidak ada tagihan lain, isolir akan otomatis dicabut.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} disabled={isPending} style={{ padding: '9px 16px', borderRadius: 9, cursor: 'pointer', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#d7c3ae', fontSize: 13, fontFamily: 'Inter,sans-serif' }}>Batal</button>
          <button onClick={onConfirm} disabled={isPending} style={{ padding: '9px 18px', borderRadius: 9, cursor: 'pointer', background: '#16a34a', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'Inter,sans-serif', opacity: isPending ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            {isPending
              ? <><div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'bl-spin .6s linear infinite' }} />Memproses…</>
              : <><span className="material-symbols-outlined" style={{ fontSize: 15 }}>check_circle</span>Ya, Tandai Lunas</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Invoices Tab ─────────────────────────────────────────────────
function InvoicesTab() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('')
  const [from, setFrom]   = useState('')
  const [to, setTo]       = useState('')
  const [page, setPage]   = useState(1)
  const [markTarget, setMarkTarget] = useState<Invoice | null>(null)

  const params: InvoiceListParams = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(from         ? { from }                 : {}),
    ...(to           ? { to }                   : {}),
    page, per_page: PER_PAGE,
  }

  const { data, isLoading, isError } = useAuthQuery<PaginatedResponse<Invoice>>({
    queryKey: ['invoices', params],
    queryFn: () => invoicesApi.list(params),
  })

  const markPaidMutation = useMutation({
    mutationFn: (id: number) => invoicesApi.markPaid(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); setMarkTarget(null) },
  })

  const invoices   = data?.data ?? []
  const meta       = data?.meta
  const totalPages = meta?.last_page ?? 1
  const totalItems = meta?.total ?? 0
  const rangeStart = totalItems === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const rangeEnd   = Math.min(page * PER_PAGE, totalItems)

  function resetFilters() { setStatusFilter(''); setFrom(''); setTo(''); setPage(1) }
  const hasFilter = !!(statusFilter || from || to)

  return (
    <>
      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <select
          className="bl-select"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as InvoiceStatus | ''); setPage(1) }}
        >
          <option value="">Semua Status</option>
          <option value="unpaid">Belum Bayar</option>
          <option value="paid">Lunas</option>
          <option value="overdue">Jatuh Tempo</option>
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'Inter,sans-serif', whiteSpace: 'nowrap' }}>Due date</span>
          <input type="date" className="bl-input-date" value={from} onChange={e => { setFrom(e.target.value); setPage(1) }} />
          <span style={{ color: '#64748b', fontSize: 12 }}>–</span>
          <input type="date" className="bl-input-date" value={to} onChange={e => { setTo(e.target.value); setPage(1) }} />
        </div>
        {hasFilter && (
          <button className="bl-reset-btn" onClick={resetFilters}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>filter_alt_off</span>
            Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bl-card">
        {isError ? (
          <EmptyState icon="wifi_off" title="Gagal memuat data" sub="Periksa koneksi atau refresh halaman" error />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="bl-table" aria-label="Tabel Invoice">
              <thead>
                <tr>
                  <th>No. Invoice</th>
                  <th>Pelanggan</th>
                  <th>Tipe</th>
                  <th>Tagihan</th>
                  <th>Jatuh Tempo</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
                  : invoices.length === 0
                    ? <tr><td colSpan={7}><EmptyState icon={hasFilter ? 'search_off' : 'receipt_long'} title={hasFilter ? 'Tidak ada hasil' : 'Belum ada invoice'} sub={hasFilter ? 'Coba ubah filter' : 'Invoice akan muncul di sini setelah dibuat'} /></td></tr>
                    : invoices.map(inv => {
                      const sc = INVOICE_STATUS[inv.status]
                      return (
                        <tr key={inv.id}>
                          <td>
                            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 13, color: '#f5a524' }}>
                              {inv.invoice_number}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 500, color: '#e2e2e8', fontSize: 14 }}>
                              {inv.customer?.name ?? `#${inv.customer_id}`}
                            </div>
                            {inv.period_month && (
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 1, fontFamily: 'JetBrains Mono,monospace' }}>
                                {inv.period_month.slice(0, 7)}
                              </div>
                            )}
                          </td>
                          <td>
                            <span style={{ fontSize: 12, color: '#94a3b8', background: 'rgba(255,255,255,.05)', padding: '3px 8px', borderRadius: 6 }}>
                              {INVOICE_TYPE[inv.type]}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 14, fontWeight: 600, color: '#e2e2e8' }}>
                              {formatCurrency(inv.final_amount)}
                            </div>
                            {inv.discount_amount > 0 && (
                              <div style={{ fontSize: 11, color: '#4ade80', marginTop: 1 }}>
                                Diskon {formatCurrency(inv.discount_amount)}
                              </div>
                            )}
                          </td>
                          <td>
                            <span style={{ fontSize: 13, color: inv.status === 'overdue' ? '#f87171' : '#94a3b8', whiteSpace: 'nowrap' }}>
                              {formatDate(inv.due_date)}
                            </span>
                          </td>
                          <td><StatusBadge label={sc.label} color={sc.color} bg={sc.bg} /></td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              {inv.status !== 'paid' && (
                                <button
                                  onClick={() => setMarkTarget(inv)}
                                  title="Tandai lunas"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.2)', color: '#4ade80', fontSize: 12, fontWeight: 600, fontFamily: 'Inter,sans-serif', transition: 'background .15s', whiteSpace: 'nowrap' }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>
                                  Lunas
                                </button>
                              )}
                              {inv.paid_at && (
                                <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'Inter,sans-serif', alignSelf: 'center' }}>
                                  {formatDate(inv.paid_at)}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                }
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {!isLoading && !isError && totalItems > 0 && (
          <div className="bl-footer">
            <span className="bl-footer-info">
              {rangeStart}–{rangeEnd} dari {totalItems} invoice
            </span>
            <Pagination page={page} total={totalPages} onPage={setPage} />
          </div>
        )}
      </div>

      {/* Mark paid confirm */}
      {markTarget && (
        <MarkPaidConfirm
          invoice={markTarget}
          onConfirm={() => markPaidMutation.mutate(markTarget.id)}
          onCancel={() => setMarkTarget(null)}
          isPending={markPaidMutation.isPending}
        />
      )}
    </>
  )
}

// ─── Payments Tab ─────────────────────────────────────────────────
function PaymentsTab() {
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('')
  const [page, setPage] = useState(1)

  const params: PaymentListParams = {
    ...(statusFilter ? { status: statusFilter } : {}),
    page, per_page: PER_PAGE,
  }

  const { data, isLoading, isError } = useAuthQuery<PaginatedResponse<Payment>>({
    queryKey: ['payments', params],
    queryFn: () => paymentsApi.list(params),
  })

  const payments   = data?.data ?? []
  const meta       = data?.meta
  const totalPages = meta?.last_page ?? 1
  const totalItems = meta?.total ?? 0
  const rangeStart = totalItems === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const rangeEnd   = Math.min(page * PER_PAGE, totalItems)
  const hasFilter  = !!statusFilter

  return (
    <>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          className="bl-select"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as PaymentStatus | ''); setPage(1) }}
        >
          <option value="">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="success">Sukses</option>
          <option value="failed">Gagal</option>
          <option value="expired">Kedaluwarsa</option>
        </select>
        {hasFilter && (
          <button className="bl-reset-btn" onClick={() => { setStatusFilter(''); setPage(1) }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>filter_alt_off</span>
            Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bl-card">
        {isError ? (
          <EmptyState icon="wifi_off" title="Gagal memuat data" sub="Periksa koneksi atau refresh halaman" error />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="bl-table" aria-label="Tabel Pembayaran">
              <thead>
                <tr>
                  <th>#ID</th>
                  <th>Invoice</th>
                  <th>Pelanggan</th>
                  <th>Gateway</th>
                  <th>Metode</th>
                  <th>Jumlah</th>
                  <th>Status</th>
                  <th>Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
                  : payments.length === 0
                    ? <tr><td colSpan={8}><EmptyState icon={hasFilter ? 'search_off' : 'payments'} title={hasFilter ? 'Tidak ada hasil' : 'Belum ada pembayaran'} sub={hasFilter ? 'Coba ubah filter' : 'Riwayat pembayaran akan muncul di sini'} /></td></tr>
                    : payments.map(pay => {
                      const sc = PAYMENT_STATUS[pay.status]
                      return (
                        <tr key={pay.id}>
                          <td><span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 12, color: '#64748b' }}>#{pay.id}</span></td>
                          <td>
                            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 12, color: '#f5a524' }}>
                              {pay.invoice?.invoice_number ?? `#${pay.invoice_id}`}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: 14, color: '#e2e2e8', fontWeight: 500 }}>
                              {pay.invoice?.customer?.name ?? '—'}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: 12, background: 'rgba(255,255,255,.05)', color: '#d7c3ae', padding: '3px 8px', borderRadius: 6 }}>
                              {PAYMENT_GATEWAY[pay.gateway] ?? pay.gateway}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: 12, color: '#94a3b8' }}>{pay.method ?? '—'}</span>
                          </td>
                          <td>
                            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 14, fontWeight: 600, color: '#e2e2e8' }}>
                              {formatCurrency(pay.amount)}
                            </span>
                          </td>
                          <td><StatusBadge label={sc.label} color={sc.color} bg={sc.bg} /></td>
                          <td>
                            <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                              {pay.paid_at ? formatDate(pay.paid_at) : pay.created_at ? formatDate(pay.created_at) : '—'}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                }
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {!isLoading && !isError && totalItems > 0 && (
          <div className="bl-footer">
            <span className="bl-footer-info">
              {rangeStart}–{rangeEnd} dari {totalItems} pembayaran
            </span>
            <Pagination page={page} total={totalPages} onPage={setPage} />
          </div>
        )}
      </div>
    </>
  )
}

// ─── Empty state ──────────────────────────────────────────────────
function EmptyState({ icon, title, sub, error }: { icon: string; title: string; sub: string; error?: boolean }) {
  return (
    <div style={{ padding: '60px 32px', textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: error ? 'rgba(248,113,113,.08)' : 'rgba(255,255,255,.04)', border: `1px solid ${error ? 'rgba(248,113,113,.2)' : 'rgba(255,255,255,.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 26, color: error ? '#f87171' : '#64748b' }}>{icon}</span>
      </div>
      <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 16, fontWeight: 600, color: '#e2e2e8', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#64748b' }}>{sub}</div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
type Tab = 'invoices' | 'payments'

export default function BillingPage() {
  const [tab, setTab] = useState<Tab>('invoices')

  // Summary stats (optional — reuse invoice query counts)
  const { data: invoiceData } = useAuthQuery<PaginatedResponse<Invoice>>({
    queryKey: ['invoices', { status: 'unpaid', page: 1, per_page: 1 }],
    queryFn: () => invoicesApi.list({ status: 'unpaid', per_page: 1 }),
  })
  const { data: overdueData } = useAuthQuery<PaginatedResponse<Invoice>>({
    queryKey: ['invoices', { status: 'overdue', page: 1, per_page: 1 }],
    queryFn: () => invoicesApi.list({ status: 'overdue', per_page: 1 }),
  })

  const unpaidCount  = invoiceData?.meta?.total ?? 0
  const overdueCount = overdueData?.meta?.total ?? 0

  return (
    <>
      <style>{`
        @keyframes bl-shimmer{0%,100%{opacity:.5}50%{opacity:1}}
        @keyframes bl-spin{to{transform:rotate(360deg)}}
        .bl-wrap{max-width:1280px;margin:0 auto;padding:32px 32px 64px}
        .bl-header{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:24px}
        .bl-title{font-family:'Space Grotesk',sans-serif;font-size:26px;font-weight:700;color:#e2e2e8;display:flex;align-items:center;gap:12px}
        .bl-title-icon{width:42px;height:42px;border-radius:12px;background:rgba(245,165,36,.12);border:1px solid rgba(245,165,36,.25);display:flex;align-items:center;justify-content:center}
        .bl-subtitle{font-size:14px;color:#94a3b8;margin-top:4px}

        /* Summary strip */
        .bl-summary{display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap}
        .bl-sum-card{display:flex;align-items:center;gap:10px;padding:12px 18px;background:rgba(18,19,23,.85);border:1px solid rgba(255,255,255,.07);border-radius:12px}
        .bl-sum-val{font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700}
        .bl-sum-lbl{font-size:12px;color:#64748b;margin-top:1px;font-family:'Inter',sans-serif}

        /* Tabs */
        .bl-tabs{display:flex;gap:4px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:4px;width:fit-content;margin-bottom:20px}
        .bl-tab{display:inline-flex;align-items:center;gap:8px;padding:9px 18px;border-radius:9px;border:none;cursor:pointer;font-family:'Inter',sans-serif;font-size:14px;font-weight:500;transition:all .15s}
        .bl-tab.active{background:#f5a524;color:#000;font-weight:600;box-shadow:0 2px 12px rgba(245,165,36,.3)}
        .bl-tab.inactive{background:transparent;color:#94a3b8}
        .bl-tab.inactive:hover{color:#e2e2e8;background:rgba(255,255,255,.05)}

        /* Controls */
        .bl-select{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px 14px;color:#e2e2e8;font-size:13px;font-family:'Inter',sans-serif;cursor:pointer;outline:none}
        .bl-select:focus{border-color:rgba(245,165,36,.4)}
        .bl-select option{background:#1e2024}
        .bl-input-date{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px 12px;color:#e2e2e8;font-size:13px;font-family:'Inter',sans-serif;outline:none;width:140px}
        .bl-input-date:focus{border-color:rgba(245,165,36,.4)}
        .bl-reset-btn{display:inline-flex;align-items:center;gap:5px;padding:9px 14px;borderRadius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:#94a3b8;font-size:13px;cursor:pointer;font-family:'Inter',sans-serif;border-radius:10px}
        .bl-reset-btn:hover{color:#e2e2e8}

        /* Table */
        .bl-card{background:rgba(18,19,23,.8);border:1px solid rgba(245,165,36,.1);border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,.3)}
        table.bl-table{width:100%;border-collapse:collapse;min-width:700px}
        .bl-table thead tr{background:rgba(255,255,255,.03);border-bottom:1px solid rgba(255,255,255,.06)}
        .bl-table th{padding:13px 18px;text-align:left;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;letter-spacing:.13em;text-transform:uppercase;color:#64748b;white-space:nowrap}
        .bl-table tbody tr{border-bottom:1px solid rgba(255,255,255,.04);transition:background .12s}
        .bl-table tbody tr:last-child{border-bottom:none}
        .bl-table tbody tr:hover{background:rgba(245,165,36,.03)}
        .bl-table td{padding:13px 18px;font-size:14px;color:#e2e2e8;font-family:'Inter',sans-serif;vertical-align:middle}

        /* Footer */
        .bl-footer{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:14px 18px;border-top:1px solid rgba(255,255,255,.06)}
        .bl-footer-info{font-size:13px;color:#64748b;font-family:'Inter',sans-serif}
      `}</style>

      <div className="bl-wrap">
        {/* Header */}
        <div className="bl-header">
          <div>
            <div className="bl-title">
              <div className="bl-title-icon">
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#f5a524' }}>receipt_long</span>
              </div>
              Billing
            </div>
            <div className="bl-subtitle">Manajemen invoice dan riwayat pembayaran</div>
          </div>
        </div>

        {/* Summary strip */}
        <div className="bl-summary">
          <div className="bl-sum-card">
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#facc15' }}>pending_actions</span>
            <div>
              <div className="bl-sum-val" style={{ color: '#facc15' }}>{unpaidCount}</div>
              <div className="bl-sum-lbl">Belum Bayar</div>
            </div>
          </div>
          <div className="bl-sum-card" style={{ borderColor: overdueCount > 0 ? 'rgba(248,113,113,.2)' : undefined }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#f87171' }}>warning</span>
            <div>
              <div className="bl-sum-val" style={{ color: '#f87171' }}>{overdueCount}</div>
              <div className="bl-sum-lbl">Jatuh Tempo</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bl-tabs" role="tablist">
          <button
            className={`bl-tab ${tab === 'invoices' ? 'active' : 'inactive'}`}
            role="tab" aria-selected={tab === 'invoices'}
            onClick={() => setTab('invoices')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>receipt_long</span>
            Invoice
          </button>
          <button
            className={`bl-tab ${tab === 'payments' ? 'active' : 'inactive'}`}
            role="tab" aria-selected={tab === 'payments'}
            onClick={() => setTab('payments')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>payments</span>
            Pembayaran
          </button>
        </div>

        {/* Tab content */}
        {tab === 'invoices' ? <InvoicesTab /> : <PaymentsTab />}
      </div>
    </>
  )
}

// ─── Pagination helper ────────────────────────────────────────────
function getPaginationRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '…')[] = [1]
  if (current > 3) pages.push('…')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p)
  if (current < total - 2) pages.push('…')
  pages.push(total)
  return pages
}
