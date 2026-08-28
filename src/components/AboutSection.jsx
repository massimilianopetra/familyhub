// Sezione "Info": mostra la versione dell'app. __APP_VERSION__ è iniettata
// in build da vite.config.js a partire da `git describe --tags` — per
// aggiornarla basta taggare una nuova release, non c'è nulla da editare qui.
export default function AboutSection() {
  return (
    <div style={{ width: '100%', maxWidth: '480px' }}>
      <h2 style={{ margin: '0 0 4px 0', fontSize: '1.5rem', color: '#38bdf8', fontWeight: 'bold' }}>ℹ️ Info</h2>
      <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '0.82rem' }}>
        Informazioni sull'app
      </p>

      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textAlign: 'center' }}>
        <span style={{ fontSize: '2.4rem' }}>🏠</span>
        <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#f1f5f9' }}>FamilyHub</div>
        <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
          Calendario, pagamenti, tessere fedeltà, medicine e giochi per la famiglia
        </div>
        <div style={{ marginTop: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '20px', padding: '6px 16px', fontSize: '0.78rem', fontFamily: 'monospace', color: '#38bdf8', fontWeight: '700' }}>
          {__APP_VERSION__}
        </div>
      </div>
    </div>
  )
}
