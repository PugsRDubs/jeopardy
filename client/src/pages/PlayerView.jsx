import { useState, useEffect, useCallback } from 'react'
import BuzzerButton from '../components/BuzzerButton'
import AnimatedCounter from '../components/AnimatedCounter'

function PlayerView({ socket, playerData, gameCode, gameState, onDisconnect }) {
  const [phase, setPhase] = useState(gameState?.phase || 'LOBBY')
  const [score, setScore] = useState(gameState?.score || 0)
  const [leaderboard, setLeaderboard] = useState(null)
  const [hostDisconnected, setHostDisconnected] = useState(false)
  const [canBuzz, setCanBuzz] = useState(false)
  const [wasChosen, setWasChosen] = useState(false)

  useEffect(() => {
    socket.on('game:phase-change', ({ phase, leaderboard, failedPlayers }) => {
      setPhase(phase)
      if (phase === 'BUZZING') {
        const blocked = failedPlayers && failedPlayers.includes(playerData.id)
        setCanBuzz(!blocked)
      } else if (phase === 'ANSWERING' || phase === 'GRID' || phase === 'REVEALED') {
        setCanBuzz(false)
      }
      if (phase === 'GAME_OVER' && leaderboard) {
        setLeaderboard(leaderboard)
      }
    })
    socket.on('game:score-update', ({ playerId, score }) => {
      if (playerId === playerData.id) {
        setScore(score)
      }
    })
    socket.on('game:you-buzzed', () => {
      setWasChosen(true)
    })
    socket.on('host:disconnect', () => {
      setHostDisconnected(true)
      setTimeout(() => onDisconnect(), 3000)
    })
    socket.on('game:host-quit', () => {
      setHostDisconnected(true)
      setTimeout(() => onDisconnect(), 1000)
    })
    return () => {
      socket.off('game:phase-change')
      socket.off('game:score-update')
      socket.off('game:you-buzzed')
      socket.off('host:disconnect')
      socket.off('game:host-quit')
    }
  }, [socket, playerData.id, onDisconnect])

  useEffect(() => {
    if (phase !== 'ANSWERING') {
      setWasChosen(false)
    }
  }, [phase])

  const handleBuzz = useCallback(() => {
    if (canBuzz) {
      socket.emit('game:buzz', { code: gameCode })
    }
  }, [socket, gameCode, canBuzz])

  if (hostDisconnected) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Host Disconnected</h1>
        <p style={styles.text}>Returning to menu...</p>
      </div>
    )
  }

  if (phase === 'LOBBY' || phase === 'WAITING') {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Waiting...</h1>
        <p style={styles.text}>Game has not started yet</p>
        <p style={styles.name}>{playerData.name}</p>
      </div>
    )
  }

  if (phase === 'GRID' || phase === 'REVEALED' || phase === 'QUESTION_ENDED') {
    return (
      <div style={styles.container}>
        <div aria-live="polite" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden' }}>
          {phase}
        </div>
        <div style={styles.scoreDisplay}>
          <span style={styles.scoreLabel}>Score</span>
          <span style={styles.scoreValue}><AnimatedCounter value={score} /></span>
        </div>
        <p style={styles.footerName}>{playerData.name}</p>
      </div>
    )
  }

  if (phase === 'BUZZING') {
    if (canBuzz) {
      return (
        <div style={styles.container}>
          <div aria-live="polite" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden' }}>
            Buzzing open
          </div>
          <div style={styles.scoreDisplay}>
            <span style={styles.scoreLabel}>Score</span>
            <span style={styles.scoreValue}><AnimatedCounter value={score} /></span>
          </div>
          <BuzzerButton onBuzz={handleBuzz} />
          <p style={styles.footerName}>{playerData.name}</p>
        </div>
      )
    }
    return (
      <div style={styles.container}>
        <div style={styles.scoreDisplay}>
          <span style={styles.scoreLabel}>Score</span>
          <span style={styles.scoreValue}><AnimatedCounter value={score} /></span>
        </div>
        <p style={styles.text}>You already answered this question</p>
        <p style={styles.footerName}>{playerData.name}</p>
      </div>
    )
  }

  if (phase === 'ANSWERING') {
    return (
      <div style={styles.container}>
        <div aria-live="polite" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden' }}>
          {wasChosen ? 'You are up' : 'Someone is answering'}
        </div>
        <div style={styles.scoreDisplay}>
          <span style={styles.scoreLabel}>Score</span>
          <span style={styles.scoreValue}><AnimatedCounter value={score} /></span>
        </div>
        {wasChosen ? (
          <p style={styles.chosen}>You're up!</p>
        ) : (
          <p style={styles.waiting}>Someone answered...</p>
        )}
        <p style={styles.footerName}>{playerData.name}</p>
      </div>
    )
  }

  if (phase === 'GAME_OVER' && leaderboard) {
    const playerRank = leaderboard.find(l => l.id === playerData.id)
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Game Over!</h1>
        {playerRank && (
          <p style={styles.yourRank}>
            You placed #{playerRank.rank} with {playerRank.score} points!
          </p>
        )}
        <button onClick={onDisconnect} style={styles.returnButton}>
          Return to Menu
        </button>
        <p style={styles.footerName}>{playerData.name}</p>
      </div>
    )
  }

  return null
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '1rem',
    userSelect: 'none'
  },
  title: {
    fontSize: '2.5rem',
    color: '#fff',
    marginBottom: '1rem'
  },
  text: {
    fontSize: '1.2rem',
    color: '#888'
  },
  name: {
    fontSize: '1.5rem',
    color: '#4361ee',
    marginTop: '1rem',
    fontWeight: 'bold'
  },
  scoreDisplay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '2rem',
    padding: '1.5rem 3rem',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, rgba(42, 42, 74, 0.8) 0%, rgba(42, 42, 90, 0.8) 100%)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
  },
  scoreLabel: {
    fontSize: '1rem',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.1em'
  },
  scoreValue: {
    fontSize: '4rem',
    fontWeight: 'bold',
    color: '#fff'
  },
  waiting: {
    fontSize: '1.5rem',
    color: '#888',
    marginTop: '2rem'
  },
  chosen: {
    fontSize: '1.8rem',
    color: '#2ecc71',
    fontWeight: 'bold',
    marginTop: '2rem'
  },
  yourRank: {
    fontSize: '1.5rem',
    color: '#4361ee',
    fontWeight: 'bold',
    marginBottom: '2rem'
  },
  leaderboard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    width: '100%',
    maxWidth: '400px',
    marginBottom: '2rem'
  },
  leaderboardRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.8rem 1.2rem',
    borderRadius: '8px',
    gap: '1rem'
  },
  lbName: {
    fontSize: '1.1rem',
    color: '#fff',
    flex: 1
  },
  rank: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#fff',
    width: '40px'
  },
  score: {
    fontSize: '1.2rem',
    color: '#fff',
    marginLeft: 'auto',
    fontWeight: 'bold'
  },
  footerName: {
    position: 'fixed',
    bottom: '1rem',
    fontSize: '1.1rem',
    color: '#666'
  },
  returnButton: {
    padding: '0.8rem 2rem',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    background: '#4361ee',
    color: '#fff',
    borderRadius: '8px',
    marginBottom: '2rem'
  }
}

export default PlayerView
