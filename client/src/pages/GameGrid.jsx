import { useState, useEffect, useRef, useCallback } from 'react'
import QuestionReveal from './QuestionReveal'

const NUM_COLS = 6
const NUM_ROWS = 5

function GameGrid({ socket, gameCode, board, onGameOver, onBack }) {
  const [questionStates, setQuestionStates] = useState(
    board.categories.map(() => new Array(NUM_ROWS).fill(false))
  )
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [phase, setPhase] = useState('GRID')
  const [gridKey, setGridKey] = useState(0)
  const [gridSize, setGridSize] = useState({ scale: 1, width: 0, height: 0 })
  const [animRect, setAnimRect] = useState(null)
  const [animStage, setAnimStage] = useState('idle')
  const containerRef = useRef(null)
  const headerRef = useRef(null)
  const overlayRef = useRef(null)
  const onGameOverRef = useRef(onGameOver)
  const cellClickRef = useRef(null)
  const quitSound = useRef(null)
  const cellHoverRef = useRef(null)
  const hoverPlayed = useRef(new Set())

  useEffect(() => {
    onGameOverRef.current = onGameOver
    cellClickRef.current = new Audio('/sounds/cell-click.wav')
    quitSound.current = new Audio('/sounds/quit.wav')
    cellHoverRef.current = new Audio('/sounds/cell-hover.wav')
  }, [onGameOver])

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const headerRect = headerRef.current?.getBoundingClientRect()
      const headerH = headerRect ? headerRect.height + 8 : 50
      const cellWidth = 200
      const cellHeight = 150
      const gap = 8
      const baseWidth = cellWidth * NUM_COLS + gap * (NUM_COLS + 1)
      const baseHeight = cellHeight * (NUM_ROWS + 1) + gap * (NUM_ROWS + 2)
      const scaleX = rect.width / baseWidth
      const scaleY = (rect.height - headerH) / baseHeight
      const scale = Math.min(scaleX, scaleY, 1)
      setGridSize({ scale, width: baseWidth * scale, height: baseHeight * scale })
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

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

  useEffect(() => {
    if (phase === 'GRID') {
      setAnimRect(null)
      setAnimStage('idle')
      setGridKey(prev => prev + 1)
    }
  }, [phase])

  useEffect(() => {
    if (phase === 'REVEALED' && animRect && animStage === 'idle') {
      setAnimStage('expanding')
    }
  }, [phase, animRect, animStage])

  useEffect(() => {
    if (animStage === 'expanding' && overlayRef.current) {
      overlayRef.current.style.transform = `translate(${animRect.tx}px, ${animRect.ty}px) scale(${animRect.sx}, ${animRect.sy})`
      overlayRef.current.style.transition = 'none'
      overlayRef.current.offsetHeight
      overlayRef.current.style.transition = 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)'
      overlayRef.current.style.transform = 'none'
    }
  }, [animStage])

  const handleBack = useCallback(() => {
    socket.emit('game:back', { code: gameCode })
    setCurrentQuestion(null)
    setPhase('GRID')
  }, [socket, gameCode])

  const handleAnswerComplete = useCallback(() => {}, [])

  const handleContinue = useCallback(() => {
    socket.emit('game:continue', { code: gameCode })
    setPhase('GRID')
  }, [socket, gameCode])

  const handleQuit = useCallback(() => {
    if (quitSound.current) {
      quitSound.current.currentTime = 0
      quitSound.current.play()
    }
    socket.emit('game:host-quit', { code: gameCode })
    onBack()
  }, [socket, gameCode, onBack])

  const handleCellMouseMove = useCallback((e) => {
    const cell = e.currentTarget
    const key = cell.getAttribute('data-cell-key')
    if (!hoverPlayed.current.has(key)) {
      hoverPlayed.current.add(key)
      if (cellHoverRef.current) {
        cellHoverRef.current.currentTime = 0
        cellHoverRef.current.volume = 0.3
        cellHoverRef.current.play()
      }
    }
    const rect = cell.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    const tilt = `perspective(500px) rotateY(${x * 15}deg) rotateX(${-y * 15}deg) scale(1.03)`
    cell.style.transform = tilt
    cell.style.boxShadow = `${-x * 8}px ${y * 8 + 10}px 20px rgba(0, 0, 0, 0.4), 0 0 20px rgba(107, 138, 255, 0.4)`
    cell.style.background = 'linear-gradient(135deg, #4a4a70 0%, #4a4a82 100%)'
  }, [])

  const handleCellMouseLeave = useCallback((e) => {
    const cell = e.currentTarget
    const key = cell.getAttribute('data-cell-key')
    hoverPlayed.current.delete(key)
    cell.style.transform = ''
    cell.style.boxShadow = ''
    cell.style.background = 'linear-gradient(135deg, #3a3a5e 0%, #3a3a70 100%)'
  }, [])

  const handleCellClick = useCallback((e, col, row) => {
    const completed = questionStates[col]?.[row]
    if (completed || phase !== 'GRID') return
    const cellEl = e.currentTarget
    const rect = cellEl.getBoundingClientRect()
    const tx = rect.left
    const ty = rect.top
    const sx = rect.width / window.innerWidth
    const sy = rect.height / window.innerHeight
    setAnimRect({ tx, ty, sx, sy })
    cellClickRef.current.currentTime = 0
    cellClickRef.current.play()
    socket.emit('game:select-question', { code: gameCode, catIdx: col, valIdx: row })
  }, [questionStates, phase, socket, gameCode])

  const isAnimating = animRect && animStage !== 'idle'

  return (
    <div style={styles.container} ref={containerRef} className="page-enter">
      <div ref={headerRef} style={styles.header}>
        <h1 style={styles.gameCode}>{gameCode}</h1>
        <button onClick={handleQuit} style={styles.quitButton}>Quit Game</button>
      </div>
      <div style={{
        ...styles.gridWrapper,
        width: gridSize.width,
        height: gridSize.height,
      }}>
        <table key={gridKey} style={{ ...styles.grid, borderSpacing: `${8 * gridSize.scale}px` }}>
          <colgroup>
            {board.categories.map((_, i) => (
              <col key={i} style={{ width: `${200 * gridSize.scale}px` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {board.categories.map((cat, i) => (
                <th key={i} style={{ ...styles.categoryHeader, height: `${50 * gridSize.scale}px`, fontSize: `${1 * gridSize.scale}rem`, borderRadius: `${4 * gridSize.scale}px` }}>{cat}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: NUM_ROWS }, (_, row) => (
              <tr key={row}>
                {Array.from({ length: NUM_COLS }, (_, col) => {
                  const completed = questionStates[col]?.[row]
                  const cellIndex = col * NUM_ROWS + row
                  return (
                    <td
                      key={`${col}-${row}`}
                      data-cell-key={`${col}-${row}`}
                      style={{
                        width: `${200 * gridSize.scale}px`,
                        height: `${150 * gridSize.scale}px`,
                        fontSize: `${2 * gridSize.scale}rem`,
                        borderRadius: `${4 * gridSize.scale}px`,
                        ...(styles.cell),
                        ...(completed ? styles.cellCompleted : styles.cellActive),
                        animation: completed ? undefined : `cellStagger 0.3s ease ${cellIndex * 20}ms both`,
                        transformStyle: 'preserve-3d',
                        transition: completed ? 'all 0.4s ease' : 'transform 0.15s ease, box-shadow 0.15s ease',
                        transformOrigin: 'center'
                      }}
                      className={completed ? 'cell-completed' : 'cell-active'}
                      onMouseMove={!completed ? handleCellMouseMove : undefined}
                      onMouseLeave={!completed ? handleCellMouseLeave : undefined}
                      onClick={(e) => handleCellClick(e, col, row)}
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

      {isAnimating && (
        <div
          ref={overlayRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'linear-gradient(180deg, #111127 0%, #1a1a2e 50%, #1e1e38 100%)',
            transformOrigin: 'top left',
            zIndex: 1000,
          }}
          onTransitionEnd={(e) => {
            if (e.propertyName === 'transform') {
              setAnimStage('done')
            }
          }}
        >
          <QuestionReveal
            socket={socket}
            gameCode={gameCode}
            question={currentQuestion}
            phase={phase}
            onBack={handleBack}
            onAnswerComplete={handleAnswerComplete}
            onContinue={handleContinue}
          />
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-start'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: '0.5rem 1rem 0.25rem',
    flexShrink: 0
  },
  quitButton: {
    padding: '0.5rem 1rem',
    background: 'transparent',
    color: '#ff6b6b',
    fontSize: '0.9rem',
    border: '1px solid #ff6b6b',
    borderRadius: '4px'
  },
  gridWrapper: {
    display: 'flex',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  grid: {
    borderCollapse: 'separate'
  },
  categoryHeader: {
    padding: '0.5rem',
    background: 'linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)',
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 10px rgba(67, 97, 238, 0.3)',
    textShadow: '0 1px 3px rgba(0,0,0,0.3)'
  },
  cell: {
    textAlign: 'center',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  cellActive: {
    background: 'linear-gradient(135deg, #3a3a5e 0%, #3a3a70 100%)',
    color: '#7b8aff',
    border: '1px solid rgba(107, 138, 255, 0.2)'
  },
  cellCompleted: {
    background: '#1a1a2e',
    color: '#333',
    cursor: 'default',
    textDecoration: 'line-through'
  }
}

const cellStyleEl = document.createElement('style')
cellStyleEl.textContent = `
  .cell-active:hover {
    box-shadow: 0 0 20px rgba(107, 138, 255, 0.5), 0 4px 15px rgba(0, 0, 0, 0.3) !important;
  }
  .cell-completed {
    animation: cellComplete 0.4s ease forwards !important;
  }
`
document.head.appendChild(cellStyleEl)

export default GameGrid
