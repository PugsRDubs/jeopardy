import { useState, useEffect, useCallback, useRef } from 'react'

function QuestionReveal({ socket, gameCode, question, phase, onBack, onAnswerComplete, onContinue }) {
  const [firstBuzz, setFirstBuzz] = useState(null)
  const [playersFailed, setPlayersFailed] = useState([])
  const [endedData, setEndedData] = useState(null)
  const buzzSoundRef = useRef(null)
  const correctSoundRef = useRef(null)
  const wrongSoundRef = useRef(null)

  useEffect(() => {
    buzzSoundRef.current = new Audio('/sounds/buzz.wav')
    correctSoundRef.current = new Audio('/sounds/correct.wav')
    wrongSoundRef.current = new Audio('/sounds/wrong.wav')
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
    socket.emit('game:start-buzzing', { code: gameCode })
  }, [socket, gameCode])

  const handleCancelBuzzing = useCallback(() => {
    socket.emit('game:cancel-buzzing', { code: gameCode })
    onBack()
  }, [socket, gameCode, onBack])

  const handleEndQuestion = useCallback(() => {
    socket.emit('game:end-question', { code: gameCode })
    onAnswerComplete('ended')
  }, [socket, gameCode, onAnswerComplete])

  const handleCorrect = useCallback(() => {
    socket.emit('game:answer-correct', { code: gameCode })
    correctSoundRef.current.currentTime = 0
    correctSoundRef.current.play()
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
        <div style={styles.card}>
          <h2 style={styles.questionText}>{endedData.question}</h2>
          <p style={styles.answerLabel}>Answer:</p>
          <p style={styles.answerText}>{endedData.answer}</p>
        </div>
        <button onClick={onContinue} style={styles.continueButton}>
          Continue
        </button>
      </div>
    )
  }

  if (phase === 'REVEALED') {
    return (
      <div style={styles.container}>
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
        <div style={styles.card}>
          <span style={styles.category}>{question.category}</span>
          <span style={styles.value}>{question.value} points</span>
          <h2 style={styles.questionText}>{firstBuzz ? firstBuzz.question : question.question}</h2>
        </div>
        {firstBuzz && (
          <div style={styles.buzzPlayer}>
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
  card: {
    background: '#2a2a4a',
    padding: '2rem',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    maxWidth: '800px',
    width: '100%',
    textAlign: 'center'
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
