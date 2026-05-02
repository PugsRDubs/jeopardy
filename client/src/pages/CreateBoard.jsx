import { useState, useEffect, useRef } from 'react'
import { getBoards, createBoard, updateBoard, deleteBoard, renameBoard, getBoard } from '../utils/boardStorage'
import { encodeBoard, getShareUrl } from '../utils/shareBoard'

function CreateBoard({ onBack, importMsg }) {
  const [boards, setBoards] = useState(getBoards())
  const [currentBoard, setCurrentBoard] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [sharingBoard, setSharingBoard] = useState(null)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [dismissedMsg, setDismissedMsg] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [renameBoardId, setRenameBoardId] = useState(null)
  const timerRef = useRef(null)

  const handleCreate = () => {
    setNewBoardName('')
    setShowCreateModal(true)
  }

  const confirmCreate = () => {
    const name = newBoardName.trim()
    if (!name) return
    const board = createBoard(name)
    setBoards(getBoards())
    setCurrentBoard(board)
    setEditMode(true)
    setShowCreateModal(false)
  }

  const handleRename = (id) => {
    const board = getBoard(id)
    if (!board) return
    setRenameBoardId(id)
    setNewBoardName(board.name)
    setShowRenameModal(true)
  }

  const confirmRename = () => {
    const name = newBoardName.trim()
    if (!name || !renameBoardId) return
    renameBoard(renameBoardId, name)
    setBoards(getBoards())
    setShowRenameModal(false)
    setRenameBoardId(null)
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
          <button onClick={() => handleShare(currentBoard)} style={{ ...styles.backButton, color: '#2ecc71', borderColor: '#2ecc71' }}>
            Share
          </button>
        </div>
        <div style={styles.editor}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.pointHeader}></th>
                {currentBoard.categories.map((cat, i) => (
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
                  {currentBoard.categories.map((_, col) => (
                    <td key={col} style={styles.questionCell}>
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
                <input readOnly value={shareUrl} style={styles.urlInput} />
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
    <div style={styles.container}>
      <button onClick={onBack} style={styles.backButton} aria-label="Go back">&larr; Back</button>
      {importMsg && !dismissedMsg && (
        <div style={styles.importBanner}>
          <span>{importMsg}</span>
          <button onClick={() => setDismissedMsg(true)} style={styles.dismissBtn} aria-label="Dismiss message">×</button>
        </div>
      )}
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
              <button onClick={() => handleRename(board.id)} style={styles.actionBtn} aria-label={`Rename ${board.name}`}>Rename</button>
              <button onClick={() => handleDelete(board.id)} style={{ ...styles.actionBtn, color: '#ff6b6b' }} aria-label={`Delete ${board.name}`}>Delete</button>
              <button onClick={() => handleShare(board)} style={{ ...styles.actionBtn, color: '#2ecc71' }} aria-label={`Share ${board.name}`}>Share</button>
              <button onClick={() => handleEdit(board)} style={{ ...styles.actionBtn, color: '#4361ee' }} aria-label={`Edit ${board.name}`}>Edit</button>
            </div>
          </div>
        ))}
      </div>
      <button onClick={handleCreate} style={styles.createButton} aria-label="Create new board">
        Create New Board
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
      {showCreateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Create New Board</h2>
            <input
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmCreate()}
              placeholder="Board name"
              style={styles.modalInput}
              autoFocus
              aria-label="Board name"
            />
            <div style={styles.modalActions}>
              <button onClick={() => setShowCreateModal(false)} style={styles.modalCancel}>Cancel</button>
              <button onClick={confirmCreate} style={styles.modalConfirm} disabled={!newBoardName.trim()}>Create</button>
            </div>
          </div>
        </div>
      )}
      {showRenameModal && (
        <div style={styles.modalOverlay} onClick={() => setShowRenameModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Rename Board</h2>
            <input
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmRename()}
              placeholder="New name"
              style={styles.modalInput}
              autoFocus
              aria-label="New board name"
            />
            <div style={styles.modalActions}>
              <button onClick={() => setShowRenameModal(false)} style={styles.modalCancel}>Cancel</button>
              <button onClick={confirmRename} style={styles.modalConfirm} disabled={!newBoardName.trim()}>Save</button>
            </div>
          </div>
        </div>
      )}
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
  importBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.8rem 1.2rem',
    background: 'linear-gradient(135deg, #1a4a1e 0%, #2a5a2e 100%)',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontSize: '1rem',
    color: '#2ecc71',
    fontWeight: 'bold'
  },
  dismissBtn: {
    background: 'transparent',
    color: '#2ecc71',
    fontSize: '1.4rem',
    padding: '0 0.3rem',
    lineHeight: 1
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
  modalInput: {
    width: '100%',
    padding: '0.7rem 1rem',
    fontSize: '1rem',
    background: '#1a1a2e',
    color: '#fff',
    border: '1px solid #4361ee',
    borderRadius: '6px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  modalActions: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'flex-end',
    width: '100%'
  },
  modalCancel: {
    padding: '0.7rem 1.5rem',
    background: 'transparent',
    color: '#aaa',
    fontSize: '1rem',
    border: '1px solid #4a4a6a',
    borderRadius: '6px'
  },
  modalConfirm: {
    padding: '0.7rem 1.5rem',
    background: '#4361ee',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 'bold',
    borderRadius: '6px',
    border: 'none'
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

export default CreateBoard
