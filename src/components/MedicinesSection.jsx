import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { dailyConsumption, daysRemaining, reorderDate, stockStatus, currentStock, displayStock, doseScheduleLabel, nextDoseStatus, WEEKDAY_NAMES, WEEKDAY_ORDER } from '../utils/medicineUtils'
import { saveCache, loadCache } from '../utils/offlineCache'

const UNIT_OPTIONS = ['compresse', 'ml', 'bustine', 'gocce', 'fiale', 'capsule', 'dosi', 'iniezioni', 'cerotti', 'flaconi']

function pad(n) { return String(n).padStart(2, '0') }
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]))
}

// ── Export Word (.doc) dell'elenco terapie/scorte attualmente visualizzato ──
function exportToWord(grouped) {
  const sections = Object.keys(grouped).sort().map(person => {
    const rows = grouped[person].map(m => {
      const dr = daysRemaining(m)
      const rDate = reorderDate(m)
      return `
        <tr>
          <td>${escapeHtml(m.medicine_name)}</td>
          <td>${escapeHtml(m.dosage_note || '-')}</td>
          <td>${m.is_active ? 'In corso' : 'Sospesa'}</td>
          <td>${displayStock(m)} ${escapeHtml(m.unit_label)}</td>
          <td>${dr != null ? Math.floor(dr) + ' giorni' : '-'}</td>
          <td>${rDate ? fmtDate(rDate) : '-'}</td>
          <td>${escapeHtml(m.notes || '-')}</td>
        </tr>`
    }).join('')
    return `
      <h2 style="color:#1d4ed8; font-family:Calibri,Arial,sans-serif;">${escapeHtml(person)}</h2>
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse; width:100%; margin-bottom:24px; font-family:Calibri,Arial,sans-serif; font-size:11pt;">
        <thead>
          <tr style="background:#e2e8f0;">
            <th>Farmaco</th><th>Posologia</th><th>Stato</th><th>Scorte attuali</th><th>Autonomia</th><th>Riordina entro</th><th>Note</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`
  }).join('')

  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset="utf-8"><title>Medicine e Terapie</title></head>
    <body style="font-family:Calibri,Arial,sans-serif;">
      <h1 style="color:#0f172a;">Medicine e Terapie</h1>
      <p>Esportato il ${fmtDate(todayStr())}</p>
      ${sections || '<p>Nessuna terapia da esportare.</p>'}
    </body>
  </html>`

  const blob = new Blob(['﻿', html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Medicine_${todayStr()}.doc`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Banner offline ──────────────────────────────────────────────
function OfflineBanner() {
  return (
    <div style={{ background: '#422006', border: '1px solid #f59e0b', borderRadius: '8px', padding: '10px 14px', marginBottom: '18px', color: '#fbbf24', fontSize: '0.82rem' }}>
      📴 Sei offline — mostro le ultime terapie salvate sul dispositivo, potrebbero non essere aggiornate.
    </div>
  )
}

// ── Toggle ───────────────────────────────────────────────────────
function Toggle({ checked, onChange, label, disabled = false }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none', opacity: disabled ? 0.55 : 1 }}>
      <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '500' }}>{label}</span>
      <div onClick={() => !disabled && onChange(!checked)}
        style={{ width: '44px', height: '24px', borderRadius: '12px', position: 'relative', transition: 'background-color .2s', cursor: disabled ? 'not-allowed' : 'pointer', flexShrink: 0, backgroundColor: checked ? '#4ade80' : '#334155' }}>
        <div style={{ position: 'absolute', top: '2px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff', transition: 'transform .2s', boxShadow: '0 1px 4px rgba(0,0,0,.4)', transform: checked ? 'translateX(20px)' : 'translateX(2px)' }} />
      </div>
    </label>
  )
}

// ── Modal aggiungi / modifica ────────────────────────────────────
function MedicineModal({ medicine, personEmail, userId, onClose, onSaved, onDeleted }) {
  const isEdit = !!medicine
  const [medicineName,    setMedicineName]    = useState(medicine?.medicine_name    ?? '')
  const [dosageNote,      setDosageNote]      = useState(medicine?.dosage_note      ?? '')
  const [unitLabel,       setUnitLabel]       = useState(medicine?.unit_label       ?? UNIT_OPTIONS[0])
  const [unitsPerIntake,  setUnitsPerIntake]  = useState(medicine?.units_per_intake  ?? 1)
  // In modifica il campo è bloccato: mostriamo le scorte arrotondate come sulla card
  // (displayStock), non il valore decimale grezzo di currentStock, così il numero
  // combacia con quello mostrato fuori dal modal invece di sembrare "calcolato diverso"
  const initialStock = medicine ? displayStock(medicine) : 0
  const [stockUnits,      setStockUnits]      = useState(initialStock)
  const [isActive,        setIsActive]        = useState(medicine?.is_active         ?? true)
  const [endDate,         setEndDate]         = useState(medicine?.end_date          ?? '')
  const [startDate,       setStartDate]       = useState(medicine?.start_date        ?? todayStr())
  const [scheduleType,    setScheduleType]    = useState(medicine?.schedule_type      ?? 'interval')
  const [doseIntervalDays, setDoseIntervalDays] = useState(medicine?.dose_interval_days ?? 1)
  const [weekdays,        setWeekdays]        = useState(medicine?.weekdays           ?? [])
  const [notes,           setNotes]           = useState(medicine?.notes             ?? '')
  const [saving,          setSaving]          = useState(false)
  const [deleting,        setDeleting]        = useState(false)
  const [confirmDel,      setConfirmDel]      = useState(false)
  const [error,           setError]           = useState('')
  const mouseDownOnBackdrop = useRef(false)

  async function handleSave() {
    if (!medicineName.trim()) { setError('Il nome del farmaco è obbligatorio'); return }
    if (Number(unitsPerIntake) < 0 || Number(stockUnits) < 0) {
      setError('I valori numerici non possono essere negativi'); return
    }
    if (scheduleType === 'interval' && !(Number(doseIntervalDays) > 0)) {
      setError('"Ogni quanti giorni" è obbligatorio ed è almeno 1'); return
    }
    if (scheduleType === 'weekdays' && weekdays.length === 0) {
      setError('Seleziona almeno un giorno della settimana'); return
    }

    setSaving(true)

    // Se la quantità mostrata (già calcolata ad oggi) viene modificata, è un nuovo
    // conteggio: registriamo oggi come nuova base da cui scalare il consumo futuro.
    const stockChanged = Math.round(Number(stockUnits) * 10) / 10 !== initialStock
    const payload = {
      person_name:       medicine?.person_name ?? personEmail,
      medicine_name:     medicineName.trim(),
      dosage_note:       dosageNote.trim() || null,
      unit_label:         unitLabel,
      units_per_intake:   Number(unitsPerIntake),
      stock_units:        stockChanged ? Number(stockUnits) : (medicine?.stock_units ?? Number(stockUnits)),
      stock_as_of:        stockChanged ? todayStr() : (medicine?.stock_as_of ?? todayStr()),
      is_active:          isActive,
      end_date:           endDate || null,
      start_date:         startDate || todayStr(),
      schedule_type:      scheduleType,
      dose_interval_days: scheduleType === 'interval' ? Number(doseIntervalDays) : null,
      weekdays:           scheduleType === 'weekdays' ? weekdays.slice().sort() : null,
      notes:              notes.trim() || null,
    }

    let err
    if (isEdit) {
      ;({ error: err } = await supabase.from('medicines').update(payload).eq('id', medicine.id))
    } else {
      ;({ error: err } = await supabase.from('medicines').insert({ ...payload, user_id: userId }))
    }
    setSaving(false)
    if (err) { setError('Errore: ' + err.message); return }
    onSaved()
    onClose()
  }

  async function handleDelete() {
    setDeleting(true)
    const { error: err } = await supabase.from('medicines').delete().eq('id', medicine.id)
    setDeleting(false)
    if (err) { setError('Errore: ' + err.message); return }
    onDeleted(medicine.id)
    onClose()
  }

  const inp = {
    background: '#0f172a', border: '1px solid #334155', borderRadius: '8px',
    padding: '10px 12px', color: '#f1f5f9', fontSize: '0.88rem', outline: 'none',
    width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
  }
  const lbl = { fontSize: '0.72rem', color: '#64748b', marginBottom: '4px' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}
      onMouseDown={e => { mouseDownOnBackdrop.current = e.target === e.currentTarget }}
      onClick={e => { if (mouseDownOnBackdrop.current && e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '24px 20px', width: '90%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 24px 60px rgba(0,0,0,0.85)', maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#f1f5f9' }}>
          {isEdit ? '✏️ Modifica terapia' : '+ Nuova terapia'}
        </div>

        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
          Terapia per: <strong style={{ color: '#94a3b8' }}>{medicine?.person_name ?? personEmail}</strong>
        </div>

        <div>
          <div style={lbl}>Farmaco *</div>
          <input autoFocus value={medicineName} onChange={e => setMedicineName(e.target.value)}
            placeholder="Es. Tachipirina 500mg" style={inp} />
        </div>

        <div>
          <div style={lbl}>Posologia (facoltativo)</div>
          <input value={dosageNote} onChange={e => setDosageNote(e.target.value)}
            placeholder="Es. 1 compressa dopo i pasti" disabled={isEdit}
            style={{ ...inp, opacity: isEdit ? 0.55 : 1, cursor: isEdit ? 'not-allowed' : 'text' }} />
        </div>

        <div>
          <div style={lbl}>Unità per assunzione</div>
          <input type="number" min="0" step="0.5" value={unitsPerIntake} disabled={isEdit}
            onChange={e => setUnitsPerIntake(e.target.value)} style={{ ...inp, opacity: isEdit ? 0.55 : 1, cursor: isEdit ? 'not-allowed' : 'text' }} />
        </div>

        <div>
          <div style={lbl}>Tipo di posologia</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { value: 'interval', label: 'Ogni tot giorni' },
              { value: 'weekdays', label: 'Giorni della settimana' },
            ].map(opt => (
              <button key={opt.value} type="button" disabled={isEdit}
                onClick={() => !isEdit && setScheduleType(opt.value)}
                style={{
                  flex: 1, padding: '9px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700',
                  cursor: isEdit ? 'not-allowed' : 'pointer', opacity: isEdit ? 0.55 : 1,
                  background: scheduleType === opt.value ? '#1d4ed8' : '#0f172a',
                  border: `1px solid ${scheduleType === opt.value ? '#1d4ed8' : '#334155'}`,
                  color: scheduleType === opt.value ? '#fff' : '#94a3b8',
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {scheduleType === 'interval' ? (
          <div>
            <div style={lbl}>Ogni quanti giorni *</div>
            <input type="number" min="1" step="1" value={doseIntervalDays} disabled={isEdit}
              onChange={e => setDoseIntervalDays(e.target.value)} style={{ ...inp, opacity: isEdit ? 0.55 : 1, cursor: isEdit ? 'not-allowed' : 'text' }} />
          </div>
        ) : (
          <div>
            <div style={lbl}>Giorni della settimana *</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {WEEKDAY_ORDER.map(d => {
                const selected = weekdays.includes(d)
                return (
                  <button key={d} type="button" disabled={isEdit}
                    onClick={() => !isEdit && setWeekdays(prev => selected ? prev.filter(x => x !== d) : [...prev, d])}
                    style={{
                      padding: '8px 6px', minWidth: '40px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '700',
                      cursor: isEdit ? 'not-allowed' : 'pointer', opacity: isEdit ? 0.55 : 1,
                      background: selected ? '#1d4ed8' : '#0f172a',
                      border: `1px solid ${selected ? '#1d4ed8' : '#334155'}`,
                      color: selected ? '#fff' : '#94a3b8',
                    }}>
                    {WEEKDAY_NAMES[d].slice(0, 3)}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '-6px' }}>
          {isEdit
            ? 'Per cambiare questi valori elimina questa terapia e creane una nuova: determinano il consumo scorte già calcolato nel tempo. Le scorte si aggiornano solo con ➕ Ricarica o 🔄 Correggi.'
            : "Determina sia il consumo scorte sia il promemoria dose. Es. una pastiglia al giorno → ogni 1 giorno; un'iniezione ogni 15gg → ogni 15 giorni; una pastiglia solo giovedì e domenica → giorni della settimana."}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <div style={lbl}>Scorte attuali (contale oggi)</div>
            <input type="number" min="0" step="0.5" value={stockUnits} disabled={isEdit}
              onChange={e => setStockUnits(e.target.value)} style={{ ...inp, opacity: isEdit ? 0.55 : 1, cursor: isEdit ? 'not-allowed' : 'text' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={lbl}>Unità di misura</div>
            <select value={unitLabel} onChange={e => setUnitLabel(e.target.value)} disabled={isEdit}
              style={{ ...inp, cursor: isEdit ? 'not-allowed' : 'pointer', opacity: isEdit ? 0.55 : 1 }}>
              {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <Toggle checked={isActive} onChange={setIsActive} label="Terapia in corso" disabled={isEdit} />

        <div>
          <div style={lbl}>Fine terapia (facoltativo)</div>
          <input type="date" value={endDate} disabled={isEdit}
            onChange={e => setEndDate(e.target.value)} style={{ ...inp, opacity: isEdit ? 0.55 : 1, cursor: isEdit ? 'not-allowed' : 'text' }} />
        </div>

        <div>
          <div style={lbl}>Prossima dose (o inizio terapia)</div>
          <input type="date" value={startDate} disabled={isEdit}
            onChange={e => setStartDate(e.target.value)} style={{ ...inp, opacity: isEdit ? 0.55 : 1, cursor: isEdit ? 'not-allowed' : 'text' }} />
        </div>

        <div>
          <div style={lbl}>Note (facoltativo)</div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }} />
        </div>

        {error && <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '10px', background: '#334155', border: 'none', borderRadius: '8px', color: '#94a3b8', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem' }}>
            Annulla
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 1, padding: '10px', background: '#1d4ed8', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Salvo…' : 'Salva'}
          </button>
        </div>

        {isEdit && (
          <div style={{ borderTop: '1px solid #334155', paddingTop: '12px' }}>
            {!confirmDel ? (
              <button onClick={() => setConfirmDel(true)}
                style={{ width: '100%', padding: '8px', background: 'none', border: '1px solid #7f1d1d', borderRadius: '8px', color: '#f87171', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}>
                🗑 Elimina terapia
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '0.8rem', color: '#f87171', textAlign: 'center' }}>Sei sicuro? L'operazione è irreversibile.</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setConfirmDel(false)}
                    style={{ flex: 1, padding: '8px', background: '#334155', border: 'none', borderRadius: '8px', color: '#94a3b8', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}>
                    Annulla
                  </button>
                  <button onClick={handleDelete} disabled={deleting}
                    style={{ flex: 1, padding: '8px', background: '#7f1d1d', border: 'none', borderRadius: '8px', color: '#fca5a5', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem', opacity: deleting ? 0.7 : 1 }}>
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

// ── Ricarica scorte rapida ───────────────────────────────────────
function RestockControl({ medicine, onRestocked }) {
  const [open,   setOpen]   = useState(false)
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  async function confirm() {
    const add = Number(amount)
    if (!add || add <= 0) { setOpen(false); return }
    setSaving(true)
    // Si riparte da oggi: scorte attuali (già scalate) + quantità appena aggiunta
    const newStock = currentStock(medicine) + add
    const asOf = todayStr()
    const { error } = await supabase.from('medicines').update({ stock_units: newStock, stock_as_of: asOf }).eq('id', medicine.id)
    setSaving(false)
    if (!error) onRestocked(medicine.id, newStock, asOf)
    setOpen(false)
    setAmount('')
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#4ade80', padding: '5px 10px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>
        ➕ Ricarica
      </button>
    )
  }
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      <input autoFocus type="number" min="0" step="0.5" value={amount}
        onChange={e => setAmount(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && confirm()}
        placeholder="Qtà"
        style={{ width: '64px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '5px 8px', color: '#f1f5f9', fontSize: '0.8rem' }} />
      <button onClick={confirm} disabled={saving}
        style={{ background: '#166534', border: 'none', borderRadius: '6px', color: '#fff', padding: '5px 10px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>
        ✓
      </button>
      <button onClick={() => { setOpen(false); setAmount('') }}
        style={{ background: 'none', border: 'none', color: '#64748b', padding: '5px 6px', fontSize: '0.75rem', cursor: 'pointer' }}>
        ✕
      </button>
    </div>
  )
}

// ── Correzione scorte (reset a un valore esatto in una data indicata) ────
// Da usare quando il conteggio calcolato si è disallineato dalla realtà
// (es. medicine perse/scadute/buttate): sovrascrive scorte e data di
// riferimento invece di sommarle a quelle già calcolate.
function ResetStockControl({ medicine, onReset }) {
  const [open,   setOpen]   = useState(false)
  const [amount, setAmount] = useState('')
  const [asOfDate, setAsOfDate] = useState(todayStr())
  const [saving, setSaving] = useState(false)

  async function confirm() {
    if (amount === '' || Number(amount) < 0) { setOpen(false); return }
    const exact = Number(amount)
    const asOf = asOfDate || todayStr()
    setSaving(true)
    const { error } = await supabase.from('medicines').update({ stock_units: exact, stock_as_of: asOf }).eq('id', medicine.id)
    setSaving(false)
    if (!error) onReset(medicine.id, exact, asOf)
    setOpen(false)
    setAmount('')
  }

  if (!open) {
    return (
      <button onClick={() => { setOpen(true); setAsOfDate(todayStr()) }}
        style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f59e0b', padding: '5px 10px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>
        🔄 Correggi
      </button>
    )
  }
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
      <input type="date" value={asOfDate} max={todayStr()}
        onChange={e => setAsOfDate(e.target.value)}
        style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '5px 8px', color: '#f1f5f9', fontSize: '0.75rem' }} />
      <input autoFocus type="number" min="0" step="0.5" value={amount}
        onChange={e => setAmount(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && confirm()}
        placeholder="Qtà esatta"
        style={{ width: '80px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '5px 8px', color: '#f1f5f9', fontSize: '0.8rem' }} />
      <button onClick={confirm} disabled={saving}
        style={{ background: '#92400e', border: 'none', borderRadius: '6px', color: '#fff', padding: '5px 10px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>
        ✓
      </button>
      <button onClick={() => { setOpen(false); setAmount('') }}
        style={{ background: 'none', border: 'none', color: '#64748b', padding: '5px 6px', fontSize: '0.75rem', cursor: 'pointer' }}>
        ✕
      </button>
    </div>
  )
}

// ── Card singola terapia ─────────────────────────────────────────
function MedicineCard({ medicine, isOwner, onEdit, onRestocked, onReset }) {
  const status = stockStatus(medicine)
  const dc = dailyConsumption(medicine)
  const dr = daysRemaining(medicine)
  const rDate = reorderDate(medicine)
  const nextDose = nextDoseStatus(medicine)

  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderLeft: `4px solid ${status.color}`, borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#f1f5f9' }}>{medicine.medicine_name}</div>
          {medicine.dosage_note && (
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>{medicine.dosage_note}</div>
          )}
        </div>
        {isOwner && (
          <button onClick={() => onEdit(medicine)}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem', padding: '2px', flexShrink: 0 }}>
            ✏️
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: '700', color: status.color, background: `${status.color}22`, borderRadius: '20px', padding: '3px 10px' }}>
          {status.label}
        </span>
        {!isOwner && (
          <span style={{ backgroundColor: '#334155', color: '#94a3b8', borderRadius: '20px', padding: '2px 8px', fontSize: '0.68rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
            👤 Famiglia
          </span>
        )}
      </div>

      <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span>Scorte: <strong style={{ color: '#f1f5f9' }}>{displayStock(medicine)} {medicine.unit_label}</strong></span>
        {medicine.is_active && dc > 0 && (
          <span>Consumo: {doseScheduleLabel(medicine)}</span>
        )}
        {dr != null && (
          <span>
            Autonomia: <strong style={{ color: status.color }}>{Math.floor(dr)} giorni</strong>
            {rDate && <> · riordina entro il <strong style={{ color: status.color }}>{fmtDate(rDate)}</strong></>}
          </span>
        )}
        {nextDose && (
          <span>💉 <strong style={{ color: nextDose.color }}>{nextDose.label}</strong> ({fmtDate(nextDose.date)})</span>
        )}
      </div>

      {isOwner && (
        <div style={{ marginTop: '4px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <RestockControl medicine={medicine} onRestocked={onRestocked} />
          <ResetStockControl medicine={medicine} onReset={onReset} />
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPALE
// ══════════════════════════════════════════════════════════════════
export default function MedicinesSection({ session }) {
  const [medicines,   setMedicines]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [offline,     setOffline]     = useState(false)
  const [personFilter, setPersonFilter] = useState('Tutti')
  const [showInactive, setShowInactive] = useState(false)
  const [onlyMine,    setOnlyMine]    = useState(true)
  const [addModal,    setAddModal]    = useState(false)
  const [editMedicine, setEditMedicine] = useState(null)

  const currentUserId = session?.user?.id

  useEffect(() => { fetchMedicines() }, [])

  async function fetchMedicines() {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('medicines').select('*')
        .order('person_name').order('medicine_name')
      if (error) throw error
      setMedicines(data ?? [])
      setOffline(false)
      saveCache('medicines', data ?? [])
    } catch (err) {
      console.error('[Medicines] fetch error:', err)
      setMedicines(await loadCache('medicines'))
      setOffline(true)
    }
    setLoading(false)
  }

  function removeMedicine(id) {
    setMedicines(prev => prev.filter(m => m.id !== id))
  }

  function applyRestock(id, newStock, asOf) {
    setMedicines(prev => prev.map(m => m.id === id ? { ...m, stock_units: newStock, stock_as_of: asOf } : m))
  }

  const visibleMedicines = onlyMine ? medicines.filter(m => m.user_id === currentUserId) : medicines

  const people = ['Tutti', ...Array.from(new Set(visibleMedicines.map(m => m.person_name))).sort()]

  const filtered = visibleMedicines
    .filter(m => showInactive || m.is_active)
    .filter(m => personFilter === 'Tutti' || m.person_name === personFilter)

  const grouped = filtered.reduce((acc, m) => {
    (acc[m.person_name] ??= []).push(m)
    return acc
  }, {})

  const lowStockCount = visibleMedicines.filter(m => {
    const s = stockStatus(m)
    return s.level === 'critical' || s.level === 'low'
  }).length

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '1.5rem', color: '#38bdf8', fontWeight: 'bold' }}>💊 Medicine</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem' }}>
            {visibleMedicines.filter(m => m.is_active).length} terapie in corso
            {lowStockCount > 0 && <span style={{ color: '#f59e0b' }}> · {lowStockCount} da riordinare</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Toggle checked={onlyMine} onChange={v => { setOnlyMine(v); setPersonFilter('Tutti') }} label="Solo mie" />
          <Toggle checked={showInactive} onChange={setShowInactive} label="Mostra sospese" />
          <button onClick={() => exportToWord(grouped)} title="Esporta l'elenco visualizzato in un file Word"
            style={{ background: 'none', border: '1px solid #334155', borderRadius: '8px', color: '#94a3b8', padding: '9px 16px', fontSize: '0.88rem', fontWeight: '700', cursor: 'pointer' }}>
            📄 Esporta Word
          </button>
          <button onClick={() => setAddModal(true)}
            style={{ background: '#1d4ed8', border: 'none', borderRadius: '8px', color: '#fff', padding: '9px 16px', fontSize: '0.88rem', fontWeight: '700', cursor: 'pointer' }}>
            + Aggiungi
          </button>
        </div>
      </div>

      {offline && <OfflineBanner />}

      {people.length > 2 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
          {people.map(p => (
            <button key={p} onClick={() => setPersonFilter(p)}
              style={{
                background: personFilter === p ? '#1d4ed8' : '#1e293b',
                border: '1px solid #334155', borderRadius: '20px',
                color: personFilter === p ? '#fff' : '#94a3b8',
                padding: '6px 14px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer',
              }}>
              {p}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Caricamento…</div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ background: '#1e293b', border: '1px dashed #334155', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#475569' }}>
          Nessuna terapia · premi <strong style={{ color: '#60a5fa' }}>+ Aggiungi</strong> per inserirne una
        </div>
      )}

      {!loading && Object.keys(grouped).sort().map(person => (
        <div key={person} style={{ marginBottom: '22px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#f1f5f9', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            👤 {person}
          </div>
          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {grouped[person].map(m => (
              <MedicineCard
                key={m.id}
                medicine={m}
                isOwner={m.user_id === currentUserId}
                onEdit={setEditMedicine}
                onRestocked={applyRestock}
                onReset={applyRestock}
              />
            ))}
          </div>
        </div>
      ))}

      {addModal && (
        <MedicineModal
          personEmail={session?.user?.email}
          userId={currentUserId}
          onClose={() => setAddModal(false)}
          onSaved={fetchMedicines}
        />
      )}
      {editMedicine && (
        <MedicineModal
          medicine={editMedicine}
          onClose={() => setEditMedicine(null)}
          onSaved={fetchMedicines}
          onDeleted={removeMedicine}
        />
      )}
    </div>
  )
}
