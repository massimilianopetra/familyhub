import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { generateMonthShifts, generateRangeShifts } from '../utils/workShift'

const MONTHS_IT    = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const MONTHS_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']
const DAYS_SHORT   = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom']
const DAYS_FULL    = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica']
const EVENT_TYPES = [
  { id: 'visita',  label: 'Visita medica',    color: '#ef4444', emoji: '🏥' },
  { id: 'ferie',   label: 'Ferie',             color: '#fbbf24', emoji: '🏖️' },
  { id: 'teatro',  label: 'Teatro / Concerto', color: '#a78bfa', emoji: '🎭' },
  { id: 'ripetizioni', label: 'Ripetizioni',    color: '#2dd4bf', emoji: '📚' },
  { id: 'altro',       label: 'Altro',          color: '#60a5fa', emoji: '📌' },
]

function getEventType(typeId) {
  return EVENT_TYPES.find(t => t.id === typeId) ?? EVENT_TYPES[3]
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate()
}

function getMonday(date) {
  const d = new Date(date)
  d.setHours(0,0,0,0)
  const diff = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - diff)
  return d
}

function fmtDateFull(date) {
  const dow = DAYS_FULL[(date.getDay() + 6) % 7]
  return `${dow} ${date.getDate()} ${MONTHS_IT[date.getMonth()]} ${date.getFullYear()}`
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

// ── Toggle ─────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }) {
  return (
    <label style={sw.wrapper}>
      <span style={sw.label}>{label}</span>
      <div onClick={() => onChange(!checked)}
        style={{ ...sw.track, backgroundColor: checked ? '#4ade80' : '#334155' }}>
        <div style={{ ...sw.thumb, transform: checked ? 'translateX(20px)' : 'translateX(2px)' }} />
      </div>
    </label>
  )
}
const sw = {
  wrapper: { display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', userSelect:'none' },
  label:   { fontSize:'0.85rem', color:'#94a3b8', fontWeight:'500' },
  track:   { width:'44px', height:'24px', borderRadius:'12px', position:'relative', transition:'background-color .2s', cursor:'pointer', flexShrink:0 },
  thumb:   { position:'absolute', top:'2px', width:'20px', height:'20px', borderRadius:'50%', backgroundColor:'#fff', transition:'transform .2s', boxShadow:'0 1px 4px rgba(0,0,0,.4)' },
}

// ── Chip turno (vista mese desktop) ───────────────────────────
function ShiftChip({ shift }) {
  return (
    <div style={{ backgroundColor: shift.color+'22', border:`1px solid ${shift.color}`, borderRadius:'4px', padding:'1px 5px', fontSize:'0.65rem', color:shift.color, fontWeight:'600', whiteSpace:'nowrap', lineHeight:'1.6' }}>
      {shift.start}–{shift.end}
    </div>
  )
}

// ── Chip turno mobile ──────────────────────────────────────────
function ShiftChipMobile({ shift }) {
  return (
    <div style={{ backgroundColor: shift.color+'22', border:`1px solid ${shift.color}`, borderRadius:'3px', padding:'1px 2px', fontSize:'0.52rem', color:shift.color, fontWeight:'700', lineHeight:'1.3', textAlign:'center', width:'100%' }}>
      <div>{shift.start}</div>
      <div>{shift.end}</div>
    </div>
  )
}

// ── Card turno (vista settimana/giorno) ────────────────────────
function ShiftCard({ shift, detailed }) {
  return (
    <div style={{ borderLeft:`3px solid ${shift.color}`, backgroundColor: shift.color+'18', borderRadius:'6px', padding: detailed ? '10px 14px' : '6px 10px', display:'flex', flexDirection:'column', gap:'3px' }}>
      <span style={{ fontSize: detailed ? '0.95rem' : '0.78rem', fontWeight:'700', color:'#f1f5f9' }}>
        🔔 Turno di lavoro
      </span>
      <span style={{ fontSize: detailed ? '0.88rem' : '0.73rem', color: shift.color, fontWeight:'600' }}>
        {shift.start} – {shift.end}
      </span>
      {detailed && (
        <span style={{ fontSize:'0.78rem', color:'#64748b', marginTop:'2px' }}>{shift.weekLabel}</span>
      )}
    </div>
  )
}

// ── Chip evento DB (vista mese desktop) ───────────────────────
function EventChip({ event, isOwner, onDelete }) {
  const { emoji, color } = getEventType(event.event_type)
  return (
    <div style={{ backgroundColor: color+'22', border:`1px solid ${color}`, borderRadius:'4px', padding:'1px 5px', fontSize:'0.65rem', color, fontWeight:'600', lineHeight:'1.6', display:'flex', alignItems:'center', gap:'3px', overflow:'hidden' }}>
      <span style={{ flexShrink:0 }}>{emoji}</span>
      <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{event.title}</span>
      {isOwner && (
        <span onClick={e => { e.stopPropagation(); onDelete(event.id) }}
          style={{ cursor:'pointer', opacity:0.65, flexShrink:0, fontSize:'0.6rem' }}>✕</span>
      )}
    </div>
  )
}

// ── Chip evento DB mobile ──────────────────────────────────────
function EventChipMobile({ event }) {
  const { emoji, color } = getEventType(event.event_type)
  return (
    <div style={{ backgroundColor: color+'22', border:`1px solid ${color}`, borderRadius:'3px', padding:'1px 2px', fontSize:'0.6rem', color, fontWeight:'700', lineHeight:'1.4', textAlign:'center', width:'100%' }}>
      {emoji}
    </div>
  )
}

// ── Card evento DB (vista settimana/giorno) ────────────────────
function EventCard({ event, detailed, isOwner, onDelete }) {
  const { emoji, label: typeLabel, color } = getEventType(event.event_type)
  const times = event.start_time
    ? event.end_time
      ? `${event.start_time.slice(0,5)} – ${event.end_time.slice(0,5)}`
      : event.start_time.slice(0,5)
    : null

  return (
    <div style={{ borderLeft:`3px solid ${color}`, backgroundColor: color+'18', borderRadius:'6px', padding: detailed ? '10px 14px' : '6px 10px', display:'flex', flexDirection:'column', gap:'3px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'6px' }}>
        <span style={{ fontSize: detailed ? '0.95rem' : '0.78rem', fontWeight:'700', color:'#f1f5f9', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {emoji} {event.title}
        </span>
        {isOwner && (
          <button onClick={() => onDelete(event.id)}
            style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:'0.8rem', padding:'0 2px', lineHeight:1, flexShrink:0 }}>
            ✕
          </button>
        )}
      </div>
      <span style={{ fontSize: detailed ? '0.88rem' : '0.73rem', color, fontWeight:'600' }}>
        {times ?? 'Tutto il giorno'}
      </span>
      {detailed && (
        <span style={{ fontSize:'0.75rem', color: color+'cc', fontWeight:'500' }}>{typeLabel}</span>
      )}
      {detailed && event.description && (
        <span style={{ fontSize:'0.78rem', color:'#64748b', marginTop:'2px' }}>{event.description}</span>
      )}
    </div>
  )
}

// ── Legenda turni ──────────────────────────────────────────────
function Legend() {
  return (
    <div style={{ display:'flex', gap:'20px', flexWrap:'wrap', marginBottom:'12px' }}>
      {[['#4ade80','Mattina (fine ≤ 14:00)'],['#fb923c','Pomeriggio / Sera']].map(([color,label]) => (
        <div key={color} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'0.75rem', color:'#64748b' }}>
          <div style={{ width:'10px', height:'10px', borderRadius:'50%', backgroundColor:color }} />
          {label}
        </div>
      ))}
    </div>
  )
}

// ── Selettore vista ────────────────────────────────────────────
function ViewSelector({ view, setView }) {
  const views = [['month','Mese'],['week','Settimana'],['day','Giorno']]
  return (
    <div style={{ display:'flex', backgroundColor:'#0f172a', borderRadius:'8px', border:'1px solid #334155', overflow:'hidden' }}>
      {views.map(([v,label]) => (
        <button key={v} onClick={() => setView(v)}
          style={{ padding:'6px 14px', border:'none', cursor:'pointer', fontSize:'0.82rem', fontWeight:'600',
            backgroundColor: view===v ? '#334155' : 'transparent',
            color: view===v ? '#f1f5f9' : '#64748b' }}>
          {label}
        </button>
      ))}
    </div>
  )
}

// ── Modal aggiungi evento ──────────────────────────────────────
function AddEventModal({ date, currentUserId, onClose, onSaved }) {
  const [title,       setTitle]       = useState('')
  const [startTime,   setStartTime]   = useState('')
  const [endTime,     setEndTime]     = useState('')
  const [eventType,   setEventType]   = useState('altro')
  const [description, setDescription] = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  async function handleSave() {
    if (!title.trim()) { setError('Il titolo è obbligatorio'); return }
    setSaving(true)
    const pad = n => String(n).padStart(2, '0')
    const dateStr = `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`
    const { color } = getEventType(eventType)
    const { error: err } = await supabase.from('calendar_events').insert({
      user_id:     currentUserId,
      title:       title.trim(),
      event_date:  dateStr,
      start_time:  startTime || null,
      end_time:    endTime   || null,
      event_type:  eventType,
      color,
      description: description.trim() || null,
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
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.72)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(5px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'16px', padding:'24px 20px', width:'90%', maxWidth:'340px', display:'flex', flexDirection:'column', gap:'14px', boxShadow:'0 24px 60px rgba(0,0,0,0.85)' }}>
        <div style={{ fontSize:'1.05rem', fontWeight:'700', color:'#f1f5f9' }}>+ Nuovo evento</div>
        <div style={{ fontSize:'0.78rem', color:'#64748b' }}>{fmtDateFull(date)}</div>

        {/* Tipologia */}
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

        <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="Titolo *" style={inp} />

        <div style={{ display:'flex', gap:'10px' }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'0.72rem', color:'#64748b', marginBottom:'4px' }}>Inizio</div>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inp} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'0.72rem', color:'#64748b', marginBottom:'4px' }}>Fine</div>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inp} />
          </div>
        </div>

        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Note (opzionale)" rows={2}
          style={{ ...inp, resize:'vertical' }} />

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
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// VISTA MESE
// ══════════════════════════════════════════════════════════════
function MonthView({ year, month, shifts, showShifts, dbEvents, currentUserId, onDayClick, onDeleteEvent, isMobile }) {
  const today = new Date()

  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const startOff = (firstDay.getDay() + 6) % 7
    return Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - startOff + i))
  }, [year, month])

  function shiftsForDay(day) { return shifts.filter(s => isSameDay(s.date, day)) }
  function eventsForDay(day) { return dbEvents.filter(e => isSameDay(new Date(e.event_date + 'T00:00:00'), day)) }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap: isMobile ? '2px' : '4px' }}>
      {DAYS_SHORT.map(d => (
        <div key={d} style={{ textAlign:'center', fontSize: isMobile ? '0.6rem' : '0.72rem', fontWeight:'700',
          color: (d==='Sab'||d==='Dom') ? '#4ade80' : '#64748b',
          padding: isMobile ? '4px 0' : '6px 0', letterSpacing:'0.5px', textTransform:'uppercase' }}>
          {isMobile ? d.slice(0,1) : d}
        </div>
      ))}
      {cells.map((day, i) => {
        const isCurrent = day.getMonth() === month
        const isToday   = isSameDay(day, today)
        const dayShifts = shiftsForDay(day)
        const dayEvents = eventsForDay(day)
        return (
          <div key={i} onClick={() => onDayClick(day)}
            style={{ backgroundColor: isToday ? '#0c2340' : '#1e293b',
              border: isToday ? '1.5px solid #38bdf8' : '1px solid #1e293b',
              borderRadius: isMobile ? '5px' : '8px',
              padding: isMobile ? '4px 3px' : '6px',
              minHeight: isMobile ? '52px' : '76px',
              display:'flex', flexDirection:'column', alignItems: isMobile ? 'center' : 'stretch', gap:'3px',
              opacity: isCurrent ? 1 : 0.35, cursor:'pointer' }}>
            <span style={{ fontSize: isMobile ? '0.75rem' : '0.8rem', fontWeight:'600',
              alignSelf: isMobile ? 'center' : 'flex-end', lineHeight:1,
              color: isToday ? '#38bdf8' : '#94a3b8' }}>
              {day.getDate()}
            </span>
            {showShifts && dayShifts.length > 0 && (
              isMobile
                ? <div style={{ display:'flex', flexDirection:'column', gap:'1px', width:'100%' }}>
                    {dayShifts.map((s,j) => <ShiftChipMobile key={j} shift={s} />)}
                  </div>
                : dayShifts.map((s,j) => <ShiftChip key={j} shift={s} />)
            )}
            {dayEvents.map(e => (
              isMobile
                ? <EventChipMobile key={e.id} event={e} />
                : <EventChip key={e.id} event={e} isOwner={e.user_id===currentUserId} onDelete={onDeleteEvent} />
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// VISTA SETTIMANA
// ══════════════════════════════════════════════════════════════
function WeekView({ monday, shifts, showShifts, dbEvents, currentUserId, onDayClick, onDeleteEvent }) {
  const today = new Date()
  const days  = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d
  })

  function shiftsForDay(day) { return shifts.filter(s => isSameDay(s.date, day)) }
  function eventsForDay(day) { return dbEvents.filter(e => isSameDay(new Date(e.event_date + 'T00:00:00'), day)) }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:'6px' }}>
      {days.map((day, i) => {
        const isToday   = isSameDay(day, today)
        const isWeekend = i >= 5
        const dayShifts = shiftsForDay(day)
        const dayEvents = eventsForDay(day)
        return (
          <div key={i} style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
            <div onClick={() => onDayClick(day)}
              style={{ textAlign:'center', padding:'8px 4px', borderRadius:'8px', cursor:'pointer',
                backgroundColor: isToday ? '#1e40af' : '#1e293b',
                border: isToday ? '1px solid #3b82f6' : '1px solid #334155' }}>
              <div style={{ fontSize:'0.68rem', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.6px',
                color: isWeekend ? '#4ade80' : '#64748b' }}>
                {DAYS_SHORT[i]}
              </div>
              <div style={{ fontSize:'1.1rem', fontWeight:'700', color: isToday ? '#93c5fd' : '#f1f5f9', lineHeight:1.2 }}>
                {day.getDate()}
              </div>
              <div style={{ fontSize:'0.65rem', color:'#64748b' }}>
                {MONTHS_SHORT[day.getMonth()]}
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'4px', minHeight:'60px' }}>
              {showShifts && dayShifts.map((s,j) => <ShiftCard key={j} shift={s} detailed={false} />)}
              {dayEvents.map(e => <EventCard key={e.id} event={e} detailed={false} isOwner={e.user_id===currentUserId} onDelete={onDeleteEvent} />)}
              {showShifts && dayShifts.length === 0 && dayEvents.length === 0 && (
                <div style={{ fontSize:'0.65rem', color:'#334155', textAlign:'center', paddingTop:'8px' }}>—</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// VISTA GIORNO
// ══════════════════════════════════════════════════════════════
function DayView({ day, shifts, showShifts, dbEvents, currentUserId, onAddEvent, onDeleteEvent }) {
  const today     = new Date()
  const isToday   = isSameDay(day, today)
  const dayShifts = shifts.filter(s => isSameDay(s.date, day))
  const dayEvents = dbEvents.filter(e => isSameDay(new Date(e.event_date + 'T00:00:00'), day))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      {/* intestazione giorno con pulsante aggiungi */}
      <div style={{ backgroundColor:'#1e293b', border: isToday ? '1.5px solid #38bdf8' : '1px solid #334155',
        borderRadius:'12px', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px' }}>
        <div>
          <div style={{ fontSize:'1.2rem', fontWeight:'700', color: isToday ? '#38bdf8' : '#f1f5f9', marginBottom:'2px' }}>
            {fmtDateFull(day)}
          </div>
          {isToday && <span style={{ fontSize:'0.75rem', color:'#38bdf8', fontWeight:'600' }}>● Oggi</span>}
        </div>
        <button onClick={onAddEvent}
          style={{ background:'#1d4ed8', border:'none', borderRadius:'8px', color:'#fff', padding:'8px 14px', fontSize:'0.85rem', fontWeight:'600', cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>
          + Evento
        </button>
      </div>

      {showShifts && (
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          <div style={{ fontSize:'0.78rem', fontWeight:'700', color:'#64748b', letterSpacing:'1px', textTransform:'uppercase' }}>
            Turni di lavoro
          </div>
          {dayShifts.length > 0
            ? dayShifts.map((s,i) => <ShiftCard key={i} shift={s} detailed={true} />)
            : (
              <div style={{ backgroundColor:'#1e293b', border:'1px dashed #334155', borderRadius:'10px',
                padding:'20px', textAlign:'center', color:'#475569', fontSize:'0.9rem' }}>
                Nessun turno previsto
              </div>
            )
          }
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
        <div style={{ fontSize:'0.78rem', fontWeight:'700', color:'#64748b', letterSpacing:'1px', textTransform:'uppercase' }}>
          Eventi
        </div>
        {dayEvents.length > 0
          ? dayEvents.map(e => <EventCard key={e.id} event={e} detailed={true} isOwner={e.user_id===currentUserId} onDelete={onDeleteEvent} />)
          : (
            <div style={{ backgroundColor:'#1e293b', border:'1px dashed #334155', borderRadius:'10px',
              padding:'20px', textAlign:'center', color:'#475569', fontSize:'0.9rem' }}>
              Nessun evento · premi <strong style={{ color:'#60a5fa' }}>+ Evento</strong> per aggiungerne uno
            </div>
          )
        }
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPALE
// ══════════════════════════════════════════════════════════════
export default function CalendarSection({ session }) {
  const today    = new Date()
  const isMobile = useIsMobile()
  const [view,         setView]         = useState('month')
  const [currentDate,  setCurrentDate]  = useState(new Date(today))
  const [showShifts,   setShowShifts]   = useState(true)
  const [onlyMyEvents, setOnlyMyEvents] = useState(true)
  const [dbEvents,     setDbEvents]     = useState([])
  const [addModal,     setAddModal]     = useState(null)

  const currentUserId = session?.user?.id

  useEffect(() => { fetchEvents() }, [])

  async function fetchEvents() {
    const { data } = await supabase.from('calendar_events').select('*').order('event_date')
    if (data) setDbEvents(data)
  }

  async function deleteEvent(id) {
    await supabase.from('calendar_events').delete().eq('id', id)
    setDbEvents(prev => prev.filter(e => e.id !== id))
  }

  const filteredEvents = useMemo(() =>
    onlyMyEvents ? dbEvents.filter(e => e.user_id === currentUserId) : dbEvents
  , [dbEvents, onlyMyEvents, currentUserId])

  const { shifts, title } = useMemo(() => {
    if (view === 'month') {
      const y = currentDate.getFullYear()
      const m = currentDate.getMonth()
      return { shifts: generateMonthShifts(y, m), title: `${MONTHS_IT[m]} ${y}` }
    }
    if (view === 'week') {
      const mon = getMonday(currentDate)
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
      const title = mon.getMonth() === sun.getMonth()
        ? `${mon.getDate()} – ${sun.getDate()} ${MONTHS_IT[mon.getMonth()]} ${mon.getFullYear()}`
        : `${mon.getDate()} ${MONTHS_SHORT[mon.getMonth()]} – ${sun.getDate()} ${MONTHS_SHORT[sun.getMonth()]} ${sun.getFullYear()}`
      return { shifts: generateRangeShifts(mon, sun), title }
    }
    return { shifts: generateRangeShifts(currentDate, currentDate), title: fmtDateFull(currentDate) }
  }, [view, currentDate])

  function navigate(delta) {
    const d = new Date(currentDate)
    if (view === 'month') { d.setDate(1); d.setMonth(d.getMonth() + delta) }
    if (view === 'week')  { d.setDate(d.getDate() + delta * 7) }
    if (view === 'day')   { d.setDate(d.getDate() + delta) }
    setCurrentDate(d)
  }

  function goToday() { setCurrentDate(new Date(today)) }

  function goToDay(day) {
    setCurrentDate(new Date(day))
    setView('day')
  }

  return (
    <div style={{ width:'100%' }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'14px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'10px' }}>
          <button style={hdr.navBtn} onClick={() => navigate(-1)}>‹</button>
          <h2 style={hdr.title}>{title}</h2>
          <button style={hdr.navBtn} onClick={() => navigate(1)}>›</button>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'12px', flexWrap:'wrap' }}>
          <button style={hdr.todayBtn} onClick={goToday}>Oggi</button>
          <ViewSelector view={view} setView={setView} />
          <Toggle checked={showShifts}   onChange={setShowShifts}   label="Turni Rosy" />
          <Toggle checked={onlyMyEvents} onChange={setOnlyMyEvents} label="Solo miei" />
        </div>
      </div>

      {showShifts && <Legend />}

      {/* ── Contenuto vista ────────────────────────────────── */}
      {view === 'month' && (
        <MonthView
          year={currentDate.getFullYear()}
          month={currentDate.getMonth()}
          shifts={shifts}
          showShifts={showShifts}
          dbEvents={filteredEvents}
          currentUserId={currentUserId}
          onDayClick={goToDay}
          onDeleteEvent={deleteEvent}
          isMobile={isMobile}
        />
      )}
      {view === 'week' && (
        <WeekView
          monday={getMonday(currentDate)}
          shifts={shifts}
          showShifts={showShifts}
          dbEvents={filteredEvents}
          currentUserId={currentUserId}
          onDayClick={goToDay}
          onDeleteEvent={deleteEvent}
        />
      )}
      {view === 'day' && (
        <DayView
          day={currentDate}
          shifts={shifts}
          showShifts={showShifts}
          dbEvents={filteredEvents}
          currentUserId={currentUserId}
          onAddEvent={() => setAddModal(currentDate)}
          onDeleteEvent={deleteEvent}
        />
      )}

      {addModal && (
        <AddEventModal
          date={addModal}
          currentUserId={currentUserId}
          onClose={() => setAddModal(null)}
          onSaved={fetchEvents}
        />
      )}
    </div>
  )
}

const hdr = {
  navBtn:   { backgroundColor:'#1e293b', border:'1px solid #334155', color:'#94a3b8', width:'36px', height:'36px', borderRadius:'8px', fontSize:'1.4rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1, padding:0 },
  title:    { margin:0, fontSize:'1.25rem', fontWeight:'700', color:'#f1f5f9', minWidth:'220px', textAlign:'center' },
  todayBtn: { backgroundColor:'#1e40af', border:'none', color:'#bfdbfe', padding:'7px 16px', borderRadius:'8px', fontSize:'0.82rem', fontWeight:'600', cursor:'pointer' },
}
