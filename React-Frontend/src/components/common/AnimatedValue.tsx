import { useCallback, useRef, type ReactNode } from 'react'
import { useCountUp } from '@/hooks/useCountUp'

/** Matches "62", "62%", "1,234", "4.5 days"; anything else renders unchanged. */
const NUMERIC = /^(-?\d[\d,]*(?:\.\d+)?)(\D*)$/

function CountUp({ value, decimals, grouped, suffix }: { value: number; decimals: number; grouped: boolean; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const format = useCallback(
    (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: grouped }) + suffix,
    [decimals, grouped, suffix],
  )
  useCountUp(ref, value, format)
  // The text is written by useCountUp (outside React) so a counting tile never re-renders per frame.
  return <span ref={ref} />
}

/** Counts numeric KPI values up from zero; non-numeric values render as given. */
export function AnimatedValue({ value }: { value: ReactNode }) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return <CountUp value={value} decimals={Number.isInteger(value) ? 0 : 1} grouped={Math.abs(value) >= 10_000} suffix="" />
  }
  if (typeof value === 'string') {
    const match = NUMERIC.exec(value.trim())
    if (match) {
      const raw = match[1]
      const decimals = raw.includes('.') ? raw.split('.')[1].length : 0
      return <CountUp value={Number(raw.replace(/,/g, ''))} decimals={decimals} grouped={raw.includes(',')} suffix={match[2]} />
    }
  }
  return <>{value}</>
}
