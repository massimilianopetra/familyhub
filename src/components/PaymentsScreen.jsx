import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { PAYMENT_TYPES, getPaymentType, categoriesFor } from '../utils/paymentTypes'

function calcNextDue(baseDate, interval) {
  const d = new Date(baseDate)
  if (interval === 'monthly')   d.setMonth(d.getMonth() + 1)
  if (interval === 'quarterly') d.setMonth(d.getMonth() + 3)
  if (interval === 'yearly')    d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

function downloadIcs(payment) {
  const base     = payment.next_due_date || payment.due_date
  if (!base) return
  const dtstart  = base.replace(/-/g, '')
  const dtend    = (() => { const d = new Date(base); d.setDate(d.getDate() + 1); return d.toISOString().slice(0,10).replace(/-/g,'') })()
  const dtstamp  = new Date().toISOString().replace(/[-:.]/g,'').slice(0,15) + 'Z'
  const rruleMap = { monthly: 'FREQ=MONTHLY', quarterly: 'FREQ=MONTHLY;INTERVAL=3', yearly: 'FREQ=YEARLY' }
  const rrule    = rruleMap[payment.recurrence_interval]
  const desc     = `Importo: €${Number(payment.amount).toFixed(2)}\\nCategoria: ${payment.category}${payment.notes ? '\\nNote: ' + payment.notes : ''}`
  const lines    = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//FamilyHub//Payments//IT',
    'CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',
    `UID:${payment.id}@familyhub`, `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${dtstart}`, `DTEND;VALUE=DATE:${dtend}`,
    `SUMMARY:${payment.title}`, `DESCRIPTION:${desc}`,
    rrule ? `RRULE:${rrule}` : '', 'END:VEVENT','END:VCALENDAR',
  ].filter(Boolean)
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `${payment.title.replace(/\s+/g,'_')}.ics`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
      <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>{label}</span>
      <div onClick={() => onChange(!checked)}
        style={{ width: 44, height: 24, borderRadius: 12, position: 'relative', flexShrink: 0,
          backgroundColor: checked ? '#4ade80' : '#334155', transition: 'background-color .2s', cursor: 'pointer' }}>
        <div style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%',
          backgroundColor: '#fff', transition: 'transform .2s', boxShadow: '0 1px 4px rgba(0,0,0,.4)',
          transform: checked ? 'translateX(20px)' : 'translateX(2px)' }} />
      </div>
    </label>
  )
}

const todayStr = () => new Date().toISOString().slice(0, 10)

const EMPTY_FORM = {
  title: '', amount: '', category: 'Luce', type: 'spesa',
  due_date: '', is_paid: false,
  paid_at: todayStr(), notes: '',
  is_recurring: false, recurrence_interval: 'monthly',
}

export default function PaymentsScreen({ user }) {
  const [payments,    setPayments]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [showForm,    setShowForm]    = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [onlyMine,    setOnlyMine]    = useState(true)
  const [markingPaid, setMarkingPaid] = useState(null) // { id, date }
  const [editingId,   setEditingId]   = useState(null)
  const [view,        setView]        = useState('lista') // 'lista' | 'rendiconto'
  const formRef = useRef(null)

  useEffect(() => { loadPayments() }, [])

  useEffect(() => {
    if (showForm) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [showForm])

  async function loadPayments() {
    setLoading(true)
    const { data, error } = await supabase
      .from('payments').select('*').order('created_at', { ascending: false })
    if (error) setError(error.message)
    else       setPayments(data || [])
    setLoading(false)
  }

  function setField(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function setType(type) {
    setForm(f => {
      const cats = categoriesFor(type)
      return { ...f, type, category: cats.includes(f.category) ? f.category : cats[0] }
    })
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  function handleEdit(p) {
    setForm({
      title:               p.title,
      amount:              String(p.amount),
      category:            p.category,
      type:                p.type || 'spesa',
      due_date:            p.due_date || '',
      is_paid:             p.is_paid,
      paid_at:             p.paid_at || todayStr(),
      notes:               p.notes || '',
      is_recurring:        p.is_recurring,
      recurrence_interval: p.recurrence_interval || 'monthly',
    })
    setEditingId(p.id)
    setShowForm(true)
    setMarkingPaid(null)
    setError('')
  }

  async function handleSave() {
    setError('')
    if (!form.title.trim())                       { setError('Il titolo è obbligatorio'); return }
    if (!form.amount || Number(form.amount) <= 0) { setError('Importo non valido'); return }

    setSaving(true)
    const baseDate      = form.due_date || form.paid_at
    const next_due_date = (form.is_recurring && baseDate) ? calcNextDue(baseDate, form.recurrence_interval) : null

    const payload = {
      title:               form.title.trim(),
      amount:              Number(form.amount),
      category:            form.category,
      type:                form.type,
      due_date:            form.due_date || null,
      is_paid:             form.is_paid,
      paid_at:             form.is_paid ? form.paid_at : null,
      notes:               form.notes.trim() || null,
      is_recurring:        form.is_recurring,
      recurrence_interval: form.is_recurring ? form.recurrence_interval : null,
      next_due_date,
    }

    const { error } = editingId
      ? await supabase.from('payments').update(payload).eq('id', editingId)
      : await supabase.from('payments').insert({ ...payload, user_id: user.id })

    if (error) { setError(error.message); setSaving(false); return }
    // auto-crea prossima scadenza se ricorrente e già pagato (solo su nuovo inserimento)
    if (!editingId && payload.is_paid && payload.is_recurring && payload.due_date) {
      await autoCreateNext({ ...payload, user_id: user.id })
    }
    closeForm()
    await loadPayments()
    setSaving(false)
  }

  async function autoCreateNext(paymentData) {
    if (!paymentData.is_recurring || !paymentData.due_date) return
    const nextDue = calcNextDue(paymentData.due_date, paymentData.recurrence_interval)
    // duplicate check in-memory
    const inMemory = payments.some(p =>
      p.user_id === user.id && p.title === paymentData.title && p.due_date === nextDue
    )
    if (inMemory) return
    // duplicate check on DB
    const { data: existing } = await supabase
      .from('payments').select('id')
      .eq('user_id', user.id).eq('title', paymentData.title).eq('due_date', nextDue)
      .maybeSingle()
    if (existing) return
    await supabase.from('payments').insert({
      user_id:             user.id,
      title:               paymentData.title,
      amount:              paymentData.amount,
      category:            paymentData.category,
      type:                paymentData.type,
      due_date:            nextDue,
      is_paid:             false,
      paid_at:             null,
      notes:               paymentData.notes || null,
      is_recurring:        true,
      recurrence_interval: paymentData.recurrence_interval,
      next_due_date:       calcNextDue(nextDue, paymentData.recurrence_interval),
    })
  }

  async function handleMarkPaid(id, date) {
    setError('')
    const payment = payments.find(p => p.id === id)
    const { error } = await supabase
      .from('payments').update({ is_paid: true, paid_at: date }).eq('id', id)
    if (error) { setError(error.message); return }
    setMarkingPaid(null)
    if (payment) await autoCreateNext(payment)
    await loadPayments()
  }

  async function handleDelete(id) {
    setError('')
    const { error } = await supabase.from('payments').delete().eq('id', id)
    if (error) setError(error.message)
    else       setPayments(prev => prev.filter(p => p.id !== id))
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const filtered = onlyMine ? payments.filter(p => p.user_id === user.id) : payments

  // sort: unpaid first (by due_date asc), then paid (by paid_at desc)
  const sorted = [...filtered].sort((a, b) => {
    const da = a.due_date ? new Date(a.due_date) : new Date('9999-12-31')
    const db = b.due_date ? new Date(b.due_date) : new Date('9999-12-31')
    return da - db
  })

  const now        = new Date()
  const monthDone  = filtered.filter(p => {
    if (!p.is_paid || !p.paid_at) return false
    const d = new Date(p.paid_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const monthSpese   = monthDone.filter(p => p.type !== 'entrata').reduce((s, p) => s + Number(p.amount), 0)
  const monthEntrate = monthDone.filter(p => p.type === 'entrata').reduce((s, p) => s + Number(p.amount), 0)
  const monthSaldo   = monthEntrate - monthSpese

  const todayDate  = new Date(); todayDate.setHours(0,0,0,0)
  const in30       = new Date(todayDate); in30.setDate(in30.getDate() + 30)
  const in7        = new Date(todayDate); in7.setDate(in7.getDate() + 7)

  const upcoming = filtered.filter(p => {
    if (p.is_paid) return false
    const ref = p.due_date || p.next_due_date
    if (!ref) return false
    const d = new Date(ref)
    return d >= todayDate && d <= in30
  }).sort((a, b) => {
    const da = new Date(a.due_date || a.next_due_date)
    const db = new Date(b.due_date || b.next_due_date)
    return da - db
  })

  const intervalLabel = { monthly: 'Mensile', quarterly: 'Trimestrale', yearly: 'Annuale' }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ color: '#f1f5f9', margin: 0, fontSize: 22, fontWeight: 700 }}>💳 Pagamenti</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
            {filtered.length} {filtered.length === 1 ? 'movimento' : 'movimenti'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {view === 'lista' && <Toggle checked={onlyMine} onChange={setOnlyMine} label="Solo miei" />}
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #ccc' }}>
            <button onClick={() => setView('lista')}
              style={{ ...viewTabBtn, backgroundColor: view === 'lista' ? '#1c1c1c' : 'transparent', color: view === 'lista' ? '#fff' : '#444' }}>
              Lista
            </button>
            <button onClick={() => setView('rendiconto')}
              style={{ ...viewTabBtn, backgroundColor: view === 'rendiconto' ? '#1c1c1c' : 'transparent', color: view === 'rendiconto' ? '#fff' : '#444' }}>
              Rendiconto
            </button>
          </div>
          {view === 'lista' && (
            <button
              onClick={() => showForm ? closeForm() : setShowForm(true)}
              style={{ backgroundColor: '#3ecf8e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap' }}
            >
              {showForm ? 'Annulla' : '+ Nuovo'}
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', color: '#991b1b', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {view === 'rendiconto' ? (
        <MonthlyReport payments={payments} />
      ) : (
      <>
      {/* Monthly summary */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #eaeaea', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
            {now.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, color: '#999' }}>Spese</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>€ {monthSpese.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#999' }}>Entrate</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#4ade80' }}>€ {monthEntrate.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#999' }}>Saldo</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: monthSaldo >= 0 ? '#111' : '#ef4444' }}>
                {monthSaldo >= 0 ? '+' : ''}€ {monthSaldo.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
        <span style={{ fontSize: 36 }}>📊</span>
      </div>

      {/* Upcoming unpaid */}
      {upcoming.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={sLabel}>Scadenze imminenti (30 giorni)</div>
          {upcoming.map(p => {
            const refDate = p.due_date || p.next_due_date
            const due     = new Date(refDate)
            const urgent  = due <= in7
            return (
              <div key={p.id} style={{
                backgroundColor: urgent ? '#fef2f2' : '#fffbeb',
                border: `1px solid ${urgent ? '#fee2e2' : '#fde68a'}`,
                borderRadius: 10, padding: '12px 16px', marginBottom: 8,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: urgent ? '#991b1b' : '#92400e', fontSize: 14, marginBottom: 2 }}>
                    {urgent && '⚠️ '}{p.title}
                  </div>
                  <div style={{ fontSize: 12, color: urgent ? '#b91c1c' : '#a16207' }}>
                    Scadenza: {due.toLocaleDateString('it-IT')} · € {Number(p.amount).toFixed(2)} · {p.category}
                  </div>
                </div>
                <button
                  onClick={() => downloadIcs(p)}
                  style={{ backgroundColor: 'transparent', border: `1px solid ${urgent ? '#fca5a5' : '#fde68a'}`,
                    borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12,
                    color: urgent ? '#991b1b' : '#92400e', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  📅 Calendario
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div ref={formRef} style={{ backgroundColor: '#ffffff', border: '1px solid #eaeaea', borderRadius: 12, padding: '20px', marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111', marginBottom: 18 }}>
            {editingId ? '✏️ Modifica movimento' : 'Nuovo movimento'}
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            {PAYMENT_TYPES.map(t => (
              <button key={t.id} type="button" onClick={() => setType(t.id)}
                style={{ flex: 1, padding: '9px 0', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                  border: `1px solid ${form.type === t.id ? t.color : '#ccc'}`,
                  backgroundColor: form.type === t.id ? t.color : 'transparent',
                  color: form.type === t.id ? '#fff' : '#444' }}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>

          <div style={fld}>
            <label style={lbl}>Titolo</label>
            <input type="text" placeholder="Es. Bolletta luce maggio"
              value={form.title} onChange={e => setField('title', e.target.value)} style={inp} />
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Importo (€)</label>
              <input type="number" min="0" step="0.01" placeholder="0.00"
                value={form.amount} onChange={e => setField('amount', e.target.value)} style={inp} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Categoria</label>
              <select value={form.category} onChange={e => setField('category', e.target.value)} style={inp}>
                {categoriesFor(form.type).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={fld}>
            <label style={lbl}>Data scadenza</label>
            <input type="date" value={form.due_date}
              onChange={e => setField('due_date', e.target.value)} style={inp} />
          </div>

          {/* Già pagato toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <input type="checkbox" id="chk-paid" checked={form.is_paid}
              onChange={e => setField('is_paid', e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#3ecf8e' }} />
            <label htmlFor="chk-paid" style={{ ...lbl, margin: 0, cursor: 'pointer' }}>
              {form.type === 'entrata' ? 'Ho già incassato' : 'Ho già pagato'}
            </label>
          </div>

          {form.is_paid && (
            <div style={fld}>
              <label style={lbl}>{getPaymentType(form.type).dateLabel}</label>
              <input type="date" value={form.paid_at}
                onChange={e => setField('paid_at', e.target.value)} style={inp} />
            </div>
          )}

          <div style={fld}>
            <label style={lbl}>Note (opzionale)</label>
            <textarea placeholder="Note aggiuntive..." value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              style={{ ...inp, resize: 'vertical', minHeight: 72 }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <input type="checkbox" id="chk-rec" checked={form.is_recurring}
              onChange={e => setField('is_recurring', e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#3ecf8e' }} />
            <label htmlFor="chk-rec" style={{ ...lbl, margin: 0, cursor: 'pointer' }}>Movimento ricorrente</label>
          </div>

          {form.is_recurring && (
            <div style={fld}>
              <label style={lbl}>Frequenza</label>
              <select value={form.recurrence_interval}
                onChange={e => setField('recurrence_interval', e.target.value)} style={inp}>
                <option value="monthly">Mensile</option>
                <option value="quarterly">Trimestrale</option>
                <option value="yearly">Annuale</option>
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={closeForm} disabled={saving}
              style={{ flex: '0 0 auto', backgroundColor: 'transparent', color: '#64748b', border: '1px solid #ccc',
                borderRadius: 8, padding: '11px 18px', fontWeight: 600, fontSize: 14,
                cursor: saving ? 'not-allowed' : 'pointer' }}>
              Annulla
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 1, backgroundColor: saving ? '#555' : '#1c1c1c', color: '#fff', border: 'none',
                borderRadius: 8, padding: '11px 0', fontWeight: 600, fontSize: 14,
                cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Salvataggio...' : editingId ? 'Aggiorna movimento' : 'Salva movimento'}
            </button>
          </div>
        </div>
      )}

      {/* Payments list */}
      {loading ? (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: 40, fontSize: 14 }}>Caricamento...</div>
      ) : sorted.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #eaeaea', borderRadius: 12, padding: 32, textAlign: 'center', color: '#888', fontSize: 14 }}>
          {onlyMine ? <>Nessun movimento.<br />Clicca &quot;+ Nuovo&quot; per iniziare.</> : 'Nessun movimento trovato.'}
        </div>
      ) : (
        <>
          <div style={sLabel}>Tutti i movimenti</div>
          {sorted.map(p => {
            const isOwn    = p.user_id === user.id
            const isPaying = markingPaid?.id === p.id
            const overdue  = !p.is_paid && p.due_date && new Date(p.due_date) < todayDate
            const pt       = getPaymentType(p.type)

            return (
              <div key={p.id} style={{
                backgroundColor: '#ffffff',
                border: `1px solid ${overdue ? '#fecaca' : '#eaeaea'}`,
                borderRadius: 12, padding: '14px 16px', marginBottom: 10,
                opacity: isOwn ? 1 : 0.85,
              }}>
                {/* Main row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title + badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: '#111', fontSize: 15 }}>{p.title}</span>

                      {/* Done / pending badge */}
                      {p.is_paid ? (
                        <span style={{ fontSize: 11, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap' }}>
                          ✓ {pt.doneLabel}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, backgroundColor: overdue ? '#fef2f2' : '#fffbeb', border: `1px solid ${overdue ? '#fecaca' : '#fde68a'}`, color: overdue ? '#991b1b' : '#92400e', borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap' }}>
                          {overdue ? '⚠️ Scaduto' : `⏳ ${pt.pendingLabel}`}
                        </span>
                      )}

                      {p.is_recurring && (
                        <span style={{ fontSize: 11, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap' }}>
                          🔁 {intervalLabel[p.recurrence_interval] || p.recurrence_interval}
                        </span>
                      )}
                      {!isOwn && (
                        <span style={{ fontSize: 11, backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', color: '#64748b', borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap' }}>
                          👤 Famiglia
                        </span>
                      )}
                    </div>

                    {/* Subtitle */}
                    <div style={{ fontSize: 13, color: '#666' }}>
                      {p.category}
                      {p.due_date  && <span> · Scadenza: {new Date(p.due_date).toLocaleDateString('it-IT')}</span>}
                      {p.is_paid && p.paid_at && <span> · {pt.doneLabel}: {new Date(p.paid_at).toLocaleDateString('it-IT')}</span>}
                      {p.notes && <span style={{ color: '#999' }}> — {p.notes}</span>}
                    </div>
                  </div>

                  {/* Right side: amount + actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: pt.color, whiteSpace: 'nowrap' }}>
                      {pt.emoji} € {Number(p.amount).toFixed(2)}
                    </span>
                    {p.is_recurring && (p.next_due_date || p.due_date) && (
                      <button onClick={() => downloadIcs(p)} title="Aggiungi al calendario"
                        style={{ backgroundColor: 'transparent', border: '1px solid #eaeaea', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>
                        📅
                      </button>
                    )}
                    {isOwn && !p.is_paid && (
                      <button
                        onClick={() => setMarkingPaid(isPaying ? null : { id: p.id, date: todayStr() })}
                        style={{ backgroundColor: '#3ecf8e', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}
                      >
                        ✓ {pt.verb}
                      </button>
                    )}
                    {isOwn && (
                      <button onClick={() => handleEdit(p)}
                        style={{ backgroundColor: 'transparent', color: '#1c1c1c', border: '1px solid #ccc', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        ✏️
                      </button>
                    )}
                    {isOwn && (
                      <button onClick={() => handleDelete(p.id)}
                        style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        Elimina
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline "mark as done" panel */}
                {isPaying && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #eaeaea', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: '#444', fontWeight: 500 }}>{pt.dateLabel}:</span>
                    <input type="date" value={markingPaid.date}
                      onChange={e => setMarkingPaid(m => ({ ...m, date: e.target.value }))}
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc', fontSize: 13, outline: 'none', backgroundColor: '#f9f9f9' }} />
                    <button
                      onClick={() => handleMarkPaid(p.id, markingPaid.date)}
                      style={{ backgroundColor: '#1c1c1c', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                      Conferma
                    </button>
                    <button
                      onClick={() => setMarkingPaid(null)}
                      style={{ backgroundColor: 'transparent', color: '#888', border: '1px solid #ddd', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>
                      Annulla
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}
      </>
      )}
    </div>
  )
}

// ── Rendiconto mensile ───────────────────────────────────────────────────────
// Per-mese, per-membro: spese/entrate/saldo. Nessuna nuova fetch di righe —
// riusa `payments` già caricato dal componente padre; carica solo l'elenco
// membri (email) via list_family_members(), stesso RPC di FamilySection.jsx.
function MonthlyReport({ payments }) {
  const [members, setMembers] = useState(null) // { [user_id]: email } oppure null finché non caricato
  const [membersError, setMembersError] = useState('')

  useEffect(() => {
    let cancelled = false
    supabase.rpc('list_family_members').then(({ data, error }) => {
      if (cancelled) return
      if (error) { setMembersError(error.message); return }
      const map = {}
      for (const m of data || []) map[m.user_id] = m.email
      setMembers(map)
    })
    return () => { cancelled = true }
  }, [])

  function memberLabel(userId) {
    const email = members?.[userId]
    return email ? email.split('@')[0] : userId.slice(0, 8)
  }

  // { 'YYYY-MM': { [user_id]: { spesa, entrata } } }, solo movimenti confermati
  const byMonth = {}
  for (const p of payments) {
    if (!p.is_paid || !p.paid_at) continue
    const d   = new Date(p.paid_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    byMonth[key] ??= {}
    byMonth[key][p.user_id] ??= { spesa: 0, entrata: 0 }
    byMonth[key][p.user_id][p.type === 'entrata' ? 'entrata' : 'spesa'] += Number(p.amount)
  }
  const months = Object.keys(byMonth).sort().reverse()

  if (members === null && !membersError) {
    return <div style={{ color: '#94a3b8', textAlign: 'center', padding: 40, fontSize: 14 }}>Caricamento...</div>
  }

  return (
    <div>
      {membersError && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', color: '#991b1b', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
          {membersError}
        </div>
      )}
      {months.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #eaeaea', borderRadius: 12, padding: 32, textAlign: 'center', color: '#888', fontSize: 14 }}>
          Nessun movimento confermato ancora — il rendiconto conta solo ciò che è stato segnato come {getPaymentType('spesa').doneLabel.toLowerCase()}/{getPaymentType('entrata').doneLabel.toLowerCase()}.
        </div>
      ) : months.map(month => {
        const rows = byMonth[month]
        const userIds = Object.keys(rows).sort((a, b) => memberLabel(a).localeCompare(memberLabel(b)))
        const totSpesa   = userIds.reduce((s, u) => s + rows[u].spesa, 0)
        const totEntrata = userIds.reduce((s, u) => s + rows[u].entrata, 0)
        const label = new Date(`${month}-01T00:00:00`).toLocaleString('it-IT', { month: 'long', year: 'numeric' })

        return (
          <div key={month} style={{ marginBottom: 24 }}>
            <div style={sLabel}>{label}</div>
            <div style={{ overflowX: 'auto', backgroundColor: '#ffffff', border: '1px solid #eaeaea', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 420 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #eaeaea' }}>
                    <th style={thStyle}>Membro</th>
                    <th style={{ ...thStyle, textAlign: 'right', color: '#ef4444' }}>Spese</th>
                    <th style={{ ...thStyle, textAlign: 'right', color: '#4ade80' }}>Entrate</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {userIds.map(u => {
                    const saldo = rows[u].entrata - rows[u].spesa
                    return (
                      <tr key={u} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={tdStyle}>{memberLabel(u)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>€ {rows[u].spesa.toFixed(2)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>€ {rows[u].entrata.toFixed(2)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: saldo >= 0 ? '#111' : '#ef4444' }}>
                          {saldo >= 0 ? '+' : ''}€ {saldo.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                  <tr>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>Totale famiglia</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>€ {totSpesa.toFixed(2)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>€ {totEntrata.toFixed(2)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: (totEntrata - totSpesa) >= 0 ? '#111' : '#ef4444' }}>
                      {(totEntrata - totSpesa) >= 0 ? '+' : ''}€ {(totEntrata - totSpesa).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const sLabel = { color: '#94a3b8', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px 0' }
const fld    = { marginBottom: 14 }
const viewTabBtn = { padding: '9px 14px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }
const thStyle = { textAlign: 'left', padding: '10px 12px', color: '#666', fontWeight: 600, fontSize: 12 }
const tdStyle = { padding: '9px 12px', color: '#111' }
const lbl    = { display: 'block', fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 5 }
const inp    = { width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #ccc', fontSize: 14, outline: 'none', backgroundColor: '#f9f9f9', color: '#111', colorScheme: 'light', boxSizing: 'border-box', fontFamily: 'system-ui, -apple-system, sans-serif' }
