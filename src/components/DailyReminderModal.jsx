import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { getEventType } from '../utils/eventTypes'

function pad(n) { return String(n).padStart(2, '0') }
function dateToStr(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` }

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

// forceTrigger: incrementato dal menu per riaprire il riepilogo a comando,
// ignorando il flag "già visto oggi" salvato in localStorage.
export default function DailyReminderModal({ session, forceTrigger }) {
  const [data, setData] = useState(null) // { payments, events, todayS } oppure null
  const userId = session?.user?.id
  const lastTrigger = useRef(0)

  useEffect(() => {
    if (!userId) return
    const isForced = forceTrigger > lastTrigger.current
    lastTrigger.current = forceTrigger ?? 0

    const todayStr    = dateToStr(new Date())
    const storageKey  = `dailyReminderShown_${userId}`
    if (!isForced && localStorage.getItem(storageKey) === todayStr) return

    let cancelled = false

    async function load() {
      const today  = new Date(); today.setHours(0, 0, 0, 0)
      const in7    = new Date(today); in7.setDate(in7.getDate() + 7)
      const todayS = dateToStr(today)
      const in7S   = dateToStr(in7)

      const [{ data: payments }, { data: events }, { data: deadlines }] = await Promise.all([
        supabase.from('payments').select('*').eq('user_id', userId).eq('is_paid', false),
        supabase.from('calendar_events').select('*').eq('user_id', userId)
          .lte('event_date', in7S)
          .or(`event_date.gte.${todayS},end_date.gte.${todayS}`)
          .eq('is_deadline', false),
        supabase.from('calendar_events').select('*').eq('user_id', userId)
          .eq('is_deadline', true).eq('completed', false),
      ])

      const duePayments = (payments ?? [])
        .filter(p => {
          const ref = p.due_date || p.next_due_date
          return ref && ref <= in7S
        })
        .sort((a, b) => (a.due_date || a.next_due_date).localeCompare(b.due_date || b.next_due_date))

      const upcomingEvents = (events ?? [])
        .sort((a, b) => a.event_date.localeCompare(b.event_date))

      const pendingDeadlines = (deadlines ?? [])
        .sort((a, b) => a.event_date.localeCompare(b.event_date))

      if (cancelled) return
      localStorage.setItem(storageKey, todayS)
      if (duePayments.length > 0 || upcomingEvents.length > 0 || pendingDeadlines.length > 0 || isForced) {
        setData({ payments: duePayments, events: upcomingEvents, deadlines: pendingDeadlines, todayS })
      }
    }

    load()
    return () => { cancelled = true }
  }, [userId, forceTrigger])

  if (!data) return null

  async function markDeadlineDone(id) {
    const completed_at = dateToStr(new Date())
    await supabase.from('calendar_events').update({ completed: true, completed_at }).eq('id', id)
    setData(prev => prev && { ...prev, deadlines: prev.deadlines.filter(d => d.id !== id) })
  }

  const isEmpty = data.payments.length === 0 && data.events.length === 0 && data.deadlines.length === 0

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}
      onClick={e => e.target === e.currentTarget && setData(null)}>
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px',
        padding: '24px 20px', width: '90%', maxWidth: '380px', maxHeight: '80vh', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 24px 60px rgba(0,0,0,0.85)' }}>

        <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f1f5f9' }}>
          📋 Riepilogo di oggi
        </div>

        {data.payments.length > 0 && (
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase',
              letterSpacing: '0.05em', marginBottom: '8px' }}>
              💳 Scadenze pagamenti
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.payments.map(p => {
                const ref = p.due_date || p.next_due_date
                const overdue = ref < data.todayS
                return (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px',
                    background: '#0f172a', borderRadius: '8px', padding: '8px 12px',
                    borderLeft: `3px solid ${overdue ? '#ef4444' : '#fbbf24'}` }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f1f5f9' }}>{p.title}</div>
                      <div style={{ fontSize: '0.72rem', color: overdue ? '#f87171' : '#94a3b8' }}>
                        {overdue ? '⚠️ Scaduto' : 'Scade'} il {fmtDate(ref)} · {p.category}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#f1f5f9', whiteSpace: 'nowrap' }}>
                      € {Number(p.amount).toFixed(2)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {data.deadlines.length > 0 && (
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase',
              letterSpacing: '0.05em', marginBottom: '8px' }}>
              ⏰ Scadenze in corso
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.deadlines.map(e => {
                const { emoji } = getEventType(e.event_type)
                const overdue = e.event_date < data.todayS
                return (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
                    background: '#0f172a', borderRadius: '8px', padding: '8px 12px',
                    borderLeft: `3px solid ${overdue ? '#ef4444' : '#fbbf24'}` }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f1f5f9' }}>{emoji} {e.title}</div>
                      <div style={{ fontSize: '0.72rem', color: overdue ? '#f87171' : '#94a3b8' }}>
                        {overdue ? '⚠️ Dal' : 'Dal'} {fmtDate(e.event_date)}
                      </div>
                    </div>
                    <button onClick={() => markDeadlineDone(e.id)}
                      style={{ background: 'none', border: '1px solid #4ade80', borderRadius: '20px', padding: '3px 10px',
                        fontSize: '0.7rem', fontWeight: '700', color: '#4ade80', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      ✓ Fatto
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {isEmpty && (
          <div style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', padding: '8px 0' }}>
            Nessuna scadenza o appuntamento nei prossimi 7 giorni. 🎉
          </div>
        )}

        {data.events.length > 0 && (
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase',
              letterSpacing: '0.05em', marginBottom: '8px' }}>
              📅 Appuntamenti in arrivo
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.events.map(e => {
                const { emoji, color } = getEventType(e.event_type)
                return (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px',
                    background: '#0f172a', borderRadius: '8px', padding: '8px 12px', borderLeft: `3px solid ${color}` }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f1f5f9' }}>{emoji} {e.title}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {fmtDate(e.event_date)}{e.start_time ? ` · ${e.start_time.slice(0,5)}` : ''}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <button onClick={() => setData(null)}
          style={{ padding: '11px', background: '#1d4ed8', border: 'none', borderRadius: '8px',
            color: '#fff', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer' }}>
          Ho capito
        </button>
      </div>
    </div>
  )
}
