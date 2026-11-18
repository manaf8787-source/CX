import { useEffect, type RefObject } from 'react'

/**
 * Scrolls a record that a link named (`?fix=`, `?pt=`, `?inv=`, `?ev=`) into view, and keeps it there while the page is still
 * loading: the cards above it grow when their own data arrives (matrix line, Trace card), which would push the target out of
 * view after a single scroll. It re-aligns whenever the page height changes, for at most two seconds, and stops at the first
 * wheel, touch, key or pointer input from the person (their scroll wins).
 */
export function useScrollToTarget(ref: RefObject<HTMLElement | null>, active: boolean, block: ScrollLogicalPosition = 'start') {
  useEffect(() => {
    const el = ref.current
    if (!active || !el) return
    const align = () => el.scrollIntoView?.({ block })
    align()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(align)
    observer.observe(document.body)
    const stop = () => observer.disconnect()
    const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const
    for (const e of events) window.addEventListener(e, stop, { once: true, passive: true })
    const timer = window.setTimeout(stop, 2000)
    return () => {
      stop()
      window.clearTimeout(timer)
      for (const e of events) window.removeEventListener(e, stop)
    }
  }, [ref, active, block])
}
