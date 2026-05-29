// Ciclo di 24 settimane dei turni della moglie
export const wifeWorkPatterns = [
  { weekNumber: 1,  monday:[{start:"18:00",end:"21:00"}], tuesday:[{start:"17:30",end:"20:30"}], wednesday:[{start:"16:45",end:"19:45"}], friday:[{start:"17:00",end:"21:15"}], saturday:[{start:"17:30",end:"21:15"}], sunday:[{start:"09:45",end:"12:45"}] },
  { weekNumber: 2,  monday:[{start:"10:30",end:"14:00"}], wednesday:[{start:"09:30",end:"13:15"}], thursday:[{start:"08:30",end:"13:00"}], friday:[{start:"09:30",end:"13:15"}], saturday:[{start:"09:30",end:"14:00"}] },
  { weekNumber: 3,  monday:[{start:"16:15",end:"20:00"}], tuesday:[{start:"16:15",end:"20:45"}], wednesday:[{start:"17:00",end:"20:15"}], thursday:[{start:"16:00",end:"20:00"}], friday:[{start:"11:00",end:"15:30"}] },
  { weekNumber: 4,  tuesday:[{start:"17:00",end:"20:00"}], wednesday:[{start:"17:15",end:"20:15"}], thursday:[{start:"16:45",end:"19:45"}], friday:[{start:"16:45",end:"20:15"}], saturday:[{start:"15:15",end:"19:45"}], sunday:[{start:"10:00",end:"13:00"}] },
  { weekNumber: 5,  tuesday:[{start:"08:30",end:"13:00"}], wednesday:[{start:"09:15",end:"12:30"}], thursday:[{start:"09:45",end:"13:00"}], friday:[{start:"08:30",end:"13:00"}], saturday:[{start:"09:00",end:"13:30"}] },
  { weekNumber: 6,  monday:[{start:"17:00",end:"21:15"}], tuesday:[{start:"15:45",end:"18:45"}], wednesday:[{start:"17:30",end:"21:15"}], friday:[{start:"16:15",end:"20:45"}], saturday:[{start:"15:45",end:"20:15"}] },
  { weekNumber: 7,  monday:[{start:"09:00",end:"13:00"}], wednesday:[{start:"08:30",end:"13:00"}], friday:[{start:"15:30",end:"19:30"}], saturday:[{start:"09:00",end:"13:30"}], sunday:[{start:"17:15",end:"20:15"}] },
  { weekNumber: 8,  monday:[{start:"14:45",end:"18:15"}], tuesday:[{start:"10:30",end:"14:30"}], thursday:[{start:"09:00",end:"13:00"}], friday:[{start:"09:00",end:"13:00"}], saturday:[{start:"09:15",end:"13:45"}] },
  { weekNumber: 9,  monday:[{start:"13:30",end:"16:30"}], tuesday:[{start:"17:45",end:"21:15"}], wednesday:[{start:"17:30",end:"21:15"}], thursday:[{start:"18:15",end:"21:15"}], friday:[{start:"17:15",end:"20:15"}], saturday:[{start:"16:30",end:"20:15"}] },
  { weekNumber: 10, wednesday:[{start:"09:00",end:"13:00"}], thursday:[{start:"08:30",end:"12:15"}], friday:[{start:"08:30",end:"12:30"}], saturday:[{start:"11:00",end:"15:30"}], sunday:[{start:"16:30",end:"20:15"}] },
  { weekNumber: 11, monday:[{start:"08:30",end:"12:30"}], wednesday:[{start:"10:00",end:"14:30"}], thursday:[{start:"10:00",end:"14:30"}], friday:[{start:"09:45",end:"12:45"}], saturday:[{start:"10:00",end:"14:00"}] },
  { weekNumber: 12, monday:[{start:"16:30",end:"20:30"}], tuesday:[{start:"15:45",end:"19:45"}], wednesday:[{start:"16:00",end:"20:00"}], friday:[{start:"16:15",end:"20:15"}], saturday:[{start:"17:15",end:"21:15"}] },
  { weekNumber: 13, monday:[{start:"09:15",end:"12:15"}], tuesday:[{start:"09:45",end:"12:45"}], wednesday:[{start:"10:15",end:"13:15"}], thursday:[{start:"09:30",end:"13:15"}], saturday:[{start:"08:45",end:"13:00"}], sunday:[{start:"09:00",end:"12:00"}] },
  { weekNumber: 14, monday:[{start:"15:45",end:"20:15"}], tuesday:[{start:"15:15",end:"19:15"}], thursday:[{start:"17:45",end:"21:00"}], friday:[{start:"14:30",end:"18:45"}], saturday:[{start:"09:30",end:"13:30"}] },
  { weekNumber: 15, monday:[{start:"09:30",end:"12:30"}], tuesday:[{start:"09:15",end:"12:30"}], wednesday:[{start:"09:15",end:"12:30"}], thursday:[{start:"10:00",end:"13:00"}], friday:[{start:"09:15",end:"13:00"}], saturday:[{start:"15:30",end:"19:15"}] },
  { weekNumber: 16, wednesday:[{start:"15:45",end:"20:00"}], thursday:[{start:"16:00",end:"20:15"}], friday:[{start:"16:15",end:"20:30"}], saturday:[{start:"17:00",end:"21:15"}], sunday:[{start:"10:30",end:"13:30"}] },
  { weekNumber: 17, monday:[{start:"09:30",end:"12:30"}], wednesday:[{start:"09:30",end:"13:30"}], thursday:[{start:"09:00",end:"13:30"}], friday:[{start:"09:15",end:"13:30"}], saturday:[{start:"09:00",end:"13:15"}] },
  { weekNumber: 18, monday:[{start:"14:45",end:"19:15"}], tuesday:[{start:"14:45",end:"18:45"}], wednesday:[{start:"16:15",end:"19:30"}], thursday:[{start:"15:00",end:"19:30"}], friday:[{start:"16:00",end:"19:45"}] },
  { weekNumber: 19, monday:[{start:"09:00",end:"12:30"}], tuesday:[{start:"09:00",end:"12:30"}], friday:[{start:"14:00",end:"18:30"}], saturday:[{start:"08:30",end:"12:30"}], sunday:[{start:"15:15",end:"19:45"}] },
  { weekNumber: 20, monday:[{start:"16:45",end:"20:45"}], tuesday:[{start:"12:30",end:"16:30"}], wednesday:[{start:"12:30",end:"16:30"}], friday:[{start:"17:15",end:"21:15"}], saturday:[{start:"17:15",end:"21:15"}] },
  { weekNumber: 21, monday:[{start:"11:30",end:"14:45"}], tuesday:[{start:"09:30",end:"12:30"}], wednesday:[{start:"09:30",end:"12:45"}], thursday:[{start:"10:45",end:"15:15"}], friday:[{start:"09:15",end:"12:15"}], saturday:[{start:"09:30",end:"12:30"}] },
  { weekNumber: 22, monday:[{start:"16:45",end:"19:45"}], tuesday:[{start:"16:15",end:"19:30"}], wednesday:[{start:"16:00",end:"19:45"}], friday:[{start:"16:15",end:"19:45"}], saturday:[{start:"16:30",end:"20:00"}], sunday:[{start:"09:30",end:"12:30"}] },
  { weekNumber: 23, monday:[{start:"15:45",end:"19:45"}], tuesday:[{start:"17:00",end:"21:00"}], thursday:[{start:"16:45",end:"20:45"}], friday:[{start:"12:30",end:"16:30"}], saturday:[{start:"15:30",end:"19:30"}] },
  { weekNumber: 24, monday:[{start:"08:30",end:"12:30"}], tuesday:[{start:"09:30",end:"13:30"}], wednesday:[{start:"09:30",end:"13:30"}], thursday:[{start:"09:00",end:"13:00"}], friday:[{start:"09:00",end:"13:00"}] },
]

// Data di riferimento: 4 agosto 2025 (lunedì) = indice settimana 7 (0-based)
const REFERENCE_DATE = new Date('2025-08-04T00:00:00')
const REFERENCE_WEEK_INDEX = 7

const DAY_KEYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']

// Verde mattina (fine < 14:00), arancio pomeriggio/sera (fine >= 14:00)
function shiftColor(endTime) {
  const [h] = endTime.split(':').map(Number)
  return h < 14 ? '#4ade80' : '#fb923c'
}

export function generateMonthShifts(year, month) {
  // Genera tutti i turni per il mese dato (month: 0-based)
  const result = []
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  const cursor   = new Date(firstDay)

  while (cursor <= lastDay) {
    const diffDays   = Math.floor((cursor - REFERENCE_DATE) / 86400000)
    const weeksPast  = Math.floor(diffDays / 7)
    const weekIndex  = ((REFERENCE_WEEK_INDEX + weeksPast) % 24 + 24) % 24
    const pattern    = wifeWorkPatterns[weekIndex]
    const dayIndex   = (cursor.getDay() + 6) % 7   // 0=lun … 6=dom
    const shifts     = pattern[DAY_KEYS[dayIndex]] || []

    for (const shift of shifts) {
      result.push({
        date: new Date(cursor),
        start: shift.start,
        end: shift.end,
        color: shiftColor(shift.end),
        weekLabel: `W${weekIndex + 1}`,
      })
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  return result
}
