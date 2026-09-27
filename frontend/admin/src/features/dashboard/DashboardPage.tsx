import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { useAuthQuery } from '@/hooks/useAuthQuery'
import { apiClient } from '@/services/api/client'
import { formatCurrency } from '@/lib/utils'
import type { DashboardStats } from '@/types'

// ─── 3D Nebula Hero ───────────────────────────────────────────────
function NebulaHero({ stats }: { stats?: DashboardStats }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
    script.onload = () => initScene()
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])

  function initScene() {
    const container = containerRef.current
    if (!container) return
    const T = (window as { THREE?: Record<string, unknown> }).THREE
    if (!T) return

    const THREE = T as {
      Scene: new() => { add:(o:unknown)=>void }
      PerspectiveCamera: new(fov:number,asp:number,near:number,far:number)=>{ position:{z:number}; aspect:number; updateProjectionMatrix:()=>void }
      WebGLRenderer: new(o:object)=>{ setSize:(w:number,h:number)=>void; setPixelRatio:(r:number)=>void; render:(s:unknown,c:unknown)=>void; domElement:HTMLCanvasElement }
      Color: new(c:string)=>unknown
      IcosahedronGeometry: new(r:number,d:number)=>unknown
      MeshPhongMaterial: new(o:object)=>unknown
      Mesh: new(g:unknown,m:unknown)=>{ rotation:{x:number;y:number}; add:(o:unknown)=>void }
      Vector3: new()=>{ x:number;y:number;z:number; setFromSphericalCoords:(r:number,p:number,t:number)=>void }
      BufferGeometry: new()=>{ setFromPoints:(pts:unknown[])=>unknown }
      PointsMaterial: new(o:object)=>unknown
      Points: new(g:unknown,m:unknown)=>{ rotation:{y:number} }
      AmbientLight: new(c:number,i:number)=>unknown
      PointLight: new(c:unknown,i:number)=>{ position:{set:(x:number,y:number,z:number)=>void} }
    }

    const w = container.clientWidth || window.innerWidth
    const h = container.clientHeight || 600
    const scene    = new THREE.Scene()
    const camera   = new THREE.PerspectiveCamera(75, w/h, 0.1, 1000)
    camera.position.z = 5
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)

    const primaryColor = new THREE.Color('#f5a524')

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.5, 4),
      new THREE.MeshPhongMaterial({
        color: 0x1a1b20, emissive: primaryColor,
        emissiveIntensity: 0.2, wireframe: true,
        transparent: true, opacity: 0.3,
      })
    )
    scene.add(core)

    const pts: unknown[] = []
    for (let i = 0; i < 1000; i++) {
      const v = new THREE.Vector3()
      const phi   = Math.acos(2 * Math.random() - 1)
      const theta = Math.random() * Math.PI * 2
      v.setFromSphericalCoords(2 + Math.random() * 0.5, phi, theta)
      pts.push(v)
    }
    const particles = new THREE.Points(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.PointsMaterial({ color: primaryColor, size: 0.03, transparent: true, opacity: 0.8 })
    )
    scene.add(particles)

    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const pl = new THREE.PointLight(primaryColor, 2)
    pl.position.set(5,5,5)
    scene.add(pl)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)
      core.rotation.y += 0.005
      core.rotation.x += 0.003
      particles.rotation.y -= 0.002
      renderer.render(scene, camera)
    }
    const onResize = () => {
      const nw = container.clientWidth || window.innerWidth
      const nh = container.clientHeight || 600
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
    }
    window.addEventListener('resize', onResize)
    animate()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: 500, overflow: 'hidden', borderBottom: '1px solid rgba(245,165,36,0.2)', background: '#000', marginBottom: 32 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none', background: 'linear-gradient(to top, #000 0%, transparent 40%, #000 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none', background: 'radial-gradient(ellipse at center, rgba(245,165,36,0.1) 0%, transparent 70%)' }} />
      <div style={{ position: 'relative', zIndex: 20, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', pointerEvents: 'none' }}>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 700, letterSpacing: '-0.02em', color: '#e2e2e8', marginBottom: 12, textShadow: '0 0 40px rgba(245,165,36,0.8)' }}>
          Dashboard Bangucup
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f5a524', boxShadow: '0 0 12px rgba(245,165,36,1)', display: 'inline-block', animation: 'dash-ping 1.5s infinite' }} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, letterSpacing: '0.2em', color: '#f5a524', textTransform: 'uppercase', textShadow: '0 0 10px rgba(245,165,36,1)' }}>
            {stats ? `${stats.active_customers} Pelanggan Aktif · System Optimal` : 'System Online'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, glow }: {
  label: string; value: string; sub?: string; icon: string; glow?: string
}) {
  return (
    <div style={{
      background: 'rgba(30,32,36,0.4)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(245,165,36,0.2)',
      borderRadius: 16,
      padding: 24,
      position: 'relative',
      overflow: 'hidden',
      transition: 'box-shadow 0.3s',
      boxShadow: '0 4px 32px rgba(245,165,36,0.08)',
    }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 48px rgba(245,165,36,0.2)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 4px 32px rgba(245,165,36,0.08)')}
    >
      <div style={{ position: 'absolute', top: -32, right: -32, width: 120, height: 120, background: glow ?? 'rgba(245,165,36,0.08)', borderRadius: '50%', filter: 'blur(40px)' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.2em', color: '#d7c3ae', textTransform: 'uppercase' }}>{label}</span>
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#f5a524' }}>{icon}</span>
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em', color: '#f5a524', lineHeight: 1, marginBottom: 6, textShadow: '0 0 16px rgba(245,165,36,0.5)' }}>
        {value}
      </div>
      {sub && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#d7c3ae', opacity: 0.7 }}>{sub}</div>}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: stats, isLoading } = useAuthQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await apiClient.get('/dashboard/stats')
      return data.data
    },
  })

  const quickActions = [
    { label: 'Speed Test',  icon: 'speed',         color: '#f5a524', href: '/monitoring' },
    { label: 'Reboot',      icon: 'restart_alt',   color: '#d7c3ae', href: '/routers' },
    { label: 'Pay Bill',    icon: 'receipt_long',  color: '#f5a524', href: '/billing/invoices' },
    { label: 'Support',     icon: 'support_agent', color: '#71e0ff', href: '/tickets' },
  ]

  const devices = [
    { name: 'Router Utama', icon: 'router',    usage: '—', active: true  },
    { name: 'ONU Client 1', icon: 'device_hub',usage: '—', active: true  },
    { name: 'Switch Core',  icon: 'hub',       usage: '—', active: false },
  ]

  return (
    <>
      <style>{`
        @keyframes dash-ping {
          0%, 100% { box-shadow: 0 0 6px rgba(245,165,36,0.8); }
          50%       { box-shadow: 0 0 20px rgba(245,165,36,1); }
        }
        .db-container { max-width: 1280px; margin: 0 auto; padding: 0 32px 64px; }
        .db-grid { display: grid; gap: 32px; }
        .db-grid-stats { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
        .db-grid-main  { grid-template-columns: 1fr; }
        @media (min-width: 1024px) {
          .db-grid-main { grid-template-columns: 1fr 1fr 1fr; }
        }
        .db-card {
          background: rgba(30,32,36,0.4);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(245,165,36,0.15);
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 4px 32px rgba(0,0,0,0.4);
        }
        .db-card-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 18px;
          font-weight: 600;
          color: #e2e2e8;
          margin-bottom: 24px;
        }
        .db-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #d7c3ae;
        }
      `}</style>

      {/* 3D Hero */}
      <NebulaHero stats={stats} />

      <div className="db-container">
        {/* Stat cards */}
        <div className="db-grid db-grid-stats" style={{ marginBottom: 32 }}>
          <StatCard
            label="Total Pelanggan"
            value={isLoading ? '—' : String(stats?.total_customers ?? 0)}
            sub={`${stats?.active_customers ?? 0} aktif`}
            icon="group"
          />
          <StatCard
            label="Pendapatan Bulan Ini"
            value={isLoading ? '—' : formatCurrency(stats?.total_revenue_this_month ?? 0)}
            sub="Dari invoice terbayar"
            icon="payments"
            glow="rgba(113,224,255,0.1)"
          />
          <StatCard
            label="Invoice Belum Bayar"
            value={isLoading ? '—' : String(stats?.unpaid_invoices ?? 0)}
            sub={`${stats?.overdue_invoices ?? 0} jatuh tempo`}
            icon="receipt_long"
            glow="rgba(255,180,171,0.1)"
          />
          <StatCard
            label="Router Online"
            value={isLoading ? '—' : `${stats?.online_routers ?? 0}/${stats?.total_routers ?? 0}`}
            sub="Status jaringan"
            icon="router"
          />
        </div>

        {/* Main grid */}
        <div className="db-grid db-grid-main">
          {/* Network Status — col span 2 */}
          <div style={{ gridColumn: 'span 2' }}>
            <div className="db-card" style={{ marginBottom: 32 }}>
              {/* Network status bar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#f5a524', boxShadow: '0 0 12px rgba(245,165,36,1)', display: 'inline-block', animation: 'dash-ping 2s infinite' }} />
                      <span className="db-card-title" style={{ margin: 0 }}>Network Status: Optimal</span>
                    </div>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#d7c3ae' }}>
                      Fiber link active · Latency: 2ms
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div className="db-label" style={{ marginBottom: 4 }}>Download</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 48, fontWeight: 700, color: '#f5a524', lineHeight: 1, textShadow: '0 0 16px rgba(245,165,36,0.6)' }}>850</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'rgba(245,165,36,0.6)' }}>MBPS</span>
                      </div>
                    </div>
                    <div style={{ width: 1, height: 64, background: 'rgba(245,165,36,0.2)' }} />
                    <div>
                      <div className="db-label" style={{ marginBottom: 4 }}>Upload</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 48, fontWeight: 700, color: '#40c5e5', lineHeight: 1, textShadow: '0 0 16px rgba(64,197,229,0.6)' }}>400</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'rgba(64,197,229,0.6)' }}>MBPS</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Data consumption chart */}
            <div className="db-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <span className="db-card-title" style={{ margin: 0 }}>Konsumsi Data</span>
                <span style={{ background: '#f5a524', color: '#000', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', padding: '4px 12px', borderRadius: 9999, boxShadow: '0 0 12px rgba(245,165,36,0.5)' }}>
                  LAST 7 DAYS
                </span>
              </div>
              <div style={{ width: '100%', height: 200, position: 'relative' }}>
                <svg viewBox="0 0 1000 200" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f5a524" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#f5a524" stopOpacity="0" />
                    </linearGradient>
                    <filter id="glow-f">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  {/* Grid lines */}
                  {[40, 80, 120, 160].map(y => (
                    <line key={y} x1="0" y1={y} x2="1000" y2={y} stroke="rgba(245,165,36,0.1)" strokeWidth="1" />
                  ))}
                  {/* Area */}
                  <path d="M0,200 L0,180 Q100,160 200,170 T400,120 T600,80 T800,100 T1000,40 L1000,200 Z" fill="url(#cg)" />
                  {/* Line */}
                  <path d="M0,180 Q100,160 200,170 T400,120 T600,80 T800,100 T1000,40" fill="none" stroke="#f5a524" strokeWidth="3" filter="url(#glow-f)" />
                  {/* Dots */}
                  {[[200,170],[400,120],[600,80],[800,100]].map(([cx,cy]) => (
                    <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4" fill="#000" stroke="#f5a524" strokeWidth="2" filter="url(#glow-f)" />
                  ))}
                  <circle cx="1000" cy="40" r="6" fill="#f5a524" stroke="#000" strokeWidth="2" filter="url(#glow-f)" />
                </svg>
                {/* X labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '0 2px' }}>
                  {['SEN','SEL','RAB','KAM','JUM','SAB','MIN'].map(d => (
                    <span key={d} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#d7c3ae', letterSpacing: '0.1em' }}>{d}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {/* Current plan */}
            <div className="db-card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: 192, height: 192, background: 'rgba(245,165,36,0.1)', borderBottomLeftRadius: '100%', filter: 'blur(32px)', transition: 'transform 0.5s' }} />
              <div className="db-label" style={{ marginBottom: 16 }}>CURRENT PLAN</div>
              <div style={{ marginBottom: 24, position: 'relative', zIndex: 1 }}>
                <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 28, fontWeight: 600, color: '#f5a524', marginBottom: 4, textShadow: '0 0 8px rgba(245,165,36,0.4)' }}>
                  {stats?.active_subscriptions ?? 0} Langganan Aktif
                </div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#d7c3ae' }}>Fiber to the Home</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, position: 'relative', zIndex: 1 }}>
                <div>
                  <span className="db-label" style={{ display: 'block', marginBottom: 4 }}>SUSPENDED</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: '#e2e2e8' }}>{stats?.suspended_customers ?? 0}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="db-label" style={{ display: 'block', marginBottom: 4 }}>STATUS</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: '#f5a524', textShadow: '0 0 4px rgba(245,165,36,0.8)' }}>ACTIVE</span>
                </div>
              </div>
              <Link to="/customers">
                <button style={{
                  width: '100%', padding: '12px', borderRadius: 9999,
                  background: '#f5a524', color: '#000',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  border: 'none', cursor: 'pointer', position: 'relative', zIndex: 1,
                  transition: 'all 0.2s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 32px rgba(245,165,36,0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                >
                  LIHAT PELANGGAN
                </button>
              </Link>
            </div>

            {/* Quick actions */}
            <div className="db-card">
              <div className="db-label" style={{ marginBottom: 16 }}>QUICK ACTIONS</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {quickActions.map(action => (
                  <Link key={action.label} to={action.href} style={{ textDecoration: 'none' }}>
                    <button style={{
                      width: '100%',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      padding: 16, borderRadius: 12,
                      background: 'rgba(0,0,0,0.5)',
                      border: '1px solid rgba(245,165,36,0.05)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      gap: 8,
                    }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'rgba(245,165,36,0.3)'
                        e.currentTarget.style.background = 'rgba(245,165,36,0.05)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'rgba(245,165,36,0.05)'
                        e.currentTarget.style.background = 'rgba(0,0,0,0.5)'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 24, color: action.color }}>{action.icon}</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#e2e2e8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        {action.label}
                      </span>
                    </button>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Connected Devices / Routers */}
        <div className="db-card" style={{ marginTop: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <span className="db-card-title" style={{ margin: 0 }}>Router & Perangkat</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#f5a524', textShadow: '0 0 4px rgba(245,165,36,0.5)' }}>
              {stats?.online_routers ?? 0} ONLINE
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {devices.map(device => (
              <div key={device.name} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: 16, borderRadius: 12,
                background: 'rgba(0,0,0,0.5)',
                border: `1px solid ${device.active ? 'rgba(245,165,36,0.1)' : 'rgba(255,255,255,0.05)'}`,
                transition: 'border-color 0.2s',
                cursor: 'default',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(245,165,36,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = device.active ? 'rgba(245,165,36,0.1)' : 'rgba(255,255,255,0.05)')}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'rgba(245,165,36,0.1)',
                  border: '1px solid rgba(245,165,36,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: device.active ? '#f5a524' : '#d7c3ae' }}>{device.icon}</span>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500, color: '#e2e2e8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {device.name}
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: device.active ? '#f5a524' : '#d7c3ae', marginTop: 4 }}>
                    {device.active ? 'ONLINE' : 'OFFLINE'}
                  </div>
                </div>
              </div>
            ))}
            {/* Add router CTA */}
            <Link to="/routers" style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: 16, borderRadius: 12,
                background: 'rgba(245,165,36,0.03)',
                border: '1px dashed rgba(245,165,36,0.2)',
                cursor: 'pointer', transition: 'all 0.2s', height: '100%', minHeight: 80,
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(245,165,36,0.07)'
                  e.currentTarget.style.borderColor = 'rgba(245,165,36,0.5)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(245,165,36,0.03)'
                  e.currentTarget.style.borderColor = 'rgba(245,165,36,0.2)'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#f5a524' }}>add</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#f5a524', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Kelola Router</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
