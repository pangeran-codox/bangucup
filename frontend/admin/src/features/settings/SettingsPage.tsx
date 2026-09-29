import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthQuery } from '@/hooks/useAuthQuery'
import { useAuthStore } from '@/stores/authStore'
import { usersApi, type UserDetail, type CreateUserPayload } from '@/services/api/users'
import { formatDate } from '@/lib/utils'

// ─── Roles available in this app ─────────────────────────────────
const ALL_ROLES = ['super_admin', 'admin', 'staff', 'teknisi'] as const
type AppRole = typeof ALL_ROLES[number]

const ROLE_CFG: Record<AppRole, { color: string; bg: string }> = {
  super_admin: { color: '#f5a524', bg: 'rgba(245,165,36,.12)' },
  admin:       { color: '#60a5fa', bg: 'rgba(96,165,250,.12)' },
  staff:       { color: '#4ade80', bg: 'rgba(74,222,128,.12)' },
  teknisi:     { color: '#c084fc', bg: 'rgba(192,132,252,.12)' },
}

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CFG[role as AppRole] ?? { color: '#94a3b8', bg: 'rgba(148,163,184,.12)' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 6, background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 600, fontFamily: 'Inter,sans-serif', whiteSpace: 'nowrap' }}>
      {role}
    </span>
  )
}

function inputStyle(hasError = false): React.CSSProperties {
  return { background: 'rgba(255,255,255,.04)', border: `1px solid ${hasError ? 'rgba(255,100,100,.6)' : 'rgba(255,255,255,.1)'}`, borderRadius: 10, padding: '9px 13px', color: '#e2e2e8', fontFamily: 'Inter,sans-serif', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' as const }
}

function Spinner({ dark }: { dark?: boolean }) {
  return <div style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${dark ? 'rgba(0,0,0,.3)' : 'rgba(255,255,255,.3)'}`, borderTopColor: dark ? '#000' : '#fff', animation: 'st-spin .6s linear infinite', flexShrink: 0 }} />
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: '#d7c3ae' }}>{label}</label>
      {children}
      {error && <span style={{ fontSize: 11, color: '#ff8080' }}>{error}</span>}
      {hint && !error && <span style={{ fontSize: 11, color: 'rgba(215,195,174,.45)' }}>{hint}</span>}
    </div>
  )
}

// ─── Profile Tab ──────────────────────────────────────────────────
function ProfileTab() {
  const qc         = useQueryClient()
  const authUser   = useAuthStore(s => s.user)
  const setAuth    = useAuthStore(s => s.setAuth)
  const token      = useAuthStore(s => s.token)

  const [name,     setName]     = useState(authUser?.name ?? '')
  const [email,    setEmail]    = useState(authUser?.email ?? '')
  const [pwdNew,   setPwdNew]   = useState('')
  const [pwdConf,  setPwdConf]  = useState('')
  const [errors,   setErrors]   = useState<Record<string, string>>({})
  const [success,  setSuccess]  = useState('')
  const [showPwd,  setShowPwd]  = useState(false)

  useEffect(() => {
    setName(authUser?.name ?? '')
    setEmail(authUser?.email ?? '')
  }, [authUser])

  const profileMutation = useMutation({
    mutationFn: () => usersApi.updateProfile(authUser!.id, {
      name:  name.trim(),
      email: email.trim(),
      ...(pwdNew ? { password: pwdNew } : {}),
    }),
    onSuccess: (updated) => {
      // Update zustand store agar header langsung reflect perubahan nama
      setAuth({ id: updated.id, name: updated.name, email: updated.email, roles: updated.roles, permissions: updated.permissions }, token!)
      qc.invalidateQueries({ queryKey: ['me'] })
      setPwdNew(''); setPwdConf('')
      setErrors({})
      setSuccess('Profil berhasil diperbarui')
      setTimeout(() => setSuccess(''), 4000)
    },
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
    setErrors({}); setSuccess('')
    const errs: Record<string, string> = {}
    if (!name.trim())  errs.name  = 'Nama wajib diisi'
    if (!email.trim()) errs.email = 'Email wajib diisi'
    if (pwdNew && pwdNew.length < 8) errs.password = 'Password minimal 8 karakter'
    if (pwdNew && pwdNew !== pwdConf) errs.password_confirmation = 'Konfirmasi password tidak cocok'
    if (Object.keys(errs).length) { setErrors(errs); return }
    profileMutation.mutate()
  }

  const busy = profileMutation.isPending

  return (
    <div style={{ maxWidth: 560 }}>
      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Avatar placeholder */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '20px 24px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14 }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: 'rgba(245,165,36,.12)', border: '2px solid rgba(245,165,36,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 24, fontWeight: 700, color: '#f5a524' }}>
              {(authUser?.name ?? 'U').charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 16, fontWeight: 600, color: '#e2e2e8' }}>{authUser?.name}</div>
            <div style={{ fontSize: 13, color: '#64748b', fontFamily: 'Inter,sans-serif', marginTop: 3 }}>{authUser?.email}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {authUser?.roles?.map(r => <RoleBadge key={r} role={r} />)}
            </div>
          </div>
        </div>

        {/* Name & Email */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Nama *" error={errors.name}>
            <input value={name} onChange={e => setName(e.target.value)} disabled={busy} style={inputStyle(!!errors.name)} />
          </Field>
          <Field label="Email *" error={errors.email}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={busy} style={inputStyle(!!errors.email)} />
          </Field>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.06)' }} />
          <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'rgba(215,195,174,.35)' }}>Ganti Password (opsional)</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.06)' }} />
        </div>

        {/* Password */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Password Baru" error={errors.password} hint="Min 8 karakter">
            <div style={{ position: 'relative' }}>
              <input type={showPwd ? 'text' : 'password'} value={pwdNew} onChange={e => setPwdNew(e.target.value)} disabled={busy} placeholder="••••••••"
                style={{ ...inputStyle(!!errors.password), paddingRight: 36 }} />
              <button type="button" onClick={() => setShowPwd(v => !v)} tabIndex={-1}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{showPwd ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </Field>
          <Field label="Konfirmasi Password" error={errors.password_confirmation}>
            <input type={showPwd ? 'text' : 'password'} value={pwdConf} onChange={e => setPwdConf(e.target.value)} disabled={busy} placeholder="••••••••"
              style={inputStyle(!!errors.password_confirmation)} />
          </Field>
        </div>

        {/* Feedback */}
        {success && (
          <div style={{ background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.2)', borderRadius: 10, padding: '10px 14px', color: '#4ade80', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check_circle</span>{success}
          </div>
        )}
        {profileMutation.isError && !Object.keys(errors).length && (
          <div style={{ background: 'rgba(255,80,80,.08)', border: '1px solid rgba(255,80,80,.25)', borderRadius: 10, padding: '10px 14px', color: '#ff8080', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>error</span>
            {(profileMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Terjadi kesalahan'}
          </div>
        )}

        <div>
          <button type="submit" disabled={busy}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 10, background: '#f5a524', border: 'none', color: '#000', fontSize: 14, fontWeight: 600, fontFamily: 'Inter,sans-serif', cursor: 'pointer', opacity: busy ? 0.7 : 1, boxShadow: '0 0 16px rgba(245,165,36,.3)' }}>
            {busy ? <><Spinner dark />Menyimpan…</> : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>Simpan Perubahan</>}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── User Form Modal ──────────────────────────────────────────────
function UserFormModal({ open, onClose, user }: { open: boolean; onClose: () => void; user?: UserDetail | null }) {
  const qc     = useQueryClient()
  const isEdit = !!user
  const nameRef = useRef<HTMLInputElement>(null)

  const [form, setForm]     = useState({ name: '', email: '', password: '', roles: [] as string[] })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPwd, setShowPwd] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({ name: user.name, email: user.email, password: '', roles: user.roles ?? [] })
    } else {
      setForm({ name: '', email: '', password: '', roles: ['staff'] })
    }
    setErrors({}); setShowPwd(false)
  }, [user, open])

  useEffect(() => { if (open) setTimeout(() => nameRef.current?.focus(), 80) }, [open])

  const saveMutation = useMutation({
    mutationFn: () => isEdit
      ? usersApi.update(user!.id, { name: form.name, email: form.email, password: form.password || null })
      : usersApi.create(form as CreateUserPayload),
    onSuccess: async (updated) => {
      if (isEdit && form.roles.length) {
        await usersApi.syncRoles(updated.id, form.roles)
      }
      qc.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
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
    if (!form.name.trim())  errs.name  = 'Nama wajib diisi'
    if (!form.email.trim()) errs.email = 'Email wajib diisi'
    if (!isEdit && !form.password) errs.password = 'Password wajib diisi'
    if (form.password && form.password.length < 8) errs.password = 'Password minimal 8 karakter'
    if (Object.keys(errs).length) { setErrors(errs); return }
    saveMutation.mutate()
  }

  function toggleRole(role: string) {
    setForm(p => ({
      ...p,
      roles: p.roles.includes(role) ? p.roles.filter(r => r !== role) : [...p.roles, role],
    }))
  }

  if (!open) return null
  const busy = saveMutation.isPending

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'st-fi .15s ease' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#121317', border: '1px solid rgba(245,165,36,.2)', borderRadius: 20, width: '100%', maxWidth: 500, boxShadow: '0 24px 80px rgba(0,0,0,.7)', animation: 'st-su .18s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid rgba(245,165,36,.1)' }}>
          <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 17, fontWeight: 600, color: '#e2e2e8', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 19, color: '#f5a524' }}>{isEdit ? 'edit' : 'person_add'}</span>
            {isEdit ? 'Edit User' : 'Tambah User'}
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', color: '#d7c3ae', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Nama *" error={errors.name}>
                <input ref={nameRef} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} disabled={busy} style={inputStyle(!!errors.name)} />
              </Field>
              <Field label="Email *" error={errors.email}>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} disabled={busy} style={inputStyle(!!errors.email)} />
              </Field>
            </div>

            <Field label={isEdit ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password *'} error={errors.password}>
              <div style={{ position: 'relative' }}>
                <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder={isEdit ? 'Kosongkan jika tidak diubah' : 'Min 8 karakter'} disabled={busy}
                  style={{ ...inputStyle(!!errors.password), paddingRight: 36 }} />
                <button type="button" onClick={() => setShowPwd(v => !v)} tabIndex={-1}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{showPwd ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </Field>

            {/* Roles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: '#d7c3ae' }}>Roles</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ALL_ROLES.map(role => {
                  const active = form.roles.includes(role)
                  const cfg = ROLE_CFG[role]
                  return (
                    <button key={role} type="button" onClick={() => toggleRole(role)} disabled={busy}
                      style={{ padding: '6px 14px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${active ? cfg.color + '50' : 'rgba(255,255,255,.08)'}`, background: active ? cfg.bg : 'rgba(255,255,255,.03)', color: active ? cfg.color : '#64748b', fontFamily: 'Inter,sans-serif', fontSize: 12, fontWeight: active ? 600 : 400, transition: 'all .15s' }}>
                      {role}
                    </button>
                  )
                })}
              </div>
            </div>

            {saveMutation.isError && !Object.keys(errors).length && (
              <div style={{ background: 'rgba(255,80,80,.08)', border: '1px solid rgba(255,80,80,.25)', borderRadius: 10, padding: '10px 14px', color: '#ff8080', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>error</span>
                {(saveMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Terjadi kesalahan'}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '0 24px 20px' }}>
            <button type="button" onClick={onClose} disabled={busy} style={{ padding: '9px 18px', borderRadius: 9, cursor: 'pointer', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#d7c3ae', fontSize: 13, fontFamily: 'Inter,sans-serif' }}>Batal</button>
            <button type="submit" disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 9, background: '#f5a524', border: 'none', color: '#000', fontSize: 13, fontWeight: 600, fontFamily: 'Inter,sans-serif', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
              {busy ? <><Spinner dark />Menyimpan…</> : <><span className="material-symbols-outlined" style={{ fontSize: 14 }}>save</span>{isEdit ? 'Simpan' : 'Tambah User'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Users Tab ────────────────────────────────────────────────────
function UsersTab() {
  const qc = useQueryClient()
  const currentUser = useAuthStore(s => s.user)

  const [formOpen, setFormOpen]       = useState(false)
  const [editTarget, setEditTarget]   = useState<UserDetail | null>(null)
  const [deleteId, setDeleteId]       = useState<number | null>(null)
  const [deleteName, setDeleteName]   = useState('')

  const { data: users = [], isLoading, isError } = useAuthQuery<UserDetail[]>({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => usersApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setDeleteId(null) },
  })

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => { setEditTarget(null); setFormOpen(true) }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: '#f5a524', border: 'none', color: '#000', fontSize: 13, fontWeight: 600, fontFamily: 'Inter,sans-serif', cursor: 'pointer', boxShadow: '0 0 14px rgba(245,165,36,.3)', whiteSpace: 'nowrap' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_add</span>
          Tambah User
        </button>
      </div>

      <div style={{ background: 'rgba(18,19,23,.8)', border: '1px solid rgba(245,165,36,.1)', borderRadius: 14, overflow: 'hidden' }}>
        {isError ? (
          <div style={{ padding: '48px 32px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#f87171', display: 'block', marginBottom: 8 }}>wifi_off</span>
            <div style={{ fontSize: 14, color: '#e2e2e8', fontFamily: 'Space Grotesk,sans-serif', fontWeight: 600 }}>Gagal memuat data</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }} aria-label="Tabel User">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,.03)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                  {['Nama', 'Email', 'Roles', 'Dibuat', ''].map(h => (
                    <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontFamily: 'JetBrains Mono,monospace', fontSize: 10, fontWeight: 600, letterSpacing: '.13em', textTransform: 'uppercase', color: '#64748b', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                      {[120, 160, 100, 80, 60].map((w, j) => (
                        <td key={j} style={{ padding: '13px 18px' }}>
                          <div style={{ height: 12, width: w, borderRadius: 6, background: 'rgba(255,255,255,.06)', animation: 'st-shimmer 1.4s ease infinite' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                  : users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,.04)', transition: 'background .12s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,165,36,.03)') }
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent') }>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(245,165,36,.1)', border: '1px solid rgba(245,165,36,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#f5a524', fontFamily: 'Space Grotesk,sans-serif', flexShrink: 0 }}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 500, color: '#e2e2e8', fontFamily: 'Inter,sans-serif' }}>{u.name}</span>
                          {u.id === currentUser?.id && (
                            <span style={{ fontSize: 10, color: '#f5a524', fontFamily: 'JetBrains Mono,monospace', letterSpacing: '.08em' }}>YOU</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'Inter,sans-serif' }}>{u.email}</span>
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {u.roles?.length ? u.roles.map(r => <RoleBadge key={r} role={r} />) : <span style={{ fontSize: 12, color: '#64748b' }}>—</span>}
                        </div>
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'Inter,sans-serif', whiteSpace: 'nowrap' }}>{formatDate(u.created_at)}</span>
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button onClick={() => { setEditTarget(u); setFormOpen(true) }}
                            style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid rgba(245,165,36,.2)', background: 'rgba(245,165,36,.06)', color: '#f5a524', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>edit</span>
                          </button>
                          {u.id !== currentUser?.id && (
                            <button onClick={() => { setDeleteId(u.id); setDeleteName(u.name) }}
                              style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid rgba(239,68,68,.2)', background: 'rgba(239,68,68,.06)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UserFormModal open={formOpen} onClose={() => { setFormOpen(false); setEditTarget(null) }} user={editTarget} />

      {/* Delete confirm */}
      {deleteId !== null && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,.78)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setDeleteId(null) }}>
          <div style={{ background: '#121317', border: '1px solid rgba(255,80,80,.25)', borderRadius: 18, padding: '26px 22px', width: '100%', maxWidth: 360, boxShadow: '0 24px 80px rgba(0,0,0,.7)' }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(255,80,80,.1)', border: '1px solid rgba(255,80,80,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#ff6060' }}>delete</span>
              </div>
              <div>
                <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontWeight: 600, fontSize: 15, color: '#e2e2e8' }}>Hapus User</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>Tidak dapat dibatalkan</div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#d7c3ae', lineHeight: 1.6, marginBottom: 20 }}>
              Yakin hapus user <strong style={{ color: '#e2e2e8' }}>{deleteName}</strong>?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteId(null)} disabled={deleteMutation.isPending}
                style={{ padding: '8px 16px', borderRadius: 9, cursor: 'pointer', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#d7c3ae', fontSize: 13, fontFamily: 'Inter,sans-serif' }}>Batal</button>
              <button onClick={() => deleteMutation.mutate(deleteId!)} disabled={deleteMutation.isPending}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, background: '#dc2626', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'Inter,sans-serif', cursor: 'pointer', opacity: deleteMutation.isPending ? 0.6 : 1 }}>
                {deleteMutation.isPending ? <><Spinner />Menghapus…</> : <><span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>Hapus</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
type Tab = 'profile' | 'users'

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile')

  return (
    <>
      <style>{`
        @keyframes st-shimmer{0%,100%{opacity:.5}50%{opacity:1}}
        @keyframes st-spin{to{transform:rotate(360deg)}}
        @keyframes st-fi{from{opacity:0}to{opacity:1}}
        @keyframes st-su{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
        .st-wrap{max-width:1280px;margin:0 auto;padding:32px 32px 64px}
        .st-header{margin-bottom:24px}
        .st-title{font-family:'Space Grotesk',sans-serif;font-size:26px;font-weight:700;color:#e2e2e8;display:flex;align-items:center;gap:12px}
        .st-icon{width:42px;height:42px;border-radius:12px;background:rgba(245,165,36,.12);border:1px solid rgba(245,165,36,.25);display:flex;align-items:center;justify-content:center}
        .st-subtitle{font-size:14px;color:#94a3b8;margin-top:4px}
        .st-tabs{display:flex;gap:4px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:4px;width:fit-content;margin-bottom:28px}
        .st-tab{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:9px;border:none;cursor:pointer;font-family:'Inter',sans-serif;font-size:14px;font-weight:500;transition:all .15s}
        .st-tab.active{background:#f5a524;color:#000;font-weight:600;box-shadow:0 2px 12px rgba(245,165,36,.3)}
        .st-tab.inactive{background:transparent;color:#94a3b8}
        .st-tab.inactive:hover{color:#e2e2e8;background:rgba(255,255,255,.05)}
      `}</style>

      <div className="st-wrap">
        {/* Header */}
        <div className="st-header">
          <div className="st-title">
            <div className="st-icon">
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#f5a524' }}>settings</span>
            </div>
            Pengaturan
          </div>
          <div className="st-subtitle">Kelola profil dan manajemen user</div>
        </div>

        {/* Tabs */}
        <div className="st-tabs" role="tablist">
          <button className={`st-tab ${tab === 'profile' ? 'active' : 'inactive'}`}
            role="tab" aria-selected={tab === 'profile'} onClick={() => setTab('profile')}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>manage_accounts</span>
            Profil Saya
          </button>
          <button className={`st-tab ${tab === 'users' ? 'active' : 'inactive'}`}
            role="tab" aria-selected={tab === 'users'} onClick={() => setTab('users')}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>group</span>
            Manajemen User
          </button>
        </div>

        {/* Tab content */}
        {tab === 'profile' ? <ProfileTab /> : <UsersTab />}
      </div>
    </>
  )
}
