import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface StackedBarItem {
  key?: string
  label: ReactNode
  value: number
  /** What is printed at the end of the label row (default: the value). Always print it: the grey bars alone are low contrast. */
  display?: ReactNode
  /** Emphasise this row (dark fill, ink label). Default: the first row. */
  hero?: boolean
}

/**
 * `RankedBars` with the label above the bar instead of beside it, for labels that are sentences ("Slow or missing follow-up"): the label
 * column of `RankedBars` is at most 9rem and truncates them. Same skill spec: 12px pill track (#ececec, inset), the hero row dark, the
 * rest the grey gradient at 62%, the value printed. [Proposed] shared request: a `layout="stacked"` prop on `RankedBars`.
 */
export function StackedBars({ items, max, label, className }: { items: StackedBarItem[]; max?: number; label: string; className?: string }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value))
  return (
    <ul aria-label={label} className={cn('flex flex-col gap-4', className)}>
      {items.map((item, i) => {
        const hero = item.hero ?? i === 0
        return (
          <li key={item.key ?? i} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className={hero ? 't-small-strong' : 't-body-s'}>{item.label}</span>
              <span className={cn('tabular shrink-0', hero ? 't-small-strong' : 't-body-s')}>{item.display ?? item.value.toLocaleString('en-US')}</span>
            </div>
            <span aria-hidden className="block h-3 overflow-hidden rounded-full bg-line shadow-inset-track">
              <span
                className={cn('block h-full rounded-full', hero ? 'material-dark' : 'bg-grad-muted-fill opacity-[0.62]')}
                style={{ width: `${Math.max(0, Math.min(100, (item.value / top) * 100))}%` }}
              />
            </span>
          </li>
        )
      })}
    </ul>
  )
}
