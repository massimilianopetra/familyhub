import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import Barcode from 'react-barcode'
import QRCode from 'react-qr-code'

const FORMATS = [
  { id: 'CODE128',  label: 'Code 128 (generico)' },
  { id: 'EAN13',    label: 'EAN-13 (13 cifre)' },
  { id: 'EAN8',     label: 'EAN-8 (8 cifre)' },
  { id: 'QR_CODE',  label: 'QR Code' },
]

const ACCENT_COLORS = ['#38bdf8','#4ade80','#f59e0b','#ff0000','#a78bfa','#fb923c','#34d399','#1e3a8a','#64748b']

// ── Validazione barcode ──────────────────────────────────────────
function validateBarcode(value, format) {
  if (!value?.trim()) return false
  if (format === 'EAN13') {
    if (!/^\d{13}$/.test(value)) return false
    const d = value.split('').map(Number)
    const sum = d.slice(0, 12).reduce((a, v, i) => a + v * (i % 2 === 0 ? 1 : 3), 0)
    return (10 - sum % 10) % 10 === d[12]
  }
  if (format === 'EAN8') {
    if (!/^\d{8}$/.test(value)) return false
    const d = value.split('').map(Number)
    const sum = d.slice(0, 7).reduce((a, v, i) => a + v * (i % 2 === 0 ? 3 : 1), 0)
    return (10 - sum % 10) % 10 === d[7]
  }
  return value.trim().length > 0
}

function validationError(value, format) {
  if (!value?.trim()) return 'Il codice è obbligatorio'
  if (format === 'EAN13') {
    if (!/^\d{13}$/.test(value)) return 'EAN-13 richiede esattamente 13 cifre'
    if (!validateBarcode(value, format)) return 'Cifra di controllo non valida – ricontrolla il codice'
  }
  if (format === 'EAN8') {
    if (!/^\d{8}$/.test(value)) return 'EAN-8 richiede esattamente 8 cifre'
    if (!validateBarcode(value, format)) return 'Cifra di controllo non valida – ricontrolla il codice'
  }
  return null
}

// ── Rendering barcode / QR sicuro ────────────────────────────────
function BarcodeDisplay({ value, format, large = false }) {
  if (!validateBarcode(value, format)) {
    return (
      <div style={{ padding: '12px', color: '#ef4444', fontSize: '0.75rem', textAlign: 'center' }}>
        Codice non valido
      </div>
    )
  }
  if (format === 'QR_CODE') {
    const size = large ? 180 : 110
    return <QRCode value={value} size={size} bgColor="#ffffff" fgColor="#111217" />
  }
  return (
    <Barcode
      value={value}
      format={format}
      width={large ? 2.5 : 1.5}
      height={large ? 90 : 55}
      displayValue={false}
      background="#ffffff"
      lineColor="#111217"
      margin={4}
    />
  )
}

// ── Toggle ───────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', userSelect:'none' }}>
      <span style={{ fontSize:'0.85rem', color:'#94a3b8', fontWeight:'500' }}>{label}</span>
      <div onClick={() => onChange(!checked)}
        style={{ width:'44px', height:'24px', borderRadius:'12px', position:'relative', transition:'background-color .2s', cursor:'pointer', flexShrink:0, backgroundColor: checked ? '#4ade80' : '#334155' }}>
        <div style={{ position:'absolute', top:'2px', width:'20px', height:'20px', borderRadius:'50%', backgroundColor:'#fff', transition:'transform .2s', boxShadow:'0 1px 4px rgba(0,0,0,.4)', transform: checked ? 'translateX(20px)' : 'translateX(2px)' }} />
      </div>
    </label>
  )
}

// Mapping formato BarcodeDetector → formato app
const SCAN_FORMAT_MAP = {
  ean_13: 'EAN13', ean_8: 'EAN8',
  upc_a: 'EAN13', upc_e: 'EAN8',
  code_128: 'CODE128', code_39: 'CODE128', itf: 'CODE128',
  qr_code: 'QR_CODE',
}
const SCAN_FORMATS = ['ean_13', 'ean_8', 'code_128', 'code_39', 'itf', 'upc_a', 'upc_e', 'qr_code']
const DETECTOR_SUPPORTED = 'BarcodeDetector' in window

// ── Modal aggiungi / modifica ────────────────────────────────────
function CardModal({ card, onClose, onSaved, onDeleted }) {
  const isEdit = !!card
  const [storeName,     setStoreName]     = useState(card?.store_name     ?? '')
  const [barcodeVal,    setBarcodeVal]    = useState(card?.barcode_value   ?? '')
  const [barcodeFormat, setBarcodeFormat] = useState(card?.barcode_format  ?? 'CODE128')
  const [color,         setColor]         = useState(card?.color           ?? ACCENT_COLORS[0])
  const [saving,        setSaving]        = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [confirmDel,    setConfirmDel]    = useState(false)
  const [error,         setError]         = useState('')
  const [scanning,      setScanning]      = useState(false)

  const videoRef = useRef(null)

  // Avvia/ferma fotocamera al cambio di `scanning`
  useEffect(() => {
    if (!scanning) return
    let raf
    let stream

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()

        const detector = new BarcodeDetector({ formats: SCAN_FORMATS })

        async function scan() {
          if (!videoRef.current) return
          try {
            const results = await detector.detect(videoRef.current)
            if (results.length > 0) {
              const r = results[0]
              setBarcodeVal(r.rawValue)
              setBarcodeFormat(SCAN_FORMAT_MAP[r.format] ?? 'CODE128')
              setError('')
              setScanning(false)
              return
            }
          } catch { /* frame non pronto */ }
          raf = requestAnimationFrame(scan)
        }
        raf = requestAnimationFrame(scan)
      } catch (err) {
        setError('Fotocamera non disponibile: ' + err.message)
        setScanning(false)
      }
    }

    start()
    return () => {
      if (raf) cancelAnimationFrame(raf)
      if (stream) stream.getTracks().forEach(t => t.stop())
    }
  }, [scanning])

  const previewOk = validateBarcode(barcodeVal, barcodeFormat)

  async function handleSave() {
    if (!storeName.trim()) { setError('Il nome è obbligatorio'); return }
    const bcErr = validationError(barcodeVal, barcodeFormat)
    if (bcErr) { setError(bcErr); return }

    setSaving(true)

    const payload = {
      store_name:     storeName.trim(),
      barcode_value:  barcodeVal.trim(),
      barcode_format: barcodeFormat,
      color,
    }

    let err
    if (isEdit) {
      ;({ error: err } = await supabase.from('loyalty_cards').update(payload).eq('id', card.id))
    } else {
      ;({ error: err } = await supabase.from('loyalty_cards').insert(payload))
    }
    setSaving(false)
    if (err) { setError('Errore: ' + err.message); return }
    onSaved()
    onClose()
  }

  async function handleDelete() {
    setDeleting(true)
    const { error: err } = await supabase.from('loyalty_cards').delete().eq('id', card.id)
    setDeleting(false)
    if (err) { setError('Errore: ' + err.message); return }
    onDeleted(card.id)
    onClose()
  }

  const inp = {
    background:'#0f172a', border:'1px solid #334155', borderRadius:'8px',
    padding:'10px 12px', color:'#f1f5f9', fontSize:'0.88rem', outline:'none',
    width:'100%', boxSizing:'border-box', fontFamily:'inherit',
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.72)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(5px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'16px', padding:'24px 20px', width:'90%', maxWidth:'340px', display:'flex', flexDirection:'column', gap:'14px', boxShadow:'0 24px 60px rgba(0,0,0,0.85)', maxHeight:'90vh', overflowY:'auto' }}>

        <div style={{ fontSize:'1.05rem', fontWeight:'700', color:'#f1f5f9' }}>
          {isEdit ? '✏️ Modifica tessera' : '+ Nuova tessera'}
        </div>

        <input autoFocus value={storeName} onChange={e => setStoreName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="Nome negozio / società *" style={inp} />

        {/* ── Sezione barcode: fotocamera o inserimento manuale ── */}
        {scanning ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            <div style={{ position:'relative', borderRadius:'10px', overflow:'hidden', background:'#000', aspectRatio:'4/3' }}>
              <video ref={videoRef} playsInline muted
                style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
              {/* mirino */}
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                <div style={{ width:'75%', height:'35%', border:'2px solid #38bdf8', borderRadius:'8px', boxShadow:'0 0 0 9999px rgba(0,0,0,0.45)' }} />
              </div>
              {/* pulsante chiudi */}
              <button onClick={() => setScanning(false)}
                style={{ position:'absolute', top:'8px', right:'8px', background:'rgba(0,0,0,0.65)', border:'none', borderRadius:'50%', color:'#fff', width:'32px', height:'32px', cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>
                ✕
              </button>
            </div>
            <div style={{ textAlign:'center', fontSize:'0.78rem', color:'#64748b' }}>
              Inquadra il codice a barre della tessera
            </div>
          </div>
        ) : (
          <>
            <div>
              <div style={{ fontSize:'0.72rem', color:'#64748b', marginBottom:'6px' }}>Formato barcode</div>
              <select value={barcodeFormat} onChange={e => { setBarcodeFormat(e.target.value); setError('') }}
                style={{ ...inp, cursor:'pointer' }}>
                {FORMATS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>

            <div>
              <div style={{ fontSize:'0.72rem', color:'#64748b', marginBottom:'4px' }}>
                Codice{barcodeFormat === 'EAN13' ? ' (13 cifre)' : barcodeFormat === 'EAN8' ? ' (8 cifre)' : ''}
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <input value={barcodeVal} onChange={e => { setBarcodeVal(e.target.value); setError('') }}
                  placeholder="Codice a barre *"
                  style={{ ...inp, fontFamily:'monospace', letterSpacing:'1px', flex:1 }} />
                {DETECTOR_SUPPORTED && (
                  <button onClick={() => { setError(''); setScanning(true) }}
                    title="Scansiona con fotocamera"
                    style={{ background:'#0f172a', border:'1px solid #334155', borderRadius:'8px', color:'#38bdf8', padding:'0 12px', cursor:'pointer', fontSize:'1.2rem', flexShrink:0, lineHeight:1 }}>
                    📷
                  </button>
                )}
              </div>
            </div>

            {/* Anteprima barcode */}
            {previewOk && (
              <div style={{ background:'#fff', borderRadius:'8px', padding:'8px', display:'flex', justifyContent:'center' }}>
                <BarcodeDisplay value={barcodeVal} format={barcodeFormat} />
              </div>
            )}
          </>
        )}

        <div>
          <div style={{ fontSize:'0.72rem', color:'#64748b', marginBottom:'8px' }}>Colore accento</div>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            {ACCENT_COLORS.map(c => (
              <div key={c} onClick={() => setColor(c)}
                style={{ width:'28px', height:'28px', borderRadius:'50%', backgroundColor:c, cursor:'pointer',
                  border: color === c ? '3px solid #fff' : '3px solid transparent',
                  boxSizing:'border-box', transition:'border-color .15s' }} />
            ))}
          </div>
        </div>

        {error && <div style={{ fontSize:'0.8rem', color:'#ef4444' }}>{error}</div>}

        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={onClose}
            style={{ flex:1, padding:'10px', background:'#334155', border:'none', borderRadius:'8px', color:'#94a3b8', fontWeight:'600', cursor:'pointer', fontSize:'0.9rem' }}>
            Annulla
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex:1, padding:'10px', background:'#1d4ed8', border:'none', borderRadius:'8px', color:'#fff', fontWeight:'600', cursor:'pointer', fontSize:'0.9rem', opacity:saving?0.7:1 }}>
            {saving ? 'Salvo…' : 'Salva'}
          </button>
        </div>

        {isEdit && (
          <div style={{ borderTop:'1px solid #334155', paddingTop:'12px' }}>
            {!confirmDel ? (
              <button onClick={() => setConfirmDel(true)}
                style={{ width:'100%', padding:'8px', background:'none', border:'1px solid #7f1d1d', borderRadius:'8px', color:'#f87171', fontWeight:'600', cursor:'pointer', fontSize:'0.85rem' }}>
                🗑 Elimina tessera
              </button>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                <div style={{ fontSize:'0.8rem', color:'#f87171', textAlign:'center' }}>Sei sicuro? L'operazione è irreversibile.</div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button onClick={() => setConfirmDel(false)}
                    style={{ flex:1, padding:'8px', background:'#334155', border:'none', borderRadius:'8px', color:'#94a3b8', fontWeight:'600', cursor:'pointer', fontSize:'0.85rem' }}>
                    Annulla
                  </button>
                  <button onClick={handleDelete} disabled={deleting}
                    style={{ flex:1, padding:'8px', background:'#7f1d1d', border:'none', borderRadius:'8px', color:'#fca5a5', fontWeight:'600', cursor:'pointer', fontSize:'0.85rem', opacity:deleting?0.7:1 }}>
                    {deleting ? 'Elimino…' : 'Sì, elimina'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Vista fullscreen per scansione ───────────────────────────────
function FullscreenCard({ card, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', zIndex:2000, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'20px', backdropFilter:'blur(8px)', cursor:'pointer' }}
      onClick={onClose}>
      <div style={{ fontSize:'1.6rem', fontWeight:'800', color:card.color, textAlign:'center', padding:'0 20px' }}>
        {card.store_name}
      </div>
      <div style={{ background:'#fff', borderRadius:'16px', padding:'24px 32px', display:'flex', flexDirection:'column', alignItems:'center', gap:'10px' }}
        onClick={e => e.stopPropagation()}>
        <BarcodeDisplay value={card.barcode_value} format={card.barcode_format} large />
        <div style={{ fontSize:'1rem', color:'#111217', fontFamily:'monospace', letterSpacing:'2px', fontWeight:'700' }}>
          {card.barcode_value}
        </div>
      </div>
      <div style={{ color:'#475569', fontSize:'0.85rem' }}>Tocca per chiudere</div>
    </div>
  )
}

// ── Colore testo contrastante rispetto allo sfondo ───────────────
function contrastColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#1e293b' : '#ffffff'
}

// ── Card singola tessera ─────────────────────────────────────────
function LoyaltyCard({ card, isOwner, onEdit, onClick }) {
  const textColor = contrastColor(card.color)
  return (
    <div onClick={onClick}
      style={{ background:card.color, borderRadius:'16px', padding:'28px 16px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:`0 6px 24px ${card.color}55`, minHeight:'90px', position:'relative' }}>
      <div style={{ fontWeight:'800', fontSize:'1.5rem', color:textColor, textAlign:'center', lineHeight:1.2, padding:'0 32px', wordBreak:'break-word' }}>
        {card.store_name}
      </div>
      {isOwner && (
        <button onClick={e => { e.stopPropagation(); onEdit(card) }}
          style={{ position:'absolute', top:'8px', right:'8px', background:'rgba(0,0,0,0.18)', border:'none', borderRadius:'6px', color:textColor, cursor:'pointer', fontSize:'0.85rem', padding:'4px 6px', lineHeight:1 }}>
          ✏️
        </button>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPALE
// ══════════════════════════════════════════════════════════════════
export default function LoyaltyCardsSection({ session }) {
  const [cards,          setCards]          = useState([])
  const [loading,        setLoading]        = useState(true)
  const [onlyMine,       setOnlyMine]       = useState(false)
  const [addModal,       setAddModal]       = useState(false)
  const [editCard,       setEditCard]       = useState(null)
  const [fullscreenCard, setFullscreenCard] = useState(null)

  const currentUserId = session?.user?.id

  useEffect(() => { fetchCards() }, [])

  async function fetchCards() {
    setLoading(true)
    const { data, error } = await supabase.from('loyalty_cards').select('*').order('store_name')
    if (error) console.error('[LoyaltyCards] fetch error:', error)
    setCards(data ?? [])
    setLoading(false)
  }

  function removeCard(id) {
    setCards(prev => prev.filter(c => c.id !== id))
  }

  const filtered = onlyMine ? cards.filter(c => c.user_id === currentUserId) : cards

  return (
    <div style={{ width:'100%' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'20px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h2 style={{ margin:'0 0 4px 0', fontSize:'1.5rem', color:'#38bdf8', fontWeight:'bold' }}>🎫 Tessere Fedeltà</h2>
          <p style={{ margin:0, color:'#64748b', fontSize:'0.82rem' }}>
            {filtered.length} {filtered.length === 1 ? 'tessera' : 'tessere'} · tocca per ingrandire
          </p>
        </div>
        <div style={{ display:'flex', gap:'12px', alignItems:'center', flexWrap:'wrap' }}>
          <Toggle checked={onlyMine} onChange={setOnlyMine} label="Solo mie" />
          <button onClick={() => setAddModal(true)}
            style={{ background:'#1d4ed8', border:'none', borderRadius:'8px', color:'#fff', padding:'9px 16px', fontSize:'0.88rem', fontWeight:'700', cursor:'pointer' }}>
            + Aggiungi
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign:'center', color:'#64748b', padding:'40px' }}>Caricamento…</div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ background:'#1e293b', border:'1px dashed #334155', borderRadius:'12px', padding:'40px', textAlign:'center', color:'#475569' }}>
          Nessuna tessera · premi <strong style={{ color:'#60a5fa' }}>+ Aggiungi</strong> per inserirne una
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:'16px' }}>
          {filtered.map(card => (
            <LoyaltyCard
              key={card.id}
              card={card}
              isOwner={card.user_id === currentUserId}
              onEdit={setEditCard}
              onClick={() => setFullscreenCard(card)}
            />
          ))}
        </div>
      )}

      {addModal && (
        <CardModal
          onClose={() => setAddModal(false)}
          onSaved={fetchCards}
        />
      )}
      {editCard && (
        <CardModal
          card={editCard}
          onClose={() => setEditCard(null)}
          onSaved={fetchCards}
          onDeleted={removeCard}
        />
      )}
      {fullscreenCard && (
        <FullscreenCard card={fullscreenCard} onClose={() => setFullscreenCard(null)} />
      )}
    </div>
  )
}
