// Motore condiviso per i giochi di carte (Solitari). Nessun modulo: variabili globali semplici,
// pensate per essere incluse con <script src="cards-common.js"> nelle pagine statiche dei giochi.

const SUITS = ['spade', 'cuori', 'quadri', 'fiori'];
const SYMS = { spade: '♠', cuori: '♥', quadri: '♦', fiori: '♣' };
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const RED_SUITS = { cuori: true, quadri: true };

function isRedSuit(suit) { return !!RED_SUITS[suit]; }

// Rango numerico 1 (A) .. 13 (K), usato per confronti di sequenza tra carte.
function valueRank(v) { return VALUES.indexOf(v) + 1; }

function buildDeck() {
    const deck = [];
    for (const s of SUITS) for (const v of VALUES) deck.push({ suit: s, value: v });
    return deck;
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
    }
    return deck;
}

// Crea l'elemento DOM di una carta. faceUp=false mostra il dorso (nessun valore leggibile).
// Le facce usano lo sprite cards-sprite.png (13 colonne per valore, 4 righe per seme,
// vedi cards-common.css) posizionato in percentuale per restare nitido a qualsiasi --card-w/h.
function cardEl(card, faceUp) {
    const el = document.createElement('div');
    if (!faceUp) { el.className = 'card hidden'; return el; }
    el.className = 'card faceup';
    const col = VALUES.indexOf(card.value);
    const row = SUITS.indexOf(card.suit);
    el.style.backgroundPosition = (col / (VALUES.length - 1) * 100) + '% ' + (row / (SUITS.length - 1) * 100) + '%';
    return el;
}

// Due carte si alternano di colore (rosso/nero) — regola comune a tutti i solitari "alternati".
function isAlternateColor(a, b) { return isRedSuit(a.suit) !== isRedSuit(b.suit); }
