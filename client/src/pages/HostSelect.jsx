import { useState, useEffect, useRef } from 'react'
import { getBoards, createBoard, updateBoard, deleteBoard, renameBoard, getBoard } from '../utils/boardStorage'
import { encodeBoard, getShareUrl } from '../utils/shareBoard'

function HostSelect({ socket, creating, onBack, onSelectBoard }) {
  const [boards, setBoards] = useState(getBoards())
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [sharingBoard, setSharingBoard] = useState(null)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [editingBoard, setEditingBoard] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const timerRef = useRef(null)

  useEffect(() => {
    const msg = sessionStorage.getItem('importMsg')
    if (msg) {
      setImportMsg(msg)
      sessionStorage.removeItem('importMsg')
    }
  }, [])

  const handleShare = async (board) => {
    const encoded = await encodeBoard(board)
    const url = getShareUrl(encoded)
    setSharingBoard(board)
    setShareUrl(url)
    setCopied(false)
  }

  const copyShareUrl = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
  }

  const closeShareModal = () => {
    setSharingBoard(null)
    setShareUrl('')
    setCopied(false)
  }

  const handleSelect = (board) => {
    if (!isBoardValid(board)) {
      alert('Board must have all 6 categories and 30 questions/answers filled in.')
      return
    }
    onSelectBoard(board)
  }

  const handleDelete = (id) => {
    if (!confirm('Delete this board?')) return
    deleteBoard(id)
    setBoards(getBoards())
  }

  const startRename = (board) => {
    setEditingId(board.id)
    setEditName(board.name)
  }

  const saveRename = (id) => {
    if (editName.trim()) {
      renameBoard(id, editName.trim())
      setBoards(getBoards())
    }
    setEditingId(null)
  }

  const handleEdit = (board) => {
    setEditingBoard({ ...board })
    setEditMode(true)
  }

  const handleCreateNew = () => {
    const board = createBoard('New Board')
    setBoards(getBoards())
    setEditingBoard({ ...board })
    setEditMode(true)
  }

  const updateField = (path, value) => {
    setEditingBoard(prev => {
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
    if (!editingBoard || !editMode) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      updateBoard(editingBoard)
      setBoards(getBoards())
    }, 5000)
    return () => clearTimeout(timerRef.current)
  }, [editingBoard, editMode])

  const handleBackFromEdit = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (editingBoard) {
      updateBoard(editingBoard)
      setBoards(getBoards())
    }
    setEditingBoard(null)
    setEditMode(false)
  }

  if (editMode && editingBoard) {
    return (
      <div style={styles.editContainer}>
        <div style={styles.header}>
          <button onClick={handleBackFromEdit} style={styles.backButton}>← Save & Back</button>
          <input
            value={editingBoard.name}
            onChange={(e) => updateField(['name'], e.target.value)}
            style={styles.boardNameInput}
          />
          <button onClick={() => handleShare(editingBoard)} style={{ ...styles.backButton, color: '#2ecc71', borderColor: '#2ecc71' }}>
            <i className="fas fa-share-nodes"></i>
          </button>
        </div>
        <div style={styles.editor}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.pointHeader}></th>
                {editingBoard.categories.map((cat, i) => (
                  <th key={i} style={styles.catHeader}>
                    <input
                      value={cat}
                      onChange={(e) => updateField(['categories', i], e.target.value)}
                      placeholder={`Category ${i + 1}`}
                      style={styles.catInput}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3, 4].map(row => (
                <tr key={row}>
                  <td style={styles.pointCell}>{(row + 1) * 100}</td>
                  {editingBoard.categories.map((_, col) => (
                    <td key={col} style={styles.questionCell}>
                      <input
                        value={editingBoard.questions[col][row].question}
                        onChange={(e) => updateField(['questions', col, row, 'question'], e.target.value)}
                        placeholder="Question"
                        style={styles.questionInput}
                      />
                      <input
                        value={editingBoard.questions[col][row].answer}
                        onChange={(e) => updateField(['questions', col, row, 'answer'], e.target.value)}
                        placeholder="Answer"
                        style={styles.answerInput}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sharingBoard && (
          <div style={styles.modalOverlay} onClick={closeShareModal}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Share "{sharingBoard.name}"</h2>
              <p style={styles.modalDesc}>Anyone with this link can import this board:</p>
              <div style={styles.urlBox}>
                <input readOnly value={shareUrl} style={styles.urlInput} aria-label="Share URL" />
                <button onClick={copyShareUrl} style={styles.copyButton}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <button onClick={closeShareModal} style={styles.modalClose}>Close</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={styles.container} className="page-enter">
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>&larr; Back</button>
        <h1 style={styles.title}>Host a Game</h1>
      </div>
      <div style={styles.boardList}>
        {boards.length === 0 && (
          <p style={styles.empty}>No boards created yet.</p>
        )}
        {boards.map(board => (
          <div key={board.id} style={styles.boardCard}>
            {editingId === board.id ? (
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => saveRename(board.id)}
                onKeyDown={(e) => e.key === 'Enter' && saveRename(board.id)}
                style={styles.renameInput}
                autoFocus
              />
            ) : (
              <span style={styles.boardName}>{board.name}</span>
            )}
            <span style={styles.date}>
              {new Date(board.updatedAt).toLocaleDateString()}
            </span>
            <div style={styles.actions}>
              <button onClick={() => startRename(board)} style={styles.iconBtn} aria-label={`Rename ${board.name}`}>
                <i className="fas fa-pencil"></i>
              </button>
              <button onClick={() => handleDelete(board.id)} style={styles.iconBtn} aria-label={`Delete ${board.name}`}>
                <i className="fas fa-trash"></i>
              </button>
              <button onClick={() => handleShare(board)} style={styles.iconBtn} aria-label={`Share ${board.name}`}>
                <i className="fas fa-share-nodes"></i>
              </button>
              <button onClick={() => handleEdit(board)} style={styles.iconBtn} aria-label={`Edit ${board.name}`}>
                <i className="fas fa-pen-to-square"></i>
              </button>
              <button onClick={() => handleSelect(board)} disabled={creating}
                style={{ ...styles.iconBtn, ...styles.hostBtn }} aria-label={`Host ${board.name}`}>
                {creating ? '...' : <i className="fas fa-play"></i>}
              </button>
            </div>
          </div>
        ))}
      </div>
      <button onClick={handleCreateNew} style={styles.createButton}>
        <i className="fas fa-plus"></i> Create New Board
      </button>
      {sharingBoard && (
        <div style={styles.modalOverlay} onClick={closeShareModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Share "{sharingBoard.name}"</h2>
            <p style={styles.modalDesc}>Anyone with this link can import this board:</p>
            <div style={styles.urlBox}>
              <input readOnly value={shareUrl} style={styles.urlInput} aria-label="Share URL" />
              <button onClick={copyShareUrl} style={styles.copyButton}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button onClick={closeShareModal} style={styles.modalClose}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

function isBoardValid(board) {
  if (board.categories.some(c => !c.trim())) return false
  for (let c = 0; c < 6; c++) {
    for (let q = 0; q < 5; q++) {
      if (!board.questions[c][q].question.trim() || !board.questions[c][q].answer.trim()) {
        return false
      }
    }
  }
  return true
}

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '700px',
    margin: '0 auto',
    background: 'linear-gradient(180deg, rgba(67, 97, 238, 0.08) 0%, transparent 50%)',
    minHeight: '100vh'
  },
  editContainer: {
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
  title: {
    fontSize: '2rem',
    color: '#fff',
    margin: 0
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
  iconBtn: {
    padding: '0.4rem',
    minWidth: '36px',
    minHeight: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    color: '#aaa',
    fontSize: '1rem',
    border: '1px solid #4a4a6a',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  hostBtn: {
    color: '#4361ee',
    borderColor: '#4361ee'
  },
  renameInput: {
    padding: '0.3rem 0.5rem',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    background: '#1a1a2e',
    color: '#fff',
    border: '1px solid #4361ee',
    borderRadius: '4px',
    flex: 1,
    minWidth: '150px',
    outline: 'none'
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
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    background: 'linear-gradient(135deg, #2a2a4a 0%, #2a2a5a 100%)',
    padding: '2rem',
    borderRadius: '12px',
    maxWidth: '550px',
    width: '90%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    boxShadow: '0 8px 40px rgba(0, 0, 0, 0.5)'
  },
  modalTitle: {
    fontSize: '1.5rem',
    color: '#fff',
    margin: 0
  },
  modalDesc: {
    fontSize: '0.95rem',
    color: '#888',
    textAlign: 'center',
    margin: 0
  },
  urlBox: {
    display: 'flex',
    width: '100%',
    gap: '0.5rem'
  },
  urlInput: {
    flex: 1,
    padding: '0.7rem 1rem',
    fontSize: '0.85rem',
    background: '#1a1a2e',
    color: '#aaa',
    border: '1px solid #4a4a6a',
    borderRadius: '6px',
    outline: 'none'
  },
  copyButton: {
    padding: '0.7rem 1.2rem',
    background: '#2ecc71',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    borderRadius: '6px',
    whiteSpace: 'nowrap'
  },
  modalClose: {
    padding: '0.7rem 2rem',
    background: '#4361ee',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '1rem',
    borderRadius: '8px'
  },
  editor: {
    display: 'flex',
    flexDirection: 'column',
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed'
  },
  pointHeader: {
    width: '60px',
    padding: '0'
  },
  catHeader: {
    padding: '0.3rem'
  },
  catInput: {
    width: '100%',
    padding: '0.8rem',
    fontSize: '1rem',
    fontWeight: 'bold',
    background: '#4361ee',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    textAlign: 'center',
    outline: 'none',
    boxSizing: 'border-box'
  },
  pointCell: {
    width: '60px',
    textAlign: 'center',
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#4361ee',
    padding: '0.3rem',
    verticalAlign: 'top'
  },
  questionCell: {
    padding: '0.3rem',
    verticalAlign: 'top'
  },
  questionInput: {
    width: '100%',
    padding: '0.5rem',
    fontSize: '0.85rem',
    background: '#2a2a4a',
    color: '#fff',
    border: '1px solid #4a4a6a',
    borderRadius: '4px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  answerInput: {
    width: '100%',
    padding: '0.5rem',
    fontSize: '0.85rem',
    background: '#1a1a2e',
    color: '#2ecc71',
    border: '1px solid #4a4a6a',
    borderRadius: '4px',
    outline: 'none',
    boxSizing: 'border-box',
    marginTop: '0.3rem'
  }
}

export default HostSelect
