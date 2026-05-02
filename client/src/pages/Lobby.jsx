import { useState, useEffect } from 'react'

function Lobby({ socket, gameCode, onBack, onKick, onStart }) {
  const [players, setPlayers] = useState([])

  useEffect(() => {
    socket.on('game:player-list', setPlayers)
    return () => socket.off('game:player-list')
  }, [socket])

  return (
    <div style={styles.container}>
      <button onClick={onBack} style={styles.backButton}>&larr; Back</button>
      <h1 style={styles.title}>Game Lobby</h1>
      <div style={styles.codeDisplay}>
        <span style={styles.codeLabel}>Game Code</span>
        <span style={styles.codeValue}>{gameCode}</span>
      </div>
      <div style={styles.playerList}>
        <h2 style={styles.subtitle}>Players ({players.length})</h2>
        {players.map(p => (
          <div key={p.id} style={styles.playerRow}>
            <span style={styles.playerName}>
              {p.name}
              {p.disconnected && <span style={styles.disconnected}> (disconnected)</span>}
            </span>
            <button onClick={() => onKick(p.id)} style={styles.kickButton}>Kick</button>
          </div>
        ))}
      </div>
      <button
        onClick={onStart}
        disabled={players.length < 2}
        style={{
          ...styles.startButton,
          opacity: players.length >= 2 ? 1 : 0.4
        }}
      >
        Start Game
      </button>
    </div>
  )
}

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '600px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: '0.5rem 1rem',
    background: 'transparent',
    color: '#aaa',
    fontSize: '1rem',
    border: '1px solid #4a4a6a',
    borderRadius: '4px',
    marginBottom: '2rem'
  },
  title: {
    fontSize: '2rem',
    marginBottom: '1.5rem',
    color: '#fff'
  },
  codeDisplay: {
    background: '#2a2a4a',
    padding: '1.5rem 3rem',
    borderRadius: '12px',
    textAlign: 'center',
    marginBottom: '2rem'
  },
  codeLabel: {
    display: 'block',
    fontSize: '0.9rem',
    color: '#888',
    marginBottom: '0.5rem'
  },
  codeValue: {
    fontSize: '3rem',
    fontWeight: 'bold',
    color: '#4361ee',
    letterSpacing: '0.3em'
  },
  playerList: {
    width: '100%',
    marginBottom: '2rem'
  },
  subtitle: {
    fontSize: '1.2rem',
    color: '#aaa',
    marginBottom: '1rem'
  },
  playerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.8rem 1rem',
    background: '#2a2a4a',
    borderRadius: '6px',
    marginBottom: '0.5rem'
  },
  playerName: {
    fontSize: '1.1rem',
    color: '#fff'
  },
  disconnected: {
    color: '#666',
    fontStyle: 'italic',
    fontSize: '0.9rem'
  },
  kickButton: {
    padding: '0.3rem 0.7rem',
    background: 'transparent',
    color: '#ff6b6b',
    fontSize: '0.85rem',
    border: '1px solid #ff6b6b',
    borderRadius: '4px'
  },
  startButton: {
    padding: '1rem 3rem',
    fontSize: '1.3rem',
    fontWeight: 'bold',
    background: '#2ecc71',
    color: '#fff',
    borderRadius: '8px',
    transition: 'opacity 0.2s'
  }
}

export default Lobby
