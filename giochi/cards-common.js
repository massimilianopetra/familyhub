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

// Disposizione dei pip per le carte numeriche 2-10, come nei mazzi veri: righe 1(alto)-5(basso),
// colonne l/c/r. Le righe 4-5 vengono ruotate di 180° in cardEl (metà inferiore della carta).
const PIP_LAYOUT = {
    '2':  [[1,'c'],[5,'c']],
    '3':  [[1,'c'],[3,'c'],[5,'c']],
    '4':  [[1,'l'],[1,'r'],[5,'l'],[5,'r']],
    '5':  [[1,'l'],[1,'r'],[3,'c'],[5,'l'],[5,'r']],
    '6':  [[1,'l'],[1,'r'],[3,'l'],[3,'r'],[5,'l'],[5,'r']],
    '7':  [[1,'l'],[1,'r'],[2,'c'],[3,'l'],[3,'r'],[5,'l'],[5,'r']],
    '8':  [[1,'l'],[1,'r'],[2,'c'],[3,'l'],[3,'r'],[4,'c'],[5,'l'],[5,'r']],
    '9':  [[1,'l'],[1,'r'],[2,'l'],[2,'r'],[3,'c'],[4,'l'],[4,'r'],[5,'l'],[5,'r']],
    '10': [[1,'l'],[1,'r'],[2,'l'],[2,'c'],[2,'r'],[4,'l'],[4,'c'],[4,'r'],[5,'l'],[5,'r']],
};
const PIP_COL_INDEX = { l: 1, c: 2, r: 3 };

// Crea l'elemento DOM di una carta. faceUp=false mostra il dorso (nessun valore leggibile).
function cardEl(card, faceUp) {
    const el = document.createElement('div');
    if (!faceUp) { el.className = 'card hidden'; return el; }
    el.className = 'card ' + (isRedSuit(card.suit) ? 'red' : 'black');
    const sym = SYMS[card.suit];
    const top = document.createElement('span');
    top.className = 'c-top';
    top.innerHTML = card.value + '<br>' + sym;
    const bot = document.createElement('span');
    bot.className = 'c-bot';
    bot.innerHTML = card.value + '<br>' + sym;
    el.appendChild(top);

    const layout = PIP_LAYOUT[card.value];
    if (layout) {
        // Numeri 2-10: disposizione realistica dei pip, come in un mazzo vero.
        const grid = document.createElement('div');
        grid.className = 'pip-grid';
        for (const [row, col] of layout) {
            const pip = document.createElement('span');
            pip.className = 'pip' + (row >= 4 ? ' rot' : '');
            pip.style.gridRow = row;
            pip.style.gridColumn = PIP_COL_INDEX[col];
            pip.textContent = sym;
            grid.appendChild(pip);
        }
        el.appendChild(grid);
    } else {
        // A, J, Q, K restano stilizzati con un simbolo centrale grande.
        const mid = document.createElement('span');
        mid.className = 'c-mid';
        mid.innerHTML = sym;
        el.appendChild(mid);
    }

    el.appendChild(bot);
    return el;
}

// Due carte si alternano di colore (rosso/nero) — regola comune a tutti i solitari "alternati".
function isAlternateColor(a, b) { return isRedSuit(a.suit) !== isRedSuit(b.suit); }
