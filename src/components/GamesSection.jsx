import { useState, useEffect, useRef } from 'react'

// ==========================================
// 🔴 MASTERMIND
// ==========================================
function MastermindGame({ onBack }) {
  const MAX_ATTEMPTS = 10
  const CODE_LENGTH = 4
  const COLOR_PALETTE = ['#e74c3c', '#2ecc71', '#3498db', '#f1c40f', '#e67e22', '#9b59b6']

  const [secretCode, setSecretCode] = useState([])
  const [currentGuess, setCurrentGuess] = useState([null, null, null, null])
  const [attemptsHistory, setAttemptsHistory] = useState([])
  const [gameOver, setGameOver] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [isWin, setIsWin] = useState(false)

  useEffect(() => { initGame() }, [])

  const initGame = () => {
    const code = Array.from({ length: CODE_LENGTH }, () => Math.floor(Math.random() * 6))
    setSecretCode(code)
    setCurrentGuess([null, null, null, null])
    setAttemptsHistory([])
    setGameOver(false)
    setStatusMsg('')
    setIsWin(false)
  }

  const selectColor = (colorIndex) => {
    if (gameOver) return
    const freeIndex = currentGuess.indexOf(null)
    if (freeIndex !== -1) {
      const next = [...currentGuess]
      next[freeIndex] = colorIndex
      setCurrentGuess(next)
    }
  }

  const clearSlot = (index) => {
    if (gameOver) return
    const next = [...currentGuess]
    next[index] = null
    setCurrentGuess(next)
  }

  const submitGuess = () => {
    if (gameOver || currentGuess.includes(null)) return
    let blacks = 0, whites = 0
    const secretMatch = [false, false, false, false]
    const guessMatch = [false, false, false, false]
    for (let i = 0; i < CODE_LENGTH; i++) {
      if (currentGuess[i] === secretCode[i]) { blacks++; secretMatch[i] = true; guessMatch[i] = true }
    }
    for (let i = 0; i < CODE_LENGTH; i++) {
      if (guessMatch[i]) continue
      for (let j = 0; j < CODE_LENGTH; j++) {
        if (!secretMatch[j] && currentGuess[i] === secretCode[j]) { whites++; secretMatch[j] = true; break }
      }
    }
    const newHistory = [...attemptsHistory, { guess: currentGuess, blacks, whites }]
    setAttemptsHistory(newHistory)
    setCurrentGuess([null, null, null, null])
    if (blacks === CODE_LENGTH) {
      setGameOver(true); setIsWin(true); setStatusMsg('🏆 Vittoria! Hai decifrato il codice!')
    } else if (newHistory.length >= MAX_ATTEMPTS) {
      setGameOver(true); setIsWin(false); setStatusMsg('Game Over! Hai esaurito i 10 tentativi.')
    }
  }

  return (
    <div style={mS.wrapper}>
      <div style={gS.gameBar}>
        <button style={gS.backBtn} onClick={onBack}>◀ Giochi</button>
        <span style={{ fontWeight: 'bold' }}>🔴 Mastermind Classico</span>
        <button style={gS.actionBtn} onClick={initGame}>Nuovo</button>
      </div>
      <div style={mS.attemptsBar}>
        <span style={mS.attemptsLabel}>TENTATIVI</span>
        <div style={mS.attemptsPips}>
          {Array(MAX_ATTEMPTS).fill().map((_, i) => (
            <div key={i} style={{ ...mS.pip, backgroundColor: i < attemptsHistory.length ? (i < 4 ? '#50fa7b' : i < 7 ? '#f1c40f' : '#ff5555') : '#1e293b' }} />
          ))}
        </div>
        <span style={{ ...mS.attemptsCount, color: attemptsHistory.length >= 8 ? '#ff5555' : attemptsHistory.length >= 5 ? '#f1c40f' : '#50fa7b' }}>
          {attemptsHistory.length}/{MAX_ATTEMPTS}
        </span>
      </div>
      <div style={mS.container}>
        <div style={mS.secretRow}>
          {secretCode.map((colorIdx, i) => (
            <div key={i} style={{ ...mS.peg, backgroundColor: gameOver ? COLOR_PALETTE[colorIdx] : '#44475a' }}>{gameOver ? '' : '?'}</div>
          ))}
        </div>
        <div style={mS.board}>
          {attemptsHistory.map((att, i) => (
            <div key={i} style={mS.row}>
              <div style={mS.slots}>
                {att.guess.map((cIdx, j) => <div key={j} style={{ ...mS.peg, backgroundColor: COLOR_PALETTE[cIdx] }} />)}
              </div>
              <div style={mS.hints}>
                {Array(4).fill().map((_, j) => {
                  const color = j < att.blacks ? '#000' : j < att.blacks + att.whites ? '#fff' : '#6b7280'
                  return <div key={j} style={{ ...mS.hintDot, backgroundColor: color }} />
                })}
              </div>
            </div>
          ))}
        </div>
        <div style={mS.controls}>
          <div style={{ ...mS.row, border: '1px solid #50fa7b', background: '#282a36', padding: '8px' }}>
            <div style={mS.slots}>
              {currentGuess.map((cIdx, i) => (
                <div key={i} style={{ ...mS.peg, backgroundColor: cIdx !== null ? COLOR_PALETTE[cIdx] : '#111217' }} onClick={() => clearSlot(i)} />
              ))}
            </div>
            <button style={mS.submitBtn} disabled={currentGuess.includes(null) || gameOver} onClick={submitGuess}>Verifica</button>
          </div>
          <div style={mS.picker}>
            {COLOR_PALETTE.map((hex, i) => (
              <div key={i} style={{ ...mS.pickerPeg, backgroundColor: hex }} onClick={() => selectColor(i)} />
            ))}
          </div>
        </div>
        {statusMsg && <div style={{ ...mS.status, color: isWin ? '#50fa7b' : '#ff5555' }}>{statusMsg}</div>}
      </div>
    </div>
  )
}

// ==========================================
// 🧱 TETRIS
// ==========================================
function TetrisGame({ onBack }) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const nextCanvasRef = useRef(null)
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [isRunning, setIsRunning] = useState(false)

  const stateRef = useRef({
    arena: Array(20).fill(null).map(() => Array(10).fill(0)),
    player: { pos: { x: 0, y: 0 }, matrix: null, nextMatrix: null },
    dropCounter: 0, dropInterval: 1000, lastTime: 0, gameOver: false, blockSize: 24, score: 0
  })

  const COLORS = [null, '#00f0f0', '#f0a000', '#0000f0', '#f0f000', '#00f0f0', '#a000f0', '#f00000']
  const SHAPES = [
    [],
    [[1, 1, 1, 1]],
    [[2, 0, 0], [2, 2, 2]],
    [[0, 0, 3], [3, 3, 3]],
    [[4, 4], [4, 4]],
    [[0, 5, 5], [5, 5, 0]],
    [[0, 6, 0], [6, 6, 6]],
    [[7, 7, 0], [0, 7, 7]]
  ]

  const collide = (arena, player) => {
    const [m, o] = [player.matrix, player.pos]
    for (let y = 0; y < m.length; ++y)
      for (let x = 0; x < m[y].length; ++x)
        if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) return true
    return false
  }

  const merge = (arena, player) => {
    player.matrix.forEach((row, y) => row.forEach((value, x) => {
      if (value !== 0) arena[y + player.pos.y][x + player.pos.x] = value
    }))
  }

  const randomShape = () => SHAPES[Math.floor(Math.random() * 7) + 1].map(row => [...row])

  const drawMatrix = (matrix, offset, ctx, size) => {
    matrix.forEach((row, y) => row.forEach((value, x) => {
      if (value !== 0) {
        ctx.fillStyle = COLORS[value]
        ctx.fillRect((x + offset.x) * size, (y + offset.y) * size, size, size)
        ctx.strokeStyle = '#000'
        ctx.lineWidth = size * 0.05
        ctx.strokeRect((x + offset.x) * size, (y + offset.y) * size, size, size)
      }
    }))
  }

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const size = stateRef.current.blockSize
    ctx.fillStyle = '#05050a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    drawMatrix(stateRef.current.arena, { x: 0, y: 0 }, ctx, size)
    if (stateRef.current.player.matrix) drawMatrix(stateRef.current.player.matrix, stateRef.current.player.pos, ctx, size)
  }

  const drawNext = () => {
    const canvas = nextCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#05050a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const boxSize = canvas.width / 4
    if (stateRef.current.player.nextMatrix) drawMatrix(stateRef.current.player.nextMatrix, { x: 0.5, y: 0.5 }, ctx, boxSize)
  }

  const playerReset = () => {
    const state = stateRef.current
    if (!state.player.nextMatrix) state.player.nextMatrix = randomShape()
    state.player.matrix = state.player.nextMatrix
    state.player.nextMatrix = randomShape()
    state.player.pos.y = 0
    state.player.pos.x = Math.floor(state.arena[0].length / 2) - Math.floor(state.player.matrix[0].length / 2)
    drawNext()
    if (collide(state.arena, state.player)) {
      setIsRunning(false)
      alert(`Game Over! Punteggio Finale: ${state.score}`)
      state.arena.forEach(row => row.fill(0))
      state.score = 0; setScore(0); setLevel(1); state.dropInterval = 1000
    }
  }

  const arenaSweep = () => {
    const state = stateRef.current
    let rowCount = 1
    outer: for (let y = state.arena.length - 1; y > 0; --y) {
      for (let x = 0; x < state.arena[y].length; ++x) if (state.arena[y][x] === 0) continue outer
      state.arena.splice(y, 1)
      state.arena.unshift(Array(10).fill(0))
      ++y
      state.score += rowCount * 10; setScore(state.score)
      const newLevel = Math.floor(state.score / 100) + 1; setLevel(newLevel)
      state.dropInterval = Math.max(100, 1000 - (newLevel - 1) * 100)
      rowCount *= 2
    }
  }

  const playerDrop = () => {
    const state = stateRef.current
    state.player.pos.y++
    if (collide(state.arena, state.player)) { state.player.pos.y--; merge(state.arena, state.player); playerReset(); arenaSweep() }
    state.dropCounter = 0; draw()
  }

  const playerMove = (dir) => {
    const state = stateRef.current
    state.player.pos.x += dir
    if (collide(state.arena, state.player)) state.player.pos.x -= dir
    draw()
  }

  const rotateMatrix = (matrix) => {
    const rows = matrix.length, cols = matrix[0].length
    return Array.from({ length: cols }, (_, x) => Array.from({ length: rows }, (_, y) => matrix[rows - 1 - y][x]))
  }

  const playerRotate = () => {
    const state = stateRef.current
    const orig = state.player.matrix, origX = state.player.pos.x
    const rotated = rotateMatrix(orig)
    state.player.matrix = rotated
    let offset = 1
    while (collide(state.arena, state.player)) {
      state.player.pos.x += offset
      offset = -(offset + (offset > 0 ? 1 : -1))
      if (Math.abs(offset) > rotated[0].length) { state.player.matrix = orig; state.player.pos.x = origX; return }
    }
    draw()
  }

  const dropInstant = () => {
    const state = stateRef.current
    while (!collide(state.arena, state.player)) state.player.pos.y++
    state.player.pos.y--; merge(state.arena, state.player); playerReset(); arenaSweep(); draw()
  }

  const resizeGame = () => {
    const canvas = canvasRef.current, container = containerRef.current
    if (!canvas || !container) return
    const availableHeight = window.innerHeight - 240
    const availableWidth = container.clientWidth - 130
    let size = Math.floor(availableHeight / 20)
    if (size * 10 > availableWidth) size = Math.floor(availableWidth / 10)
    size = Math.max(16, size)
    stateRef.current.blockSize = size
    canvas.width = size * 10; canvas.height = size * 20
    draw(); drawNext()
  }

  useEffect(() => {
    playerReset(); resizeGame()
    window.addEventListener('resize', resizeGame)
    const handleKeyDown = (e) => {
      if (!isRunning) return
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(e.key)) e.preventDefault()
      if (e.key === 'ArrowLeft' || e.key === 'a') playerMove(-1)
      if (e.key === 'ArrowRight' || e.key === 'd') playerMove(1)
      if (e.key === 'ArrowDown' || e.key === 's') playerDrop()
      if (e.key === 'ArrowUp' || e.key === 'w') playerRotate()
      if (e.key === ' ') dropInstant()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => { window.removeEventListener('resize', resizeGame); window.removeEventListener('keydown', handleKeyDown) }
  }, [isRunning])

  useEffect(() => {
    let animId
    const loop = (time = 0) => {
      const state = stateRef.current
      if (isRunning) {
        const delta = time - state.lastTime; state.lastTime = time
        state.dropCounter += delta
        if (state.dropCounter > state.dropInterval) playerDrop()
        draw()
      }
      animId = requestAnimationFrame(loop)
    }
    if (isRunning) { stateRef.current.lastTime = performance.now(); animId = requestAnimationFrame(loop) }
    return () => cancelAnimationFrame(animId)
  }, [isRunning])

  return (
    <div style={tS.wrapper}>
      <div style={gS.gameBar}>
        <button style={gS.backBtn} onClick={onBack}>◀ Giochi</button>
        <span style={{ fontWeight: 'bold' }}>🧱 Tetris Arcade</span>
        <button style={gS.actionBtn} onClick={() => setIsRunning(!isRunning)}>{isRunning ? 'Pausa' : 'Gioca'}</button>
      </div>
      <div ref={containerRef} style={tS.container}>
        <canvas ref={canvasRef} style={tS.board} />
        <div style={tS.sidebar}>
          <div style={tS.box}><h5 style={tS.boxLabel}>Punti</h5><div style={tS.value}>{score}</div></div>
          <div style={tS.box}><h5 style={tS.boxLabel}>Livello</h5><div style={tS.value}>{level}</div></div>
          <div style={tS.box}><h5 style={tS.boxLabel}>Next</h5><canvas ref={nextCanvasRef} width="70" height="70" style={{ background: '#05050a', borderRadius: '4px' }} /></div>
        </div>
      </div>
      <div style={tS.touchPanel}>
        <button style={tS.touchBtn} onClick={() => playerMove(-1)}>◀</button>
        <button style={tS.touchBtn} onClick={playerRotate}>↻</button>
        <button style={tS.touchBtn} onClick={() => playerMove(1)}>▶</button>
        <button style={{ ...tS.touchBtn, gridColumn: 'span 2' }} onClick={dropInstant}>Spazio (Giù)</button>
        <button style={tS.touchBtn} onClick={playerDrop}>▼</button>
      </div>
    </div>
  )
}

// ==========================================
// 🖼️ IFRAME GAME
// ==========================================
function IframeGame({ onBack, src, title, icon }) {
  return (
    <div style={iS.wrapper}>
      <div style={gS.gameBar}>
        <button style={gS.backBtn} onClick={onBack}>◀ Giochi</button>
        <span style={{ fontWeight: 'bold' }}>{icon} {title}</span>
        <div style={{ width: '60px' }} />
      </div>
      <iframe src={src} title={title} style={iS.frame} />
    </div>
  )
}

// ==========================================
// 🎮 GAMES SECTION (HOME + GIOCO ATTIVO)
// ==========================================
const GAMES = [
  { id: 'mastermind',  icon: '🔴', title: 'Mastermind',    desc: 'Indovina il codice segreto di 4 colori.',              color: '#e74c3c' },
  { id: 'tetris',      icon: '🧱', title: 'Tetris Arcade', desc: 'Incastra i mattoncini e distruggi le linee.',          color: '#3498db' },
  { id: 'lightsout',   icon: '💡', title: 'Lights Out',    desc: 'Spegni tutte le luci: ogni click cambia 5 celle.',     color: '#f1c40f' },
  { id: 'yahtzee',     icon: '🎲', title: 'Yahtzee',       desc: 'Lancia 5 dadi per le migliori combinazioni!',          color: '#9b59b6' },
  { id: 'minesweeper', icon: '💣', title: 'Minesweeper',   desc: 'Scopri le celle senza far esplodere le mine.',         color: '#6b7280' },
  { id: 'sudoku',      icon: '🔢', title: 'Sudoku',        desc: 'Riempi la griglia 9×9 senza ripetizioni.',             color: '#0ea5e9' },
  { id: 'blackjack',   icon: '🃏', title: 'Blackjack',     desc: 'Punta al 21 senza sforare: batti il banco!',           color: '#16a34a' },
  { id: 'mancala',     icon: '🪨', title: 'Mancala',       desc: 'Antico gioco di strategia: svuota il lato avversario.',color: '#b45309' },
  { id: 'othello',     icon: '⚫', title: 'Othello',       desc: 'Conquista la scacchiera capovolgendo le pedine.',      color: '#7c3aed' },
  { id: 'backgammon',  icon: '🎯', title: 'Backgammon',    desc: 'Sposta le pedine e porta tutte a casa per primo.',     color: '#0d9488' },
]

export default function GamesSection() {
  const [active, setActive] = useState(null)

  if (active === 'mastermind') return <MastermindGame onBack={() => setActive(null)} />
  if (active === 'tetris')     return <TetrisGame     onBack={() => setActive(null)} />
  if (active === 'lightsout')  return <IframeGame onBack={() => setActive(null)} src={`${import.meta.env.BASE_URL}giochi/lightsout.html`}   title="Lights Out"   icon="💡" />
  if (active === 'yahtzee')    return <IframeGame onBack={() => setActive(null)} src={`${import.meta.env.BASE_URL}giochi/yatzee.html`}       title="Yahtzee"      icon="🎲" />
  if (active === 'minesweeper')return <IframeGame onBack={() => setActive(null)} src={`${import.meta.env.BASE_URL}giochi/mInesweeper.html`} title="Minesweeper"  icon="💣" />
  if (active === 'sudoku')     return <IframeGame onBack={() => setActive(null)} src={`${import.meta.env.BASE_URL}giochi/sodku.html`}        title="Sudoku"       icon="🔢" />
  if (active === 'blackjack')  return <IframeGame onBack={() => setActive(null)} src={`${import.meta.env.BASE_URL}giochi/blackjack.html`}    title="Blackjack"    icon="🃏" />
  if (active === 'mancala')    return <IframeGame onBack={() => setActive(null)} src={`${import.meta.env.BASE_URL}giochi/mancala.html`}      title="Mancala"      icon="🪨" />
  if (active === 'othello')    return <IframeGame onBack={() => setActive(null)} src={`${import.meta.env.BASE_URL}giochi/othello.html`}      title="Othello"      icon="⚫" />
  if (active === 'backgammon') return <IframeGame onBack={() => setActive(null)} src={`${import.meta.env.BASE_URL}giochi/backgammon.html`}   title="Backgammon"   icon="🎯" />

  return (
    <div style={homeS.wrapper}>
      <h2 style={homeS.title}>🎮 Retro Arcade</h2>
      <p style={homeS.subtitle}>Scegli un gioco e inizia a giocare</p>
      <div style={homeS.grid}>
        {GAMES.map((g) => (
          <div key={g.id} style={homeS.card}>
            <div style={homeS.cardIcon}>{g.icon}</div>
            <h3 style={homeS.cardTitle}>{g.title}</h3>
            <p style={homeS.cardDesc}>{g.desc}</p>
            <button style={{ ...homeS.cardBtn, backgroundColor: g.color }} onClick={() => setActive(g.id)}>
              Gioca Ora
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ==========================================
// STILI
// ==========================================
const gS = {
  gameBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', padding: '10px 15px', borderRadius: '10px', border: '1px solid #334155', marginBottom: '12px' },
  backBtn: { backgroundColor: '#475569', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  actionBtn: { backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
}

const homeS = {
  wrapper: { width: '100%' },
  title: { margin: '0 0 6px 0', fontSize: '1.6rem', color: '#38bdf8', fontWeight: 'bold' },
  subtitle: { margin: '0 0 24px 0', color: '#94a3b8', fontSize: '0.9rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' },
  card: { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 6px 20px rgba(0,0,0,0.3)' },
  cardIcon: { fontSize: '2.4rem', marginBottom: '10px' },
  cardTitle: { margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 'bold', color: '#f1f5f9' },
  cardDesc: { color: '#94a3b8', fontSize: '0.78rem', marginBottom: '16px', lineHeight: '1.5', flexGrow: 1 },
  cardBtn: { color: '#0f172a', border: 'none', padding: '9px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', width: '100%' },
}

const iS = {
  wrapper: { display: 'flex', flexDirection: 'column', width: '100%', height: 'calc(100vh - 140px)' },
  frame: { flex: 1, border: 'none', borderRadius: '12px', width: '100%' },
}

const tS = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '500px', margin: '0 auto', boxSizing: 'border-box' },
  container: { display: 'flex', gap: '15px', backgroundColor: '#161d31', padding: '15px', borderRadius: '14px', border: '1px solid #334155', justifyContent: 'center', width: '100%', boxSizing: 'border-box' },
  board: { border: '2px solid #4e4e6a', backgroundColor: '#05050a', borderRadius: '6px', display: 'block' },
  sidebar: { display: 'flex', flexDirection: 'column', gap: '12px', width: '100px' },
  box: { backgroundColor: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', padding: '8px 4px', borderRadius: '8px', textAlign: 'center' },
  boxLabel: { margin: '0 0 4px 0', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' },
  value: { fontSize: '1.1rem', fontWeight: 'bold', color: '#fff' },
  touchPanel: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', width: '100%' },
  touchBtn: { backgroundColor: '#2e374d', border: '1px solid #47536e', color: '#fff', padding: '12px', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' },
}

const mS = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '420px', margin: '0 auto', boxSizing: 'border-box' },
  container: { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' },
  secretRow: { display: 'flex', justifyContent: 'center', gap: '12px', paddingBottom: '15px', borderBottom: '2px dashed #334155' },
  board: { display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111217', padding: '6px 12px', borderRadius: '8px' },
  slots: { display: 'flex', gap: '10px' },
  peg: { width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff', cursor: 'pointer' },
  hints: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', background: '#6b7280', padding: '4px', borderRadius: '4px' },
  hintDot: { width: '8px', height: '8px', borderRadius: '50%', border: '1px solid #9ca3af' },
  controls: { display: 'flex', flexDirection: 'column', gap: '10px', background: '#0f172a', padding: '10px', borderRadius: '10px' },
  picker: { display: 'flex', justifyContent: 'space-between', padding: '5px 0' },
  pickerPeg: { width: '34px', height: '34px', borderRadius: '50%', border: '1px solid #000', cursor: 'pointer' },
  submitBtn: { backgroundColor: '#50fa7b', color: '#0f172a', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  status: { textAlign: 'center', fontWeight: 'bold', fontSize: '1rem' },
  attemptsBar: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#1e293b', padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155' },
  attemptsLabel: { fontSize: '0.65rem', color: '#64748b', fontWeight: 'bold', letterSpacing: '1px', whiteSpace: 'nowrap' },
  attemptsPips: { display: 'flex', gap: '4px', flex: 1 },
  pip: { flex: 1, height: '8px', borderRadius: '3px', border: '1px solid #334155', transition: 'background-color 0.3s' },
  attemptsCount: { fontSize: '0.85rem', fontWeight: 'bold', minWidth: '30px', textAlign: 'right' },
}
