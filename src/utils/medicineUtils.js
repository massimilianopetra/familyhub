function pad(n) { return String(n).padStart(2, '0') }
function dateToStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

function daysSince(dateStr) {
  if (!dateStr) return 0
  const then = new Date(dateStr + 'T00:00:00')
  const now = new Date(); now.setHours(0, 0, 0, 0)
  return Math.max(0, Math.round((now - then) / 86400000))
}

// Ogni quanti giorni si ripete l'assunzione (campo obbligatorio; 1 se mancante
// per compatibilità con righe salvate prima che lo diventasse)
function doseInterval(m) {
  return Number(m.dose_interval_days) > 0 ? Number(m.dose_interval_days) : 1
}

// Quante unità (compresse, ml, bustine...) si consumano al giorno
export function dailyConsumption(m) {
  if (!m.is_active) return 0
  return Number(m.units_per_intake || 0) / doseInterval(m)
}

// Scorte rimaste OGGI: quantità registrata in stock_as_of meno il consumo
// previsto nei giorni trascorsi da allora (si aggiorna da sola col passare del tempo)
export function currentStock(m) {
  const recorded = Number(m.stock_units || 0)
  const dc = dailyConsumption(m)
  if (!dc) return recorded
  const elapsed = daysSince(m.stock_as_of)
  return Math.max(0, recorded - dc * elapsed)
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

// Etichetta leggibile del ritmo di assunzione (es. "1 ogni 15 giorni"
// invece della frazione "0,07 fiale/giorno")
export function doseScheduleLabel(m) {
  const interval = doseInterval(m)
  const units = Number(m.units_per_intake || 0)
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
export function nextDoseDate(m) {
  const interval = doseInterval(m)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  let next = m.start_date ? new Date(m.start_date + 'T00:00:00') : new Date(today)
  while (next < today) next.setDate(next.getDate() + interval)
  return dateToStr(next)
}

// Stato della prossima dose: colore + etichetta in base a quanto manca
export function nextDoseStatus(m) {
  if (!m.is_active) return null
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
  const dr = daysRemaining(m)
  if (dr == null) return { level: 'unknown', color: '#64748b', label: 'Consumo non impostato' }
  if (dr <= 0) return { level: 'critical', color: '#ef4444', label: 'Scorte esaurite' }
  if (dr <= 3) return { level: 'critical', color: '#ef4444', label: 'Scorte quasi esaurite' }
  if (dr <= 7) return { level: 'low', color: '#f59e0b', label: 'Scorte in esaurimento' }
  return { level: 'ok', color: '#4ade80', label: 'Scorte ok' }
}
