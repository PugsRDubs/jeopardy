import { useState } from 'react'
import { getBoards, deleteBoard, renameBoard } from '../utils/boardStorage'
import { encodeBoard, getShareUrl } from '../utils/shareBoard'

function HostSelect({ socket, onBack, onSelectBoard, onCreateNew }) {
  const [boards, setBoards] = useState(getBoards())
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [sharingBoard, setSharingBoard] = useState(null)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)

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
    console.log('Attempting to host board:', board.name, 'id:', board.id)
    console.log('Board categories:', board.categories)
    console.log('Board questions:', board.questions)
    if (!isBoardValid(board)) {
      alert('Board must have all 6 categories and 30 questions/answers filled in.')
      return
    }
    console.log('Board is valid, calling onSelectBoard')
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

  return (
    <div style={styles.container} className="page-enter">
      <button onClick={onBack} style={styles.backButton}>&larr; Back</button>
      <h1 style={styles.title}>Host a Game</h1>
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
              <button onClick={() => startRename(board)} style={styles.actionBtn}>Rename</button>
              <button onClick={() => handleDelete(board.id)} style={{ ...styles.actionBtn, color: '#ff6b6b' }}>Delete</button>
              <button onClick={() => handleShare(board)} style={{ ...styles.actionBtn, color: '#2ecc71' }}>Share</button>
              <button onClick={() => handleSelect(board)} style={{ ...styles.actionBtn, color: '#4361ee' }}>Host</button>
            </div>
          </div>
        ))}
      </div>
      <button onClick={onCreateNew} style={styles.createButton}>
        Create New Board
      </button>
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
  backButton: {
    padding: '0.5rem 1rem',
    background: 'transparent',
    color: '#aaa',
    fontSize: '1rem',
    border: '1px solid #4a4a6a',
    borderRadius: '4px',
    marginBottom: '2rem'
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
  }
}

export default HostSelect
