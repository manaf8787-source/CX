import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  note?: string
  /** Optional: shown in a 30px light circle in the middle of the dot grid. Without it the dot grid stands alone (no illustrations). */
  icon?: ReactNode
  /** One primary action (a ghost link may sit beside it). */
  action?: ReactNode
  className?: string
}

const COLUMNS = 14
const ROWS = 5
/** The lit dots of the motif (cells counted row by row): a few, off-centre, so it reads as data waiting to arrive. */
const LIT = new Set([16, 17, 30, 31, 32, 45, 59])
const DOTS = Array.from({ length: COLUMNS * ROWS }, (_, i) => (
  <span key={i} className={cn('size-2.5 rounded-full', LIT.has(i) ? 'bg-grad-dark shadow-raised-dark' : 'bg-line shadow-dot-off')} />
))

/**
 * Empty state per the skill: a well showing the dot-grid motif (10px dots, 14 columns; off = #ececec, lit = the dark material), then a
 * Heading 4 title, a Body M note (max 420px) and one primary action, centred. The decoration is `aria-hidden`; the title and note are
 * the content. Put it inside the card it belongs to.
 */
export function EmptyState({ title, note, icon, action, className }: EmptyStateProps) {
  return (
    <div data-slot="empty-state" className={cn('flex flex-col items-center gap-4 px-4 py-6 text-center', className)}>
      <div aria-hidden className="well relative grid w-full max-w-[420px] place-items-center py-5">
        <div className="grid gap-[7px]" style={{ gridTemplateColumns: `repeat(${COLUMNS}, 10px)` }}>
          {DOTS}
        </div>
        {icon && <span className="material-light absolute inline-grid size-[30px] place-items-center rounded-full [&_svg]:size-4">{icon}</span>}
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <p className="t-h4">{title}</p>
        {note && <p className="t-body-m max-w-[420px]">{note}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
