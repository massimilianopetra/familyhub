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

// Le categorie vere e proprie vivono ora nella tabella payment_categories
// (personalizzabile per famiglia, vedi supabase/payment_categories.sql):
// PaymentsScreen.jsx le carica da lì, non da qui. Queste due liste restano
// solo (a) il seed usato dallo script SQL e da create_family() per popolare
// le categorie di default di ogni famiglia, e (b) il fallback mostrato nel
// form finché quella fetch non è ancora tornata.
export const EXPENSE_CATEGORIES = [
  'Tasse', 'Tassa Rifiuti', 'IMU', 'Bollo Auto', 'SMAT', 'Luce', 'Gas',
  'Acqua', 'Internet', 'Mutuo/Affitto', 'Bolletta', 'Assicurazione',
  'Auto/Trasporti', 'Salute', 'Svago/Divertimenti', 'Altro',
]

export const INCOME_CATEGORIES = ['Stipendio', 'Bonus', 'Regalo', 'Altro']
