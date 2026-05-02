import { useState, useEffect, useRef } from 'react'
import Avatar from '../components/Avatar'

function Lobby({ socket, gameCode, onBack, onKick, onStart }) {
  const [players, setPlayers] = useState([])
  const [countdown, setCountdown] = useState(null)
  const joinSound = useRef(null)
  const countdownBeep = useRef(null)
  const prevPlayerCount = useRef(0)

  useEffect(() => {
    joinSound.current = new Audio('/sounds/player-join.wav')
    countdownBeep.current = new Audio('/sounds/countdown-beep.wav')
  }, [])

  useEffect(() => {
    socket.on('game:player-list', (newPlayers) => {
      if (newPlayers.length > prevPlayerCount.current) {
        if (joinSound.current) {
          joinSound.current.currentTime = 0
          joinSound.current.play()
        }
      }
      prevPlayerCount.current = newPlayers.length
      setPlayers(newPlayers)
    })
    return () => socket.off('game:player-list')
  }, [socket])

  useEffect(() => {
    if (countdown === null) return
    if (countdown === 0) {
      onStart()
      return
    }
    if (countdownBeep.current) {
      countdownBeep.current.currentTime = 0
      countdownBeep.current.play()
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown, onStart])

  const handleStart = () => {
    setCountdown(3)
  }

  const handleCancel = () => {
    setCountdown(null)
  }

  return (
    <div style={styles.container} className="page-enter">
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
            <div style={styles.playerInfo}>
              <Avatar name={p.name} size={36} />
              <span style={styles.playerName}>{p.name}</span>
            </div>
            <button onClick={() => onKick(p.id)} style={styles.kickButton}>Kick</button>
          </div>
        ))}
      </div>
      <button
        onClick={handleStart}
        disabled={players.length < 2 || countdown !== null}
        style={{
          ...styles.startButton,
          opacity: players.length >= 2 && countdown === null ? 1 : 0.4
        }}
      >
        Start Game
      </button>

      {countdown !== null && (
        <div style={styles.countdownOverlay} onClick={e => e.stopPropagation()}>
          <div style={styles.countdownNumber} key={countdown}>{countdown > 0 ? countdown : 'GO!'}</div>
          <button onClick={handleCancel} style={styles.cancelButton}>Cancel</button>
        </div>
      )}
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
    alignItems: 'center',
    background: 'linear-gradient(180deg, rgba(67, 97, 238, 0.08) 0%, transparent 50%)',
    minHeight: '100vh'
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
    background: 'linear-gradient(135deg, #2a2a4a 0%, #3a2a5a 100%)',
    padding: '1.5rem 3rem',
    borderRadius: '12px',
    textAlign: 'center',
    marginBottom: '2rem',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
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
  playerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem'
  },
  playerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.8rem 1rem',
    background: 'linear-gradient(135deg, #2a2a4a 0%, #2a2a5a 100%)',
    borderRadius: '8px',
    marginBottom: '0.5rem'
  },
  playerName: {
    fontSize: '1.1rem',
    color: '#fff'
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
  },
  countdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(17, 17, 39, 0.7)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  countdownNumber: {
    fontSize: '10rem',
    fontWeight: 'bold',
    color: '#4361ee',
    marginBottom: '2rem',
    animation: 'countdown-pulse 0.5s ease-out'
  },
  cancelButton: {
    padding: '0.8rem 2rem',
    fontSize: '1.1rem',
    background: 'transparent',
    color: '#ff6b6b',
    border: '2px solid #ff6b6b',
    borderRadius: '8px',
    cursor: 'pointer'
  }
}

export default Lobby
