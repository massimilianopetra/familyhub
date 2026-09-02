function pad(n) { return String(n).padStart(2, '0') }
function dateToStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

// Differenza in giorni interi tra due date YYYY-MM-DD (b - a)
function daysBetween(aStr, bStr) {
  const a = new Date(aStr + 'T00:00:00')
  const b = new Date(bStr + 'T00:00:00')
  return Math.round((b - a) / 86400000)
}

// Nomi giorni indicizzati come Date.getDay() (0=domenica ... 6=sabato),
// stessa convenzione usata dalla colonna "weekdays"
export const WEEKDAY_NAMES = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
// Ordine di visualizzazione italiano (settimana che parte da lunedì)
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

function isWeekdaySchedule(m) {
  return m.schedule_type === 'weekdays'
}

// Terapie ad uso saltuario, senza schema fisso (es. antidolorifico preso solo
// quando serve): niente scalo automatico delle scorte, niente promemoria
// "prossima dose" — le scorte si muovono solo con le azioni manuali
// (Ricarica / Correggi / Consumo).
function isOccasionalSchedule(m) {
  return m.schedule_type === 'occasional'
}

function weekdaySet(m) {
  return new Set((m.weekdays || []).map(Number))
}

// Ogni quanti giorni si ripete l'assunzione (solo per schedule_type
// 'interval'; campo obbligatorio in quel caso, 1 se mancante per
// compatibilità con righe salvate prima che lo diventasse)
function doseInterval(m) {
  return Number(m.dose_interval_days) > 0 ? Number(m.dose_interval_days) : 1
}

// Quante unità (compresse, ml, bustine...) si consumano al giorno in media
export function dailyConsumption(m) {
  if (!m.is_active) return 0
  if (isOccasionalSchedule(m)) return 0
  const units = Number(m.units_per_intake || 0)
  if (isWeekdaySchedule(m)) return units * weekdaySet(m).size / 7
  return units / doseInterval(m)
}

// Quante dosi sono effettivamente cadute in calendario dopo `sinceStr` e fino
// a oggi (incluso), secondo lo stesso ancoraggio usato da nextDoseDate:
// start_date + multipli di dose_interval_days. Conta le date esatte di
// assunzione, non una frazione di giorno per giorno.
function dosesTakenSinceInterval(m, sinceStr) {
  const interval = doseInterval(m)
  const anchor = m.start_date || sinceStr
  if (!anchor || !sinceStr) return 0
  const today = dateToStr(new Date())

  const anchorToToday = daysBetween(anchor, today)
  if (anchorToToday < 0) return 0 // la terapia non è ancora iniziata

  const kTo = Math.floor(anchorToToday / interval)
  const anchorToSince = daysBetween(anchor, sinceStr)
  const kFrom = anchorToSince < 0 ? 0 : Math.floor(anchorToSince / interval) + 1

  return Math.max(0, kTo - kFrom + 1)
}

// Equivalente a dosesTakenSinceInterval ma per la posologia "giorni della
// settimana": conta quante date tra sinceStr (escluso) e oggi (incluso),
// non prima dell'inizio terapia, cadono in uno dei giorni della settimana
// selezionati.
function dosesTakenSinceWeekdays(m, sinceStr) {
  const days = weekdaySet(m)
  if (days.size === 0) return 0
  const anchor = m.start_date || sinceStr
  if (!anchor || !sinceStr) return 0
  const today = dateToStr(new Date())
  if (daysBetween(anchor, today) < 0) return 0 // la terapia non è ancora iniziata

  let cursor = new Date(sinceStr + 'T00:00:00')
  cursor.setDate(cursor.getDate() + 1)
  const anchorDate = new Date(anchor + 'T00:00:00')
  if (anchorDate > cursor) cursor = anchorDate
  const end = new Date(today + 'T00:00:00')
  if (cursor > end) return 0

  let count = 0
  const d = new Date(cursor)
  while (d <= end) {
    if (days.has(d.getDay())) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

function dosesTakenSince(m, sinceStr) {
  if (isOccasionalSchedule(m)) return 0
  return isWeekdaySchedule(m) ? dosesTakenSinceWeekdays(m, sinceStr) : dosesTakenSinceInterval(m, sinceStr)
}

// Scorte rimaste OGGI: quantità registrata in stock_as_of meno le dosi
// effettivamente cadute in calendario da allora ad oggi (si aggiorna da sola
// col passare del tempo, ma scala di unità intere nelle date vere di
// assunzione anziché sottrarre una frazione ogni giorno)
export function currentStock(m) {
  const recorded = Number(m.stock_units || 0)
  if (!m.is_active) return recorded
  const doses = dosesTakenSince(m, m.stock_as_of)
  const consumed = doses * Number(m.units_per_intake || 0)
  return Math.max(0, recorded - consumed)
}

// Scorte da mostrare all'utente: arrotondate all'unità intera per eccesso,
// così restano ferme al valore pieno per tutto l'intervallo e scalano di
// un'unità esattamente il giorno in cui la dose viene presa (non ha senso
// mostrare "0,9 iniezioni"). Il .toFixed(6) prima del ceil evita che errori
// di virgola mobile (es. 1/15*15 = 1.0000000000000002) facciano scattare
// il calo un giorno prima del dovuto.
export function displayStock(m) {
  return Math.ceil(Number(currentStock(m).toFixed(6)))
}

// Etichetta leggibile del ritmo di assunzione (es. "1 ogni 15 giorni",
// oppure "1 compressa: giovedì, domenica" per la posologia settimanale)
export function doseScheduleLabel(m) {
  const units = Number(m.units_per_intake || 0)
  if (isOccasionalSchedule(m)) return `${units} ${m.unit_label}: al bisogno`
  if (isWeekdaySchedule(m)) {
    const days = weekdaySet(m)
    const names = WEEKDAY_ORDER.filter(d => days.has(d)).map(d => WEEKDAY_NAMES[d].toLowerCase())
    return `${units} ${m.unit_label}: ${names.join(', ') || '-'}`
  }
  const interval = doseInterval(m)
  if (interval <= 1) return `${units} ${m.unit_label}/giorno`
  return `${units} ${m.unit_label} ogni ${interval} giorni`
}

// Giorni residui di autonomia delle scorte, null se non calcolabile
export function daysRemaining(m) {
  const dc = dailyConsumption(m)
  if (!dc) return null
  return currentStock(m) / dc
}

// Data stimata di esaurimento scorte (stringa YYYY-MM-DD), null se non calcolabile
export function reorderDate(m) {
  const dr = daysRemaining(m)
  if (dr == null) return null
  const d = new Date()
  d.setDate(d.getDate() + Math.floor(dr))
  return dateToStr(d)
}

// Prossima data di assunzione, calcolata "avanzando" l'ancoraggio salvato
// (start_date) a passi di dose_interval_days finché non cade nel futuro.
// Così l'utente imposta la data una volta sola (quando farà la prossima
// assunzione) e da lì in poi si autoaggiorna da sola, senza bisogno di
// modificarla dopo ogni assunzione (utile per le iniezioni, es. ogni 15gg).
function nextDoseDateInterval(m) {
  const interval = doseInterval(m)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  let next = m.start_date ? new Date(m.start_date + 'T00:00:00') : new Date(today)
  while (next < today) next.setDate(next.getDate() + interval)
  return dateToStr(next)
}

// Prossima data di assunzione per la posologia "giorni della settimana":
// il primo giorno selezionato che cade da oggi (o dall'inizio terapia, se
// futuro) in poi.
function nextDoseDateWeekdays(m) {
  const days = weekdaySet(m)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const start = m.start_date ? new Date(m.start_date + 'T00:00:00') : new Date(today)
  const cursor = start > today ? start : today
  if (days.size === 0) return dateToStr(cursor)
  for (let i = 0; i < 7; i++) {
    if (days.has(cursor.getDay())) return dateToStr(cursor)
    cursor.setDate(cursor.getDate() + 1)
  }
  return dateToStr(cursor)
}

export function nextDoseDate(m) {
  if (isOccasionalSchedule(m)) return null
  return isWeekdaySchedule(m) ? nextDoseDateWeekdays(m) : nextDoseDateInterval(m)
}

// Stato della prossima dose: colore + etichetta in base a quanto manca
export function nextDoseStatus(m) {
  if (!m.is_active) return null
  if (isOccasionalSchedule(m)) return null // nessuno schema fisso, nessun promemoria
  const nd = nextDoseDate(m)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(nd + 'T00:00:00')
  const days = Math.round((target - today) / 86400000)
  const label = days === 0 ? 'Prossima dose: oggi'
    : days === 1 ? 'Prossima dose: domani'
    : `Prossima dose tra ${days} giorni`
  const color = days <= 3 ? '#f59e0b' : '#4ade80'
  return { color, label, date: nd }
}

// Stato scorte: colore + etichetta, per badge e avvisi
export function stockStatus(m) {
  if (!m.is_active) return { level: 'inactive', color: '#64748b', label: 'Terapia sospesa' }
  if (isOccasionalSchedule(m)) return { level: 'occasional', color: '#38bdf8', label: 'Uso occasionale' }
  const dr = daysRemaining(m)
  if (dr == null) return { level: 'unknown', color: '#64748b', label: 'Consumo non impostato' }
  if (dr <= 0) return { level: 'critical', color: '#ef4444', label: 'Scorte esaurite' }
  if (dr <= 3) return { level: 'critical', color: '#ef4444', label: 'Scorte quasi esaurite' }
  if (dr <= 7) return { level: 'low', color: '#f59e0b', label: 'Scorte in esaurimento' }
  return { level: 'ok', color: '#4ade80', label: 'Scorte ok' }
}
