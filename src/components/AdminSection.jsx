import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function SettingRow({ label, description, checked, onChange, saving }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px',
      backgroundColor:'#0f172a', borderRadius:'10px', padding:'16px 18px',
    }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:'0.95rem', fontWeight:'600', color:'#f1f5f9', marginBottom:'3px' }}>{label}</div>
        <div style={{ fontSize:'0.78rem', color:'#64748b', lineHeight:1.4 }}>{description}</div>
      </div>
      <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor: saving ? 'wait' : 'pointer', userSelect:'none', flexShrink:0 }}>
        {saving && <span style={{ fontSize:'0.72rem', color:'#64748b' }}>salvo…</span>}
        <div onClick={() => !saving && onChange(!checked)}
          style={{ width:'44px', height:'24px', borderRadius:'12px', position:'relative',
            backgroundColor: checked ? '#4ade80' : '#334155',
            transition:'background-color .2s', cursor: saving ? 'wait' : 'pointer' }}>
          <div style={{ position:'absolute', top:'2px', width:'20px', height:'20px', borderRadius:'50%',
            backgroundColor:'#fff', transition:'transform .2s', boxShadow:'0 1px 4px rgba(0,0,0,.4)',
            transform: checked ? 'translateX(20px)' : 'translateX(2px)' }} />
        </div>
      </label>
    </div>
  )
}

export default function AdminSection() {
  const [registrationEnabled, setRegistrationEnabled] = useState(false)
  const [loading,             setLoading]             = useState(true)
  const [saving,              setSaving]              = useState(false)
  const [feedback,            setFeedback]            = useState('')

  useEffect(() => { fetchSettings() }, [])

  async function fetchSettings() {
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')
    if (data) {
      const reg = data.find(r => r.key === 'registration_enabled')
      if (reg) setRegistrationEnabled(reg.value === true || reg.value === 'true')
    }
    setLoading(false)
  }

  async function toggleRegistration(val) {
    setSaving(true)
    setFeedback('')
    const { error } = await supabase
      .from('app_settings')
      .update({ value: val, updated_at: new Date().toISOString() })
      .eq('key', 'registration_enabled')
    setSaving(false)
    if (error) {
      setFeedback('Errore nel salvataggio')
    } else {
      setRegistrationEnabled(val)
      setFeedback(val ? 'Registrazione abilitata' : 'Registrazione disabilitata')
      setTimeout(() => setFeedback(''), 2500)
    }
  }

  const [backupState, setBackupState] = useState('idle') // idle | running | done | error
  const [backupMsg,   setBackupMsg]   = useState('')

  async function handleBackup() {
    setBackupState('running')
    setBackupMsg('')
    try {
      const tables = ['app_settings', 'calendar_events', 'loyalty_cards']
      const dump = { exported_at: new Date().toISOString(), tables: {} }

      for (const t of tables) {
        const { data, error } = await supabase.from(t).select('*')
        if (error) throw new Error(`${t}: ${error.message}`)
        dump.tables[t] = data
      }

      const json = JSON.stringify(dump, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      const ts   = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      a.href     = url
      a.download = `familyhub-backup-${ts}.json`
      a.click()
      URL.revokeObjectURL(url)

      const total = Object.values(dump.tables).reduce((s, rows) => s + rows.length, 0)
      setBackupMsg(`${total} righe esportate`)
      setBackupState('done')
      setTimeout(() => setBackupState('idle'), 3000)
    } catch(e) {
      setBackupMsg(e.message)
      setBackupState('error')
    }
  }

  if (loading) return (
    <div style={{ color:'#64748b', fontSize:'0.9rem', padding:'40px 0', textAlign:'center' }}>
      Caricamento…
    </div>
  )

  return (
    <div style={{ width:'100%', maxWidth:'520px', margin:'0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom:'28px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
          <span style={{ fontSize:'1.4rem' }}>⚙️</span>
          <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:'700', color:'#f1f5f9' }}>Pannello Admin</h2>
        </div>
        <p style={{ margin:0, fontSize:'0.78rem', color:'#64748b' }}>
          Impostazioni globali dell'applicazione
        </p>
      </div>

      {/* Sezione accesso */}
      <div style={{ marginBottom:'24px' }}>
        <div style={{ fontSize:'0.72rem', fontWeight:'700', color:'#475569',
          textTransform:'uppercase', letterSpacing:'1px', marginBottom:'10px' }}>
          Accesso
        </div>
        <SettingRow
          label="Registrazione nuovi utenti"
          description="Se attivo, il bottone «Crea account» nella pagina di login è visibile e funzionante."
          checked={registrationEnabled}
          onChange={toggleRegistration}
          saving={saving}
        />
      </div>

      {feedback && (
        <div style={{ backgroundColor: feedback.startsWith('Errore') ? '#7f1d1d' : '#052e16',
          border:`1px solid ${feedback.startsWith('Errore') ? '#ef4444' : '#4ade80'}`,
          borderRadius:'8px', padding:'10px 14px', fontSize:'0.85rem',
          color: feedback.startsWith('Errore') ? '#fca5a5' : '#86efac' }}>
          {feedback}
        </div>
      )}

      {/* Sezione backup */}
      <div style={{ marginTop:'28px' }}>
        <div style={{ fontSize:'0.72rem', fontWeight:'700', color:'#475569',
          textTransform:'uppercase', letterSpacing:'1px', marginBottom:'10px' }}>
          Database
        </div>
        <div style={{ backgroundColor:'#0f172a', borderRadius:'10px', padding:'16px 18px',
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px' }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'0.95rem', fontWeight:'600', color:'#f1f5f9', marginBottom:'3px' }}>
              Backup dati
            </div>
            <div style={{ fontSize:'0.78rem', color:'#64748b', lineHeight:1.4 }}>
              Esporta tutte le tabelle in un file JSON con timestamp.
              {backupMsg && (
                <span style={{ marginLeft:'8px', color: backupState === 'error' ? '#f87171' : '#4ade80' }}>
                  {backupMsg}
                </span>
              )}
            </div>
          </div>
          <button onClick={handleBackup} disabled={backupState === 'running'}
            style={{ flexShrink:0, padding:'8px 16px', borderRadius:'8px', border:'none', cursor: backupState === 'running' ? 'wait' : 'pointer',
              fontWeight:'600', fontSize:'0.85rem',
              background: backupState === 'error' ? '#7f1d1d' : backupState === 'done' ? '#052e16' : '#1d4ed8',
              color: backupState === 'error' ? '#fca5a5' : backupState === 'done' ? '#4ade80' : '#fff',
              opacity: backupState === 'running' ? 0.7 : 1 }}>
            {backupState === 'running' ? 'Esporto…' : backupState === 'done' ? '✓ Scaricato' : backupState === 'error' ? 'Errore' : '⬇ Scarica'}
          </button>
        </div>
      </div>
    </div>
  )
}
