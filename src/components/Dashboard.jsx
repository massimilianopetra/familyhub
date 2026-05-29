import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import GamesSection from './GamesSection'
import CalendarSection from './CalendarSection'

const NAV = [
  { id: 'games',    icon: '🎮', label: 'Giochi' },
  { id: 'calendar', icon: '📅', label: 'Calendario' },
]

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

export default function Dashboard({ session }) {
  const [section, setSection] = useState('games')
  const isMobile = useIsMobile()

  return (
    <div style={{ ...s.shell, flexDirection: isMobile ? 'column' : 'row' }}>

      {/* SIDEBAR — solo desktop */}
      {!isMobile && (
        <aside style={s.sidebar}>
          <div style={s.brand}>
            <span style={s.brandIcon}>🏠</span>
            <span style={s.brandName}>FamHub</span>
          </div>
          <nav style={s.nav}>
            {NAV.map(item => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                style={{ ...s.navItem, ...(section === item.id ? s.navItemActive : {}) }}
              >
                <span style={s.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div style={s.sidebarFooter}>
            <div style={s.userEmail}>{session.user.email}</div>
            <button style={s.logoutBtn} onClick={() => supabase.auth.signOut()}>Esci</button>
          </div>
        </aside>
      )}

      {/* TOPBAR — solo mobile */}
      {isMobile && (
        <header style={s.topbar}>
          <span style={s.brandName}>🏠 FamHub</span>
          <button style={s.logoutBtnSmall} onClick={() => supabase.auth.signOut()}>Esci</button>
        </header>
      )}

      {/* MAIN CONTENT */}
      <main style={{ ...s.main, paddingBottom: isMobile ? '80px' : '32px' }}>
        {section === 'games'    && <GamesSection />}
        {section === 'calendar' && <CalendarSection />}
      </main>

      {/* BOTTOM NAV — solo mobile */}
      {isMobile && (
        <nav style={s.bottomNav}>
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              style={{ ...s.bottomNavItem, ...(section === item.id ? s.bottomNavItemActive : {}) }}
            >
              <span style={s.bottomNavIcon}>{item.icon}</span>
              <span style={s.bottomNavLabel}>{item.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}

const s = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#f1f5f9',
    fontFamily: "'Segoe UI', Roboto, sans-serif",
  },

  /* ── SIDEBAR (desktop) ── */
  sidebar: {
    width: '200px',
    minWidth: '200px',
    backgroundColor: '#1e293b',
    borderRight: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 12px',
    gap: '8px',
    position: 'sticky',
    top: 0,
    height: '100vh',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '4px 8px 20px',
    borderBottom: '1px solid #334155',
    marginBottom: '8px',
  },
  brandIcon: { fontSize: '1.5rem' },
  brandName: { fontSize: '1.1rem', fontWeight: '700', color: '#38bdf8' },
  nav: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    textAlign: 'left',
    width: '100%',
  },
  navItemActive: {
    backgroundColor: '#0f172a',
    color: '#38bdf8',
  },
  navIcon: { fontSize: '1.1rem' },
  sidebarFooter: {
    borderTop: '1px solid #334155',
    paddingTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  userEmail: {
    fontSize: '0.72rem',
    color: '#64748b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  logoutBtn: {
    backgroundColor: '#7f1d1d',
    color: '#fca5a5',
    border: 'none',
    padding: '8px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '600',
    width: '100%',
  },

  /* ── TOPBAR (mobile) ── */
  topbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderBottom: '1px solid #334155',
    padding: '12px 16px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  logoutBtnSmall: {
    backgroundColor: '#7f1d1d',
    color: '#fca5a5',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '600',
  },

  /* ── MAIN ── */
  main: {
    flex: 1,
    padding: '24px 16px',
    overflowY: 'auto',
    minWidth: 0,
  },

  /* ── BOTTOM NAV (mobile) ── */
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    backgroundColor: '#1e293b',
    borderTop: '1px solid #334155',
    zIndex: 100,
  },
  bottomNavItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3px',
    padding: '10px 0',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '0.7rem',
    fontWeight: '500',
  },
  bottomNavItemActive: {
    color: '#38bdf8',
    backgroundColor: 'rgba(56,189,248,0.08)',
  },
  bottomNavIcon: { fontSize: '1.3rem' },
  bottomNavLabel: {},
}
