# FamilyHub

App familiare progressiva (PWA) costruita con **React + Vite** e backend **Supabase**.  
Ottimizzata per cellulare, installabile da Chrome come app standalone.

---

## Funzionalità

### 📅 Calendario

Calendario completo con tre viste: **Mese**, **Settimana**, **Giorno**.

- **Turni di lavoro di Rosy** — ciclo fisso di 24 settimane calcolato dinamicamente; turni mattutini (fine ≤ 14:00) in verde, pomeridiani/serali in arancio. Toggle per mostrare/nascondere.
- **Eventi personali** — ogni utente può creare eventi salvati su Supabase con: tipologia, titolo, data inizio e fine (anche multi-giorno), orari opzionali e note.
- **Tipologie evento** con colore e icona dedicati:

  | Tipologia | Icona | Colore |
  |---|---|---|
  | Visita medica | 🏥 | Rosso |
  | Ferie | 🏖️ | Giallo |
  | Teatro / Concerto | 🎭 | Viola |
  | Ripetizioni | 📚 | Verde acqua |
  | Altro | 📌 | Blu |

- **Filtro "Solo miei"** — di default mostra solo i propri eventi; disattivandolo si vedono gli eventi di tutti i membri della famiglia.
- **Modifica / Elimina** — ogni evento mostra un ✏️ che apre il modal di modifica; la cancellazione richiede conferma esplicita.
- **Navigazione** — clic su un giorno nella vista Mese o Settimana porta direttamente alla vista Giorno.
- **Conferma nuova partita** — popup personalizzato prima di resettare il Sudoku.

### 🗓️ Prossimi eventi

Lista cronologica degli eventi dei prossimi **3 mesi**, raggruppata per data.

- Badge dinamico per ogni evento: **Oggi**, **Domani**, **tra X giorni**, **In corso**
- Filtro "Solo miei" (default attivo)
- Quando il filtro è disattivato, gli eventi degli altri familiari sono visivamente distinti: bordo tratteggiato, sfondo più scuro, badge **👤 Famiglia**

### 🎮 Giochi

Raccolta di giochi classici ottimizzati per mobile, con tema dark retro.

| Gioco | Descrizione |
|---|---|
| **Mastermind** | 6 colori, 10 tentativi, segnali bianco/nero. |
| **Tetris** | Classico Tetris arcade con velocità crescente. |
| **Lights Out** | Puzzle 5×5: spegni tutte le luci. Premendo una cella si invertono lei e le adiacenti. |
| **Yahtzee Arcade** | Gioco di dadi per uno o più giocatori, fino a 3 lanci per round. |
| **Campo Minato** | Minesweeper classico 9×9 con 10 mine. Su mobile modalità ⛏️ Scava / 🚩 Segnala. |
| **Sudoku** | Griglia 9×9 con tre difficoltà. Tastierino numerico integrato. Popup di conferma prima di iniziare una nuova partita. |
| **Blackjack** | Gioco contro il banco con puntate, raddoppio e statistica crediti. Mazzo singolo da 52 carte persistente tra le mani (rimescolato automaticamente sotto le 15 carte residue). |
| **Mancala** | Antico gioco africano dei semi. Modalità 2 giocatori o vs Computer. Animazione seme per seme, annulla mossa, velocità regolabile. |
| **Othello** | Classico Reversi su griglia 8×8. Modalità 2 giocatori o vs Computer. Animazione flip delle pedine catturate, caselle valide evidenziate. |
| **Backgammon** | Tabellone classico su SVG. Modalità 2 giocatori o vs Computer. Dadi che si scuriscono man mano che vengono giocati, pipcount, log mosse. |
| **Forza 4** | Allinea 4 pedine in griglia 7×6. Modalità 2 giocatori o vs Computer. |

#### 🤖 Intelligenza artificiale nei giochi

**Mancala — AI greedy con look-ahead a 2 livelli**

Il computer valuta ogni mossa disponibile assegnando un punteggio basato su:
- differenza di semi nel proprio magazzino rispetto all'avversario;
- bonus per le mosse che garantiscono un **turno extra** (ultimo seme nel magazzino);
- bonus per le mosse di **cattura** (ultimo seme in buca vuota con buca opposta non vuota);
- per le mosse con turno extra, valutazione ricorsiva della migliore mossa successiva (look-ahead +1).

**Othello — Minimax con Alpha-Beta pruning, profondità 4**

L'algoritmo **minimax** esplora l'albero delle mosse fino a 4 livelli di profondità, simulando sia le mosse del computer (massimizza) sia quelle dell'avversario (minimizza). La potatura **alpha-beta** elimina i rami che non possono migliorare il risultato già trovato, riducendo drasticamente il numero di posizioni valutate senza perdere qualità di gioco.

La funzione di valutazione usa una **matrice di pesi posizionali** 8×8:
- Gli **angoli** (valore 120) sono la posizione più forte: una volta occupati non possono essere ripresi.
- I **bordi** hanno valore medio-alto perché limitano le mosse avversarie.
- Le **celle adiacenti agli angoli** hanno valore negativo (−20/−40): occuparle prima di controllare l'angolo regala spesso l'angolo all'avversario.
- Il centro ha valore basso nelle prime fasi; la valutazione posizionale è dominante rispetto al semplice conteggio delle pedine.

**Backgammon — AI greedy (1 livello)**

Per ogni dado disponibile il computer valuta tutte le mosse possibili assegnando un punteggio:
- **avanzamento**: pip percorsi verso casa;
- **bear-off** immediato: punteggio massimo, sempre prioritario;
- **hit** dell'avversario (pedina singola su un punto): bonus;
- **blot**: penalità se la mossa lascia una propria pedina sola e scoperta;
- **punto chiuso**: bonus se la mossa porta a ≥2 pedine sullo stesso punto.

Sceglie la mossa con punteggio più alto per ciascun dado rimanente, senza look-ahead sui dadi successivi.

**Forza 4 — Minimax con Alpha-Beta pruning, profondità 5**

Stesso schema di Othello: esplorazione **minimax** con potatura **alpha-beta**, qui a profondità 5 mosse. L'ordine di esplorazione delle colonne parte dal centro (`3,2,4,1,5,0,6`) per massimizzare l'efficacia della potatura.

La funzione di valutazione scorre tutte le finestre di 4 celle (orizzontali, verticali, diagonali) e assegna punteggi:
- 4 in fila: vittoria (1000 punti, o ±1.000.000 se rilevata durante la ricerca);
- 3 proprie + 1 vuota: +50;
- 2 proprie + 2 vuote: +10;
- 3 avversarie + 1 vuota: −80 (penalità forte, da bloccare);
- 2 avversarie + 2 vuote: −5;
- bonus per le pedine proprie nella colonna centrale (colonna più versatile).

### ⚙️ Pannello Admin *(solo super user)*

Visibile esclusivamente all'account amministratore. Permette di:

- **Abilitare / disabilitare la registrazione** di nuovi utenti — quando disabilitata, il bottone "Crea account" non compare nella pagina di login.

---

## Autenticazione

- Login con email e password via Supabase Auth
- Reset password via email
- Registrazione nuovi utenti controllata dall'Admin
- Sessione persistente

---

## Database Supabase

| Tabella | Descrizione |
|---|---|
| `calendar_events` | Eventi del calendario con `user_id`, tipologia, date (inizio + fine), orari, colore |
| `app_settings` | Impostazioni globali dell'app (es. `registration_enabled`) |

Row Level Security abilitata: ogni utente può modificare solo i propri eventi; tutti possono leggere.

---

## Stack tecnico

- **React 18** + **Vite**
- **Supabase** — autenticazione, database, RLS
- **PWA** con `manifest.json` — installabile da Chrome su Android/iOS (notifiche push pianificate)

---

## Sviluppo locale

```bash
npm install
npm run dev
```

## Deploy

Il progetto viene pubblicato su GitHub Pages:

```bash
npm run build
npm run deploy
```

La base URL di produzione è `/familyhub/`.
