import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

// ─── Data paket ──────────────────────────────────────────────────
const packages = [
  {
    id: 'hemat',
    label: 'PAKET HEMAT',
    speed: 20,
    desc: 'Cocok untuk 1–3 perangkat',
    priceMonthly: 199000,
    priceYearly: 139300,
    popular: false,
    color: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.1)',
    ctaLabel: 'Pilih Hemat',
    ctaStyle: 'outline' as const,
    features: [
      { text: 'Unlimited Kuota', check: true },
      { text: 'Gratis Router WiFi', check: true },
      { text: 'Layanan TV Kabel', check: false },
    ],
  },
  {
    id: 'populer',
    label: 'PAKET POPULER',
    speed: 50,
    desc: 'Cocok untuk keluarga (4–7 perangkat)',
    priceMonthly: 299000,
    priceYearly: 209300,
    popular: true,
    color: 'rgba(245,165,36,0.08)',
    borderColor: 'rgba(245,165,36,0.5)',
    ctaLabel: 'Berlangganan Populer',
    ctaStyle: 'primary' as const,
    features: [
      { text: 'Unlimited Kuota', check: true },
      { text: 'Gratis Router Dual-Band', check: true },
      { text: 'Prioritas CS', check: true },
    ],
  },
  {
    id: 'super',
    label: 'PAKET SUPER',
    speed: 100,
    desc: 'Gaming & 4K Streaming (8+ perangkat)',
    priceMonthly: 449000,
    priceYearly: 314300,
    popular: false,
    color: 'rgba(113,224,255,0.05)',
    borderColor: 'rgba(113,224,255,0.25)',
    ctaLabel: 'Pilih Super',
    ctaStyle: 'outline' as const,
    features: [
      { text: 'Unlimited Kuota', check: true },
      { text: 'Router Mesh WiFi 6', check: true },
      { text: 'IP Publik Dinamis', check: true },
    ],
  },
]

function formatRp(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

function PricingSection() {
  const [yearly, setYearly] = useState(false)

  return (
    <section id="harga" style={{
      padding: 'var(--section-gap) var(--gutter)',
      position: 'relative',
    }}>
      {/* Ambience */}
      <div aria-hidden="true" style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 900, height: 600,
        background: 'radial-gradient(ellipse, rgba(245,165,36,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <span className="label-caps" style={{ color: 'var(--color-primary)', marginBottom: 12, display: 'block' }}>
            PAKET INTERNET WARGA
          </span>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <h2 className="headline-lg" style={{ color: 'var(--color-on-background)', marginBottom: 8 }}>
                Pilih Paket Terbaik Anda
              </h2>
              <p className="body-base" style={{ color: 'var(--color-on-surface-variant)' }}>
                Pilih paket yang sesuai dengan kebutuhan keluarga Anda. Transparan tanpa biaya tersembunyi.
              </p>
            </div>

            {/* Toggle Bulanan / Tahunan */}
            <div style={{
              display: 'inline-flex',
              background: 'var(--color-surface-container)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 9999,
              padding: 4,
              gap: 4,
            }}>
              {[
                { label: 'Bulanan', value: false },
                { label: 'Tahunan', value: true, badge: 'Hemat 30%' },
              ].map(opt => (
                <button
                  key={String(opt.value)}
                  onClick={() => setYearly(opt.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 20px',
                    borderRadius: 9999,
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 12,
                    letterSpacing: '0.1em',
                    fontWeight: 500,
                    transition: 'all 0.25s',
                    background: yearly === opt.value ? 'var(--color-primary-container)' : 'transparent',
                    color: yearly === opt.value ? 'var(--color-on-primary-container)' : 'var(--color-on-surface-variant)',
                  }}
                >
                  {opt.label}
                  {opt.badge && (
                    <span style={{
                      fontSize: 10,
                      background: yearly ? 'rgba(42,24,0,0.4)' : 'rgba(245,165,36,0.15)',
                      color: yearly ? 'var(--color-on-primary-container)' : 'var(--color-primary)',
                      padding: '2px 8px',
                      borderRadius: 9999,
                      letterSpacing: '0.05em',
                    }}>
                      {opt.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
          marginTop: 48,
          alignItems: 'stretch',
        }}>
          {packages.map(pkg => (
            <div
              key={pkg.id}
              style={{
                position: 'relative',
                background: pkg.color,
                backdropFilter: 'blur(32px)',
                border: `1px solid ${pkg.borderColor}`,
                borderRadius: 24,
                padding: '36px 32px',
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
                transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s',
                boxShadow: pkg.popular
                  ? '0 0 0 1px rgba(245,165,36,0.3), 0 20px 60px rgba(245,165,36,0.1), inset 0 1px 0 rgba(255,255,255,0.1)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.3)',
                cursor: 'default',
                transform: pkg.popular ? 'scale(1.03)' : 'scale(1)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = pkg.popular ? 'scale(1.05) translateY(-4px)' : 'scale(1) translateY(-6px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = pkg.popular ? 'scale(1.03)' : 'scale(1)'
              }}
            >
              {/* Popular badge */}
              {pkg.popular && (
                <div style={{
                  position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, #f5a524, #ff6b6b)',
                  color: '#2a1800',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.12em',
                  padding: '5px 18px',
                  borderRadius: 9999,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 16px rgba(245,165,36,0.4)',
                }}>
                  PALING DIMINATI
                </div>
              )}

              {/* Label */}
              <div className="label-caps" style={{
                color: pkg.popular ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                marginBottom: 16,
                fontSize: 11,
              }}>
                {pkg.label}
              </div>

              {/* Speed */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 56,
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                  color: pkg.popular ? 'var(--color-primary)' : 'var(--color-on-surface)',
                }}>
                  {pkg.speed}
                </span>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 20,
                  fontWeight: 600,
                  color: 'var(--color-on-surface-variant)',
                }}>
                  Mbps
                </span>
              </div>

              <p className="body-base" style={{
                color: 'var(--color-on-surface-variant)',
                fontSize: 13,
                marginBottom: 24,
              }}>
                {pkg.desc}
              </p>

              {/* Price */}
              <div style={{ marginBottom: 32 }}>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 24,
                  fontWeight: 600,
                  color: 'var(--color-on-surface)',
                  letterSpacing: '-0.02em',
                }}>
                  {formatRp(yearly ? pkg.priceYearly : pkg.priceMonthly)}
                </div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11,
                  color: 'var(--color-on-surface-variant)',
                  opacity: 0.6,
                  marginTop: 2,
                }}>
                  / bulan{yearly ? ' · tagihan tahunan' : ''}
                </div>
              </div>

              {/* Divider */}
              <div style={{
                height: 1,
                background: `linear-gradient(to right, transparent, ${pkg.borderColor}, transparent)`,
                marginBottom: 24,
              }} />

              {/* Features */}
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                {pkg.features.map(f => (
                  <li key={f.text} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    color: f.check ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)',
                    opacity: f.check ? 1 : 0.4,
                    fontSize: 14,
                  }}>
                    <span className="material-symbols-outlined" style={{
                      fontSize: 18,
                      color: f.check
                        ? (pkg.popular ? 'var(--color-primary)' : 'var(--color-tertiary)')
                        : 'var(--color-on-surface-variant)',
                      fontVariationSettings: f.check ? "'FILL' 1" : "'FILL' 0",
                    }}>
                      {f.check ? 'check_circle' : 'cancel'}
                    </span>
                    {f.text}
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: 12,
                border: pkg.ctaStyle === 'primary' ? 'none' : '1px solid rgba(255,255,255,0.15)',
                background: pkg.ctaStyle === 'primary'
                  ? 'linear-gradient(135deg, #f5a524, #ff6b6b)'
                  : 'rgba(255,255,255,0.05)',
                color: pkg.ctaStyle === 'primary' ? '#2a1800' : 'var(--color-on-surface)',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.25s',
                boxShadow: pkg.ctaStyle === 'primary' ? '0 4px 20px rgba(245,165,36,0.35)' : 'none',
              }}
              onMouseEnter={e => {
                if (pkg.ctaStyle === 'primary') {
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(245,165,36,0.5)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                } else {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                }
              }}
              onMouseLeave={e => {
                if (pkg.ctaStyle === 'primary') {
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(245,165,36,0.35)'
                  e.currentTarget.style.transform = 'translateY(0)'
                } else {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                }
              }}>
                {pkg.ctaLabel}
              </button>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <p className="body-base" style={{
          textAlign: 'center',
          color: 'var(--color-on-surface-variant)',
          opacity: 0.5,
          fontSize: 13,
          marginTop: 40,
        }}>
          Semua paket sudah termasuk instalasi gratis · Tanpa biaya tersembunyi · Bisa dibatalkan kapan saja
        </p>
      </div>
    </section>
  )
}



export default function LandingPage() {
  const globeContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load Three.js dynamically
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
    script.onload = () => initGlobe()
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  function initGlobe() {
    const container = globeContainerRef.current
    if (!container || !(window as unknown as { THREE: unknown }).THREE) return

    const THREE = (window as unknown as { THREE: {
      Scene: new() => THREE_Scene
      PerspectiveCamera: new(fov: number, aspect: number, near: number, far: number) => THREE_Camera
      WebGLRenderer: new(opts: object) => THREE_Renderer
      Group: new() => THREE_Group
      SphereGeometry: new(r: number, w: number, h: number) => THREE_Geometry
      MeshBasicMaterial: new(opts: object) => THREE_Material
      Mesh: new(g: THREE_Geometry, m: THREE_Material) => THREE_Mesh
      BufferGeometry: new() => THREE_BufferGeometry
      BufferAttribute: new(arr: Float32Array, n: number) => THREE_BufferAttribute
      PointsMaterial: new(opts: object) => THREE_PointsMaterial
      Points: new(g: THREE_BufferGeometry, m: THREE_PointsMaterial) => THREE_Points
      Clock: new() => THREE_Clock
      AdditiveBlending: number
    }}).THREE

    type THREE_Scene      = { add: (o: unknown) => void }
    type THREE_Camera     = { position: { z: number }; aspect: number; updateProjectionMatrix: () => void }
    type THREE_Renderer   = { setSize: (w: number, h: number) => void; setPixelRatio: (r: number) => void; render: (s: THREE_Scene, c: THREE_Camera) => void; domElement: HTMLCanvasElement }
    type THREE_Group      = { add: (o: unknown) => void; rotation: { x: number; y: number } }
    type THREE_Geometry   = object
    type THREE_Material   = object
    type THREE_Mesh       = object
    type THREE_BufferGeometry = { setAttribute: (name: string, attr: THREE_BufferAttribute) => void }
    type THREE_BufferAttribute = object
    type THREE_PointsMaterial = { opacity: number }
    type THREE_Points     = object
    type THREE_Clock      = { getElapsedTime: () => number }

    const scene    = new THREE.Scene()
    const camera   = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000)
    camera.position.z = 15

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    const globeGroup = new THREE.Group()
    scene.add(globeGroup)

    // Wireframe sphere
    const geometry = new THREE.SphereGeometry(5, 32, 32)
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x333539,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    })
    const wireframeSphere = new THREE.Mesh(geometry, wireframeMaterial)
    globeGroup.add(wireframeSphere)

    // Points
    const pointsGeometry  = new THREE.BufferGeometry()
    const pointsCount     = 1000
    const posArray        = new Float32Array(pointsCount * 3)
    for (let i = 0; i < pointsCount * 3; i += 3) {
      const phi   = Math.acos(-1 + (2 * i) / (pointsCount * 3))
      const theta = Math.sqrt(pointsCount * 3 * Math.PI) * phi
      const r     = 5.05
      posArray[i]     = r * Math.cos(theta) * Math.sin(phi)
      posArray[i + 1] = r * Math.sin(theta) * Math.sin(phi)
      posArray[i + 2] = r * Math.cos(phi)
    }
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
    const pointsMaterial = new THREE.PointsMaterial({
      size: 0.05,
      color: 0xffb957,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    })
    const pointsMesh = new THREE.Points(pointsGeometry, pointsMaterial)
    globeGroup.add(pointsMesh)

    let mouseX = 0
    let mouseY = 0
    const windowHalfX = window.innerWidth / 2
    const windowHalfY = window.innerHeight / 2

    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX - windowHalfX) * 0.001
      mouseY = (e.clientY - windowHalfY) * 0.001
    }
    document.addEventListener('mousemove', onMouseMove)

    const onResize = () => {
      (camera as unknown as { aspect: number; updateProjectionMatrix: () => void }).aspect = container.clientWidth / container.clientHeight;
      (camera as unknown as { updateProjectionMatrix: () => void }).updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener('resize', onResize)

    const clock = new THREE.Clock()
    let animId: number

    const animate = () => {
      animId = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()
      const gr = globeGroup.rotation
      gr.y = t * 0.05
      gr.x = t * 0.02
      gr.y += 0.05 * (mouseX * 0.5 - gr.y)
      gr.x += 0.05 * (mouseY * 0.5 - gr.x)
      pointsMaterial.opacity = 0.5 + Math.sin(t * 2) * 0.2
      renderer.render(scene, camera)
    }
    animate()

    // Cleanup
    return () => {
      cancelAnimationFrame(animId)
      document.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }

  return (
    <>
      {/* Fonts & Icons */}
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&family=Space+Grotesk:wght@600;700&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&family=Space+Grotesk:wght@600;700&display=swap');

        .landing-root {
          --color-primary: #ffc77f;
          --color-primary-container: #f5a524;
          --color-on-primary-container: #2a1800;
          --color-secondary: #ffb3b0;
          --color-tertiary: #71e0ff;
          --color-tertiary-fixed-dim: #57d6f7;
          --color-secondary-fixed: #ffdad8;
          --color-secondary-container: #901822;
          --color-background: #111317;
          --color-surface: #111317;
          --color-surface-glass: rgba(25, 27, 32, 0.6);
          --color-surface-container: #1e2024;
          --color-surface-container-low: #1a1c20;
          --color-surface-container-lowest: #0c0e12;
          --color-surface-container-high: #282a2e;
          --color-surface-variant: #333539;
          --color-on-surface: #e2e2e8;
          --color-on-surface-variant: #d7c3ae;
          --color-on-background: #e2e2e8;
          --color-outline: #9f8e7a;
          --color-outline-variant: #524434;
          --color-error: #ffb4ab;
          --color-primary-fixed-dim: #ffb957;
          --color-accent-gradient: linear-gradient(135deg, #f5a524 0%, #ff6b6b 100%);
          --section-gap: 120px;
          --container-max: 1280px;
          --gutter: 32px;
          --card-padding: 40px;
          font-family: 'Inter', sans-serif;
          background-color: var(--color-background);
          color: var(--color-on-background);
          overflow-x: hidden;
        }
        .landing-root ::-webkit-scrollbar { display: none; }

        /* Typography */
        .display-hero {
          font-family: 'Space Grotesk', sans-serif;
          font-size: clamp(40px, 6vw, 64px);
          line-height: 1.05;
          letter-spacing: -0.04em;
          font-weight: 700;
        }
        .headline-lg {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 36px;
          line-height: 1.2;
          letter-spacing: -0.02em;
          font-weight: 600;
        }
        .title-card {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 20px;
          line-height: 1.4;
          letter-spacing: -0.01em;
          font-weight: 600;
        }
        .body-lg   { font-size: 18px; line-height: 1.6; }
        .body-base { font-size: 16px; line-height: 1.5; }
        .label-caps {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          line-height: 1;
          letter-spacing: 0.15em;
          font-weight: 500;
          text-transform: uppercase;
        }
        .metric-xl {
          font-family: 'JetBrains Mono', monospace;
          font-size: 40px;
          line-height: 1;
          letter-spacing: -0.02em;
          font-weight: 600;
        }

        /* Animations */
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmer {
          from { transform: translateX(-100%) skewX(12deg); }
          to   { transform: translateX(200%) skewX(12deg); }
        }
        .anim-fade-in-up { animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        .anim-fade-in    { animation: fade-in 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }
        .delay-6 { animation-delay: 0.6s; }
        .delay-8 { animation-delay: 0.8s; }

        /* Glass */
        .glass {
          background: var(--color-surface-glass);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.1);
        }

        /* Gradient text */
        .text-gradient {
          background: var(--color-accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Feature card hover */
        .feature-card {
          background: var(--color-surface-glass);
          backdrop-filter: blur(32px);
          border-radius: 24px;
          padding: var(--card-padding);
          transition: transform 0.5s cubic-bezier(0.16,1,0.3,1);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.4);
          position: relative;
        }
        .feature-card:hover { transform: translateY(-8px); }
        .feature-card-glow {
          position: absolute;
          inset: 0;
          border-radius: 24px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.5s;
        }
        .feature-card:hover .feature-card-glow { opacity: 1; }
        .feature-card .icon-wrap {
          width: 64px; height: 64px;
          border-radius: 16px;
          background: linear-gradient(135deg, var(--color-surface-container-high), var(--color-surface-container-low));
          border: 1px solid rgba(255,255,255,0.1);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 32px;
          transition: transform 0.5s;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        }
        .feature-card:hover .icon-wrap { transform: scale(1.1); }
        .material-symbols-outlined { font-size: 28px; }

        /* Stat card */
        .stat-card {
          background: var(--color-surface-glass);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 20px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 10px 40px rgba(0,0,0,0.5);
          transition: transform 0.3s;
        }
        .stat-card:hover { transform: scale(1.05); }

        /* Nav */
        nav a { font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 0.15em; font-weight: 500; text-transform: uppercase; }

        /* Buttons */
        .btn-primary {
          background: var(--color-primary-container);
          color: var(--color-on-primary-container);
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px; letter-spacing: 0.15em; font-weight: 500; text-transform: uppercase;
          padding: 16px 40px;
          border-radius: 9999px;
          border: none; cursor: pointer;
          position: relative; overflow: hidden;
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .btn-primary:hover { box-shadow: 0 0 32px rgba(245,165,36,0.4); transform: scale(1.05); }
        .btn-primary:active { transform: scale(0.95); }
        .btn-primary .shimmer {
          position: absolute; inset: 0;
          background: rgba(255,255,255,0.2);
          transform: translateX(-100%) skewX(12deg);
        }
        .btn-primary:hover .shimmer { animation: shimmer 1.5s infinite; }

        .btn-secondary {
          background: var(--color-surface-glass);
          backdrop-filter: blur(24px);
          color: var(--color-on-surface);
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px; letter-spacing: 0.15em; font-weight: 500; text-transform: uppercase;
          padding: 16px 40px;
          border-radius: 9999px;
          border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer;
          transition: background 0.3s;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
        }
        .btn-secondary:hover { background: var(--color-surface-container-high); }

        /* Footer */
        .footer-link { color: var(--color-on-surface-variant); font-size: 14px; cursor: pointer; transition: color 0.2s; }
        .footer-link:hover { color: var(--color-on-surface); }
      `}</style>

      <div className="landing-root">
        {/* ── Header ───────────────────────────────────────────────── */}
        <header style={{
          position: 'fixed', top: 0, width: '100%', zIndex: 50,
          background: 'var(--color-surface-glass)',
          backdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
        }}>
          <div style={{
            height: 80, maxWidth: 'var(--container-max)',
            margin: '0 auto', padding: '0 var(--gutter)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 32, height: 32,
                background: 'var(--color-primary-container)',
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-on-primary-container)' }}>wifi</span>
              </div>
              <span className="title-card" style={{ color: 'var(--color-on-surface)' }}>Bangucup</span>
            </div>

            {/* Nav */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: 'var(--gutter)' }}>
              <a href="#" style={{ color: 'var(--color-primary)' }}>BERANDA</a>
              <a href="#packages" style={{ color: 'var(--color-on-surface-variant)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-on-surface-variant)')}>
                PAKET
              </a>
              <a href="#coverage" style={{ color: 'var(--color-on-surface-variant)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-on-surface-variant)')}>
                CAKUPAN
              </a>
              <a href="#help" style={{ color: 'var(--color-on-surface-variant)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-on-surface-variant)')}>
                BANTUAN
              </a>
            </nav>

            {/* CTA */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <button className="btn-primary" style={{ padding: '12px 32px', display: 'none' }}
                onLoad={e => { (e.currentTarget as HTMLElement).style.display = 'block' }}>
                PASANG BARU
              </button>
              <Link
                to="/login"
                className="label-caps"
                style={{
                  color: 'var(--color-on-surface-variant)',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-on-surface-variant)')}>
                MASUK
              </Link>
            </div>
          </div>
        </header>

        <main style={{ paddingTop: 80 }}>
          {/* ── Hero ───────────────────────────────────────────────── */}
          <section style={{
            position: 'relative',
            overflow: 'hidden',
            minHeight: 921,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: `96px var(--gutter) var(--section-gap)`,
          }}>
            {/* Background ambience */}
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
              <div style={{
                position: 'absolute', top: 0, left: '25%',
                width: 800, height: 800,
                background: 'var(--color-primary-container)',
                borderRadius: '50%', filter: 'blur(150px)',
                opacity: 0.1, mixBlendMode: 'screen',
                transform: 'translateY(-50%)',
              }} />
              <div style={{
                position: 'absolute', top: 409, right: 0,
                width: 600, height: 600,
                background: 'var(--color-tertiary)',
                borderRadius: '50%', filter: 'blur(120px)',
                opacity: 0.08, mixBlendMode: 'screen',
                transform: 'translateX(33%)',
              }} />
              <div style={{
                position: 'absolute', bottom: 0, left: 0,
                width: '100%', height: 614,
                background: 'linear-gradient(to top, var(--color-background), transparent)',
                zIndex: 10,
              }} />
              <div style={{
                position: 'absolute', inset: 0,
                opacity: 0.03,
                backgroundImage: 'linear-gradient(to right, #e2e2e8 1px, transparent 1px), linear-gradient(to bottom, #e2e2e8 1px, transparent 1px)',
                backgroundSize: '64px 64px',
              }} />
            </div>

            {/* 3D Globe */}
            <div
              ref={globeContainerRef}
              style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0.8, zIndex: 1,
              }}
            />

            {/* Hero content */}
            <div style={{
              position: 'relative', zIndex: 10,
              textAlign: 'center',
              maxWidth: 896,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              marginTop: 48,
              pointerEvents: 'none',
            }}>
              {/* Live badge */}
              <div className="glass anim-fade-in" style={{
                display: 'inline-flex', alignItems: 'center', gap: 12,
                padding: '8px 24px', borderRadius: 9999,
                marginBottom: 32,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 0 32px rgba(245,165,36,0.1)',
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--color-error)',
                  boxShadow: '0 0 12px rgba(255,180,171,0.8)',
                  animation: 'pulse 2s infinite',
                }} />
                <span className="label-caps" style={{ color: 'var(--color-on-surface-variant)' }}>
                  JARINGAN LIVE AKTIF
                </span>
              </div>

              <h1 className="display-hero anim-fade-in-up delay-1"
                style={{ color: 'var(--color-on-background)', marginBottom: 24 }}>
                Internet Cepat,<br />
                <span className="text-gradient">Warga Hebat.</span>
              </h1>

              <p className="body-lg anim-fade-in-up delay-2"
                style={{
                  color: 'var(--color-on-surface-variant)',
                  maxWidth: 640, margin: '0 auto 48px',
                  lineHeight: 1.6,
                }}>
                Konektivitas Fiber Optic premium untuk masa depan digital Anda.
                Stabil, ultra-cepat, dan dirancang untuk kebutuhan modern warga Bangucup.
              </p>

              <div className="anim-fade-in-up delay-3"
                style={{
                  display: 'flex', flexWrap: 'wrap',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 24, pointerEvents: 'auto',
                }}>
                <button className="btn-primary">
                  <span style={{ position: 'relative', zIndex: 1 }}>CEK AREA ANDA</span>
                  <div className="shimmer" />
                </button>
                <Link to="/login">
                  <button className="btn-secondary">MASUK DASHBOARD</button>
                </Link>
              </div>
            </div>

            {/* Floating stat cards */}
            <div className="stat-card anim-fade-in delay-6"
              style={{
                position: 'absolute', top: '30%', left: '5%', zIndex: 20,
                display: 'none',
              }}
              ref={el => { if (el) el.style.display = 'block' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'rgba(64,197,229,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-tertiary-fixed-dim)',
                }}>
                  <span className="material-symbols-outlined">speed</span>
                </div>
                <div>
                  <div className="label-caps" style={{ color: 'var(--color-on-surface-variant)', marginBottom: 4 }}>SPEED UP TO</div>
                  <div className="metric-xl" style={{ fontSize: 24, color: 'var(--color-on-surface)' }}>1 Gbps</div>
                </div>
              </div>
            </div>

            <div className="stat-card anim-fade-in delay-8"
              style={{
                position: 'absolute', bottom: '20%', right: '5%', zIndex: 20,
                display: 'none',
              }}
              ref={el => { if (el) el.style.display = 'block' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'rgba(144,24,34,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-secondary-fixed)',
                }}>
                  <span className="material-symbols-outlined">verified</span>
                </div>
                <div>
                  <div className="label-caps" style={{ color: 'var(--color-on-surface-variant)', marginBottom: 4 }}>RELIABILITY</div>
                  <div className="metric-xl" style={{ fontSize: 24, color: 'var(--color-on-surface)' }}>99.9% Uptime</div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Features ───────────────────────────────────────────── */}
          <section id="packages" style={{
            padding: `var(--section-gap) var(--gutter)`,
            background: 'rgba(12,14,18,0.5)',
            backdropFilter: 'blur(48px)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: 64 }}>
                <h2 className="headline-lg" style={{ color: 'var(--color-on-background)', marginBottom: 16 }}>
                  Infrastruktur Kelas Dunia
                </h2>
                <p className="body-base" style={{ color: 'var(--color-on-surface-variant)', maxWidth: 480, margin: '0 auto' }}>
                  Kami tidak berkompromi soal kualitas. Jaringan Bangucup dibangun dengan teknologi fiber terkini.
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 32,
              }}>
                {/* Card 1 */}
                <div className="feature-card">
                  <div className="feature-card-glow" style={{
                    border: '1px solid rgba(245,165,36,0.3)',
                    boxShadow: 'inset 0 0 20px rgba(245,165,36,0.1)',
                  }} />
                  <div className="icon-wrap">
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-primary-fixed-dim)', fontVariationSettings: "'FILL' 1" }}>cable</span>
                  </div>
                  <h3 className="title-card" style={{ color: 'var(--color-on-surface)', marginBottom: 12 }}>100% Fiber Optic</h3>
                  <p className="body-base" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.8, lineHeight: 1.6 }}>
                    Jalur khusus fiber optic langsung ke rumah Anda. Tanpa tembaga, tanpa latensi tinggi. Nikmati kecepatan simetris unggulan.
                  </p>
                </div>

                {/* Card 2 */}
                <div className="feature-card">
                  <div className="feature-card-glow" style={{
                    border: '1px solid rgba(113,224,255,0.3)',
                    boxShadow: 'inset 0 0 20px rgba(113,224,255,0.1)',
                  }} />
                  <div className="icon-wrap">
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-tertiary-fixed-dim)', fontVariationSettings: "'FILL' 1" }}>all_inclusive</span>
                  </div>
                  <h3 className="title-card" style={{ color: 'var(--color-on-surface)', marginBottom: 12 }}>Unlimited Quota</h3>
                  <p className="body-base" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.8, lineHeight: 1.6 }}>
                    Streaming 4K, gaming kompetitif, dan unduhan masif tanpa perlu memikirkan sisa kuota. Bebas hambatan FUP.
                  </p>
                </div>

                {/* Card 3 */}
                <div className="feature-card">
                  <div className="feature-card-glow" style={{
                    border: '1px solid rgba(255,179,176,0.3)',
                    boxShadow: 'inset 0 0 20px rgba(255,179,176,0.1)',
                  }} />
                  <div className="icon-wrap">
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-secondary-fixed)', fontVariationSettings: "'FILL' 1" }}>support_agent</span>
                  </div>
                  <h3 className="title-card" style={{ color: 'var(--color-on-surface)', marginBottom: 12 }}>24/7 Support</h3>
                  <p className="body-base" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.8, lineHeight: 1.6 }}>
                    Tim teknis dedicated siap membantu Anda kapan saja. Respon cepat untuk memastikan konektivitas Anda selalu optimal.
                  </p>
                </div>
              </div>
            </div>
          </section>
          {/* ── Pricing ────────────────────────────────────────────── */}
          <PricingSection />
        </main>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <footer style={{
          background: 'var(--color-surface-container-low)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: `var(--section-gap) var(--gutter)`,
        }}>
          <div style={{
            maxWidth: 'var(--container-max)', margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--gutter)',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{
                  width: 24, height: 24,
                  background: 'var(--color-primary-container)',
                  borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0.8,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--color-on-primary-container)' }}>wifi</span>
                </div>
                <span className="title-card" style={{ color: 'var(--color-on-surface)' }}>Bangucup</span>
              </div>
              <p className="body-base" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.6, fontSize: 14, lineHeight: 1.6 }}>
                Premium Fiber Optic Connectivity for the next generation of digital excellence.
              </p>
            </div>

            <div>
              <h4 className="label-caps" style={{ color: 'var(--color-primary)', marginBottom: 24 }}>LAYANAN</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {['Internet Rumah', 'Internet Bisnis', 'Dedicated Fiber'].map(item => (
                  <li key={item} className="footer-link">{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="label-caps" style={{ color: 'var(--color-primary)', marginBottom: 24 }}>PERUSAHAAN</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {['Tentang Kami', 'Karir', 'Kontak'].map(item => (
                  <li key={item} className="footer-link">{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="label-caps" style={{ color: 'var(--color-primary)', marginBottom: 24 }}>SOCIAL</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {['Instagram', 'Twitter / X', 'LinkedIn'].map(item => (
                  <li key={item} className="footer-link">{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{
            maxWidth: 'var(--container-max)', margin: '64px auto 0',
            padding: `32px var(--gutter) 0`,
            borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', flexWrap: 'wrap',
            justifyContent: 'space-between', alignItems: 'center',
            gap: 16,
          }}>
            <span className="label-caps" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.4, fontSize: 11 }}>
              © 2024 BANGUCUP FIBER NETWORKS. ALL RIGHTS RESERVED.
            </span>
            <div style={{ display: 'flex', gap: 32 }}>
              {['TERMS OF SERVICE', 'PRIVACY POLICY'].map(item => (
                <span key={item} className="label-caps" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.4, fontSize: 11, cursor: 'pointer' }}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
