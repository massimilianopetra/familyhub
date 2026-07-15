function pad(n) { return String(n).padStart(2, '0') }
function dateToStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

function daysSince(dateStr) {
  if (!dateStr) return 0
  const then = new Date(dateStr + 'T00:00:00')
  const now = new Date(); now.setHours(0, 0, 0, 0)
  return Math.max(0, Math.round((now - then) / 86400000))
}

// Quante unità (compresse, ml, bustine...) si consumano al giorno
export function dailyConsumption(m) {
  if (!m.is_active) return 0
  return Number(m.times_per_day || 0) * Number(m.units_per_intake || 0)
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
