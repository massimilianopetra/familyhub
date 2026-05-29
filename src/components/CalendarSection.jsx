import { useState, useMemo, useEffect } from 'react'
import { generateMonthShifts, generateRangeShifts } from '../utils/workShift'

const MONTHS_IT    = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const MONTHS_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']
const DAYS_SHORT   = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom']
const DAYS_FULL    = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica']

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

// ── Chip piccolo (vista mese) ──────────────────────────────────
function ShiftChip({ shift }) {
  return (
    <div style={{ backgroundColor: shift.color+'22', border:`1px solid ${shift.color}`, borderRadius:'4px', padding:'1px 5px', fontSize:'0.65rem', color:shift.color, fontWeight:'600', whiteSpace:'nowrap', lineHeight:'1.6' }}>
      {shift.start}–{shift.end}
    </div>
  )
}

// ── Chip mobile a due righe (vista mese su cellulare) ──────────
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

// ── Legenda ────────────────────────────────────────────────────
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

// ══════════════════════════════════════════════════════════════
// VISTA MESE
// ══════════════════════════════════════════════════════════════
function MonthView({ year, month, shifts, showShifts, onDayClick, isMobile }) {
  const today = new Date()

  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const startOff = (firstDay.getDay() + 6) % 7
    return Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - startOff + i))
  }, [year, month])

  function shiftsForDay(day) {
    return shifts.filter(s => isSameDay(s.date, day))
  }

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
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// VISTA SETTIMANA
// ══════════════════════════════════════════════════════════════
function WeekView({ monday, shifts, showShifts, onDayClick }) {
  const today = new Date()
  const days  = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d
  })

  function shiftsForDay(day) {
    return shifts.filter(s => isSameDay(s.date, day))
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:'6px' }}>
      {days.map((day, i) => {
        const isToday   = isSameDay(day, today)
        const isWeekend = i >= 5
        const dayShifts = shiftsForDay(day)
        return (
          <div key={i} style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
            {/* intestazione colonna */}
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
            {/* turni */}
            <div style={{ display:'flex', flexDirection:'column', gap:'4px', minHeight:'60px' }}>
              {showShifts && dayShifts.length > 0
                ? dayShifts.map((s,j) => <ShiftCard key={j} shift={s} detailed={false} />)
                : showShifts && <div style={{ fontSize:'0.65rem', color:'#334155', textAlign:'center', paddingTop:'8px' }}>—</div>
              }
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
function DayView({ day, shifts, showShifts }) {
  const today     = new Date()
  const isToday   = isSameDay(day, today)
  const dayShifts = shifts.filter(s => isSameDay(s.date, day))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      <div style={{ backgroundColor:'#1e293b', border: isToday ? '1.5px solid #38bdf8' : '1px solid #334155',
        borderRadius:'12px', padding:'20px 24px' }}>
        <div style={{ fontSize:'1.3rem', fontWeight:'700', color: isToday ? '#38bdf8' : '#f1f5f9', marginBottom:'4px' }}>
          {fmtDateFull(day)}
        </div>
        {isToday && <span style={{ fontSize:'0.75rem', color:'#38bdf8', fontWeight:'600' }}>● Oggi</span>}
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
                padding:'24px', textAlign:'center', color:'#475569', fontSize:'0.9rem' }}>
                Nessun turno previsto
              </div>
            )
          }
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPALE
// ══════════════════════════════════════════════════════════════
export default function CalendarSection() {
  const today    = new Date()
  const isMobile = useIsMobile()
  const [view,        setView]        = useState('month')
  const [currentDate, setCurrentDate] = useState(new Date(today))
  const [showShifts,  setShowShifts]  = useState(true)

  // Calcola range dati da generare in base alla vista
  const { shifts, title } = useMemo(() => {
    if (view === 'month') {
      const y = currentDate.getFullYear()
      const m = currentDate.getMonth()
      return {
        shifts: generateMonthShifts(y, m),
        title: `${MONTHS_IT[m]} ${y}`,
      }
    }
    if (view === 'week') {
      const mon = getMonday(currentDate)
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
      const title = mon.getMonth() === sun.getMonth()
        ? `${mon.getDate()} – ${sun.getDate()} ${MONTHS_IT[mon.getMonth()]} ${mon.getFullYear()}`
        : `${mon.getDate()} ${MONTHS_SHORT[mon.getMonth()]} – ${sun.getDate()} ${MONTHS_SHORT[sun.getMonth()]} ${sun.getFullYear()}`
      return { shifts: generateRangeShifts(mon, sun), title }
    }
    // day
    return {
      shifts: generateRangeShifts(currentDate, currentDate),
      title: fmtDateFull(currentDate),
    }
  }, [view, currentDate])

  function navigate(delta) {
    const d = new Date(currentDate)
    if (view === 'month') { d.setDate(1); d.setMonth(d.getMonth() + delta) }
    if (view === 'week')  { d.setDate(d.getDate() + delta * 7) }
    if (view === 'day')   { d.setDate(d.getDate() + delta) }
    setCurrentDate(d)
  }

  function goToday() {
    setCurrentDate(new Date(today))
  }

  function goToDay(day) {
    setCurrentDate(new Date(day))
    setView('day')
  }

  return (
    <div style={{ width:'100%' }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'14px' }}>
        {/* Riga 1 — navigazione centrata */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'10px' }}>
          <button style={hdr.navBtn} onClick={() => navigate(-1)}>‹</button>
          <h2 style={hdr.title}>{title}</h2>
          <button style={hdr.navBtn} onClick={() => navigate(1)}>›</button>
        </div>
        {/* Riga 2 — controlli */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'12px', flexWrap:'wrap' }}>
          <button style={hdr.todayBtn} onClick={goToday}>Oggi</button>
          <ViewSelector view={view} setView={setView} />
          <Toggle checked={showShifts} onChange={setShowShifts} label="Turni Rosy" />
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
          onDayClick={goToDay}
          isMobile={isMobile}
        />
      )}
      {view === 'week' && (
        <WeekView
          monday={getMonday(currentDate)}
          shifts={shifts}
          showShifts={showShifts}
          onDayClick={goToDay}
        />
      )}
      {view === 'day' && (
        <DayView
          day={currentDate}
          shifts={shifts}
          showShifts={showShifts}
        />
      )}
    </div>
  )
}

const hdr = {
  navBtn: { backgroundColor:'#1e293b', border:'1px solid #334155', color:'#94a3b8', width:'36px', height:'36px', borderRadius:'8px', fontSize:'1.4rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1, padding:0 },
  title:  { margin:0, fontSize:'1.25rem', fontWeight:'700', color:'#f1f5f9', minWidth:'220px', textAlign:'center' },
  todayBtn: { backgroundColor:'#1e40af', border:'none', color:'#bfdbfe', padding:'7px 16px', borderRadius:'8px', fontSize:'0.82rem', fontWeight:'600', cursor:'pointer' },
}
