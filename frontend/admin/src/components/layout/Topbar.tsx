import { useNavigate } from 'react-router'
import { useAuthStore } from '@/stores/authStore'

interface TopbarProps {
  onMenuClick?: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const user     = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AD'

  return (
    <>
      <style>{`
        .topbar-root {
          height: 80px;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-bottom: 1px solid rgba(245,165,36,0.2);
          box-shadow: 0 4px 32px rgba(245,165,36,0.1);
          display: flex;
          align-items: center;
          padding: 0 32px;
          gap: 16px;
          position: sticky;
          top: 0;
          z-index: 40;
          flex-shrink: 0;
        }
        .topbar-mobile-logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .topbar-mobile-logo-icon {
          width: 28px; height: 28px;
          border-radius: 6px;
          background: rgba(245,165,36,0.15);
          border: 1px solid rgba(245,165,36,0.3);
          display: flex; align-items: center; justify-content: center;
        }
        .topbar-nav {
          display: flex;
          align-items: center;
          gap: 32px;
          margin: 0 auto;
        }
        .topbar-nav a {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #d7c3ae;
          text-decoration: none;
          transition: color 0.2s;
        }
        .topbar-nav a.active,
        .topbar-nav a:hover { color: #f5a524; }
        .topbar-nav a.active {
          filter: drop-shadow(0 0 8px rgba(245,165,36,0.8));
        }
        .topbar-right {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-left: auto;
        }
        .topbar-btn-cta {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          background: #f5a524;
          color: #2a1800;
          border: none;
          padding: 10px 24px;
          border-radius: 9999px;
          cursor: pointer;
          transition: all 0.2s;
          display: none;
        }
        @media (min-width: 1024px) {
          .topbar-btn-cta { display: block; }
          .topbar-mobile-logo { display: none; }
          .topbar-nav { display: flex; }
        }
        @media (max-width: 1023px) {
          .topbar-nav { display: none; }
          .topbar-mobile-logo { display: flex; }
        }
        .topbar-btn-cta:hover {
          box-shadow: 0 0 24px rgba(245,165,36,0.6);
          transform: scale(1.05);
        }
        .topbar-avatar {
          width: 32px; height: 32px;
          border-radius: 50%;
          border: 1px solid rgba(245,165,36,0.5);
          padding: 2px;
          overflow: hidden;
          box-shadow: 0 0 12px rgba(245,165,36,0.4);
          background: rgba(245,165,36,0.15);
          display: flex; align-items: center; justify-content: center;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 600;
          color: #f5a524;
          cursor: pointer;
          flex-shrink: 0;
        }
        .topbar-menu-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px; height: 36px;
          background: none;
          border: 1px solid rgba(245,165,36,0.2);
          border-radius: 8px;
          color: #d7c3ae;
          cursor: pointer;
          transition: all 0.2s;
        }
        .topbar-menu-btn:hover {
          color: #f5a524;
          border-color: rgba(245,165,36,0.5);
        }
        @media (min-width: 1024px) {
          .topbar-menu-btn { display: none; }
        }
      `}</style>

      <header className="topbar-root">
        {/* Mobile menu + logo */}
        <button className="topbar-menu-btn" onClick={onMenuClick}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>menu</span>
        </button>

        <div className="topbar-mobile-logo">
          <div className="topbar-mobile-logo-icon">
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#f5a524', fontVariationSettings: "'FILL' 1" }}>wifi</span>
          </div>
          <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 16, fontWeight: 600, color: '#e2e2e8' }}>
            Bangucup
          </span>
        </div>

        {/* Center nav */}
        <nav className="topbar-nav">
          {[
            { label: 'BERANDA', href: '/' },
            { label: 'PAKET', href: '/packages' },
            { label: 'CAKUPAN', href: '/coverage' },
            { label: 'BANTUAN', href: '/help' },
          ].map(item => (
            <a key={item.href} href={item.href}>{item.label}</a>
          ))}
        </nav>

        {/* Right */}
        <div className="topbar-right">
          <button className="topbar-btn-cta">PASANG BARU</button>
          <div
            className="topbar-avatar"
            onClick={() => navigate('/settings')}
            title={user?.name ?? 'Profile'}
          >
            {initials}
          </div>
        </div>
      </header>
    </>
  )
}
