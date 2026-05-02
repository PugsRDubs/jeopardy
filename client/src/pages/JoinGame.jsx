import { useState } from 'react'

function JoinGame({ code, socket, onConnected, onBack }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleJoin = () => {
    if (name.trim().length === 0) return
    socket.emit('game:join', { code, name: name.trim() }, (response) => {
      if (response.error) {
        setError(response.error)
      } else {
        onConnected(response.player, response.gameState)
      }
    })
  }

  return (
    <div style={styles.container} className="page-enter">
      <button onClick={onBack} style={styles.backButton}>&larr; Back</button>
      <div style={styles.card}>
        <h2 style={styles.title}>Enter Your Name</h2>
        <p style={styles.subtitle}>Game Code: {code}</p>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setError('') }}
          placeholder="Your name"
          style={styles.input}
          maxLength={20}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          autoFocus
        />
        {error && <p style={styles.error}>{error}</p>}
        <button
          onClick={handleJoin}
          style={{
            ...styles.joinButton,
            opacity: name.trim().length > 0 ? 1 : 0.5
          }}
          disabled={name.trim().length === 0}
        >
          Join Game
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
  backButton: {
    position: 'absolute',
    top: '2rem',
    left: '2rem',
    padding: '0.5rem 1rem',
    background: 'transparent',
    color: '#aaa',
    fontSize: '1rem',
    border: '1px solid #4a4a6a',
    borderRadius: '4px'
  },
  card: {
    background: '#2a2a4a',
    padding: '2rem',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    width: '100%',
    maxWidth: '400px'
  },
  title: {
    fontSize: '1.8rem',
    color: '#fff'
  },
  subtitle: {
    color: '#888',
    fontSize: '1.1rem'
  },
  input: {
    padding: '0.8rem 1rem',
    fontSize: '1.2rem',
    border: '2px solid #4a4a6a',
    borderRadius: '8px',
    background: '#1a1a2e',
    color: '#fff',
    width: '100%',
    textAlign: 'center',
    outline: 'none'
  },
  error: {
    color: '#ff6b6b',
    fontSize: '0.9rem'
  },
  joinButton: {
    padding: '0.8rem 2rem',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    background: '#4361ee',
    color: '#fff',
    borderRadius: '8px',
    width: '100%',
    transition: 'opacity 0.2s'
  }
}

export default JoinGame
