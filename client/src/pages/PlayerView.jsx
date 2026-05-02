import { useState, useEffect, useCallback } from 'react'
import BuzzerButton from '../components/BuzzerButton'

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
    return () => {
      socket.off('game:phase-change')
      socket.off('game:score-update')
      socket.off('game:you-buzzed')
      socket.off('host:disconnect')
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
        <div style={styles.scoreDisplay}>
          <span style={styles.scoreLabel}>Score</span>
          <span style={styles.scoreValue}>{score}</span>
        </div>
        <p style={styles.footerName}>{playerData.name}</p>
      </div>
    )
  }

  if (phase === 'BUZZING') {
    if (canBuzz) {
      return (
        <div style={styles.container}>
          <div style={styles.scoreDisplay}>
            <span style={styles.scoreLabel}>Score</span>
            <span style={styles.scoreValue}>{score}</span>
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
          <span style={styles.scoreValue}>{score}</span>
        </div>
        <p style={styles.text}>You cannot buzz</p>
        <p style={styles.footerName}>{playerData.name}</p>
      </div>
    )
  }

  if (phase === 'ANSWERING') {
    return (
      <div style={styles.container}>
        <div style={styles.scoreDisplay}>
          <span style={styles.scoreLabel}>Score</span>
          <span style={styles.scoreValue}>{score}</span>
        </div>
        {wasChosen ? (
          <p style={styles.chosen}>You were chosen!</p>
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
        <div style={styles.leaderboard}>
          {leaderboard.map((entry) => (
            <div
              key={entry.id}
              style={{
                ...styles.leaderboardRow,
                background: entry.id === playerData.id ? '#4361ee' : '#2a2a4a'
              }}
            >
              <span style={styles.rank}>#{entry.rank}</span>
              <span style={styles.name}>{entry.name}</span>
              <span style={styles.score}>{entry.score}</span>
            </div>
          ))}
        </div>
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
    marginBottom: '2rem'
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
    maxWidth: '400px'
  },
  leaderboardRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.8rem 1.2rem',
    borderRadius: '8px',
    gap: '1rem'
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
  }
}

export default PlayerView
