// Spesa vs entrata su payments, stesso pattern di lookup tipizzato di
// eventTypes.js (colore/emoji per tipo + accessor con fallback), esteso con
// le etichette azione (paga/incassa) così PaymentsScreen non deve avere `if`
// sparsi per distinguere i due casi.
export const PAYMENT_TYPES = [
  {
    id: 'spesa', label: 'Spesa', emoji: '➖', color: '#ef4444',
    verb: 'Paga', doneLabel: 'Pagato', pendingLabel: 'Da pagare', dateLabel: 'Data pagamento',
  },
  {
    id: 'entrata', label: 'Entrata', emoji: '➕', color: '#4ade80',
    verb: 'Incassa', doneLabel: 'Incassato', pendingLabel: 'Da incassare', dateLabel: 'Data incasso',
  },
]

export function getPaymentType(id) {
  return PAYMENT_TYPES.find(t => t.id === id) ?? PAYMENT_TYPES[0]
}

export const EXPENSE_CATEGORIES = [
  'Tasse', 'Tassa Rifiuti', 'IMU', 'Bollo Auto', 'SMAT', 'Luce', 'Gas',
  'Acqua', 'Internet', 'Mutuo/Affitto', 'Bolletta', 'Assicurazione',
  'Auto/Trasporti', 'Salute', 'Svago/Divertimenti', 'Altro',
]

export const INCOME_CATEGORIES = ['Stipendio', 'Bonus', 'Regalo', 'Altro']

export function categoriesFor(type) {
  return type === 'entrata' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
}
