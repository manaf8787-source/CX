import { useReducedMotion } from 'motion/react'

/** Spread onto Recharts series: a short ease-out draw-in, off under reduced motion. */
export function useChartMotion() {
  const reduced = useReducedMotion()
  return { isAnimationActive: !reduced, animationDuration: 600, animationEasing: 'ease-out' as const }
}
