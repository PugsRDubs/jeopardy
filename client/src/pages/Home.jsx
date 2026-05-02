import { useState } from 'react'

function Home({ onJoin, codeError, onHost }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const handleJoin = () => {
    if (code.trim().length > 0) {
      setError('')
      onJoin(code.trim().toUpperCase())
    }
  }

  const displayError = codeError || error

  return (
    <div style={styles.container} className="page-enter">
      <h1 style={styles.title}>Not Jeopardy</h1>

      <div style={styles.joinSection}>
        <label style={styles.label}>Enter Game Code</label>
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError('') }}
          placeholder="ABC123"
          style={styles.codeInput}
          maxLength={6}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
        />
        <button
          onClick={handleJoin}
          style={{
            ...styles.joinButton,
            opacity: code.trim().length > 0 ? 1 : 0.5
          }}
          disabled={code.trim().length === 0}
          aria-label="Join game"
        >
          Join Game
        </button>
        {displayError && <p style={styles.error}>{displayError}</p>}
      </div>

      <button onClick={onHost} style={styles.optionButton} aria-label="Host a game">
        Host a Game
      </button>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '2rem',
    background: 'linear-gradient(180deg, rgba(67, 97, 238, 0.08) 0%, transparent 50%)'
  },
  title: {
    fontSize: '3rem',
    marginBottom: '3rem',
    color: '#fff'
  },
  joinSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem'
  },
  label: {
    fontSize: '1.2rem',
    color: '#aaa'
  },
  codeInput: {
    padding: '1rem 1.5rem',
    fontSize: '2rem',
    letterSpacing: '0.5rem',
    textAlign: 'center',
    border: '2px solid #4a4a6a',
    borderRadius: '8px',
    background: '#2a2a4a',
    color: '#fff',
    width: '280px',
    outline: 'none'
  },
  joinButton: {
    padding: '1rem 2rem',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    background: '#4361ee',
    color: '#fff',
    borderRadius: '8px',
    width: '280px',
    transition: 'opacity 0.2s'
  },
  error: {
    color: '#ff6b6b',
    fontSize: '0.95rem'
  },
  optionButton: {
    padding: '1rem 2rem',
    fontSize: '1.2rem',
    background: '#2a2a4a',
    color: '#aaa',
    border: '2px solid #4a4a6a',
    borderRadius: '8px',
    width: '280px',
    marginTop: '3.5rem',
    transition: 'all 0.2s'
  }
}

export default Home
