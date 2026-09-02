import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function FamilySection({ session }) {
  const [info,      setInfo]      = useState(null)
  const [members,   setMembers]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [busy,      setBusy]      = useState(false)
  const [feedback,  setFeedback]  = useState('')
  const [confirmLeave, setConfirmLeave] = useState(false)

  const currentUserId = session?.user?.id

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: infoData, error: infoErr }, { data: memberData, error: memErr }] = await Promise.all([
      supabase.rpc('my_family_info'),
      supabase.rpc('list_family_members'),
    ])
    if (infoErr) console.error('[Family] my_family_info error:', infoErr)
    if (memErr) console.error('[Family] list_family_members error:', memErr)
    setInfo(infoData?.[0] ?? null)
    setMembers(memberData ?? [])
    setLoading(false)
  }

  const isLeader = info?.role === 'leader'

  async function withBusy(fn) {
    setBusy(true); setFeedback('')
    const { error } = await fn()
    setBusy(false)
    if (error) { setFeedback('Errore: ' + error.message); return }
    fetchAll()
  }

  const approve    = (userId) => withBusy(() => supabase.rpc('approve_member', { p_user_id: userId }))
  const reject     = (userId) => withBusy(() => supabase.rpc('reject_member',  { p_user_id: userId }))
  const removeUser = (userId) => withBusy(() => supabase.rpc('remove_member',  { p_user_id: userId }))

  async function regenerate() {
    setBusy(true); setFeedback('')
    const { error } = await supabase.rpc('regenerate_invite_code')
    setBusy(false)
    if (error) { setFeedback('Errore: ' + error.message); return }
    setFeedback('Nuovo codice generato')
    fetchAll()
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(info.invite_code)
      setFeedback('Codice copiato negli appunti')
    } catch {
      setFeedback(`Codice: ${info.invite_code}`)
    }
  }

  async function leaveFamily() {
    setBusy(true)
    const { error } = await supabase.rpc('leave_family')
    setBusy(false)
    if (error) { setFeedback('Errore: ' + error.message); return }
    window.location.reload() // torna alla schermata di onboarding (FamilyGate)
  }

  if (loading) {
    return <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Caricamento…</div>
  }
  if (!info) {
    return <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Nessuna famiglia trovata.</div>
  }

  const pending  = members.filter(m => m.status === 'pending')
  const approved = members.filter(m => m.status === 'approved')

  return (
    <div style={{ width: '100%', maxWidth: '640px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 4px 0', fontSize: '1.5rem', color: '#38bdf8', fontWeight: 'bold' }}>👪 {info.family_name}</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem' }}>
          {approved.length} {approved.length === 1 ? 'membro' : 'membri'}
          {isLeader && ' · sei il capofamiglia'}
        </p>
      </div>

      {/* Codice invito */}
      <div style={s.box}>
        <div style={s.boxLabel}>Codice invito</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={s.code}>{info.invite_code}</span>
          <button onClick={copyCode} style={s.btnGhost}>📋 Copia</button>
          {isLeader && <button onClick={regenerate} disabled={busy} style={s.btnGhost}>🔄 Rigenera</button>}
        </div>
        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '6px' }}>
          Condividi questo codice con chi vuoi invitare: potrà chiedere di unirsi dalla schermata di accesso.
          {isLeader && ' Rigenerarlo invalida il vecchio codice.'}
        </div>
      </div>

      {feedback && <div style={{ fontSize: '0.82rem', color: feedback.startsWith('Errore') ? '#ef4444' : '#4ade80', margin: '10px 0' }}>{feedback}</div>}

      {/* Richieste in attesa (solo leader) */}
      {isLeader && pending.length > 0 && (
        <div style={{ marginTop: '18px' }}>
          <div style={s.sectionTitle}>Richieste in attesa</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pending.map(m => (
              <div key={m.user_id} style={s.row}>
                <span style={{ color: '#f1f5f9', fontSize: '0.88rem', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</span>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => approve(m.user_id)} disabled={busy} style={s.btnApprove}>✓ Approva</button>
                  <button onClick={() => reject(m.user_id)} disabled={busy} style={s.btnReject}>✕ Rifiuta</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Membri */}
      <div style={{ marginTop: '18px' }}>
        <div style={s.sectionTitle}>Membri</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {approved.map(m => (
            <div key={m.user_id} style={s.row}>
              <span style={{ color: '#f1f5f9', fontSize: '0.88rem', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {m.role === 'leader' && '👑 '}{m.email}
                {m.user_id === currentUserId && <span style={{ color: '#64748b' }}> (tu)</span>}
              </span>
              {isLeader && m.user_id !== currentUserId && (
                <button onClick={() => removeUser(m.user_id)} disabled={busy} style={s.btnReject}>Rimuovi</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Lascia la famiglia (solo membri, non il leader) */}
      {!isLeader && (
        <div style={{ marginTop: '22px', borderTop: '1px solid #334155', paddingTop: '14px' }}>
          {!confirmLeave ? (
            <button onClick={() => setConfirmLeave(true)} style={s.btnLeave}>Lascia la famiglia</button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '0.8rem', color: '#f87171' }}>Sicuro? Perderai l'accesso ai dati condivisi della famiglia.</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setConfirmLeave(false)} style={s.btnGhost}>Annulla</button>
                <button onClick={leaveFamily} disabled={busy} style={s.btnReject}>Sì, esci</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const s = {
  box: {
    background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '14px 16px',
  },
  boxLabel: { fontSize: '0.72rem', color: '#64748b', marginBottom: '6px' },
  code: {
    fontFamily: 'monospace', fontSize: '1.15rem', fontWeight: '700', letterSpacing: '3px',
    color: '#38bdf8', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '6px 12px',
  },
  sectionTitle: { fontSize: '0.85rem', fontWeight: '700', color: '#f1f5f9', marginBottom: '8px' },
  row: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
    background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '10px 14px',
  },
  btnGhost: {
    background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#94a3b8',
    padding: '6px 10px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
  },
  btnApprove: {
    background: '#166534', border: 'none', borderRadius: '6px', color: '#fff',
    padding: '6px 10px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
  },
  btnReject: {
    background: 'none', border: '1px solid #7f1d1d', borderRadius: '6px', color: '#f87171',
    padding: '6px 10px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
  },
  btnLeave: {
    background: 'none', border: '1px solid #7f1d1d', borderRadius: '8px', color: '#f87171',
    padding: '9px 16px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer',
  },
}
