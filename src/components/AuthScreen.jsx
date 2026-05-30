import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function AuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')
  const [successo, setSuccesso] = useState('')
  const [registrationEnabled, setRegistrationEnabled] = useState(false)

  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key','registration_enabled').single()
      .then(({ data }) => {
        if (data) setRegistrationEnabled(data.value === true || data.value === 'true')
      })
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrore('')
    setSuccesso('')
    
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setErrore(error.message)
    }
    setLoading(false)
  }

  const handleForgotPassword = async () => {
    setErrore('')
    setSuccesso('')
    if (!email) {
      setErrore('Inserisci la tua email prima di richiedere il reset.')
      return
    }
    setLoading(true)
    const redirectTo = window.location.origin + window.location.pathname
    const { error } = await supabase.auth.resetPasswordForEmail(email, { emailRedirectTo: redirectTo })
    setLoading(false)
    if (error) {
      setErrore(error.message)
    } else {
      setSuccesso('Email inviata! Controlla la tua casella di posta.')
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrore('')
    setSuccesso('')

    const redirectTo = window.location.origin + window.location.pathname
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo }
    })
    if (error) {
      setErrore(error.message)
    } else {
      setSuccesso('Registrazione avviata! Controlla la mail per confermare.')
    }
    setLoading(false)
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h3 style={styles.title}>Benvenuto</h3>
        <p style={styles.subtitle}>Inserisci le tue credenziali per accedere</p>

        <form style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input 
              type="email" 
              placeholder="nome@esempio.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              style={styles.input} 
              disabled={loading}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.passwordInput}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={styles.eyeButton}
                tabIndex={-1}
                aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="button" onClick={handleForgotPassword} style={styles.forgotLink} disabled={loading}>
            Hai dimenticato la password?
          </button>

          {errore && <div style={styles.errorAlert}>{errore}</div>}
          {successo && <div style={styles.successAlert}>{successo}</div>}

          <button
            onClick={handleLogin}
            style={{ ...styles.button, ...styles.buttonPrimary }}
            disabled={loading}
          >
            {loading ? 'Attendi...' : 'Accedi'}
          </button>

          <div style={styles.divider}>
            <span style={styles.dividerText}>Non hai ancora un account?</span>
          </div>

          {registrationEnabled && (
            <button
              onClick={handleSignUp}
              style={{ ...styles.button, ...styles.buttonSecondary }}
              disabled={loading}
            >
              Crea account
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

// Oggetto per gli stili in linea (Design in stile Supabase/Moderno)
const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '80vh',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
    width: '100%',
    maxWidth: '400px',
    border: '1px solid #eaeaea',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '24px',
    fontWeight: '600',
    color: '#111111',
    textAlign: 'center',
  },
  subtitle: {
    margin: '0 0 24px 0',
    fontSize: '14px',
    color: '#666666',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#444444',
  },
  input: {
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    backgroundColor: '#f9f9f9',
  },
  passwordWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  passwordInput: {
    width: '100%',
    padding: '12px 42px 12px 12px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    backgroundColor: '#f9f9f9',
    boxSizing: 'border-box',
  },
  eyeButton: {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    color: '#888',
    display: 'flex',
    alignItems: 'center',
  },
  errorAlert: {
    padding: '10px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    fontSize: '13px',
  },
  successAlert: {
    padding: '10px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #dcfce7',
    color: '#166534',
    borderRadius: '6px',
    fontSize: '13px',
  },
  button: {
    width: '100%',
    padding: '12px',
    borderRadius: '6px',
    fontWeight: '500',
    fontSize: '14px',
    cursor: 'pointer',
    border: 'none',
    transition: 'opacity 0.2s',
  },
  buttonPrimary: {
    backgroundColor: '#1c1c1c',
    color: '#ffffff',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    color: '#888888',
    border: '1px solid #dddddd',
    fontSize: '13px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '4px 0',
  },
  dividerText: {
    width: '100%',
    textAlign: 'center',
    fontSize: '12px',
    color: '#aaaaaa',
  },
  forgotLink: {
    background: 'none',
    border: 'none',
    color: '#666',
    fontSize: '13px',
    cursor: 'pointer',
    textAlign: 'right',
    padding: '0',
    textDecoration: 'underline',
    alignSelf: 'flex-end',
  },
}
