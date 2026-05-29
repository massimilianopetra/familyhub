import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import AuthScreen from './components/AuthScreen'
import ResetPasswordScreen from './components/ResetPasswordScreen'

// Componente Principale
export default function App() {
  const [session, setSession] = useState(null)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [errore, setErrore] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true)
        setSession(session)
      } else {
        setRecoveryMode(false)
        setSession(session)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center', marginTop: '50px' }}>
      <h1>FamHub Assistente 🏠</h1>
      {errore && <p style={{ color: 'red' }}>{errore}</p>}

      {recoveryMode ? (
        <ResetPasswordScreen onDone={() => setRecoveryMode(false)} />
      ) : !session ? (
        <AuthScreen setErrore={setErrore} />
      ) : (
        <div style={{ maxWidth: '400px', margin: 'auto', padding: '20px', border: '1px solid #ccc' }}>
          <h3>Benvenuto, {session.user.email}!</h3>
          <button onClick={() => supabase.auth.signOut()} style={{ background: '#ff4d4d', color: 'white', border: 'none', padding: '8px 12px' }}>Esci</button>
          <hr />
          <p>La tua infrastruttura React + Supabase client-side è pronta.</p>
        </div>
      )}
    </div>
  )
}
