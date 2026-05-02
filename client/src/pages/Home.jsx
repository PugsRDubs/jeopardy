import { useState } from 'react'

function Home({ onJoin, codeError, onHost, onCreate }) {
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
        <div style={styles.joinRow}>
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
          >
            Join Game
          </button>
        </div>
        {displayError && <p style={styles.error}>{displayError}</p>}
      </div>

      <div style={styles.divider} />

      <div style={styles.optionsRow}>
        <button onClick={onHost} style={styles.optionButton}>
          Host a Game
        </button>
        <button onClick={onCreate} style={styles.optionButton}>
          Create Board
        </button>
      </div>
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
    gap: '1rem',
    marginBottom: '2rem'
  },
  label: {
    fontSize: '1.2rem',
    color: '#aaa'
  },
  joinRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    alignItems: 'center'
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
  divider: {
    width: '60%',
    height: '1px',
    background: '#4a4a6a',
    margin: '2rem 0'
  },
  optionsRow: {
    display: 'flex',
    gap: '2rem'
  },
  optionButton: {
    padding: '1rem 2rem',
    fontSize: '1.2rem',
    background: '#2a2a4a',
    color: '#aaa',
    border: '2px solid #4a4a6a',
    borderRadius: '8px',
    transition: 'all 0.2s'
  }
}

export default Home
