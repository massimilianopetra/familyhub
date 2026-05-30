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
| **Sudoku** | Griglia 9×9 con tre difficoltà. Tastierino numerico integrato. Popup di conferma prima di iniziare una nuova partita. |
| **Lights Out** | Puzzle 5×5: spegni tutte le luci. Premendo una cella si invertono lei e le adiacenti. |
| **Campo Minato** | Minesweeper classico 9×9 con 10 mine. Su mobile modalità ⛏️ Scava / 🚩 Segnala. |
| **Yahtzee Arcade** | Gioco di dadi per uno o più giocatori, fino a 3 lanci per round. |
| **Tetris** | Classico Tetris arcade con velocità crescente. |
| **Mastermind** | 6 colori, 10 tentativi, segnali bianco/nero. |

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
