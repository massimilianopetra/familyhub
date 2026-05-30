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
    </div>
  )
}
