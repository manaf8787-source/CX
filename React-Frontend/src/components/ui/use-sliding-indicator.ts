import * as React from "react"

export interface IndicatorBox {
  x: number
  y: number
  w: number
  h: number
}

/**
 * One dark pill that slides between the items of a segmented control, tab list or nav (skill: "the selected pill is a single element
 * that slides between positions on spring.ui"). It measures the element matching `selector` inside the container and returns the box
 * for the indicator, in the container's PHYSICAL coordinates (offsetLeft, not logical start), so it is correct in right-to-left too.
 *
 * `ready` is false until the first non-empty measurement (jsdom, first paint, no ResizeObserver): callers then paint the selected item
 * itself, so selection is never invisible. `animate` turns on after the first placement so the pill does not fly in from the corner.
 */
export function useSlidingIndicator<T extends HTMLElement = HTMLElement>(selector: string) {
  const ref = React.useRef<T | null>(null)
  const [box, setBox] = React.useState<IndicatorBox | null>(null)
  const [animate, setAnimate] = React.useState(false)

  const measure = React.useCallback(() => {
    const root = ref.current
    const el = root?.querySelector<HTMLElement>(selector)
    if (!root || !el) {
      setBox((prev) => (prev === null ? prev : null))
      return
    }
    const next = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }
    setBox((prev) => (prev && prev.x === next.x && prev.y === next.y && prev.w === next.w && prev.h === next.h ? prev : next))
  }, [selector])

  React.useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    measure()
    let raf = 0
    let observer: ResizeObserver | undefined
    let mutations: MutationObserver | undefined
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(measure)
      observer.observe(root)
      root.querySelectorAll("[role=tab],[role=radio],a,button").forEach((child) => observer?.observe(child))
    }
    if (typeof MutationObserver !== "undefined") {
      mutations = new MutationObserver(measure)
      mutations.observe(root, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["data-state", "aria-selected", "aria-checked", "aria-current", "data-active"],
      })
    }
    raf = requestAnimationFrame(() => setAnimate(true))
    void document.fonts?.ready.then(measure)
    return () => {
      cancelAnimationFrame(raf)
      observer?.disconnect()
      mutations?.disconnect()
    }
  }, [measure])

  const ready = box !== null && box.w > 0
  return { ref, box, ready, animate }
}
