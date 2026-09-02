import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

// Messaggi leggibili per le eccezioni sollevate dalle funzioni SQL in
// supabase/families.sql (RAISE EXCEPTION 'codice') — supabase-js restituisce
// quel codice esatto come error.message.
const ERROR_MESSAGES = {
  already_in_family: 'Fai già parte di una famiglia.',
  invalid_name: 'Il nome della famiglia è obbligatorio.',
  invalid_code: 'Codice invito non valido.',
}
function rpcErrorMessage(err) {
  return ERROR_MESSAGES[err?.message] || `Errore: ${err?.message ?? 'sconosciuto'}`
}

function CreateFamilyForm({ onDone }) {
  const [name,   setName]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Il nome è obbligatorio'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.rpc('create_family', { p_name: name.trim() })
    setSaving(false)
    if (err) { setError(rpcErrorMessage(err)); return }
    onDone()
  }

  return (
    <form onSubmit={submit} style={s.form}>
      <div style={s.lbl}>Nome della famiglia</div>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Es. Famiglia Petra"
        style={s.input} disabled={saving} autoFocus />
      {error && <div style={s.error}>{error}</div>}
      <button type="submit" disabled={saving} style={s.buttonPrimary}>{saving ? 'Creo…' : 'Crea famiglia'}</button>
    </form>
  )
}

function JoinFamilyForm({ onRequested }) {
  const [code,   setCode]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!code.trim()) { setError('Il codice è obbligatorio'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.rpc('request_join_family', { p_code: code.trim() })
    setSaving(false)
    if (err) { setError(rpcErrorMessage(err)); return }
    onRequested()
  }

  return (
    <form onSubmit={submit} style={s.form}>
      <div style={s.lbl}>Codice invito</div>
      <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Es. AB3K7Q"
        style={{ ...s.input, letterSpacing: '2px', textTransform: 'uppercase' }} disabled={saving} autoFocus />
      {error && <div style={s.error}>{error}</div>}
      <button type="submit" disabled={saving} style={s.buttonPrimary}>{saving ? 'Invio…' : 'Richiedi di unirti'}</button>
    </form>
  )
}

// ══════════════════════════════════════════════════════════════════
// Blocca l'accesso al resto dell'app finché l'utente non appartiene a una
// famiglia approvata: nessuna riga in family_members → onboarding (crea/
// unisciti), riga 'pending' → schermata di attesa, 'approved' → children
// (il Dashboard vero e proprio).
// ══════════════════════════════════════════════════════════════════
export default function FamilyGate({ children }) {
  const [status, setStatus] = useState('loading') // loading | none | pending | approved
  const [info,   setInfo]   = useState(null)
  const [mode,   setMode]   = useState('create')  // 'create' | 'join', solo per status 'none'

  useEffect(() => { refresh() }, [])

  async function refresh() {
    setStatus('loading')
    const { data, error } = await supabase.rpc('my_family_info')
    if (error) {
      console.error('[FamilyGate] my_family_info error:', error)
      setStatus('none')
      return
    }
    const row = data?.[0]
    if (!row) { setStatus('none'); return }
    setInfo(row)
    setStatus(row.status)
  }

  async function cancelRequest() {
    await supabase.rpc('leave_family')
    refresh()
  }

  if (status === 'loading') {
    return <div style={s.wrap}><div style={s.loading}>Caricamento…</div></div>
  }

  if (status === 'approved') return children

  if (status === 'pending') {
    return (
      <div style={s.wrap}>
        <div style={s.card}>
          <div style={s.icon}>⏳</div>
          <h2 style={s.title}>In attesa di approvazione</h2>
          <p style={s.text}>
            La tua richiesta di unirti a <strong style={{ color: '#f1f5f9' }}>{info?.family_name}</strong> è
            stata inviata: il capofamiglia deve approvarla prima che tu possa accedere.
          </p>
          <button onClick={refresh} style={s.buttonSecondary}>🔄 Controlla di nuovo</button>
          <button onClick={cancelRequest} style={s.buttonGhost}>Annulla richiesta</button>
          <button onClick={() => supabase.auth.signOut()} style={s.logout}>Esci</button>
        </div>
      </div>
    )
  }

  // status === 'none'
  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.icon}>🏠</div>
        <h2 style={s.title}>Benvenuto in FamilyHub</h2>
        <p style={s.text}>Per iniziare, crea la tua famiglia oppure chiedi di unirti a una famiglia già esistente con un codice invito.</p>

        <div style={s.tabs}>
          <button onClick={() => setMode('create')} style={{ ...s.tab, ...(mode === 'create' ? s.tabActive : {}) }}>
            Crea famiglia
          </button>
          <button onClick={() => setMode('join')} style={{ ...s.tab, ...(mode === 'join' ? s.tabActive : {}) }}>
            Ho un codice
          </button>
        </div>

        {mode === 'create'
          ? <CreateFamilyForm onDone={refresh} />
          : <JoinFamilyForm onRequested={refresh} />}

        <button onClick={() => supabase.auth.signOut()} style={s.logout}>Esci</button>
      </div>
    </div>
  )
}

const s = {
  wrap: {
    minHeight: '100vh', backgroundColor: '#0f172a', color: '#f1f5f9',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    fontFamily: "'Segoe UI', Roboto, sans-serif",
  },
  loading: { color: '#64748b', fontSize: '0.95rem' },
  card: {
    background: '#1e293b', border: '1px solid #334155', borderRadius: '16px',
    padding: '32px 26px', width: '100%', maxWidth: '380px',
    display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center',
    textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
  },
  icon: { fontSize: '2.4rem' },
  title: { margin: '0 0 4px 0', fontSize: '1.2rem', color: '#38bdf8' },
  text: { margin: 0, fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 },
  tabs: { display: 'flex', gap: '8px', width: '100%', marginTop: '8px' },
  tab: {
    flex: 1, padding: '9px 10px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700',
    cursor: 'pointer', background: '#0f172a', border: '1px solid #334155', color: '#94a3b8',
  },
  tabActive: { background: '#1d4ed8', border: '1px solid #1d4ed8', color: '#fff' },
  form: { display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '4px' },
  lbl: { fontSize: '0.72rem', color: '#64748b', textAlign: 'left' },
  input: {
    background: '#0f172a', border: '1px solid #334155', borderRadius: '8px',
    padding: '10px 12px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none',
    width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
  },
  error: { fontSize: '0.78rem', color: '#ef4444', textAlign: 'left' },
  buttonPrimary: {
    padding: '10px', background: '#1d4ed8', border: 'none', borderRadius: '8px',
    color: '#fff', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem',
  },
  buttonSecondary: {
    width: '100%', padding: '9px', background: 'none', border: '1px solid #334155',
    borderRadius: '8px', color: '#94a3b8', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem', marginTop: '6px',
  },
  buttonGhost: {
    background: 'none', border: 'none', color: '#64748b', fontSize: '0.78rem',
    cursor: 'pointer', textDecoration: 'underline',
  },
  logout: {
    background: 'none', border: 'none', color: '#f87171', fontSize: '0.8rem',
    cursor: 'pointer', marginTop: '10px',
  },
}
