import { useEffect, useRef } from 'react'

function BuzzerButton({ onBuzz }) {
  const buzzTimeout = useRef(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        triggerBuzz()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const triggerBuzz = () => {
    if (buzzTimeout.current) return
    buzzTimeout.current = setTimeout(() => { buzzTimeout.current = null }, 300)
    onBuzz()
  }

  return (
    <button
      onClick={triggerBuzz}
      style={styles.button}
    >
      BUZZ!
    </button>
  )
}

const styles = {
  button: {
    width: '250px',
    height: '250px',
    borderRadius: '50%',
    background: 'linear-gradient(145deg, #e63946, #c1121f)',
    color: '#fff',
    fontSize: '2.5rem',
    fontWeight: 'bold',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 30px rgba(230, 57, 70, 0.4)',
    animation: 'pulse 1.5s ease-in-out infinite',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent'
  }
}

const styleEl = document.createElement('style')
styleEl.textContent = `
  @keyframes pulse {
    0%, 100% { transform: scale(1); box-shadow: 0 8px 30px rgba(230, 57, 70, 0.4); }
    50% { transform: scale(1.05); box-shadow: 0 12px 40px rgba(230, 57, 70, 0.6); }
  }
`
document.head.appendChild(styleEl)

export default BuzzerButton
