import { useState, useEffect, useCallback, useRef } from 'react'
import Confetti from '../components/Confetti'
import Avatar from '../components/Avatar'

function QuestionReveal({ socket, gameCode, question, phase, onBack, onAnswerComplete, onContinue }) {
  const [firstBuzz, setFirstBuzz] = useState(null)
  const [playersFailed, setPlayersFailed] = useState([])
  const [endedData, setEndedData] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const buzzSoundRef = useRef(null)
  const correctSoundRef = useRef(null)
  const wrongSoundRef = useRef(null)
  const startBuzzRef = useRef(null)
  const buttonSoundRef = useRef(null)

  useEffect(() => {
    buzzSoundRef.current = new Audio('/sounds/buzz.wav')
    correctSoundRef.current = new Audio('/sounds/correct.wav')
    wrongSoundRef.current = new Audio('/sounds/wrong.wav')
    startBuzzRef.current = new Audio('/sounds/start-buzzing.wav')
    buttonSoundRef.current = new Audio('/sounds/button.wav')
  }, [])

  useEffect(() => {
    const handleFirstBuzz = (data) => {
      setFirstBuzz(data)
      buzzSoundRef.current.currentTime = 0
      buzzSoundRef.current.play()
    }
    socket.on('game:first-buzz', handleFirstBuzz)
    return () => socket.off('game:first-buzz', handleFirstBuzz)
  }, [socket])

  useEffect(() => {
    socket.on('game:question-ended', (data) => {
      setEndedData(data)
    })
    return () => socket.off('game:question-ended')
  }, [socket])

  useEffect(() => {
    if (phase !== 'QUESTION_ENDED') {
      setEndedData(null)
    }
  }, [phase])

  const handleStartBuzzing = useCallback(() => {
    startBuzzRef.current.currentTime = 0
    startBuzzRef.current.play()
    socket.emit('game:start-buzzing', { code: gameCode })
  }, [socket, gameCode])

  const handleCancelBuzzing = useCallback(() => {
    socket.emit('game:cancel-buzzing', { code: gameCode })
  }, [socket, gameCode])

  const handleEndQuestion = useCallback(() => {
    socket.emit('game:end-question', { code: gameCode })
    onAnswerComplete('ended')
  }, [socket, gameCode, onAnswerComplete])

  const handleCorrect = useCallback(() => {
    socket.emit('game:answer-correct', { code: gameCode })
    correctSoundRef.current.currentTime = 0
    correctSoundRef.current.play()
    setShowConfetti(true)
    onAnswerComplete('correct')
  }, [socket, gameCode, onAnswerComplete])

  const handleWrong = useCallback(() => {
    if (firstBuzz) {
      setPlayersFailed(prev => [...prev, firstBuzz.playerId])
      setFirstBuzz(null)
      socket.emit('game:answer-wrong', { code: gameCode })
      wrongSoundRef.current.currentTime = 0
      wrongSoundRef.current.play()
    }
  }, [socket, gameCode, firstBuzz, onAnswerComplete])

  const handleCancelAnswer = useCallback(() => {
    socket.emit('game:cancel-answer', { code: gameCode })
    onAnswerComplete('cancelled')
  }, [socket, gameCode, onAnswerComplete])

  if (phase === 'QUESTION_ENDED' && endedData) {
    return (
      <div style={styles.container}>
        <Confetti active={showConfetti} />
        <h2 style={styles.gameCode}>{gameCode}</h2>
        <div style={styles.card}>
          <h2 style={styles.questionText}>{endedData.question}</h2>
          <p style={styles.answerLabel}>Answer:</p>
          <p style={styles.answerText}>{endedData.answer}</p>
        </div>
        {endedData.leaderboard && (
          <div style={styles.leaderboard}>
            {endedData.leaderboard.map((entry) => (
              <div key={entry.id} style={styles.leaderboardRow}>
                <Avatar name={entry.name} size={36} />
                <span style={styles.lbRank}>#{entry.rank}</span>
                <span style={styles.lbName}>{entry.name}</span>
                <span style={styles.lbScore}>{entry.score}</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => { buttonSoundRef.current.currentTime = 0; buttonSoundRef.current.play(); onContinue() }} style={styles.continueButton}>
          Continue
        </button>
      </div>
    )
  }

  if (phase === 'REVEALED') {
    return (
      <div style={styles.container}>
        <h2 style={styles.gameCode}>{gameCode}</h2>
        <div style={styles.card}>
          <span style={styles.category}>{question.category}</span>
          <span style={styles.value}>{question.value} points</span>
          <h2 style={styles.questionText}>{question.question}</h2>
        </div>
        <div style={styles.actions}>
          <button onClick={onBack} style={styles.backButton}>&larr; Back</button>
          <button onClick={handleStartBuzzing} style={styles.startBuzzButton}>
            Start Buzzing
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'BUZZING') {
    return (
      <div style={styles.container}>
        <h2 style={styles.gameCode}>{gameCode}</h2>
        <div style={styles.card}>
          <span style={styles.category}>{question.category}</span>
          <span style={styles.value}>{question.value} points</span>
          <h2 style={styles.questionText}>{question.question}</h2>
        </div>
        <div style={styles.buzzIndicator}>
          <div style={styles.buzzText}>Waiting for buzz...</div>
          <div style={styles.pulseDot} />
        </div>
        <div style={styles.actions}>
          <button onClick={handleCancelBuzzing} style={styles.cancelButton}>
            Cancel
          </button>
          <button onClick={handleEndQuestion} style={styles.endButton}>
            End Question
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'ANSWERING') {
    return (
      <div style={styles.container}>
        <h2 style={styles.gameCode}>{gameCode}</h2>
        <div style={styles.card}>
          <span style={styles.category}>{question.category}</span>
          <span style={styles.value}>{question.value} points</span>
          <h2 style={styles.questionText}>{firstBuzz ? firstBuzz.question : question.question}</h2>
        </div>
        {firstBuzz && (
          <div style={styles.buzzPlayer}>
            <Avatar name={firstBuzz.playerName} size={60} />
            <span style={styles.buzzPlayerLabel}>{firstBuzz.playerName}</span>
            <span style={styles.buzzPlayerText}>buzzed in!</span>
          </div>
        )}
        <div style={styles.actions}>
          <button onClick={handleCancelAnswer} style={styles.cancelButton}>
            Cancel
          </button>
          <button onClick={handleCorrect} style={styles.correctButton}>
            Correct
          </button>
          <button onClick={handleWrong} style={styles.wrongButton}>
            Next Player
          </button>
          <button onClick={handleEndQuestion} style={styles.endButton}>
            End Question
          </button>
        </div>
        {playersFailed.length > 0 && (
          <p style={styles.failedText}>{playersFailed.length} player(s) failed this question</p>
        )}
      </div>
    )
  }

  return null
}

const styles = {
  container: {
    padding: '2rem',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2rem'
  },
  gameCode: {
    position: 'fixed',
    top: '1rem',
    left: '1.5rem',
    fontSize: '1.2rem',
    color: '#888',
    margin: 0
  },
  card: {
    background: 'linear-gradient(135deg, #2a2a4a 0%, #2a2a5a 100%)',
    padding: '2rem',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    maxWidth: '800px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)'
  },
  category: {
    fontSize: '1rem',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.1em'
  },
  value: {
    fontSize: '1.2rem',
    color: '#4361ee',
    fontWeight: 'bold'
  },
  questionText: {
    fontSize: '2rem',
    color: '#fff',
    marginTop: '1rem',
    lineHeight: 1.4
  },
  answerLabel: {
    fontSize: '1rem',
    color: '#888',
    marginTop: '1rem'
  },
  answerText: {
    fontSize: '1.5rem',
    color: '#2ecc71',
    fontWeight: 'bold'
  },
  buzzIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  buzzText: {
    fontSize: '1.5rem',
    color: '#888'
  },
  pulseDot: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    background: '#e63946',
    animation: 'pulseDot 1s ease-in-out infinite'
  },
  buzzPlayer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.3rem'
  },
  buzzPlayerLabel: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#fff'
  },
  buzzPlayerText: {
    fontSize: '1.2rem',
    color: '#888'
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  backButton: {
    padding: '0.8rem 1.5rem',
    background: 'transparent',
    color: '#aaa',
    fontSize: '1rem',
    border: '1px solid #4a4a6a',
    borderRadius: '6px'
  },
  startBuzzButton: {
    padding: '0.8rem 2rem',
    background: '#4361ee',
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    borderRadius: '6px'
  },
  cancelButton: {
    padding: '0.8rem 1.5rem',
    background: 'transparent',
    color: '#aaa',
    fontSize: '1rem',
    border: '1px solid #4a4a6a',
    borderRadius: '6px'
  },
  endButton: {
    padding: '0.8rem 1.5rem',
    background: '#666',
    color: '#fff',
    fontSize: '1rem',
    borderRadius: '6px'
  },
  correctButton: {
    padding: '0.8rem 2rem',
    background: '#2ecc71',
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    borderRadius: '6px'
  },
  wrongButton: {
    padding: '0.8rem 2rem',
    background: '#e63946',
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    borderRadius: '6px'
  },
  failedText: {
    color: '#666',
    fontSize: '0.9rem'
  },
  continueButton: {
    padding: '1rem 3rem',
    background: '#4361ee',
    color: '#fff',
    fontSize: '1.3rem',
    fontWeight: 'bold',
    borderRadius: '8px'
  },
  leaderboard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    width: '100%',
    maxWidth: '500px'
  },
  leaderboardRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.6rem 1rem',
    background: 'linear-gradient(135deg, #2a2a4a 0%, #2a2a5a 100%)',
    borderRadius: '8px',
    gap: '0.8rem'
  },
  lbRank: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#4361ee',
    width: '35px'
  },
  lbName: {
    fontSize: '1.1rem',
    color: '#fff',
    flex: 1
  },
  lbScore: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#fff'
  }
}

const styleEl = document.createElement('style')
styleEl.textContent = `
  @keyframes pulseDot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.3; transform: scale(1.5); }
  }
`
document.head.appendChild(styleEl)

export default QuestionReveal
