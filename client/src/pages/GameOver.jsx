import { useEffect, useState } from 'react'
import Confetti from '../components/Confetti'
import Avatar from '../components/Avatar'

function GameOver({ leaderboard, onBack }) {
  const [gameOverSound] = useState(() => {
    const audio = new Audio('/sounds/gameover.wav')
    return audio
  })

  useEffect(() => {
    gameOverSound.play()
  }, [gameOverSound])

  return (
    <div style={styles.container} className="page-enter">
      <Confetti active={true} />
      <h1 style={styles.title}>Game Over!</h1>
      <div style={styles.leaderboard}>
        {leaderboard.map((entry) => (
          <div key={entry.id} style={styles.row}>
            <Avatar name={entry.name} size={40} />
            <span style={styles.rank}>#{entry.rank}</span>
            <span style={styles.name}>{entry.name}</span>
            <span style={styles.score}>{entry.score}</span>
          </div>
        ))}
      </div>
      <button onClick={onBack} style={styles.backButton}>
        Return to Menu
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
    alignItems: 'center',
    minHeight: '100vh',
    justifyContent: 'center'
  },
  title: {
    fontSize: '3rem',
    color: '#fff',
    marginBottom: '2rem'
  },
  leaderboard: {
    width: '100%',
    marginBottom: '3rem'
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    background: 'linear-gradient(135deg, #2a2a4a 0%, #2a2a5a 100%)',
    borderRadius: '8px',
    marginBottom: '0.5rem',
    gap: '1rem',
    transition: 'transform 0.2s',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
  },
  rank: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#4361ee',
    width: '50px'
  },
  name: {
    fontSize: '1.3rem',
    color: '#fff',
    flex: 1
  },
  score: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#fff'
  },
  backButton: {
    padding: '1rem 2rem',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    background: '#4361ee',
    color: '#fff',
    borderRadius: '8px'
  }
}

export default GameOver
