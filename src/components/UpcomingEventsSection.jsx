import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { getEventType } from '../utils/eventTypes'

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
  if (diff <= 0) return `Oggi — ${full}`
  if (diff === 1) return `Domani — ${full}`
  return `${DAYS_FULL[d.getDay()]} ${full}`
}

function buildBadge(event) {
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

export default function UpcomingEventsSection({ session }) {
  const [onlyMyEvents, setOnlyMyEvents] = useState(true)
  const [events,       setEvents]       = useState([])
  const [loading,      setLoading]      = useState(true)

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
      .or(`event_date.gte.${todayStr},end_date.gte.${todayStr}`)
      .order('event_date', { ascending: true })

    setEvents(data ?? [])
    setLoading(false)
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
        <Toggle checked={onlyMyEvents} onChange={setOnlyMyEvents} label="Solo miei" />
      </div>

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
                  const times      = event.start_time
                    ? event.end_time
                      ? `${event.start_time.slice(0,5)} – ${event.end_time.slice(0,5)}`
                      : event.start_time.slice(0,5)
                    : null

                  return (
                    <div key={event.id} style={{
                      backgroundColor:'#1e293b',
                      borderLeft:`4px solid ${color}`,
                      borderRadius:'0 14px 14px 0',
                      padding:'14px 16px',
                      display:'flex', flexDirection:'column', gap:'8px',
                      boxShadow:'0 2px 12px rgba(0,0,0,0.3)',
                    }}>

                      {/* Riga 1: tipo + badge */}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px' }}>
                        <span style={{ fontSize:'0.75rem', color, fontWeight:'700', display:'flex', alignItems:'center', gap:'4px' }}>
                          {emoji} {typeLabel}
                        </span>
                        <span style={{
                          backgroundColor: color+'22', color, border:`1px solid ${color}55`,
                          borderRadius:'20px', padding:'2px 10px',
                          fontSize:'0.7rem', fontWeight:'700', whiteSpace:'nowrap',
                        }}>
                          {badge.text}
                        </span>
                      </div>

                      {/* Riga 2: titolo */}
                      <div style={{ fontSize:'1.02rem', fontWeight:'700', color:'#f1f5f9', lineHeight:1.3 }}>
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
