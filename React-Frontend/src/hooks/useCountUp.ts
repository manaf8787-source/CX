import { useLayoutEffect, useRef, type RefObject } from 'react'
import { prefersReducedMotion } from '@/lib/motion'

const easeOutCubic = (p: number) => 1 - (1 - p) ** 3

/**
 * Animates a number from its previous value to `target` by writing each frame's
 * text straight into `ref` — no React re-render per frame, so several tiles
 * counting at once stay off the main thread's critical path. The first real
 * value counts up from 0; later changes count from the last shown value, and an
 * unchanged value does not animate again. Instant under reduced motion.
 */
export function useCountUp(ref: RefObject<HTMLElement | null>, target: number, format: (n: number) => string, duration = 700) {
  const fromRef = useRef(0)
  const formatRef = useRef(format)

  useLayoutEffect(() => {
    formatRef.current = format
  }, [format])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const from = fromRef.current
    if (prefersReducedMotion() || from === target) {
      fromRef.current = target
      el.textContent = formatRef.current(target)
      return
    }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const value = from + (target - from) * easeOutCubic(p)
      fromRef.current = value
      el.textContent = formatRef.current(value)
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    el.textContent = formatRef.current(from)
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      fromRef.current = target
      el.textContent = formatRef.current(target)
    }
  }, [ref, target, duration])
}
