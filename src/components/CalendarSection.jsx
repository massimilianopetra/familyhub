import { useState, useMemo } from 'react'
import { generateMonthShifts } from '../utils/workShift'

const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const DAYS_SHORT = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom']

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate()
}

// ── Toggle switch ──────────────────────────────────────────────
function Toggle({ checked, onChange, label }) {
  return (
    <label style={sw.wrapper}>
      <span style={sw.label}>{label}</span>
      <div
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{ ...sw.track, backgroundColor: checked ? '#4ade80' : '#334155' }}
      >
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

// ── Chip turno ─────────────────────────────────────────────────
function ShiftChip({ shift, compact }) {
  const bg = shift.color + '22'  // 13% opacity background
  const border = shift.color
  if (compact) {
    return <div style={{ width:'8px', height:'8px', borderRadius:'50%', backgroundColor:shift.color, flexShrink:0 }} title={`${shift.start}–${shift.end}`} />
  }
  return (
    <div style={{ backgroundColor:bg, border:`1px solid ${border}`, borderRadius:'4px', padding:'1px 5px', fontSize:'0.68rem', color:shift.color, fontWeight:'600', whiteSpace:'nowrap', lineHeight:'1.6' }}>
      {shift.start}–{shift.end}
    </div>
  )
}

// ── Cella giorno ──────────────────────────────────────────────
function DayCell({ day, isCurrentMonth, isToday, shifts, showShifts, compact }) {
  return (
    <div style={{
      ...c.cell,
      ...(isToday         ? c.cellToday        : {}),
      ...(!isCurrentMonth ? c.cellOtherMonth   : {}),
    }}>
      <span style={{ ...c.dayNum, ...(isToday ? c.dayNumToday : {}) }}>{day.getDate()}</span>
      {showShifts && shifts.length > 0 && (
        <div style={c.chips}>
          {shifts.map((s, i) => <ShiftChip key={i} shift={s} compact={compact} />)}
        </div>
      )}
    </div>
  )
}

// ── Legenda ───────────────────────────────────────────────────
function Legend() {
  return (
    <div style={leg.wrapper}>
      <div style={leg.item}>
        <div style={{ ...leg.dot, backgroundColor:'#4ade80' }} />
        <span>Mattina (fine &lt; 14:00)</span>
      </div>
      <div style={leg.item}>
        <div style={{ ...leg.dot, backgroundColor:'#fb923c' }} />
        <span>Pomeriggio / Sera</span>
      </div>
    </div>
  )
}

const leg = {
  wrapper: { display:'flex', gap:'20px', flexWrap:'wrap', marginTop:'12px' },
  item:    { display:'flex', alignItems:'center', gap:'6px', fontSize:'0.75rem', color:'#64748b' },
  dot:     { width:'10px', height:'10px', borderRadius:'50%' },
}

// ── Componente principale ─────────────────────────────────────
export default function CalendarSection() {
  const today = new Date()
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [showShifts, setShowShifts] = useState(true)

  const year  = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const shifts = useMemo(() => generateMonthShifts(year, month), [year, month])

  // Costruisce la griglia (sempre 6 righe × 7 col per stabilità layout)
  const cells = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1)
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7   // 0=lun
    const grid = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(year, month, 1 - startOffset + i)
      grid.push(d)
    }
    return grid
  }, [year, month])

  function shiftsForDay(day) {
    return shifts.filter(s => isSameDay(s.date, day))
  }

  function goMonth(delta) {
    setCurrentDate(new Date(year, month + delta, 1))
  }

  function goToday() {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  // Usa compact (dot) se la griglia è stretta — deciso dal browser via CSS
  // Ma per semplicità usiamo compact sotto una soglia stimata
  const compact = false   // sempre chip testuali; su mobile i chip si adattano da soli

  return (
    <div style={s.wrapper}>
      {/* ── Header ── */}
      <div style={s.header}>
        <div style={s.navGroup}>
          <button style={s.navBtn} onClick={() => goMonth(-1)}>‹</button>
          <h2 style={s.monthTitle}>{MONTHS_IT[month]} {year}</h2>
          <button style={s.navBtn} onClick={() => goMonth(1)}>›</button>
        </div>

        <div style={s.controls}>
          <button style={s.todayBtn} onClick={goToday}>Oggi</button>
          <Toggle
            checked={showShifts}
            onChange={setShowShifts}
            label="Turni moglie"
          />
        </div>
      </div>

      {showShifts && <Legend />}

      {/* ── Griglia ── */}
      <div style={s.grid}>
        {/* Intestazioni giorni */}
        {DAYS_SHORT.map(d => (
          <div key={d} style={{ ...s.dayHeader, ...(d === 'Sab' || d === 'Dom' ? s.dayHeaderWeekend : {}) }}>
            {d}
          </div>
        ))}

        {/* Celle */}
        {cells.map((day, i) => (
          <DayCell
            key={i}
            day={day}
            isCurrentMonth={day.getMonth() === month}
            isToday={isSameDay(day, today)}
            shifts={shiftsForDay(day)}
            showShifts={showShifts}
            compact={compact}
          />
        ))}
      </div>
    </div>
  )
}

// ── Stili ──────────────────────────────────────────────────────
const s = {
  wrapper: {
    width: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '16px',
  },
  navGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  monthTitle: {
    margin: 0,
    fontSize: '1.4rem',
    fontWeight: '700',
    color: '#f1f5f9',
    minWidth: '200px',
    textAlign: 'center',
    letterSpacing: '0.5px',
  },
  navBtn: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    color: '#94a3b8',
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    fontSize: '1.4rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    padding: 0,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  todayBtn: {
    backgroundColor: '#1e40af',
    border: 'none',
    color: '#bfdbfe',
    padding: '7px 16px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
    marginTop: '16px',
  },
  dayHeader: {
    textAlign: 'center',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#64748b',
    padding: '6px 0',
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
  },
  dayHeaderWeekend: {
    color: '#4ade80',
  },
  cell: {
    backgroundColor: '#1e293b',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    padding: '6px',
    minHeight: '80px',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    overflow: 'hidden',
    cursor: 'default',
    transition: 'border-color .15s',
  },
  cellToday: {
    border: '1.5px solid #38bdf8',
    backgroundColor: '#0c2340',
  },
  cellOtherMonth: {
    backgroundColor: '#161d2e',
    opacity: 0.45,
  },
  dayNum: {
    fontSize: '0.82rem',
    fontWeight: '600',
    color: '#94a3b8',
    alignSelf: 'flex-end',
    lineHeight: 1,
  },
  dayNumToday: {
    color: '#38bdf8',
    fontSize: '0.9rem',
  },
  chips: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    marginTop: '2px',
    overflow: 'hidden',
  },
}

const c = s  // alias per DayCell
