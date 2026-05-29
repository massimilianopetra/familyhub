import React, { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function ResetPasswordScreen({ onDone }) {
  const [password, setPassword] = useState('')
  const [conferma, setConferma] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')
  const [successo, setSuccesso] = useState('')

  const handleReset = async (e) => {
    e.preventDefault()
    setErrore('')

    if (password.length < 6) {
      setErrore('La password deve essere di almeno 6 caratteri.')
      return
    }
    if (password !== conferma) {
      setErrore('Le password non coincidono.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setErrore(error.message)
    } else {
      setSuccesso('Password aggiornata! Ora puoi accedere.')
      setTimeout(onDone, 2000)
    }
  }

  const EyeIcon = () => showPassword ? (
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
  )

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h3 style={styles.title}>Nuova password</h3>
        <p style={styles.subtitle}>Scegli una nuova password per il tuo account</p>

        <form onSubmit={handleReset} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Nuova password</label>
            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.passwordInput}
                disabled={loading}
                required
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} style={styles.eyeButton} tabIndex={-1} aria-label={showPassword ? 'Nascondi' : 'Mostra'}>
                <EyeIcon />
              </button>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Conferma password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={conferma}
              onChange={(e) => setConferma(e.target.value)}
              style={styles.input}
              disabled={loading}
              required
            />
          </div>

          {errore && <div style={styles.errorAlert}>{errore}</div>}
          {successo && <div style={styles.successAlert}>{successo}</div>}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Attendi...' : 'Aggiorna password'}
          </button>
        </form>
      </div>
    </div>
  )
}

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
    boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
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
    backgroundColor: '#f9f9f9',
    boxSizing: 'border-box',
    width: '100%',
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
    padding: '12px',
    borderRadius: '6px',
    fontWeight: '500',
    fontSize: '14px',
    cursor: 'pointer',
    border: 'none',
    backgroundColor: '#1c1c1c',
    color: '#ffffff',
    marginTop: '8px',
  },
}
