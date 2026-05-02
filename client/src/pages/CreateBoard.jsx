import { useState, useEffect, useRef } from 'react'
import { getBoards, createBoard, updateBoard, deleteBoard, renameBoard, getBoard } from '../utils/boardStorage'

function CreateBoard({ onBack }) {
  const [boards, setBoards] = useState(getBoards())
  const [currentBoard, setCurrentBoard] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const timerRef = useRef(null)

  const handleCreate = () => {
    const name = prompt('Board name:')
    if (!name?.trim()) return
    const board = createBoard(name.trim())
    setBoards(getBoards())
    setCurrentBoard(board)
    setEditMode(true)
  }

  const handleEdit = (board) => {
    setCurrentBoard({ ...board })
    setEditMode(true)
  }

  const handleDelete = (id) => {
    if (!confirm('Delete this board?')) return
    deleteBoard(id)
    setBoards(getBoards())
  }

  const handleRename = (id) => {
    const name = prompt('New name:')
    if (name?.trim()) {
      renameBoard(id, name.trim())
      setBoards(getBoards())
    }
  }

  const updateField = (path, value) => {
    setCurrentBoard(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      let obj = next
      for (let i = 0; i < path.length - 1; i++) {
        obj = obj[path[i]]
      }
      obj[path[path.length - 1]] = value
      return next
    })
  }

  useEffect(() => {
    if (!currentBoard || !editMode) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      updateBoard(currentBoard)
      setBoards(getBoards())
    }, 5000)
    return () => clearTimeout(timerRef.current)
  }, [currentBoard, editMode])

  const handleBack = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (currentBoard) {
      updateBoard(currentBoard)
      setBoards(getBoards())
    }
    setCurrentBoard(null)
    setEditMode(false)
  }

  if (editMode && currentBoard) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={handleBack} style={styles.backButton}>&larr; Save & Back</button>
          <input
            value={currentBoard.name}
            onChange={(e) => updateField(['name'], e.target.value)}
            style={styles.boardNameInput}
          />
        </div>
        <div style={styles.editor}>
          <div style={styles.categoryRow}>
            {currentBoard.categories.map((cat, i) => (
              <input
                key={i}
                value={cat}
                onChange={(e) => updateField(['categories', i], e.target.value)}
                placeholder={`Category ${i + 1}`}
                style={styles.categoryInput}
              />
            ))}
          </div>
          {[0, 1, 2, 3, 4].map(row => (
            <div key={row} style={styles.questionRow}>
              <div style={styles.pointLabel}>{(row + 1) * 100}</div>
              {currentBoard.categories.map((_, col) => (
                <div key={col} style={styles.questionCell}>
                  <input
                    value={currentBoard.questions[col][row].question}
                    onChange={(e) => updateField(['questions', col, row, 'question'], e.target.value)}
                    placeholder="Question"
                    style={styles.questionInput}
                  />
                  <input
                    value={currentBoard.questions[col][row].answer}
                    onChange={(e) => updateField(['questions', col, row, 'answer'], e.target.value)}
                    placeholder="Answer"
                    style={styles.answerInput}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <button onClick={onBack} style={styles.backButton}>&larr; Back</button>
      <h1 style={styles.title}>Create Board</h1>
      <div style={styles.boardList}>
        {boards.length === 0 && (
          <p style={styles.empty}>No boards yet. Create one!</p>
        )}
        {boards.map(board => (
          <div key={board.id} style={styles.boardCard}>
            <span style={styles.boardName}>{board.name}</span>
            <span style={styles.date}>
              {new Date(board.updatedAt).toLocaleDateString()}
            </span>
            <div style={styles.actions}>
              <button onClick={() => handleRename(board.id)} style={styles.actionBtn}>Rename</button>
              <button onClick={() => handleDelete(board.id)} style={{ ...styles.actionBtn, color: '#ff6b6b' }}>Delete</button>
              <button onClick={() => handleEdit(board)} style={{ ...styles.actionBtn, color: '#4361ee' }}>Edit</button>
            </div>
          </div>
        ))}
      </div>
      <button onClick={handleCreate} style={styles.createButton}>
        Create New Board
      </button>
    </div>
  )
}

const styles = {
  container: {
    padding: '1rem',
    minHeight: '100vh'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem'
  },
  backButton: {
    padding: '0.5rem 1rem',
    background: 'transparent',
    color: '#aaa',
    fontSize: '1rem',
    border: '1px solid #4a4a6a',
    borderRadius: '4px'
  },
  boardNameInput: {
    padding: '0.5rem 1rem',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    background: 'transparent',
    color: '#fff',
    border: 'none',
    borderBottom: '2px solid #4361ee',
    outline: 'none',
    flex: 1
  },
  title: {
    fontSize: '2rem',
    marginBottom: '2rem',
    color: '#fff'
  },
  boardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '2rem'
  },
  empty: {
    color: '#888',
    textAlign: 'center',
    padding: '2rem'
  },
  boardCard: {
    background: '#2a2a4a',
    padding: '1rem 1.5rem',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  boardName: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    minWidth: '150px'
  },
  date: {
    color: '#666',
    fontSize: '0.9rem'
  },
  actions: {
    display: 'flex',
    gap: '0.5rem'
  },
  actionBtn: {
    padding: '0.4rem 0.8rem',
    background: 'transparent',
    color: '#aaa',
    fontSize: '0.9rem',
    border: '1px solid #4a4a6a',
    borderRadius: '4px'
  },
  createButton: {
    padding: '1rem 2rem',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    background: '#4361ee',
    color: '#fff',
    borderRadius: '8px',
    width: '100%'
  },
  editor: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    overflowX: 'auto'
  },
  categoryRow: {
    display: 'flex',
    gap: '0.5rem',
    marginLeft: '60px'
  },
  categoryInput: {
    flex: 1,
    padding: '0.8rem',
    fontSize: '1rem',
    fontWeight: 'bold',
    background: '#4361ee',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    textAlign: 'center',
    outline: 'none'
  },
  questionRow: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center'
  },
  pointLabel: {
    width: '60px',
    textAlign: 'center',
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#4361ee'
  },
  questionCell: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem'
  },
  questionInput: {
    padding: '0.5rem',
    fontSize: '0.85rem',
    background: '#2a2a4a',
    color: '#fff',
    border: '1px solid #4a4a6a',
    borderRadius: '4px',
    outline: 'none'
  },
  answerInput: {
    padding: '0.5rem',
    fontSize: '0.85rem',
    background: '#1a1a2e',
    color: '#2ecc71',
    border: '1px solid #4a4a6a',
    borderRadius: '4px',
    outline: 'none'
  }
}

export default CreateBoard
