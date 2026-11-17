import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '@/lib/motion'

const easeOutCubic = (p: number) => 1 - (1 - p) ** 3

/**
 * Animates a number from its previous value to `target`. The first real value
 * counts up from 0; later changes count from the last shown value, and an
 * unchanged value does not animate again. Instant under reduced motion.
 */
export function useCountUp(target: number, duration = 700): number {
  const reduced = prefersReducedMotion()
  const [shown, setShown] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    if (reduced) {
      fromRef.current = target
      return
    }
    const from = fromRef.current
    if (from === target) return
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const value = from + (target - from) * easeOutCubic(p)
      fromRef.current = value
      setShown(value)
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration, reduced])

  return reduced ? target : shown
}
