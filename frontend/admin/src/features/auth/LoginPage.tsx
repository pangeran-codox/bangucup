import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router'
import { Loader2 } from 'lucide-react'
import { authApi } from '@/services/api/auth'
import { useAuthStore } from '@/stores/authStore'

export default function LoginPage() {
  const navigate      = useNavigate()
  const setAuth       = useAuthStore((s) => s.setAuth)
  const globeRef      = useRef<HTMLDivElement>(null)

  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [remember,    setRemember]    = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  // ─── 3D Globe ─────────────────────────────────────────────────
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://ajax.googleapis.com/ajax/libs/threejs/r125/three.min.js'
    script.onload = () => initGlobe()
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])

  function initGlobe() {
    const container = globeRef.current
    if (!container) return
    const T = (window as { THREE?: Record<string, unknown> }).THREE
    if (!T) return

    const THREE = T as {
      Scene: new () => { add: (o: unknown) => void }
      PerspectiveCamera: new (fov: number, asp: number, near: number, far: number) => {
        position: { z: number }; aspect: number; updateProjectionMatrix: () => void
      }
      WebGLRenderer: new (opts: object) => {
        setSize: (w: number, h: number) => void
        setPixelRatio: (r: number) => void
        render: (s: unknown, c: unknown) => void
        domElement: HTMLCanvasElement
      }
      Color: new (c: string) => unknown
      SphereGeometry: new (r: number, w: number, h: number) => unknown
      MeshPhongMaterial: new (opts: object) => unknown
      MeshBasicMaterial: new (opts: object) => unknown
      Mesh: new (g: unknown, m: unknown) => {
        add: (o: unknown) => void
        rotation: { x: number; y: number }
        position: { setFromSphericalCoords: (r: number, p: number, t: number) => void }
      }
      AmbientLight: new (color: number, intensity: number) => unknown
      PointLight: new (color: unknown, intensity: number) => {
        position: { set: (x: number, y: number, z: number) => void }
      }
    }

    const w = container.clientWidth || window.innerWidth
    const h = container.clientHeight || window.innerHeight

    const scene    = new THREE.Scene()
    const camera   = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000)
    camera.position.z = 2.5

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)

    const primaryColor = new THREE.Color('#f5a524')

    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      new THREE.MeshPhongMaterial({
        color: 0x1a1b20, emissive: 0x0d0e12,
        specular: primaryColor, shininess: 20,
        transparent: true, opacity: 0.9,
      })
    )
    scene.add(globe)

    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.01, 32, 32),
      new THREE.MeshBasicMaterial({ color: primaryColor, wireframe: true, transparent: true, opacity: 0.1 })
    ))

    const dotGeo = new THREE.SphereGeometry(0.015, 8, 8)
    const dotMat = new THREE.MeshBasicMaterial({ color: primaryColor })
    for (let i = 0; i < 150; i++) {
      const dot = new THREE.Mesh(dotGeo, dotMat)
      const phi   = Math.acos(-1 + (2 * i) / 150)
      const theta = Math.sqrt(150 * Math.PI) * phi
      dot.position.setFromSphericalCoords(1.02, phi, theta)
      globe.add(dot)
    }

    const ambient = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambient)
    const light = new THREE.PointLight(primaryColor, 1.5)
    light.position.set(5, 3, 5)
    scene.add(light)

    let mouseX = 0, mouseY = 0
    const onMove = (e: MouseEvent) => {
      mouseX = (e.clientX - window.innerWidth / 2)  / (window.innerWidth / 2)
      mouseY = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2)
    }
    window.addEventListener('mousemove', onMove)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)
      globe.rotation.y += 0.002
      globe.rotation.y += (mouseX * 0.5 - globe.rotation.y) * 0.05
      globe.rotation.x += (mouseY * 0.5 - globe.rotation.x) * 0.05
      renderer.render(scene, camera)
    }
    const onResize = () => {
      const nw = container.clientWidth || window.innerWidth
      const nh = container.clientHeight || window.innerHeight
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
    }
    window.addEventListener('resize', onResize)
    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('resize', onResize)
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }

  // ─── Magnetic button ──────────────────────────────────────────
  const btnRef = useRef<HTMLButtonElement>(null)
  const onBtnMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn  = btnRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const x    = e.clientX - rect.left - rect.width / 2
    const y    = e.clientY - rect.top  - rect.height / 2
    btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`
  }
  const onBtnLeave = () => {
    if (btnRef.current) btnRef.current.style.transform = 'translate(0,0)'
  }

  // ─── Submit ───────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { user, token } = await authApi.login({ email, password })
      setAuth(user, token)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Email atau password salah.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&family=Space+Grotesk:wght@600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

        .login-root {
          min-height: 100vh;
          background: #121317;
          color: #e3e2e8;
          font-family: 'Inter', sans-serif;
          overflow: hidden;
          position: relative;
        }

        @keyframes fade-up {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer-btn {
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        @keyframes border-glow-pulse {
          0%, 100% { border-color: rgba(245,165,36,0.2); box-shadow: 0 0 20px rgba(245,165,36,0.05), 0 25px 60px rgba(0,0,0,0.6); }
          50%       { border-color: rgba(245,165,36,0.6); box-shadow: 0 0 35px rgba(245,165,36,0.2), 0 25px 60px rgba(0,0,0,0.6); }
        }
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }

        .anim-1 { animation: fade-up 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
        .anim-2 { animation: fade-up 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s both; }
        .anim-3 { animation: fade-up 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s both; }
        .anim-4 { animation: fade-up 0.8s cubic-bezier(0.16,1,0.3,1) 0.4s both; }
        .anim-5 { animation: fade-up 0.8s cubic-bezier(0.16,1,0.3,1) 0.5s both; }

        .glass-card {
          background: linear-gradient(145deg, rgba(26,27,32,0.4) 0%, rgba(13,14,18,0.6) 100%);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(245,165,36,0.2);
          animation: border-glow-pulse 4s ease-in-out infinite;
        }

        .input-field {
          width: 100%;
          height: 48px;
          background: rgba(31,31,36,0.4);
          border: 1px solid rgba(82,68,52,0.4);
          border-radius: 8px;
          padding: 0 16px 0 40px;
          font-family: 'Inter', sans-serif;
          font-size: 16px;
          color: #e3e2e8;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          backdrop-filter: blur(8px);
          box-sizing: border-box;
        }
        .input-field::placeholder { color: rgba(215,195,174,0.5); }
        .input-field:focus {
          border-color: #f5a524;
          box-shadow: 0 0 0 1px rgba(245,165,36,0.5);
        }
        .input-field.password-dots {
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.2em;
          font-size: 14px;
        }

        .input-icon {
          position: absolute;
          left: 8px;
          top: 50%;
          transform: translateY(-50%);
          color: #d7c3ae;
          font-size: 20px;
          transition: color 0.2s;
        }
        .input-group:focus-within .input-icon { color: #f5a524; }

        .btn-login {
          position: relative;
          width: 100%;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 9999px;
          background: #f5a524;
          color: #462b00;
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          overflow: hidden;
          transition: background 0.3s, box-shadow 0.3s;
          box-shadow: 0 0 20px rgba(245,165,36,0.2);
        }
        .btn-login:hover {
          background: #ffddb5;
          box-shadow: 0 0 40px rgba(245,165,36,0.6);
        }
        .btn-login:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .btn-login .shimmer-layer {
          position: absolute;
          inset: 0;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent);
          transform: translateX(-100%) skewX(-12deg);
        }
        .btn-login:not(:disabled):hover .shimmer-layer {
          animation: shimmer-btn 1.5s infinite;
        }

        .btn-social {
          flex: 1;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 8px;
          background: rgba(31,31,36,0.2);
          border: 1px solid rgba(82,68,52,0.4);
          color: #e3e2e8;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, transform 0.2s;
          backdrop-filter: blur(12px);
        }
        .btn-social:hover {
          background: rgba(31,31,36,0.6);
          border-color: rgba(82,68,52,0.7);
          transform: translateY(-2px);
        }

        .ping-dot {
          position: relative;
          display: inline-flex;
          height: 8px;
          width: 8px;
        }
        .ping-dot::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: #57d6f7;
          animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite;
        }
        .ping-dot::after {
          content: '';
          position: relative;
          display: inline-flex;
          border-radius: 50%;
          height: 8px;
          width: 8px;
          background: #57d6f7;
        }
      `}</style>

      <div className="login-root">
        {/* 3D Globe background */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none',
            background: 'linear-gradient(to bottom, rgba(18,19,23,0.4), rgba(18,19,23,0.8), #121317)',
          }} />
          <div ref={globeRef} style={{ width: '100%', height: '100%', opacity: 0.7 }} />
        </div>

        {/* Ambience blobs */}
        <div style={{
          position: 'absolute', top: 0, right: 0, zIndex: 0, pointerEvents: 'none',
          width: '50vw', height: '50vw',
          background: 'rgba(245,165,36,0.1)',
          borderRadius: '50%', filter: 'blur(120px)',
          transform: 'translate(33%, -50%)',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, zIndex: 0, pointerEvents: 'none',
          width: '40vw', height: '40vw',
          background: 'rgba(87,214,247,0.05)',
          borderRadius: '50%', filter: 'blur(100px)',
          transform: 'translate(-25%, 33%)',
        }} />

        {/* Main */}
        <main style={{
          position: 'relative', zIndex: 10,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
        }}>
          {/* Card */}
          <div className="glass-card" style={{
            width: '100%', maxWidth: 448,
            borderRadius: 16,
            padding: 32,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}>
            {/* Logo + Title */}
            <div className="anim-1" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
              <Link to="/" style={{ textDecoration: 'none' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 12,
                  background: '#1f1f24',
                  border: '1px solid rgba(82,68,52,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#f5a524', fontVariationSettings: "'FILL' 1" }}>wifi</span>
                </div>
              </Link>
              <div>
                <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em', color: '#e3e2e8', margin: 0 }}>
                  Welcome Back
                </h1>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, color: '#d7c3ae', margin: '6px 0 0' }}>
                  Enter your details to access the network.
                </p>
              </div>
            </div>

            {/* Form */}
            <form className="anim-2" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Email */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.2em', color: '#d7c3ae', textTransform: 'uppercase' }}>
                    Identifier
                  </label>
                  <div className="input-group" style={{ position: 'relative' }}>
                    <span className="material-symbols-outlined input-icon">person</span>
                    <input
                      className="input-field"
                      type="email"
                      placeholder="Email atau Username"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Password */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.2em', color: '#d7c3ae', textTransform: 'uppercase' }}>
                    Passkey
                  </label>
                  <div className="input-group" style={{ position: 'relative' }}>
                    <span className="material-symbols-outlined input-icon">lock</span>
                    <input
                      className={`input-field${showPass ? '' : ' password-dots'}`}
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                        color: '#d7c3ae', display: 'flex', alignItems: 'center',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                        {showPass ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                    style={{
                      width: 16, height: 16,
                      accentColor: '#f5a524',
                      cursor: 'pointer',
                    }}
                  />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, color: '#d7c3ae' }}>
                    Keep me connected
                  </span>
                </label>
                <a href="#" style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, color: '#f5a524', textDecoration: 'none' }}>
                  Recover Passkey
                </a>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  background: 'rgba(147,0,10,0.15)',
                  border: '1px solid rgba(255,180,171,0.3)',
                  borderRadius: 8, padding: '10px 14px',
                  color: '#ffb4ab',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 14,
                }}>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                ref={btnRef}
                type="submit"
                disabled={loading}
                className="btn-login"
                onMouseMove={onBtnMove}
                onMouseLeave={onBtnLeave}
              >
                <div className="shimmer-layer" />
                <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {loading
                    ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Menghubungkan...</>
                    : <>Initialize Uplink <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span></>
                  }
                </span>
              </button>
            </form>

            {/* Divider */}
            <div className="anim-3" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(82,68,52,0.3)' }} />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.2em', color: '#d7c3ae', textTransform: 'uppercase' }}>
                Or Auth Via
              </span>
              <div style={{ flex: 1, height: 1, background: 'rgba(82,68,52,0.3)' }} />
            </div>

            {/* Social buttons */}
            <div className="anim-4" style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="btn-social">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
              <button type="button" className="btn-social">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.365 7.94c-1.637-.128-3.344 1.107-4.225 1.107-.872 0-2.39-1.1-3.75-1.077-1.745.023-3.36 1.01-4.258 2.585-1.83 3.195-.47 7.92 1.306 10.51.87 1.258 1.895 2.668 3.25 2.616 1.31-.05 1.812-.843 3.385-.843 1.575 0 2.03.842 3.395.817 1.402-.02 2.277-1.272 3.14-2.535 1.002-1.465 1.41-2.887 1.432-2.962-.032-.014-2.77-1.066-2.795-4.25-.022-2.665 2.176-3.928 2.274-3.978-1.24-1.815-3.175-2.062-3.882-2.133L16.365 7.94zm-3.235-3.41c.717-.875 1.203-2.09 1.072-3.305-1.05.043-2.343.7-3.082 1.56-.66.75-1.24 1.996-1.09 3.18 1.173.09 2.385-.562 3.1-1.435z"/>
                </svg>
                Apple
              </button>
            </div>

            {/* Register link */}
            <div className="anim-5" style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, color: '#d7c3ae', margin: 0 }}>
                Belum punya akun?{' '}
                <a href="#" style={{ color: '#f5a524', textDecoration: 'none', fontWeight: 700 }}>
                  Join Bangucup Network
                </a>
              </p>
            </div>
          </div>

          {/* Status indicator */}
          <div style={{ marginTop: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span className="ping-dot" />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.2em', color: '#57d6f7', textTransform: 'uppercase' }}>
                System Status: Optimal
              </span>
            </div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgba(215,195,174,0.5)', maxWidth: 320, margin: '0 auto' }}>
              Secure connection established via Bangucup Fiber Quantum Gateway.
            </p>
          </div>
        </main>
      </div>
    </>
  )
}
