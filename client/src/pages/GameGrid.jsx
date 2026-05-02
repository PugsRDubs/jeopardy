import { useState, useEffect, useRef, useCallback } from 'react'
import QuestionReveal from './QuestionReveal'

function GameGrid({ socket, gameCode, board, onGameOver, onBack }) {
  const [questionStates, setQuestionStates] = useState(
    board.categories.map(() => new Array(5).fill(false))
  )
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [phase, setPhase] = useState('GRID')
  const onGameOverRef = useRef(onGameOver)

  useEffect(() => {
    onGameOverRef.current = onGameOver
  }, [onGameOver])

  useEffect(() => {
    socket.on('game:question-reveal', (data) => {
      setCurrentQuestion(data)
      setPhase('REVEALED')
    })
    socket.on('game:phase-change', ({ phase, leaderboard }) => {
      if (phase === 'GAME_OVER') {
        if (leaderboard) onGameOverRef.current(leaderboard)
        return
      }
      if (phase === 'GRID') {
        setCurrentQuestion(null)
      }
      setPhase(phase)
    })
    socket.on('game:question-states', (states) => {
      setQuestionStates(states)
    })
    return () => {
      socket.off('game:question-reveal')
      socket.off('game:phase-change')
      socket.off('game:question-states')
    }
  }, [socket])

  const handleBack = useCallback(() => {
    socket.emit('game:back', { code: gameCode })
    setCurrentQuestion(null)
    setPhase('GRID')
  }, [socket, gameCode])

  const handleAnswerComplete = useCallback(() => {
    setCurrentQuestion(null)
    setPhase('GRID')
  }, [])

  if (phase === 'REVEALED' || phase === 'BUZZING' || phase === 'ANSWERING') {
    return (
      <QuestionReveal
        socket={socket}
        gameCode={gameCode}
        question={currentQuestion}
        phase={phase}
        onBack={handleBack}
        onAnswerComplete={handleAnswerComplete}
      />
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.gameCode}>Code: {gameCode}</h1>
        <button onClick={onBack} style={styles.quitButton}>Quit Game</button>
      </div>
      <table style={styles.grid}>
        <thead>
          <tr>
            {board.categories.map((cat, i) => (
              <th key={i} style={styles.categoryHeader}>{cat}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2, 3, 4].map(row => (
            <tr key={row}>
              {[0, 1, 2, 3, 4].map(col => {
                const completed = questionStates[col]?.[row]
                return (
                  <td
                    key={`${col}-${row}`}
                    style={{
                      ...styles.cell,
                      ...(completed ? styles.cellCompleted : styles.cellActive)
                    }}
                    onClick={() => {
                      if (!completed && phase === 'GRID') {
                        socket.emit('game:select-question', { code: gameCode, catIdx: col, valIdx: row })
                      }
                    }}
                  >
                    {!completed ? (row + 1) * 100 : ''}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const styles = {
  container: {
    padding: '1rem',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  gameCode: {
    fontSize: '1.2rem',
    color: '#888'
  },
  quitButton: {
    padding: '0.5rem 1rem',
    background: 'transparent',
    color: '#ff6b6b',
    fontSize: '0.9rem',
    border: '1px solid #ff6b6b',
    borderRadius: '4px'
  },
  grid: {
    width: '100%',
    flex: 1,
    borderCollapse: 'collapse'
  },
  categoryHeader: {
    padding: '1rem',
    background: '#4361ee',
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  cell: {
    textAlign: 'center',
    fontSize: '2rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '2px solid #2a2a4a'
  },
  cellActive: {
    background: '#2a2a4a',
    color: '#4361ee'
  },
  cellCompleted: {
    background: '#1a1a2e',
    color: '#333',
    cursor: 'default',
    textDecoration: 'line-through'
  }
}

export default GameGrid
