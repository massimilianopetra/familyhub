# FamilyHub

App familiare progressiva (PWA) costruita con **React + Vite** e backend **Supabase**.  
Ottimizzata per cellulare, installabile da Chrome come app standalone.

## Funzionalità

### 📅 Calendario
Visualizza i turni di lavoro di Rosy su un calendario mensile, settimanale o giornaliero.  
I turni mattutini (fine ≤ 14:00) appaiono in verde, quelli pomeridiani/serali in arancio.  
Su mobile i turni vengono mostrati nelle celle del mese con orario su due righe.

### 🎮 Giochi
Raccolta di giochi classici ottimizzati per mobile, con tema dark retro.

| Gioco | Descrizione |
|---|---|
| **Lights Out** | Puzzle 5×5: spegni tutte le luci. Premendo una cella si invertono lei e le adiacenti. Edizione retro con livelli sempre risolvibili. |
| **Campo Minato** | Minesweeper classico su griglia 9×9 con 10 mine. Su mobile si usa la modalità ⛏️ Scava / 🚩 Segnala per distinguere i due tipi di tocco. |
| **Yahtzee Arcade** | Gioco di dadi per uno o più giocatori. Lancia fino a 3 volte per round, tieni i dadi che vuoi e punta alla combinazione migliore nella scheda punteggi. |
| **Tetris** | Classico Tetris arcade. I pezzi scendono, componi righe intere per eliminarle. La velocità aumenta con il punteggio. |
| **Mastermind** | Edizione classica con 6 colori e 10 tentativi. Indovina la sequenza segreta di 4 colori (la ripetizione è ammessa) interpretando i segnali bianchi/neri. |
| **Sudoku** | Griglia 9×9 con tre difficoltà (Facile / Medio / Difficile). Seleziona una casella e usa il tastierino numerico integrato per inserire i numeri. |

## Stack tecnico

- **React 18** con Vite
- **Supabase** — autenticazione e database
- PWA con `manifest.json` — installabile da Chrome su Android/iOS

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
