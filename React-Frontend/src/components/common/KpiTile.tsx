import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { AnimatedValue } from './AnimatedValue'
import { TermHelp } from './TermHelp'

interface KpiTileProps {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  /** Any CSS color, e.g. 'var(--chart-1)' or a legacy token 'var(--crit)'. Drives the top bar and icon tint. */
  accent?: string
  icon?: ReactNode
  /** Navigate on click (preferred) … */
  to?: string
  /** … or run a handler. Without either the tile is static. */
  onClick?: () => void
  loading?: boolean
  className?: string
  children?: ReactNode
  /** Glossary term for a "?" beside the metric (KB §14). */
  term?: string
}

const BASE =
  'group relative flex min-w-0 flex-col gap-1 overflow-hidden rounded-xl border bg-card p-4 text-start text-card-foreground shadow-xs ' +
  'before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-(--c)'
const INTERACTIVE =
  'cursor-pointer outline-none transition-[box-shadow,transform,border-color] duration-200 ease-out ' +
  'hover:-translate-y-px hover:border-(--c)/40 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 ' +
  'motion-reduce:hover:translate-y-0'

/** Bento-capable KPI tile: pass `className="md:col-span-2"` etc. to size it in a grid. */
export function KpiTile({ label, value, sub, accent = 'var(--chart-1)', icon, to, onClick, loading, className, children, term }: KpiTileProps) {
  const style = { '--c': accent } as CSSProperties
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {icon ? (
          <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-(--c)/12 text-(--c) [&_svg]:size-4">
            {icon}
          </span>
        ) : (
          (to || onClick) && (
            <ArrowUpRight
              aria-hidden
              className="size-4 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 rtl:-scale-x-100"
            />
          )
        )}
      </div>
      {loading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <span className="text-3xl font-semibold tracking-tight tabular-nums">
          <AnimatedValue value={value} />
        </span>
      )}
      {sub && <span className="text-sm text-muted-foreground">{sub}</span>}
      {children}
    </>
  )

  const tile = to ? (
    <Link to={to} style={style} className={cn(BASE, INTERACTIVE, term ? 'h-full' : className)}>
      {body}
    </Link>
  ) : onClick ? (
    <button type="button" onClick={onClick} style={style} className={cn(BASE, INTERACTIVE, term ? 'h-full w-full' : className)}>
      {body}
    </button>
  ) : (
    <div style={style} className={cn(BASE, term ? 'h-full' : className)}>
      {body}
    </div>
  )
  if (!term) return tile
  // The "?" sits beside the tile, not inside it, so a link tile never nests a button.
  return (
    <div className={cn('relative min-w-0', className)}>
      {tile}
      <TermHelp term={term} className="absolute end-2 bottom-2" />
    </div>
  )
}
