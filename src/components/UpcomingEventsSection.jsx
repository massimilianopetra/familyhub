import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { EVENT_TYPES, getEventType } from '../utils/eventTypes'

const MONTHS_IT    = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const MONTHS_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']
const DAYS_FULL    = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato']

function pad(n) { return String(n).padStart(2, '0') }

function dateToStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
}

function fmtDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

function fmtGroupHeader(dateStr) {
  const d    = new Date(dateStr + 'T00:00:00')
  const today = new Date(); today.setHours(0,0,0,0)
  const diff  = Math.round((d - today) / 86400000)
  const full  = `${d.getDate()} ${MONTHS_IT[d.getMonth()]} ${d.getFullYear()}`
  if (diff === 0) return `Oggi — ${full}`
  if (diff === 1) return `Domani — ${full}`
  if (diff < 0)   return `${full} (${Math.abs(diff)} ${Math.abs(diff) === 1 ? 'giorno' : 'giorni'} fa)`
  return `${DAYS_FULL[d.getDay()]} ${full}`
}

function buildBadge(event) {
  if (event.is_deadline) {
    return event.completed
      ? { text: '✓ Completata', color: '#4ade80' }
      : { text: '⏰ Scadenza in corso', color: '#ef4444' }
  }
  const today = new Date(); today.setHours(0,0,0,0)
  const start = new Date(event.event_date + 'T00:00:00')
  const end   = event.end_date ? new Date(event.end_date + 'T00:00:00') : start
  if (today > start && today <= end) return { text: 'In corso', color: '#fb923c' }
  const diff = Math.round((start - today) / 86400000)
  if (diff === 0) return { text: 'Oggi',           color: '#38bdf8' }
  if (diff === 1) return { text: 'Domani',         color: '#4ade80' }
  if (diff < 7)  return { text: `tra ${diff} gg`,  color: '#a78bfa' }
  return               { text: `tra ${diff} giorni`, color: '#64748b' }
}

function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', userSelect:'none' }}>
      <span style={{ fontSize:'0.85rem', color:'#94a3b8', fontWeight:'500' }}>{label}</span>
      <div onClick={() => onChange(!checked)}
        style={{ width:'44px', height:'24px', borderRadius:'12px', position:'relative', flexShrink:0,
          backgroundColor: checked ? '#4ade80' : '#334155', transition:'background-color .2s', cursor:'pointer' }}>
        <div style={{ position:'absolute', top:'2px', width:'20px', height:'20px', borderRadius:'50%',
          backgroundColor:'#fff', transition:'transform .2s', boxShadow:'0 1px 4px rgba(0,0,0,.4)',
          transform: checked ? 'translateX(20px)' : 'translateX(2px)' }} />
      </div>
    </label>
  )
}

function AddEventModal({ currentUserId, onClose, onSaved }) {
  const today = new Date(); today.setHours(0,0,0,0)
  const todayStr = dateToStr(today)

  const [title,       setTitle]       = useState('')
  const [startDate,   setStartDate]   = useState(todayStr)
  const [endDate,     setEndDate]     = useState('')
  const [startTime,   setStartTime]   = useState('')
  const [endTime,     setEndTime]     = useState('')
  const [eventType,   setEventType]   = useState('altro')
  const [description, setDescription] = useState('')
  const [isDeadline,  setIsDeadline]  = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  async function handleSave() {
    if (!title.trim())   { setError('Il titolo è obbligatorio');           return }
    if (!startDate)      { setError('La data di inizio è obbligatoria');   return }
    if (endDate && endDate < startDate) { setError('La data fine non può essere prima della data inizio'); return }
    setSaving(true)
    const { color } = getEventType(eventType)
    const { error: err } = await supabase.from('calendar_events').insert({
      user_id:     currentUserId,
      title:       title.trim(),
      event_date:  startDate,
      end_date:    endDate || null,
      start_time:  startTime || null,
      end_time:    endTime   || null,
      event_type:  eventType,
      color,
      description: description.trim() || null,
      is_deadline: isDeadline,
    })
    setSaving(false)
    if (err) { setError('Errore: ' + err.message); return }
    onSaved()
    onClose()
  }

  const inp = {
    background:'#0f172a', border:'1px solid #334155', borderRadius:'8px',
    padding:'10px 12px', color:'#f1f5f9', fontSize:'0.88rem', outline:'none',
    width:'100%', boxSizing:'border-box', fontFamily:'inherit',
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.72)', zIndex:1000,
      display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(5px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'16px',
        padding:'24px 20px', width:'90%', maxWidth:'340px', display:'flex', flexDirection:'column',
        gap:'14px', boxShadow:'0 24px 60px rgba(0,0,0,0.85)' }}>

        <div style={{ fontSize:'1.05rem', fontWeight:'700', color:'#f1f5f9' }}>+ Nuovo evento</div>

        {/* Tipologia */}
        <div>
          <div style={{ fontSize:'0.72rem', color:'#64748b', marginBottom:'6px' }}>Tipologia</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
            {EVENT_TYPES.map(t => {
              const selected = eventType === t.id
              return (
                <button key={t.id} onClick={() => setEventType(t.id)}
                  style={{ padding:'10px 8px', borderRadius:'10px',
                    border: selected ? `2px solid ${t.color}` : '2px solid #334155',
                    background: selected ? t.color+'22' : '#0f172a',
                    color: selected ? t.color : '#64748b',
                    cursor:'pointer', fontWeight:'600', fontSize:'0.82rem',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
                    transition:'all .15s' }}>
                  <span>{t.emoji}</span>
                  <span style={{ whiteSpace:'nowrap' }}>{t.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="Titolo *" style={inp} />

        <div style={{ display:'flex', gap:'10px' }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'0.72rem', color:'#64748b', marginBottom:'4px' }}>Data inizio *</div>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{ ...inp, borderColor: !startDate ? '#ef4444' : '#334155' }} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'0.72rem', color:'#64748b', marginBottom:'4px' }}>Data fine</div>
            <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} style={inp} />
          </div>
        </div>

        <div style={{ display:'flex', gap:'10px' }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'0.72rem', color:'#64748b', marginBottom:'4px' }}>Ora inizio</div>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inp} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'0.72rem', color:'#64748b', marginBottom:'4px' }}>Ora fine</div>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inp} />
          </div>
        </div>

        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Note (opzionale)" rows={2}
          style={{ ...inp, resize:'vertical' }} />

        <Toggle checked={isDeadline} onChange={setIsDeadline} label="📌 È una scadenza" />

        {error && <div style={{ fontSize:'0.8rem', color:'#ef4444' }}>{error}</div>}

        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={onClose}
            style={{ flex:1, padding:'10px', background:'#334155', border:'none', borderRadius:'8px',
              color:'#94a3b8', fontWeight:'600', cursor:'pointer', fontSize:'0.9rem' }}>
            Annulla
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex:1, padding:'10px', background:'#1d4ed8', border:'none', borderRadius:'8px',
              color:'#fff', fontWeight:'600', cursor:'pointer', fontSize:'0.9rem', opacity:saving?0.7:1 }}>
            {saving ? 'Salvo…' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditEventModal({ event, onClose, onSaved, onDeleted }) {
  const [title,       setTitle]       = useState(event.title)
  const [startDate,   setStartDate]   = useState(event.event_date ?? '')
  const [endDate,     setEndDate]     = useState(event.end_date ?? '')
  const [startTime,   setStartTime]   = useState(event.start_time?.slice(0,5) ?? '')
  const [endTime,     setEndTime]     = useState(event.end_time?.slice(0,5) ?? '')
  const [eventType,   setEventType]   = useState(event.event_type ?? 'altro')
  const [description, setDescription] = useState(event.description ?? '')
  const [isDeadline,  setIsDeadline]  = useState(event.is_deadline ?? false)
  const [completed,   setCompleted]   = useState(event.completed ?? false)
  const [saving,      setSaving]      = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [confirmDel,  setConfirmDel]  = useState(false)
  const [error,       setError]       = useState('')

  async function handleSave() {
    if (!title.trim()) { setError('Il titolo è obbligatorio'); return }
    if (!startDate)    { setError('La data inizio è obbligatoria'); return }
    if (endDate && endDate < startDate) { setError('La data fine non può essere prima della data inizio'); return }
    setSaving(true)
    const { color } = getEventType(eventType)
    const completedNow = isDeadline && completed
    const { error: err } = await supabase.from('calendar_events').update({
      title:       title.trim(),
      event_date:  startDate,
      end_date:    endDate || null,
      start_time:  startTime || null,
      end_time:    endTime   || null,
      event_type:  eventType,
      color,
      description: description.trim() || null,
      is_deadline:  isDeadline,
      completed:    completedNow,
      completed_at: completedNow ? (event.completed_at ?? new Date().toISOString().slice(0,10)) : null,
    }).eq('id', event.id)
    setSaving(false)
    if (err) { setError('Errore: ' + err.message); return }
    onSaved()
    onClose()
  }

  async function handleDelete() {
    setDeleting(true)
    const { error: err } = await supabase.from('calendar_events').delete().eq('id', event.id)
    setDeleting(false)
    if (err) { setError('Errore: ' + err.message); return }
    onDeleted(event.id)
    onClose()
  }

  const inp = {
    background:'#0f172a', border:'1px solid #334155', borderRadius:'8px',
    padding:'10px 12px', color:'#f1f5f9', fontSize:'0.88rem', outline:'none',
    width:'100%', boxSizing:'border-box', fontFamily:'inherit',
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.72)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(5px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'16px', padding:'24px 20px', width:'90%', maxWidth:'340px', display:'flex', flexDirection:'column', gap:'14px', boxShadow:'0 24px 60px rgba(0,0,0,0.85)' }}>
        <div style={{ fontSize:'1.05rem', fontWeight:'700', color:'#f1f5f9' }}>✏️ Modifica evento</div>

        <div>
          <div style={{ fontSize:'0.72rem', color:'#64748b', marginBottom:'6px' }}>Tipologia</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
            {EVENT_TYPES.map(t => {
              const selected = eventType === t.id
              return (
                <button key={t.id} onClick={() => setEventType(t.id)}
                  style={{ padding:'10px 8px', borderRadius:'10px', border: selected ? `2px solid ${t.color}` : '2px solid #334155',
                    background: selected ? t.color+'22' : '#0f172a',
                    color: selected ? t.color : '#64748b',
                    cursor:'pointer', fontWeight:'600', fontSize:'0.82rem',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
                    transition:'all .15s' }}>
                  <span>{t.emoji}</span>
                  <span style={{ whiteSpace:'nowrap' }}>{t.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <input value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="Titolo *" style={inp} />

        <div style={{ display:'flex', gap:'10px' }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'0.72rem', color:'#64748b', marginBottom:'4px' }}>Data inizio</div>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inp} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'0.72rem', color:'#64748b', marginBottom:'4px' }}>Data fine</div>
            <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} style={inp} />
          </div>
        </div>

        <div style={{ display:'flex', gap:'10px' }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'0.72rem', color:'#64748b', marginBottom:'4px' }}>Ora inizio</div>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inp} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'0.72rem', color:'#64748b', marginBottom:'4px' }}>Ora fine</div>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inp} />
          </div>
        </div>

        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Note (opzionale)" rows={2}
          style={{ ...inp, resize:'vertical' }} />

        <Toggle checked={isDeadline} onChange={setIsDeadline} label="📌 È una scadenza" />
        {isDeadline && (
          <Toggle checked={completed} onChange={setCompleted} label="✅ Completata" />
        )}

        {error && <div style={{ fontSize:'0.8rem', color:'#ef4444' }}>{error}</div>}

        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={onClose}
            style={{ flex:1, padding:'10px', background:'#334155', border:'none', borderRadius:'8px', color:'#94a3b8', fontWeight:'600', cursor:'pointer', fontSize:'0.9rem' }}>
            Annulla
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex:1, padding:'10px', background:'#1d4ed8', border:'none', borderRadius:'8px', color:'#fff', fontWeight:'600', cursor:'pointer', fontSize:'0.9rem', opacity:saving?0.7:1 }}>
            {saving ? 'Salvo…' : 'Salva'}
          </button>
        </div>

        <div style={{ borderTop:'1px solid #334155', paddingTop:'12px' }}>
          {!confirmDel ? (
            <button onClick={() => setConfirmDel(true)}
              style={{ width:'100%', padding:'8px', background:'none', border:'1px solid #7f1d1d', borderRadius:'8px', color:'#f87171', fontWeight:'600', cursor:'pointer', fontSize:'0.85rem' }}>
              🗑 Elimina evento
            </button>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              <div style={{ fontSize:'0.8rem', color:'#f87171', textAlign:'center' }}>Sei sicuro? L'operazione è irreversibile.</div>
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={() => setConfirmDel(false)}
                  style={{ flex:1, padding:'8px', background:'#334155', border:'none', borderRadius:'8px', color:'#94a3b8', fontWeight:'600', cursor:'pointer', fontSize:'0.85rem' }}>
                  Annulla
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  style={{ flex:1, padding:'8px', background:'#7f1d1d', border:'none', borderRadius:'8px', color:'#fca5a5', fontWeight:'600', cursor:'pointer', fontSize:'0.85rem', opacity:deleting?0.7:1 }}>
                  {deleting ? 'Elimino…' : 'Sì, elimina'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function UpcomingEventsSection({ session }) {
  const [onlyMyEvents, setOnlyMyEvents] = useState(true)
  const [events,       setEvents]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editModal,    setEditModal]    = useState(null)

  const currentUserId = session?.user?.id

  useEffect(() => { fetchEvents() }, [])

  async function fetchEvents() {
    const today      = new Date(); today.setHours(0,0,0,0)
    const twoMonths  = new Date(today); twoMonths.setMonth(twoMonths.getMonth() + 3)
    const todayStr   = dateToStr(today)
    const limitStr   = dateToStr(twoMonths)

    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .lte('event_date', limitStr)
      .or(`event_date.gte.${todayStr},end_date.gte.${todayStr},and(is_deadline.eq.true,completed.eq.false)`)
      .order('event_date', { ascending: true })

    setEvents(data ?? [])
    setLoading(false)
  }

  function deleteEvent(id) {
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  async function toggleCompleted(event) {
    const completed    = !event.completed
    const completed_at = completed ? dateToStr(new Date()) : null
    const { error } = await supabase.from('calendar_events')
      .update({ completed, completed_at })
      .eq('id', event.id)
    if (!error) {
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, completed, completed_at } : e))
    }
  }

  const filteredEvents = useMemo(() =>
    onlyMyEvents ? events.filter(e => e.user_id === currentUserId) : events
  , [events, onlyMyEvents, currentUserId])

  // Raggruppa per data inizio
  const grouped = useMemo(() => {
    const map = {}
    filteredEvents.forEach(e => {
      if (!map[e.event_date]) map[e.event_date] = []
      map[e.event_date].push(e)
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredEvents])

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:'60px 0', color:'#64748b', fontSize:'0.9rem' }}>
      Caricamento…
    </div>
  )

  return (
    <div style={{ width:'100%', maxWidth:'580px', margin:'0 auto' }}>

      {/* ── Header ────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
        marginBottom:'24px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:'700', color:'#f1f5f9', letterSpacing:'0.3px' }}>
            Prossimi eventi
          </h2>
          <p style={{ margin:'4px 0 0', fontSize:'0.78rem', color:'#64748b' }}>
            Prossimi 3 mesi · {filteredEvents.length} {filteredEvents.length === 1 ? 'evento' : 'eventi'}
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <Toggle checked={onlyMyEvents} onChange={setOnlyMyEvents} label="Solo miei" />
          <button onClick={() => setShowAddModal(true)}
            style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px',
              background:'#1d4ed8', border:'none', borderRadius:'10px',
              color:'#fff', fontWeight:'700', fontSize:'0.82rem', cursor:'pointer',
              whiteSpace:'nowrap', flexShrink:0 }}>
            + Evento
          </button>
        </div>
      </div>

      {showAddModal && (
        <AddEventModal
          currentUserId={session?.user?.id}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); fetchEvents() }}
        />
      )}
      {editModal && (
        <EditEventModal
          event={editModal}
          onClose={() => setEditModal(null)}
          onSaved={() => { setEditModal(null); fetchEvents() }}
          onDeleted={deleteEvent}
        />
      )}

      {/* ── Contenuto ─────────────────────────────────────── */}
      {grouped.length === 0 ? (
        <div style={{ backgroundColor:'#1e293b', border:'1px dashed #334155', borderRadius:'16px',
          padding:'52px 24px', textAlign:'center' }}>
          <div style={{ fontSize:'2.8rem', marginBottom:'14px' }}>🗓️</div>
          <div style={{ fontSize:'1rem', fontWeight:'700', color:'#f1f5f9', marginBottom:'6px' }}>
            Nessun evento in programma
          </div>
          <div style={{ fontSize:'0.85rem', color:'#64748b' }}>
            {onlyMyEvents
              ? 'Non hai eventi nei prossimi 2 mesi.'
              : 'Nessun evento nei prossimi 2 mesi per nessun membro.'}
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'28px' }}>
          {grouped.map(([dateStr, dayEvents]) => (
            <div key={dateStr}>

              {/* Intestazione data */}
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
                <div style={{ fontSize:'0.72rem', fontWeight:'700', color:'#475569',
                  textTransform:'uppercase', letterSpacing:'1px', whiteSpace:'nowrap' }}>
                  {fmtGroupHeader(dateStr)}
                </div>
                <div style={{ flex:1, height:'1px', backgroundColor:'#1e293b' }} />
              </div>

              {/* Card eventi */}
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {dayEvents.map(event => {
                  const { emoji, label: typeLabel, color } = getEventType(event.event_type)
                  const badge     = buildBadge(event)
                  const isMultiDay = event.end_date && event.end_date !== event.event_date
                  const isOwn      = event.user_id === currentUserId
                  const times      = event.start_time
                    ? event.end_time
                      ? `${event.start_time.slice(0,5)} – ${event.end_time.slice(0,5)}`
                      : event.start_time.slice(0,5)
                    : null

                  return (
                    <div key={event.id} style={{
                      backgroundColor: isOwn ? '#1e293b' : '#161e2e',
                      borderLeft: isOwn ? `4px solid ${color}` : `4px dashed ${color}88`,
                      borderRadius:'0 14px 14px 0',
                      padding:'14px 16px',
                      display:'flex', flexDirection:'column', gap:'8px',
                      boxShadow:'0 2px 12px rgba(0,0,0,0.3)',
                      opacity: isOwn ? 1 : 0.82,
                    }}>

                      {/* Riga 1: tipo + badge + famiglia + modifica */}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px' }}>
                        <span style={{ fontSize:'0.75rem', color: isOwn ? color : color+'aa', fontWeight:'700', display:'flex', alignItems:'center', gap:'4px' }}>
                          {emoji} {typeLabel}
                        </span>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                          {!isOwn && (
                            <span style={{
                              backgroundColor:'#334155', color:'#94a3b8',
                              borderRadius:'20px', padding:'2px 8px',
                              fontSize:'0.68rem', fontWeight:'600', whiteSpace:'nowrap',
                            }}>
                              👤 Famiglia
                            </span>
                          )}
                          <span style={{
                            backgroundColor: color+'22', color: isOwn ? color : color+'aa',
                            border:`1px solid ${color}${isOwn ? '55' : '33'}`,
                            borderRadius:'20px', padding:'2px 10px',
                            fontSize:'0.7rem', fontWeight:'700', whiteSpace:'nowrap',
                          }}>
                            {badge.text}
                          </span>
                          {event.is_deadline && isOwn && (
                            <button onClick={() => toggleCompleted(event)}
                              style={{ background:'none', border:`1px solid ${event.completed ? '#4ade80' : '#ef4444'}`,
                                borderRadius:'20px', padding:'2px 8px', fontSize:'0.68rem', fontWeight:'700',
                                color: event.completed ? '#4ade80' : '#ef4444', cursor:'pointer', whiteSpace:'nowrap' }}>
                              {event.completed ? '↺ Riapri' : '✓ Completa'}
                            </button>
                          )}
                          {isOwn && (
                            <button onClick={() => setEditModal(event)}
                              style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:'0.85rem', padding:'0 2px', lineHeight:1, flexShrink:0 }}>
                              ✏️
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Riga 2: titolo */}
                      <div style={{ fontSize:'1.02rem', fontWeight:'700', color:'#f1f5f9', lineHeight:1.3,
                        textDecoration: event.completed ? 'line-through' : 'none', opacity: event.completed ? 0.6 : 1 }}>
                        {event.title}
                      </div>

                      {/* Riga 3: date/orari */}
                      <div style={{ display:'flex', alignItems:'center', gap:'14px', flexWrap:'wrap' }}>
                        {isMultiDay && (
                          <span style={{ fontSize:'0.8rem', color:'#94a3b8', display:'flex', alignItems:'center', gap:'4px' }}>
                            📅 {fmtDateShort(event.event_date)} – {fmtDateShort(event.end_date)}
                          </span>
                        )}
                        <span style={{ fontSize:'0.8rem', color:'#94a3b8', display:'flex', alignItems:'center', gap:'4px' }}>
                          🕐 {times ?? 'Tutto il giorno'}
                        </span>
                      </div>

                      {/* Riga 4: note (opzionale) */}
                      {event.description && (
                        <div style={{
                          fontSize:'0.8rem', color:'#64748b',
                          borderTop:'1px solid #334155', paddingTop:'8px',
                          lineHeight:1.5,
                        }}>
                          {event.description}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
