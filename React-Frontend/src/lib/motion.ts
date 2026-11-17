import type { Transition } from 'motion/react'

/** Shared motion tokens — docs/DESIGN_SYSTEM.md §8. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const
export const EASE_IN = [0.4, 0, 1, 1] as const

export const DURATION = { fast: 0.15, base: 0.24, slow: 0.4 } as const

export const ENTER: Transition = { duration: DURATION.base, ease: EASE_OUT }
export const EXIT: Transition = { duration: DURATION.fast, ease: EASE_IN }

/** Horizontal offsets are written for LTR; multiply by this so slides mirror in Arabic. */
export function dirSign(dir: 'ltr' | 'rtl'): 1 | -1 {
  return dir === 'rtl' ? -1 : 1
}

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}
