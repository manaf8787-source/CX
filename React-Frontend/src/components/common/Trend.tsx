import { ArrowDown, ArrowUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * The portal's good / bad colours (owner, 23 Nov): every positive reads green and every negative red; a number that moved shows an
 * arrow, green when it moved the good way (NPS up, negative share down), red when it moved the bad way.
 */
export function Good({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('text-(--status-success-text)', className)}>{children}</span>
}
export function Bad({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('text-(--status-error-text)', className)}>{children}</span>
}

/** Green above zero, red below, ink at zero: for NPS and other signed scores. */
export function Signed({ value, children }: { value: number | null | undefined; children: ReactNode }) {
  if (value == null || value === 0) return <>{children}</>
  return value > 0 ? <Good>{children}</Good> : <Bad>{children}</Bad>
}

/**
 * An arrow and the change against an earlier value. `goodWhen` says which way is good (NPS: up; negative share, reply time: down).
 * Renders nothing when there is no earlier value or nothing moved.
 */
export function Delta({
  now,
  before,
  goodWhen,
  unit = '',
  label,
  className,
}: {
  now: number | null | undefined
  before: number | null | undefined
  goodWhen: 'up' | 'down'
  unit?: string
  /** e.g. "vs last month"; shown after the change. */
  label?: string
  className?: string
}) {
  if (now == null || before == null || now === before) return null
  const up = now > before
  const good = up === (goodWhen === 'up')
  const Icon = up ? ArrowUp : ArrowDown
  const diff = Math.round(Math.abs(now - before) * 10) / 10
  return (
    <span
      data-trend={good ? 'good' : 'bad'}
      className={cn('inline-flex items-center gap-0.5 font-medium tabular', good ? 'text-(--status-success-text)' : 'text-(--status-error-text)', className)}
    >
      <Icon aria-hidden className="size-3.5" />
      <bdi dir="ltr">
        {diff}
        {unit}
      </bdi>
      {label && <span className="font-normal text-muted-foreground"> {label}</span>}
    </span>
  )
}
