import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthQuery } from '@/hooks/useAuthQuery'
import { ticketsApi } from '@/services/api/tickets'
import { formatDate } from '@/lib/utils'
import type {
  Ticket, TicketStatus, TicketPriority, TicketListParams,
  PaginatedResponse,
} from '@/types'

// ─── Config ───────────────────────────────────────────────────────
const STATUS_CFG: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  open:        { label: 'Open',        color: '#60a5fa', bg: 'rgba(96,165,250,.12)'  },
  in_progress: { label: 'In Progress', color: '#f5a524', bg: 'rgba(245,165,36,.12)'  },
  resolved:    { label: 'Resolved',    color: '#4ade80', bg: 'rgba(74,222,128,.12)'  },
  closed:      { label: 'Closed',      color: '#64748b', bg: 'rgba(100,116,139,.12)' },
}

const PRIORITY_CFG: Record<TicketPriority, { label: string; color: string; icon: string }> = {
  low:    { label: 'Low',    color: '#64748b', icon: 'arrow_downward' },
  medium: { label: 'Medium', color: '#f5a524', icon: 'remove'         },
  high:   { label: 'High',   color: '#f87171', icon: 'arrow_upward'   },
}

const PER_PAGE = 20

// ─── Helpers ──────────────────────────────────────────────────────
function StatusBadge({ status }: { status: TicketStatus }) {
  const c = STATUS_CFG[status]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 9999, background: c.bg, color: c.color, fontSize: 12, fontWeight: 600, fontFamily: 'Inter,sans-serif', whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.color }} />
      {c.label}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const c = PRIORITY_CFG[priority]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: c.color, fontSize: 12, fontWeight: 600, fontFamily: 'Inter,sans-serif' }}>
      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{c.icon}</span>
      {c.label}
    </span>
  )
}

function SkeletonRow() {
  return (
    <tr>
      {[180, 110, 70, 80, 90, 80].map((w, i) => (
        <td key={i} style={{ padding: '14px 18px' }}>
          <div style={{ height: 13, width: w, borderRadius: 6, background: 'rgba(255,255,255,.06)', animation: 'tk-shimmer 1.4s ease infinite' }} />
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

// ─── Ticket Detail Panel ──────────────────────────────────────────
function TicketDetail({ ticketId, onClose }: { ticketId: number; onClose: () => void }) {
  const qc = useQueryClient()
  const [replyText, setReplyText] = useState('')

  const { data: ticket, isLoading } = useAuthQuery<Ticket>({
    queryKey: ['ticket', ticketId],
    queryFn: () => ticketsApi.show(ticketId),
    staleTime: 0,
  })

  const replyMutation = useMutation({
    mutationFn: (msg: string) => ticketsApi.reply(ticketId, msg),
    onSuccess: () => {
      setReplyText('')
      qc.invalidateQueries({ queryKey: ['ticket', ticketId] })
      qc.invalidateQueries({ queryKey: ['tickets'] })
    },
  })

  const statusMutation = useMutation({
    mutationFn: (status: TicketStatus) => ticketsApi.update(ticketId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', ticketId] })
      qc.invalidateQueries({ queryKey: ['tickets'] })
    },
  })

  function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!replyText.trim()) return
    replyMutation.mutate(replyText.trim())
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', padding: 0 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#0e0f13', borderLeft: '1px solid rgba(245,165,36,.15)', width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', height: '100vh', animation: 'tk-slide-in .2s ease' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {isLoading
              ? <div style={{ height: 16, width: '70%', borderRadius: 6, background: 'rgba(255,255,255,.08)', animation: 'tk-shimmer 1.4s ease infinite' }} />
              : <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 16, fontWeight: 600, color: '#e2e2e8', marginBottom: 6, lineHeight: 1.3 }}>{ticket?.subject}</div>
            }
            {ticket && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
                <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'Inter,sans-serif' }}>
                  {ticket.customer?.name ?? `#${ticket.customer_id}`} · {formatDate(ticket.created_at)}
                </span>
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>

        {/* Status actions */}
        {ticket && ticket.status !== 'closed' && (
          <div style={{ padding: '10px 24px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['open', 'in_progress', 'resolved', 'closed'] as TicketStatus[])
              .filter(s => s !== ticket.status)
              .map(s => (
                <button key={s}
                  onClick={() => statusMutation.mutate(s)}
                  disabled={statusMutation.isPending}
                  style={{ padding: '5px 12px', borderRadius: 8, cursor: 'pointer', background: STATUS_CFG[s].bg, border: `1px solid ${STATUS_CFG[s].color}30`, color: STATUS_CFG[s].color, fontSize: 12, fontWeight: 500, fontFamily: 'Inter,sans-serif', opacity: statusMutation.isPending ? 0.6 : 1 }}>
                  → {STATUS_CFG[s].label}
                </button>
              ))
            }
          </div>
        )}

        {/* Description */}
        {ticket?.description && (
          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.02)' }}>
            <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono,monospace', letterSpacing: '.1em', textTransform: 'uppercase', color: '#64748b', marginBottom: 8 }}>Deskripsi</div>
            <p style={{ fontSize: 14, color: '#d7c3ae', lineHeight: 1.7, fontFamily: 'Inter,sans-serif', margin: 0, whiteSpace: 'pre-wrap' }}>{ticket.description}</p>
          </div>
        )}

        {/* Replies */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,.03)', borderRadius: 12, padding: 14 }}>
                <div style={{ height: 10, width: '30%', borderRadius: 5, background: 'rgba(255,255,255,.07)', marginBottom: 8, animation: 'tk-shimmer 1.4s ease infinite' }} />
                <div style={{ height: 10, width: '80%', borderRadius: 5, background: 'rgba(255,255,255,.05)', animation: 'tk-shimmer 1.4s ease infinite' }} />
              </div>
            ))
          ) : ticket?.replies?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b', fontSize: 13, fontFamily: 'Inter,sans-serif' }}>
              Belum ada balasan
            </div>
          ) : (
            ticket?.replies?.map(reply => (
              <div key={reply.id} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(245,165,36,.15)', border: '1px solid rgba(245,165,36,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#f5a524', fontFamily: 'Space Grotesk,sans-serif' }}>
                      {(reply.user?.name ?? 'U').charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e2e8', fontFamily: 'Inter,sans-serif' }}>{reply.user?.name ?? 'Admin'}</span>
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'Inter,sans-serif' }}>{formatDate(reply.created_at)}</span>
                </div>
                <p style={{ fontSize: 13, color: '#d7c3ae', lineHeight: 1.6, margin: 0, fontFamily: 'Inter,sans-serif', whiteSpace: 'pre-wrap' }}>{reply.message}</p>
              </div>
            ))
          )}
        </div>

        {/* Reply form */}
        {ticket?.status !== 'closed' && (
          <form onSubmit={handleReply} style={{ padding: '14px 24px 20px', borderTop: '1px solid rgba(255,255,255,.07)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Tulis balasan…"
              rows={3}
              disabled={replyMutation.isPending}
              style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '10px 14px', color: '#e2e2e8', fontSize: 14, fontFamily: 'Inter,sans-serif', resize: 'vertical', outline: 'none', width: '100%', boxSizing: 'border-box' }}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleReply(e as unknown as React.FormEvent) }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'Inter,sans-serif' }}>Ctrl+Enter untuk kirim</span>
              <button type="submit" disabled={replyMutation.isPending || !replyText.trim()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, background: '#f5a524', border: 'none', color: '#000', fontSize: 13, fontWeight: 600, fontFamily: 'Inter,sans-serif', cursor: 'pointer', opacity: (!replyText.trim() || replyMutation.isPending) ? 0.5 : 1 }}>
                {replyMutation.isPending
                  ? <><div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(0,0,0,.3)', borderTopColor: '#000', animation: 'tk-spin .6s linear infinite' }} />Mengirim…</>
                  : <><span className="material-symbols-outlined" style={{ fontSize: 14 }}>send</span>Kirim</>
                }
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Create Ticket Modal ──────────────────────────────────────────
function CreateTicketModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ customer_id: '', subject: '', description: '', priority: 'medium' as TicketPriority })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const mutation = useMutation({
    mutationFn: () => ticketsApi.create({
      customer_id: Number(form.customer_id),
      subject: form.subject,
      description: form.description || null,
      priority: form.priority,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tickets'] }); onClose() },
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
    if (!form.customer_id) errs.customer_id = 'ID pelanggan wajib diisi'
    if (!form.subject.trim()) errs.subject = 'Subjek wajib diisi'
    if (Object.keys(errs).length) { setErrors(errs); return }
    mutation.mutate()
  }

  if (!open) return null
  const busy = mutation.isPending

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 65, background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#121317', border: '1px solid rgba(245,165,36,.2)', borderRadius: 20, width: '100%', maxWidth: 500, boxShadow: '0 24px 80px rgba(0,0,0,.7)', animation: 'tk-slide-up .18s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid rgba(245,165,36,.1)' }}>
          <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 17, fontWeight: 600, color: '#e2e2e8', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 19, color: '#f5a524' }}>add_circle</span>
            Buat Tiket Baru
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', color: '#d7c3ae', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Customer ID */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: '#d7c3ae' }}>ID Pelanggan *</label>
              <input type="number" value={form.customer_id} onChange={e => setForm(p => ({ ...p, customer_id: e.target.value }))}
                placeholder="Masukkan ID pelanggan" disabled={busy}
                style={{ background: 'rgba(255,255,255,.04)', border: `1px solid ${errors.customer_id ? 'rgba(255,100,100,.6)' : 'rgba(255,255,255,.1)'}`, borderRadius: 10, padding: '9px 13px', color: '#e2e2e8', fontFamily: 'Inter,sans-serif', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
              {errors.customer_id && <span style={{ fontSize: 11, color: '#ff8080' }}>{errors.customer_id}</span>}
            </div>
            {/* Subject */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: '#d7c3ae' }}>Subjek *</label>
              <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                placeholder="Contoh: Internet tidak bisa konek" maxLength={200} disabled={busy}
                style={{ background: 'rgba(255,255,255,.04)', border: `1px solid ${errors.subject ? 'rgba(255,100,100,.6)' : 'rgba(255,255,255,.1)'}`, borderRadius: 10, padding: '9px 13px', color: '#e2e2e8', fontFamily: 'Inter,sans-serif', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
              {errors.subject && <span style={{ fontSize: 11, color: '#ff8080' }}>{errors.subject}</span>}
            </div>
            {/* Priority */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: '#d7c3ae' }}>Prioritas</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['low', 'medium', 'high'] as TicketPriority[]).map(p => (
                  <button key={p} type="button" onClick={() => setForm(prev => ({ ...prev, priority: p }))} disabled={busy}
                    style={{ flex: 1, padding: '8px 0', borderRadius: 9, cursor: 'pointer', border: `1px solid ${form.priority === p ? PRIORITY_CFG[p].color + '60' : 'rgba(255,255,255,.08)'}`, background: form.priority === p ? `${PRIORITY_CFG[p].color}18` : 'rgba(255,255,255,.03)', color: PRIORITY_CFG[p].color, fontSize: 12, fontWeight: form.priority === p ? 600 : 400, fontFamily: 'Inter,sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{PRIORITY_CFG[p].icon}</span>
                    {PRIORITY_CFG[p].label}
                  </button>
                ))}
              </div>
            </div>
            {/* Description */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: '#d7c3ae' }}>Deskripsi</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Detail masalah yang dialami pelanggan…" rows={3} disabled={busy}
                style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '9px 13px', color: '#e2e2e8', fontFamily: 'Inter,sans-serif', fontSize: 14, outline: 'none', resize: 'vertical', width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '0 24px 20px' }}>
            <button type="button" onClick={onClose} disabled={busy} style={{ padding: '9px 18px', borderRadius: 9, cursor: 'pointer', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#d7c3ae', fontSize: 13, fontFamily: 'Inter,sans-serif' }}>Batal</button>
            <button type="submit" disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 9, background: '#f5a524', border: 'none', color: '#000', fontSize: 13, fontWeight: 600, fontFamily: 'Inter,sans-serif', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
              {busy ? <><div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(0,0,0,.3)', borderTopColor: '#000', animation: 'tk-spin .6s linear infinite' }} />Membuat…</> : <><span className="material-symbols-outlined" style={{ fontSize: 14 }}>add_circle</span>Buat Tiket</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
export default function TicketsPage() {
  const [statusFilter, setStatusFilter]     = useState<TicketStatus | ''>('')
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | ''>('')
  const [page, setPage]         = useState(1)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const params: TicketListParams = {
    ...(statusFilter   ? { status: statusFilter }     : {}),
    ...(priorityFilter ? { priority: priorityFilter } : {}),
    page, per_page: PER_PAGE,
  }

  const { data, isLoading, isError } = useAuthQuery<PaginatedResponse<Ticket>>({
    queryKey: ['tickets', params],
    queryFn: () => ticketsApi.list(params),
  })

  const tickets    = data?.data ?? []
  const meta       = data?.meta
  const totalPages = meta?.last_page ?? 1
  const totalItems = meta?.total ?? 0
  const rangeStart = totalItems === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const rangeEnd   = Math.min(page * PER_PAGE, totalItems)
  const hasFilter  = !!(statusFilter || priorityFilter)

  function resetFilters() { setStatusFilter(''); setPriorityFilter(''); setPage(1) }

  return (
    <>
      <style>{`
        @keyframes tk-shimmer{0%,100%{opacity:.5}50%{opacity:1}}
        @keyframes tk-spin{to{transform:rotate(360deg)}}
        @keyframes tk-slide-in{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes tk-slide-up{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
        .tk-wrap{max-width:1280px;margin:0 auto;padding:32px 32px 64px}
        .tk-header{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:24px}
        .tk-title{font-family:'Space Grotesk',sans-serif;font-size:26px;font-weight:700;color:#e2e2e8;display:flex;align-items:center;gap:12px}
        .tk-icon{width:42px;height:42px;border-radius:12px;background:rgba(245,165,36,.12);border:1px solid rgba(245,165,36,.25);display:flex;align-items:center;justify-content:center}
        .tk-subtitle{font-size:14px;color:#94a3b8;margin-top:4px}
        .tk-add-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:10px;background:#f5a524;border:none;color:#000;font-family:'Inter',sans-serif;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 0 16px rgba(245,165,36,.3);transition:opacity .15s,transform .1s;white-space:nowrap}
        .tk-add-btn:hover{opacity:.88}.tk-add-btn:active{transform:scale(.97)}
        .tk-toolbar{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px;align-items:center}
        .tk-select{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px 14px;color:#e2e2e8;font-size:13px;font-family:'Inter',sans-serif;cursor:pointer;outline:none}
        .tk-select:focus{border-color:rgba(245,165,36,.4)}.tk-select option{background:#1e2024}
        .tk-reset{display:inline-flex;align-items:center;gap:5px;padding:9px 14px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:#94a3b8;font-size:13px;cursor:pointer;font-family:'Inter',sans-serif}
        .tk-reset:hover{color:#e2e2e8}
        .tk-card{background:rgba(18,19,23,.8);border:1px solid rgba(245,165,36,.1);border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,.3)}
        table.tk-table{width:100%;border-collapse:collapse;min-width:640px}
        .tk-table thead tr{background:rgba(255,255,255,.03);border-bottom:1px solid rgba(255,255,255,.06)}
        .tk-table th{padding:13px 18px;text-align:left;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;letter-spacing:.13em;text-transform:uppercase;color:#64748b;white-space:nowrap}
        .tk-table tbody tr{border-bottom:1px solid rgba(255,255,255,.04);transition:background .12s;cursor:pointer}
        .tk-table tbody tr:last-child{border-bottom:none}
        .tk-table tbody tr:hover{background:rgba(245,165,36,.04)}
        .tk-table td{padding:13px 18px;font-size:14px;color:#e2e2e8;font-family:'Inter',sans-serif;vertical-align:middle}
        .tk-footer{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:14px 18px;border-top:1px solid rgba(255,255,255,.06)}
        .tk-footer-info{font-size:13px;color:#64748b;font-family:'Inter',sans-serif}
        .tk-pg-btn{min-width:34px;height:34px;padding:0 8px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:#d7c3ae;font-size:13px;font-family:'Inter',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
        .tk-pg-btn:hover:not(:disabled){border-color:rgba(245,165,36,.3);color:#f5a524}
        .tk-pg-btn.active{background:rgba(245,165,36,.15);border-color:rgba(245,165,36,.4);color:#f5a524;font-weight:600}
        .tk-pg-btn:disabled{opacity:.3;cursor:not-allowed}
      `}</style>

      <div className="tk-wrap">
        {/* Header */}
        <div className="tk-header">
          <div>
            <div className="tk-title">
              <div className="tk-icon"><span className="material-symbols-outlined" style={{ fontSize: 22, color: '#f5a524' }}>confirmation_number</span></div>
              Tiket Support
            </div>
            <div className="tk-subtitle">{isLoading ? 'Memuat data…' : `${totalItems} tiket`}</div>
          </div>
          <button className="tk-add-btn" onClick={() => setCreateOpen(true)}>
            <span className="material-symbols-outlined" style={{ fontSize: 17 }}>add_circle</span>
            Buat Tiket
          </button>
        </div>

        {/* Toolbar */}
        <div className="tk-toolbar">
          <select className="tk-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value as TicketStatus | ''); setPage(1) }}>
            <option value="">Semua Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select className="tk-select" value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value as TicketPriority | ''); setPage(1) }}>
            <option value="">Semua Prioritas</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          {hasFilter && (
            <button className="tk-reset" onClick={resetFilters}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>filter_alt_off</span>Reset
            </button>
          )}
        </div>

        {/* Table */}
        <div className="tk-card">
          {isError ? (
            <div style={{ padding: '60px 32px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#f87171', display: 'block', marginBottom: 10 }}>wifi_off</span>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e2e8', marginBottom: 5, fontFamily: 'Space Grotesk,sans-serif' }}>Gagal memuat data</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>Periksa koneksi atau refresh halaman</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="tk-table" aria-label="Tabel Tiket">
                <thead>
                  <tr>
                    <th>#ID</th>
                    <th>Subjek</th>
                    <th>Pelanggan</th>
                    <th>Prioritas</th>
                    <th>Status</th>
                    <th>Dibuat</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                    : tickets.length === 0
                      ? (
                        <tr><td colSpan={6}>
                          <div style={{ padding: '60px 32px', textAlign: 'center' }}>
                            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#64748b' }}>{hasFilter ? 'search_off' : 'confirmation_number'}</span>
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e2e8', marginBottom: 5, fontFamily: 'Space Grotesk,sans-serif' }}>{hasFilter ? 'Tidak ada hasil' : 'Belum ada tiket'}</div>
                            <div style={{ fontSize: 13, color: '#64748b' }}>{hasFilter ? 'Coba ubah filter' : 'Buat tiket support pertama untuk pelanggan'}</div>
                          </div>
                        </td></tr>
                      )
                      : tickets.map(t => (
                        <tr key={t.id} onClick={() => setDetailId(t.id)} title="Klik untuk lihat detail">
                          <td><span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 12, color: '#64748b' }}>#{t.id}</span></td>
                          <td>
                            <div style={{ fontWeight: 500, color: '#e2e2e8', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</div>
                            {t.description && <div style={{ fontSize: 12, color: '#64748b', marginTop: 1, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>}
                          </td>
                          <td><span style={{ fontSize: 13, color: '#d7c3ae' }}>{t.customer?.name ?? `#${t.customer_id}`}</span></td>
                          <td><PriorityBadge priority={t.priority} /></td>
                          <td><StatusBadge status={t.status} /></td>
                          <td><span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{formatDate(t.created_at)}</span></td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && !isError && totalItems > 0 && (
            <div className="tk-footer">
              <span className="tk-footer-info">{rangeStart}–{rangeEnd} dari {totalItems} tiket</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button className="tk-pg-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Sebelumnya">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span>
                </button>
                {getPaginationRange(page, totalPages).map((p, i) =>
                  p === '…'
                    ? <span key={`e${i}`} style={{ color: '#64748b', padding: '0 4px', fontSize: 13 }}>…</span>
                    : <button key={p} className={`tk-pg-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p as number)}>{p}</button>
                )}
                <button className="tk-pg-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} aria-label="Berikutnya">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {detailId !== null && <TicketDetail ticketId={detailId} onClose={() => setDetailId(null)} />}

      {/* Create modal */}
      <CreateTicketModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  )
}
