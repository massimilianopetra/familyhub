import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { saveCache, loadCache } from '../utils/offlineCache'

const MAX_PER_USER = 10
const MAX_LENGTH = 500

// Colori "post-it" classici — il primo (giallo) è il default per una nota nuova.
const POSTIT_COLORS = [
  { id: 'yellow', bg: '#fef08a', edge: '#fde047' },
  { id: 'orange', bg: '#fed7aa', edge: '#fdba74' },
  { id: 'pink',   bg: '#fbcfe8', edge: '#f9a8d4' },
  { id: 'green',  bg: '#bbf7d0', edge: '#86efac' },
  { id: 'blue',   bg: '#bae6fd', edge: '#7dd3fc' },
  { id: 'purple', bg: '#e9d5ff', edge: '#d8b4fe' },
]
const INK_COLOR = '#3f3f1f' // testo scuro leggibile su tutti i pastelli sopra

function colorInfo(hex) {
  return POSTIT_COLORS.find(c => c.bg === hex) ?? POSTIT_COLORS[0]
}

// Rotazione stabile per nota (non ricalcolata ad ogni render), per un effetto
// "foglietti attaccati un po' storti" invece di una griglia perfettamente allineata.
function rotationFor(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997
  return (h % 7) - 3 // da -3° a +3°
}

// ── Toggle ───────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', userSelect:'none' }}>
      <span style={{ fontSize:'0.85rem', color:'#94a3b8', fontWeight:'500' }}>{label}</span>
      <div onClick={() => onChange(!checked)}
        style={{ width:'44px', height:'24px', borderRadius:'12px', position:'relative', transition:'background-color .2s', cursor:'pointer', flexShrink:0, backgroundColor: checked ? '#4ade80' : '#334155' }}>
        <div style={{ position:'absolute', top:'2px', width:'20px', height:'20px', borderRadius:'50%', backgroundColor:'#fff', transition:'transform .2s', boxShadow:'0 1px 4px rgba(0,0,0,.4)', transform: checked ? 'translateX(20px)' : 'translateX(2px)' }} />
      </div>
    </label>
  )
}

// ── Banner offline ──────────────────────────────────────────────
function OfflineBanner() {
  return (
    <div style={{ background:'#422006', border:'1px solid #f59e0b', borderRadius:'8px', padding:'10px 14px', marginBottom:'16px', color:'#fbbf24', fontSize:'0.82rem' }}>
      📴 Sei offline — mostro gli ultimi post-it salvati sul dispositivo, potrebbero non essere aggiornati.
    </div>
  )
}

// ── Editor (nuovo / modifica) ────────────────────────────────────
function PostitEditor({ postit, readOnly = false, onClose, onSaved, onDeleted }) {
  const isEdit = !!postit
  const [content,   setContent]   = useState(postit?.content ?? '')
  const [color,     setColor]     = useState(postit?.color ?? POSTIT_COLORS[0].bg)
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [error,     setError]     = useState('')

  async function handleSave() {
    if (!content.trim()) { setError('Scrivi qualcosa prima di salvare'); return }
    setSaving(true)
    setError('')

    const payload = { content: content.trim(), color }
    let err
    if (isEdit) {
      ;({ error: err } = await supabase.from('postits').update(payload).eq('id', postit.id))
    } else {
      ;({ error: err } = await supabase.from('postits').insert(payload))
    }
    setSaving(false)
    if (err) { setError('Errore: ' + err.message); return }
    onSaved()
    onClose()
  }

  async function handleDelete() {
    setDeleting(true)
    const { error: err } = await supabase.from('postits').delete().eq('id', postit.id)
    setDeleting(false)
    if (err) { setError('Errore: ' + err.message); return }
    onDeleted(postit.id)
    onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.72)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(5px)', padding:'16px' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: color, borderRadius:'4px', padding:'22px 20px 18px',
        width:'100%', maxWidth:'360px', display:'flex', flexDirection:'column', gap:'14px',
        boxShadow:'0 24px 60px rgba(0,0,0,0.6), 0 2px 0 rgba(0,0,0,0.08) inset',
        fontFamily:"'Segoe Print','Comic Sans MS',cursive",
        maxHeight:'90vh', overflowY:'auto', boxSizing:'border-box',
      }}>
        <div style={{ fontSize:'1.05rem', fontWeight:'700', color:INK_COLOR }}>
          {readOnly ? '📝 Post-it' : isEdit ? '✏️ Modifica post-it' : '📝 Nuovo post-it'}
        </div>

        <textarea
          autoFocus={!readOnly}
          readOnly={readOnly}
          value={content}
          maxLength={MAX_LENGTH}
          onChange={e => { setContent(e.target.value); setError('') }}
          placeholder="Scrivi qui la tua nota o promemoria…"
          rows={7}
          className="postit-editor-text"
          style={{
            background:'transparent', border:'none', outline:'none', resize:'none',
            color:INK_COLOR, fontFamily:'inherit', width:'100%', boxSizing:'border-box',
            cursor: readOnly ? 'default' : 'text',
          }}
        />

        {!readOnly && (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', gap:'6px' }}>
              {POSTIT_COLORS.map(c => (
                <div key={c.id} onClick={() => setColor(c.bg)}
                  style={{ width:'22px', height:'22px', borderRadius:'50%', backgroundColor:c.bg, cursor:'pointer',
                    border: color === c.bg ? `2px solid ${INK_COLOR}` : '2px solid transparent',
                    boxSizing:'border-box', boxShadow:'0 1px 3px rgba(0,0,0,0.25)' }} />
              ))}
            </div>
            <span style={{ fontSize:'0.7rem', color: content.length >= MAX_LENGTH ? '#b91c1c' : 'rgba(63,63,31,0.6)' }}>
              {content.length}/{MAX_LENGTH}
            </span>
          </div>
        )}

        {error && <div style={{ fontSize:'0.8rem', color:'#b91c1c', fontFamily:"'Segoe UI',sans-serif" }}>{error}</div>}

        <div style={{ display:'flex', gap:'8px', fontFamily:"'Segoe UI',sans-serif" }}>
          <button onClick={onClose}
            style={{ flex:1, padding:'10px', background: readOnly ? '#1e293b' : 'rgba(0,0,0,0.12)', border:'none', borderRadius:'6px', color: readOnly ? '#fef08a' : INK_COLOR, fontWeight:'600', cursor:'pointer', fontSize:'0.9rem' }}>
            {readOnly ? 'Chiudi' : 'Annulla'}
          </button>
          {!readOnly && (
            <button onClick={handleSave} disabled={saving}
              style={{ flex:1, padding:'10px', background:'#1e293b', border:'none', borderRadius:'6px', color:'#fef08a', fontWeight:'600', cursor:'pointer', fontSize:'0.9rem', opacity:saving?0.7:1 }}>
              {saving ? 'Salvo…' : 'Salva'}
            </button>
          )}
        </div>

        {!readOnly && isEdit && (
          <div style={{ borderTop:'1px solid rgba(0,0,0,0.15)', paddingTop:'10px', fontFamily:"'Segoe UI',sans-serif" }}>
            {!confirmDel ? (
              <button onClick={() => setConfirmDel(true)}
                style={{ width:'100%', padding:'8px', background:'none', border:'1px solid rgba(185,28,28,0.5)', borderRadius:'6px', color:'#b91c1c', fontWeight:'600', cursor:'pointer', fontSize:'0.85rem' }}>
                🗑 Elimina post-it
              </button>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                <div style={{ fontSize:'0.8rem', color:'#b91c1c', textAlign:'center' }}>Sei sicuro? L'operazione è irreversibile.</div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button onClick={() => setConfirmDel(false)}
                    style={{ flex:1, padding:'8px', background:'rgba(0,0,0,0.12)', border:'none', borderRadius:'6px', color:INK_COLOR, fontWeight:'600', cursor:'pointer', fontSize:'0.85rem' }}>
                    Annulla
                  </button>
                  <button onClick={handleDelete} disabled={deleting}
                    style={{ flex:1, padding:'8px', background:'#7f1d1d', border:'none', borderRadius:'6px', color:'#fca5a5', fontWeight:'600', cursor:'pointer', fontSize:'0.85rem', opacity:deleting?0.7:1 }}>
                    {deleting ? 'Elimino…' : 'Sì, elimina'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Nota singola (griglia) ───────────────────────────────────────
function PostitNote({ postit, isOwner, onOpen }) {
  const { bg, edge } = colorInfo(postit.color)
  const rotate = rotationFor(postit.id)
  return (
    <div onClick={onOpen}
      style={{
        background: bg, borderRadius:'2px', padding:'16px 14px', minHeight:'140px',
        display:'flex', flexDirection:'column', cursor:'pointer',
        boxShadow: `0 8px 16px rgba(0,0,0,0.35), inset 0 -14px 14px -14px ${edge}`,
        transform: `rotate(${rotate}deg)`, transition:'transform .15s',
        fontFamily:"'Segoe Print','Comic Sans MS',cursive",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'rotate(0deg) scale(1.03)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = `rotate(${rotate}deg)` }}>
      <div className="postit-note-text" style={{
        flex:1, color:INK_COLOR,
        whiteSpace:'pre-wrap', wordBreak:'break-word', overflow:'hidden',
        display:'-webkit-box', WebkitLineClamp:7, WebkitBoxOrient:'vertical',
      }}>
        {postit.content}
      </div>
      {!isOwner && (
        <span style={{ alignSelf:'flex-start', marginTop:'8px', fontSize:'0.68rem', fontFamily:"'Segoe UI',sans-serif", backgroundColor:'rgba(255,255,255,0.55)', border:'1px solid rgba(0,0,0,0.12)', color:'#57534e', borderRadius:'4px', padding:'2px 7px', whiteSpace:'nowrap' }}>
          👤 Famiglia
        </span>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPALE
// ══════════════════════════════════════════════════════════════════
export default function PostitSection({ session }) {
  const [postits,  setPostits]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [offline,  setOffline]  = useState(false)
  const [onlyMine, setOnlyMine] = useState(false)
  const [addModal, setAddModal] = useState(false)
  const [editPostit, setEditPostit] = useState(null)
  const [viewPostit, setViewPostit] = useState(null)

  const currentUserId = session?.user?.id

  useEffect(() => { fetchPostits() }, [])

  async function fetchPostits() {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('postits').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setPostits(data ?? [])
      setOffline(false)
      saveCache('postits', data ?? [])
    } catch (err) {
      console.error('[Postit] fetch error:', err)
      setPostits(await loadCache('postits'))
      setOffline(true)
    }
    setLoading(false)
  }

  function removePostit(id) {
    setPostits(prev => prev.filter(p => p.id !== id))
  }

  const filtered = onlyMine ? postits.filter(p => p.user_id === currentUserId) : postits
  const ownCount = postits.filter(p => p.user_id === currentUserId).length
  const limitReached = ownCount >= MAX_PER_USER

  return (
    <div style={{ width:'100%' }}>
      <style>{`
        .postit-grid { display:grid; gap:18px; grid-template-columns:repeat(2,1fr); }
        @media(min-width:600px){ .postit-grid { grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:22px; } }

        /* Testo grande e in grassetto ovunque: si legge meglio, non solo su cellulare */
        .postit-note-text { font-size:1.3rem; font-weight:700; line-height:1.35; }
        .postit-editor-text { font-size:1.45rem; font-weight:700; line-height:1.4; }
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'20px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h2 style={{ margin:'0 0 4px 0', fontSize:'1.5rem', color:'#38bdf8', fontWeight:'bold' }}>📝 Post-it</h2>
          <p style={{ margin:0, color:'#64748b', fontSize:'0.82rem' }}>
            {filtered.length} {filtered.length === 1 ? 'nota' : 'note'} · {ownCount}/{MAX_PER_USER} tuoi
          </p>
        </div>
        <div style={{ display:'flex', gap:'12px', alignItems:'center', flexWrap:'wrap' }}>
          <Toggle checked={onlyMine} onChange={setOnlyMine} label="Solo miei" />
          <button onClick={() => setAddModal(true)} disabled={limitReached}
            title={limitReached ? `Hai raggiunto il limite di ${MAX_PER_USER} post-it` : undefined}
            style={{ background: limitReached ? '#334155' : '#1d4ed8', border:'none', borderRadius:'8px', color: limitReached ? '#64748b' : '#fff', padding:'9px 16px', fontSize:'0.88rem', fontWeight:'700', cursor: limitReached ? 'not-allowed' : 'pointer' }}>
            + Aggiungi
          </button>
        </div>
      </div>

      {limitReached && (
        <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'8px', padding:'8px 14px', marginBottom:'16px', color:'#94a3b8', fontSize:'0.8rem' }}>
          Hai raggiunto il limite di {MAX_PER_USER} post-it personali — eliminane uno per aggiungerne un altro.
        </div>
      )}

      {offline && <OfflineBanner />}

      {loading && (
        <div style={{ textAlign:'center', color:'#64748b', padding:'40px' }}>Caricamento…</div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ background:'#1e293b', border:'1px dashed #334155', borderRadius:'12px', padding:'40px', textAlign:'center', color:'#475569' }}>
          Nessun post-it · premi <strong style={{ color:'#60a5fa' }}>+ Aggiungi</strong> per scriverne uno
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <>
          <div className="postit-grid">
            {filtered.map(p => (
              <PostitNote
                key={p.id}
                postit={p}
                isOwner={p.user_id === currentUserId}
                onOpen={() => p.user_id === currentUserId ? setEditPostit(p) : setViewPostit(p)}
              />
            ))}
          </div>
        </>
      )}

      {addModal && (
        <PostitEditor
          onClose={() => setAddModal(false)}
          onSaved={fetchPostits}
        />
      )}
      {editPostit && (
        <PostitEditor
          postit={editPostit}
          onClose={() => setEditPostit(null)}
          onSaved={fetchPostits}
          onDeleted={removePostit}
        />
      )}
      {viewPostit && (
        <PostitEditor
          postit={viewPostit}
          readOnly
          onClose={() => setViewPostit(null)}
        />
      )}
    </div>
  )
}
