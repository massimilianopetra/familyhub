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
function cardEl(card, faceUp) {
    const el = document.createElement('div');
    if (!faceUp) { el.className = 'card hidden'; return el; }
    el.className = 'card ' + (isRedSuit(card.suit) ? 'red' : 'black');
    const sym = SYMS[card.suit];
    const top = document.createElement('span');
    top.className = 'c-top';
    top.innerHTML = card.value + '<br>' + sym;
    const mid = document.createElement('span');
    mid.className = 'c-mid';
    mid.innerHTML = sym;
    const bot = document.createElement('span');
    bot.className = 'c-bot';
    bot.innerHTML = card.value + '<br>' + sym;
    el.appendChild(top); el.appendChild(mid); el.appendChild(bot);
    return el;
}

// Due carte si alternano di colore (rosso/nero) — regola comune a tutti i solitari "alternati".
function isAlternateColor(a, b) { return isRedSuit(a.suit) !== isRedSuit(b.suit); }
