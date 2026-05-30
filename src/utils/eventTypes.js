export const EVENT_TYPES = [
  { id: 'visita',      label: 'Visita medica',    color: '#ef4444', emoji: '🏥' },
  { id: 'ferie',       label: 'Ferie',             color: '#fbbf24', emoji: '🏖️' },
  { id: 'teatro',      label: 'Teatro / Concerto', color: '#a78bfa', emoji: '🎭' },
  { id: 'ripetizioni', label: 'Ripetizioni',       color: '#2dd4bf', emoji: '📚' },
  { id: 'altro',       label: 'Altro',             color: '#60a5fa', emoji: '📌' },
]

export function getEventType(typeId) {
  return EVENT_TYPES.find(t => t.id === typeId) ?? EVENT_TYPES[4]
}
