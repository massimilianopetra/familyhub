import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import AuthScreen from './components/AuthScreen'
import ResetPasswordScreen from './components/ResetPasswordScreen'
import Dashboard from './components/Dashboard'

// Componente Principale
export default function App() {
  const [session, setSession] = useState(null)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [errore, setErrore] = useState('')

  useEffect(() => {
    // Controlla se il fragment URL contiene un errore (es. link scaduto)
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const errorCode = hash.get('error_code')
    if (errorCode === 'otp_expired') {
      setErrore('Il link è scaduto. Richiedi un nuovo reset della password.')
      window.history.replaceState(null, '', window.location.pathname)
    } else if (hash.get('error')) {
      setErrore('Link non valido. Richiedi un nuovo reset della password.')
      window.history.replaceState(null, '', window.location.pathname)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true)
        setErrore('')
        setSession(session)
      } else {
        setRecoveryMode(false)
        setSession(session)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (recoveryMode) return <ResetPasswordScreen onDone={() => setRecoveryMode(false)} />
  if (!session) return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh' }}>
      {errore && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#7f1d1d', color: '#fca5a5', padding: '12px 20px', borderRadius: '8px', fontSize: '14px', zIndex: 9999 }}>
          {errore}
        </div>
      )}
      <AuthScreen setErrore={setErrore} />
    </div>
  )
  return <Dashboard session={session} />
}
