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
    background: 'radial-gradient(circle at 40% 35%, #ff4d5a, #e63946 40%, #c1121f)',
    color: '#fff',
    fontSize: '2.5rem',
    fontWeight: 'bold',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 40px rgba(230, 57, 70, 0.6), 0 0 80px rgba(230, 57, 70, 0.3), inset 0 -6px 12px rgba(0,0,0,0.3)',
    animation: 'buzzerPulse 1.5s ease-in-out infinite',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
    transition: 'transform 0.1s, box-shadow 0.1s',
    position: 'relative',
    textShadow: '0 2px 8px rgba(0,0,0,0.4)'
  }
}

const styleEl = document.createElement('style')
styleEl.textContent = `
  @keyframes buzzerPulse {
    0%, 100% { transform: scale(1); box-shadow: 0 0 40px rgba(230, 57, 70, 0.6), 0 0 80px rgba(230, 57, 70, 0.3), inset 0 -6px 12px rgba(0,0,0,0.3); }
    50% { transform: scale(1.06); box-shadow: 0 0 60px rgba(230, 57, 70, 0.8), 0 0 120px rgba(230, 57, 70, 0.5), inset 0 -6px 12px rgba(0,0,0,0.3); }
  }
  @keyframes buzzerRing {
    0% { transform: scale(1); opacity: 0.8; }
    100% { transform: scale(1.6); opacity: 0; }
  }
`
document.head.appendChild(styleEl)

export default BuzzerButton
