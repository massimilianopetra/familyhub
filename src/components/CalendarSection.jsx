export default function CalendarSection() {
  return (
    <div style={s.wrapper}>
      <h2 style={s.title}>📅 Calendario</h2>
      <p style={s.subtitle}>Sezione in arrivo</p>
      <div style={s.placeholder}>
        <div style={s.icon}>🚧</div>
        <p style={s.msg}>Il calendario di famiglia sarà disponibile a breve.</p>
      </div>
    </div>
  )
}

const s = {
  wrapper: { width: '100%' },
  title: { margin: '0 0 6px 0', fontSize: '1.6rem', color: '#38bdf8', fontWeight: 'bold' },
  subtitle: { margin: '0 0 32px 0', color: '#94a3b8', fontSize: '0.9rem' },
  placeholder: { backgroundColor: '#1e293b', border: '1px dashed #334155', borderRadius: '16px', padding: '60px 40px', textAlign: 'center' },
  icon: { fontSize: '3rem', marginBottom: '16px' },
  msg: { color: '#64748b', fontSize: '1rem', margin: 0 },
}
