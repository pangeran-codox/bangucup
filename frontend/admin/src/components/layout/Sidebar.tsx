import { NavLink, useNavigate } from 'react-router'
import { useAuthStore } from '@/stores/authStore'

interface NavItem {
  label: string
  href: string
  icon: string
  children?: NavItem[]
}

const navItems: NavItem[] = [
  { label: 'Overview',           href: '/dashboard',        icon: 'dashboard' },
  { label: 'Network Analytics',  href: '/monitoring',       icon: 'monitoring' },
  { label: 'Pelanggan',          href: '/customers',        icon: 'group' },
  { label: 'Perangkat',          href: '/devices',          icon: 'devices' },
  { label: 'Billing',            href: '/billing/invoices', icon: 'receipt_long' },
  { label: 'Paket',              href: '/packages',         icon: 'inventory_2' },
  { label: 'Router',             href: '/routers',          icon: 'router' },
  { label: 'Tiket',              href: '/tickets',          icon: 'support_agent' },
  { label: 'Aset',               href: '/assets',           icon: 'inventory' },
]

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AD'

  return (
    <>
      <style>{`
        .sidebar-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 256px;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-right: 1px solid rgba(245,165,36,0.2);
          box-shadow: 4px 0 32px rgba(245,165,36,0.1);
          padding: 32px 16px 24px;
          overflow-y: auto;
        }
        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 48px;
          padding: 0 8px;
        }
        .sidebar-logo-icon {
          width: 32px; height: 32px;
          border-radius: 8px;
          background: rgba(245,165,36,0.15);
          border: 1px solid rgba(245,165,36,0.3);
          display: flex; align-items: center; justify-content: center;
        }
        .sidebar-logo-text {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 18px;
          font-weight: 600;
          color: #e2e2e8;
          letter-spacing: -0.01em;
        }
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 12px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: #d7c3ae;
          text-decoration: none;
          border: 1px solid transparent;
          transition: all 0.2s;
        }
        .sidebar-link:hover {
          color: #f5a524;
          background: rgba(245,165,36,0.05);
          border-color: rgba(245,165,36,0.2);
          box-shadow: 0 0 12px rgba(245,165,36,0.1);
        }
        .sidebar-link:hover .sidebar-icon {
          filter: drop-shadow(0 0 8px rgba(245,165,36,0.8));
        }
        .sidebar-link.active {
          color: #f5a524;
          background: rgba(245,165,36,0.1);
          border-color: rgba(245,165,36,0.2);
          box-shadow: 0 0 12px rgba(245,165,36,0.2);
        }
        .sidebar-icon {
          font-size: 20px;
          transition: all 0.2s;
        }
        .sidebar-divider {
          height: 1px;
          background: rgba(245,165,36,0.15);
          margin: 16px 8px;
        }
        .sidebar-footer {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 8px;
          border-radius: 12px;
          border: 1px solid rgba(245,165,36,0.1);
          background: rgba(245,165,36,0.03);
        }
        .sidebar-avatar {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: rgba(245,165,36,0.2);
          border: 1px solid rgba(245,165,36,0.4);
          display: flex; align-items: center; justify-content: center;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 600;
          color: #f5a524;
          flex-shrink: 0;
        }
        .sidebar-user-name {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: #e2e2e8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          min-width: 0;
        }
        .sidebar-logout {
          background: none;
          border: none;
          cursor: pointer;
          color: #d7c3ae;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          transition: color 0.2s;
          flex-shrink: 0;
        }
        .sidebar-logout:hover { color: #f5a524; }
        .sidebar-settings-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 12px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: #d7c3ae;
          text-decoration: none;
          border: 1px solid transparent;
          transition: all 0.2s;
          margin-bottom: 8px;
        }
        .sidebar-settings-link:hover {
          color: #f5a524;
          background: rgba(245,165,36,0.05);
          border-color: rgba(245,165,36,0.2);
        }
      `}</style>

      <aside className="sidebar-root">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#f5a524', fontVariationSettings: "'FILL' 1" }}>wifi</span>
          </div>
          <span className="sidebar-logo-text">Bangucup</span>
        </div>

        {/* Nav items */}
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                `sidebar-link${isActive ? ' active' : ''}`
              }
            >
              <span className="material-symbols-outlined sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div>
          <NavLink to="/settings" className="sidebar-settings-link">
            <span className="material-symbols-outlined sidebar-icon">settings</span>
            <span>Settings</span>
          </NavLink>
          <div className="sidebar-divider" />
          <div className="sidebar-footer">
            <div className="sidebar-avatar">{initials}</div>
            <span className="sidebar-user-name">{user?.name ?? 'Administrator'}</span>
            <button className="sidebar-logout" onClick={handleLogout} title="Logout">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
