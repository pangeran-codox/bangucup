import { useState } from 'react'
import { Outlet } from 'react-router'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&family=Space+Grotesk:wght@600;700&display=swap');

        .app-layout-root {
          display: flex;
          min-height: 100vh;
          background: #000000;
          color: #e2e2e8;
          font-family: 'Inter', sans-serif;
        }
        .app-sidebar-fixed {
          position: fixed;
          inset: 0 auto 0 0;
          z-index: 50;
          width: 256px;
          display: none;
          transition: transform 0.25s;
        }
        @media (min-width: 1024px) {
          .app-sidebar-fixed { display: flex; }
        }
        .app-sidebar-mobile {
          position: fixed;
          inset: 0 auto 0 0;
          z-index: 50;
          width: 256px;
          transform: translateX(-100%);
          transition: transform 0.25s;
          display: flex;
        }
        .app-sidebar-mobile.open { transform: translateX(0); }
        .app-sidebar-overlay {
          position: fixed;
          inset: 0;
          z-index: 40;
          background: rgba(0,0,0,0.7);
          display: none;
        }
        .app-sidebar-overlay.open { display: block; }
        @media (min-width: 1024px) {
          .app-sidebar-mobile { display: none; }
          .app-sidebar-overlay { display: none !important; }
        }
        .app-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          overflow: hidden;
        }
        @media (min-width: 1024px) {
          .app-content { margin-left: 256px; }
        }
        .app-main {
          flex: 1;
          overflow-y: auto;
        }
      `}</style>

      <div className="app-layout-root">
        {/* Desktop sidebar */}
        <div className="app-sidebar-fixed">
          <Sidebar />
        </div>

        {/* Mobile sidebar */}
        <div
          className={`app-sidebar-overlay${sidebarOpen ? ' open' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />
        <div className={`app-sidebar-mobile${sidebarOpen ? ' open' : ''}`}>
          <Sidebar />
        </div>

        {/* Content */}
        <div className="app-content">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="app-main">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  )
}
