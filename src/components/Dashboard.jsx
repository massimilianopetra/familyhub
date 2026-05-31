import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import GamesSection from './GamesSection'
import CalendarSection from './CalendarSection'
import UpcomingEventsSection from './UpcomingEventsSection'
import LoyaltyCardsSection from './LoyaltyCardsSection'
import AdminSection from './AdminSection'

const SUPER_USER = 'massimiliano.petra@gmail.com'

const NAV_BASE = [
  { id: 'games',   icon: '🎮', label: 'Giochi' },
  { id: 'calendar',icon: '📅', label: 'Calendario' },
  { id: 'upcoming',icon: '🗓️', label: 'Prossimi' },
  { id: 'cards',   icon: '🎫', label: 'Tessere' },
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

function HamburgerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect y="4"  width="22" height="2.2" rx="1.1" fill="#94a3b8"/>
      <rect y="10" width="22" height="2.2" rx="1.1" fill="#94a3b8"/>
      <rect y="16" width="22" height="2.2" rx="1.1" fill="#94a3b8"/>
    </svg>
  )
}

export default function Dashboard({ session }) {
  const [section,    setSection]    = useState('calendar')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const isMobile  = useIsMobile()
  const isSuperUser = session.user.email === SUPER_USER
  const nav = isSuperUser
    ? [...NAV_BASE, { id: 'admin', icon: '⚙️', label: 'Admin' }]
    : NAV_BASE

  function navTo(id) {
    setSection(id)
    setDrawerOpen(false)
  }

  return (
    <div style={{ ...s.shell, flexDirection: isMobile ? 'column' : 'row' }}>

      {/* ── SIDEBAR desktop ─────────────────────────────────── */}
      {!isMobile && (
        <aside style={s.sidebar}>
          <div style={s.brand}>
            <span style={s.brandIcon}>🏠</span>
            <span style={s.brandName}>FamilyHub</span>
          </div>
          <nav style={s.nav}>
            {nav.map(item => (
              <button key={item.id} onClick={() => setSection(item.id)}
                style={{ ...s.navItem, ...(section === item.id ? s.navItemActive : {}) }}>
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

      {/* ── TOPBAR mobile ────────────────────────────────────── */}
      {isMobile && (
        <header style={s.topbar}>
          <span style={s.brandName}>🏠 FamilyHub</span>
          <button style={s.hamburgerBtn} onClick={() => setDrawerOpen(true)} aria-label="Menu">
            <HamburgerIcon />
          </button>
        </header>
      )}

      {/* ── DRAWER mobile ────────────────────────────────────── */}
      {isMobile && (
        <>
          <div
            style={{ ...s.backdrop, opacity: drawerOpen ? 1 : 0, pointerEvents: drawerOpen ? 'auto' : 'none' }}
            onClick={() => setDrawerOpen(false)}
          />
          <div style={{ ...s.drawer, transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)' }}>
            <div style={s.drawerHeader}>
              <span style={s.brandName}>🏠 FamilyHub</span>
              <button style={s.closeBtn} onClick={() => setDrawerOpen(false)}>✕</button>
            </div>

            <nav style={s.drawerNav}>
              {nav.map(item => (
                <button key={item.id} onClick={() => navTo(item.id)}
                  style={{ ...s.drawerItem, ...(section === item.id ? s.drawerItemActive : {}) }}>
                  <span style={s.drawerItemIcon}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            <div style={s.drawerFooter}>
              <div style={s.userEmail}>{session.user.email}</div>
              <button style={s.logoutBtn} onClick={() => supabase.auth.signOut()}>Esci</button>
            </div>
          </div>
        </>
      )}

      {/* ── MAIN ─────────────────────────────────────────────── */}
      <main style={s.main}>
        {section === 'games'    && <GamesSection />}
        {section === 'calendar' && <CalendarSection session={session} />}
        {section === 'upcoming' && <UpcomingEventsSection session={session} />}
        {section === 'cards'    && <LoyaltyCardsSection session={session} />}
        {section === 'admin'    && isSuperUser && <AdminSection />}
      </main>
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

  /* ── Sidebar (desktop) ── */
  sidebar: {
    width: '200px', minWidth: '200px',
    backgroundColor: '#1e293b',
    borderRight: '1px solid #334155',
    display: 'flex', flexDirection: 'column',
    padding: '20px 12px', gap: '8px',
    position: 'sticky', top: 0, height: '100vh',
  },
  brand: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '4px 8px 20px',
    borderBottom: '1px solid #334155', marginBottom: '8px',
  },
  brandIcon: { fontSize: '1.5rem' },
  brandName: { fontSize: '1.1rem', fontWeight: '700', color: '#38bdf8' },
  nav: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 12px', borderRadius: '8px',
    border: 'none', backgroundColor: 'transparent',
    color: '#94a3b8', cursor: 'pointer',
    fontSize: '0.9rem', fontWeight: '500',
    textAlign: 'left', width: '100%',
  },
  navItemActive: { backgroundColor: '#0f172a', color: '#38bdf8' },
  navIcon: { fontSize: '1.1rem' },
  sidebarFooter: {
    borderTop: '1px solid #334155', paddingTop: '16px',
    display: 'flex', flexDirection: 'column', gap: '8px',
  },
  userEmail: {
    fontSize: '0.72rem', color: '#64748b',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  logoutBtn: {
    backgroundColor: '#7f1d1d', color: '#fca5a5',
    border: 'none', padding: '8px', borderRadius: '6px',
    cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', width: '100%',
  },

  /* ── Topbar (mobile) ── */
  topbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1e293b', borderBottom: '1px solid #334155',
    padding: '12px 16px',
    position: 'sticky', top: 0, zIndex: 100,
  },
  hamburgerBtn: {
    backgroundColor: 'transparent', border: 'none',
    cursor: 'pointer', padding: '6px', lineHeight: 0,
    borderRadius: '6px',
  },

  /* ── Drawer (mobile) ── */
  backdrop: {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 200, transition: 'opacity 0.25s',
  },
  drawer: {
    position: 'fixed', top: 0, left: 0, bottom: 0,
    width: '72vw', maxWidth: '280px',
    backgroundColor: '#1e293b', borderRight: '1px solid #334155',
    display: 'flex', flexDirection: 'column',
    zIndex: 300,
    transition: 'transform 0.28s cubic-bezier(.4,0,.2,1)',
    overflowY: 'auto',
  },
  drawerHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 16px 16px', borderBottom: '1px solid #334155',
    flexShrink: 0,
  },
  closeBtn: {
    backgroundColor: 'transparent', border: 'none',
    color: '#64748b', fontSize: '1.1rem',
    cursor: 'pointer', padding: '4px 8px', lineHeight: 1,
  },
  drawerNav: {
    display: 'flex', flexDirection: 'column', gap: '4px',
    padding: '12px', flex: 1,
  },
  drawerItem: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '13px 14px', borderRadius: '8px',
    border: 'none', backgroundColor: 'transparent',
    color: '#94a3b8', cursor: 'pointer',
    fontSize: '0.95rem', fontWeight: '500',
    textAlign: 'left', width: '100%',
  },
  drawerItemActive: { backgroundColor: '#0f172a', color: '#38bdf8' },
  drawerItemIcon: { fontSize: '1.2rem' },
  drawerFooter: {
    borderTop: '1px solid #334155',
    padding: '16px 12px',
    display: 'flex', flexDirection: 'column', gap: '8px',
    flexShrink: 0,
  },

  /* ── Main ── */
  main: {
    flex: 1, padding: '24px 16px',
    overflowY: 'auto', minWidth: 0,
  },
}
