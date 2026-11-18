import { useEffect, useRef, useState } from 'react'

/**
 * True once the page has scrolled under a sticky bar. A 1px sentinel sits where the bar naturally starts (render `ref` on a
 * `h-px -mb-px` element just above it); when the sentinel leaves the viewport the bar is stuck and gets its hairline. No scroll listener.
 * Without IntersectionObserver (old engines, jsdom stubs that never call back) it stays false and the bar simply has no line.
 */
export function useScrollEdge() {
  const ref = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return { ref, scrolled }
}
