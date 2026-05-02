import { useState, useEffect, useRef } from 'react'

function AnimatedCounter({ value, duration = 500 }) {
  const [displayValue, setDisplayValue] = useState(0)
  const prevValue = useRef(0)
  const animFrame = useRef(null)

  useEffect(() => {
    const start = prevValue.current
    const end = value
    const diff = end - start
    if (diff === 0) return

    const startTime = performance.now()

    function step(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(start + diff * eased)
      setDisplayValue(current)

      if (progress < 1) {
        animFrame.current = requestAnimationFrame(step)
      } else {
        prevValue.current = end
      }
    }

    animFrame.current = requestAnimationFrame(step)

    return () => {
      if (animFrame.current) cancelAnimationFrame(animFrame.current)
    }
  }, [value, duration])

  return <span>{displayValue}</span>
}

export default AnimatedCounter
