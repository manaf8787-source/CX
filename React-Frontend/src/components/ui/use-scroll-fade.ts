import * as React from "react"

/**
 * For a strip that scrolls sideways (page tabs, a filter track): tells which edge still has content beyond it, so the strip can fade that
 * edge (`.scroll-fade` in theme.css) and the person sees it scrolls. Works in right-to-left (scrollLeft is negative there, so the
 * distance is read as an absolute value and "start" and "end" are logical). Spread `fadeProps` on the scrolling element and set `ref`.
 */
export function useScrollFade<T extends HTMLElement = HTMLElement>() {
  const ref = React.useRef<T | null>(null)
  const [edge, setEdge] = React.useState({ start: false, end: false })

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => {
      const max = el.scrollWidth - el.clientWidth
      const pos = Math.abs(el.scrollLeft)
      const next = { start: pos > 2, end: max - pos > 2 }
      setEdge((prev) => (prev.start === next.start && prev.end === next.end ? prev : next))
    }
    check()
    el.addEventListener("scroll", check, { passive: true })
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(check) : undefined
    observer?.observe(el)
    if (el.firstElementChild) observer?.observe(el.firstElementChild)
    return () => {
      el.removeEventListener("scroll", check)
      observer?.disconnect()
    }
  }, [])

  return {
    ref,
    fadeProps: {
      "data-fade-start": edge.start || undefined,
      "data-fade-end": edge.end || undefined,
    } as const,
  }
}
