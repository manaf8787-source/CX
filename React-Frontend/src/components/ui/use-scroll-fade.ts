import * as React from "react"

/**
 * For a strip that scrolls sideways (page tabs, a filter track): tells which edge still has content beyond it, so the strip can fade that
 * edge (`.scroll-fade` in theme.css) and the person sees it scrolls. Works in right-to-left (scrollLeft is negative there, so the
 * distance is read as an absolute value and "start" and "end" are logical). Spread `fadeProps` on the scrolling element and set `ref`.
 * `axis: 'y'` does the same for a list that scrolls up and down (`.scroll-fade-y`): "start" is the top, "end" the bottom.
 */
export function useScrollFade<T extends HTMLElement = HTMLElement>(axis: "x" | "y" = "x") {
  const ref = React.useRef<T | null>(null)
  const [edge, setEdge] = React.useState({ start: false, end: false })

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => {
      const max = axis === "y" ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth
      const pos = Math.abs(axis === "y" ? el.scrollTop : el.scrollLeft)
      const next = { start: pos > 2, end: max - pos > 2 }
      setEdge((prev) => (prev.start === next.start && prev.end === next.end ? prev : next))
    }
    check()
    el.addEventListener("scroll", check, { passive: true })
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(check) : undefined
    observer?.observe(el)
    // every child: a vertical list grows by any of its groups, not only the first
    for (const child of axis === "y" ? Array.from(el.children) : el.firstElementChild ? [el.firstElementChild] : []) observer?.observe(child)
    return () => {
      el.removeEventListener("scroll", check)
      observer?.disconnect()
    }
  }, [axis])

  return {
    ref,
    fadeProps: {
      "data-fade-start": edge.start || undefined,
      "data-fade-end": edge.end || undefined,
    } as const,
  }
}
