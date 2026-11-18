import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { AnimatedValue } from '@/components/common/AnimatedValue'
import { TermHelp } from '@/components/common/TermHelp'
import { cn } from '@/lib/utils'

interface StatWellProps {
  label: ReactNode
  value: ReactNode
  /** A grey sentence under the number. */
  sub?: ReactNode
  /** The unit after the number, in the grey unit style. */
  unit?: ReactNode
  /** Makes the whole well a link (a role that may not open the page passes `undefined` and gets a static well). */
  to?: string
  loading?: boolean
  /** Glossary term for a "?" at the bottom corner (it sits beside the link, never inside it). */
  term?: string
  className?: string
}

/**
 * A stat that lives on a card: label (13/500 grey), the value (44 comfortable / 32 dense, tabular, counted up), an optional unit and a grey
 * sentence, all in a well (card -> well -> text). The skill's KPI card without the card, for a group of numbers that share one card
 * (Overview, Reputation index). Same counting and `bdi` rules as `KpiTile`; a link well shows the arrow on hover and keeps the system
 * focus ring. Never coloured: the number is ink.
 *
 * [Proposed] shared request: `KpiTile` could take `variant="well"` instead.
 */
export function StatWell({ label, value, sub, unit, to, loading, term, className }: StatWellProps) {
  const body = (
    <>
      <span className="t-small-strong flex items-start justify-between gap-2 text-muted-foreground transition-[padding] duration-400 ease-spring group-hover/stat:ps-[3px]">
        <span>{label}</span>
        {to && <ArrowUpRight aria-hidden className="size-4 shrink-0 opacity-0 transition-opacity duration-200 group-hover/stat:opacity-100 group-focus-visible/stat:opacity-100 rtl:-scale-x-100" />}
      </span>
      {loading ? (
        <Skeleton className="h-(--kpi-size) w-24 rounded-lg" />
      ) : (
        <span className="flex items-baseline gap-1">
          <bdi className="t-kpi">
            <AnimatedValue value={value} />
          </bdi>
          {unit && <span className="t-unit">{unit}</span>}
        </span>
      )}
      {sub && <span className="t-body-s">{sub}</span>}
    </>
  )
  const box = 'well group/stat flex h-full min-w-0 flex-col gap-3 text-start'
  return (
    <div className={cn('relative min-w-0', className)}>
      {to ? (
        <Link to={to} className={cn(box, 'transition-colors duration-200 hover:bg-well-hover')}>
          {body}
        </Link>
      ) : (
        <div className={box}>{body}</div>
      )}
      {term && <TermHelp term={term} className="absolute end-3 bottom-3" />}
    </div>
  )
}
