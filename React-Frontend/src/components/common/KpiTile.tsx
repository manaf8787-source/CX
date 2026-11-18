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
  /**
   * Any CSS colour, e.g. 'var(--success)'. It becomes the 6px status dot before the label: colour is categorical in this design, it never
   * tints the number, the icon or the card. Pass it only when the colour means something (a status, a product); leave it out otherwise.
   */
  accent?: string
  /** Shown in a 30px light round tile at the end of the label row (neutral: ink on the light material). */
  icon?: ReactNode
  /** The unit after the number, in the smaller grey "unit" style ("%", "days"). */
  unit?: ReactNode
  /** A change since the last period, as a light tag at the end of the label row ("+4.2%"). Takes the place of the icon. */
  delta?: ReactNode
  /** Navigate on click (preferred) … */
  to?: string
  /** … or run a handler. Without either the tile is static. */
  onClick?: () => void
  loading?: boolean
  className?: string
  /** Optional visual (a mono chart, a bar list): rendered in a well inside the card, under the value. */
  children?: ReactNode
  /** Glossary term for a "?" beside the metric (KB §14). */
  term?: string
  /**
   * `card` (default): the white card. `well`: the same tile without a card, for a group of numbers that share one card (card -> well -> text;
   * a link well tints on hover). `dark`: the view's ONE dark feature card (never next to another dark card).
   */
  variant?: 'card' | 'well' | 'dark'
}

const BASE: Record<NonNullable<KpiTileProps['variant']>, string> = {
  card: 'surface-card p-(--card-pad) text-card-foreground',
  well: 'well h-full',
  dark: 'surface-dark p-(--card-pad)',
}
const INTERACTIVE = 'cursor-pointer outline-hidden'

/**
 * The skill's KPI card: label (small strong, grey) with an optional icon tile or delta tag, the value (44 comfortable / 32 dense,
 * tabular, counted up), an optional unit, a grey sub line and an optional well. Density follows `data-density` on any ancestor.
 * Bento-capable: pass `className="md:col-span-2"` to size it in a grid.
 */
export function KpiTile({ label, value, sub, accent, icon, unit, delta, to, onClick, loading, className, children, term, variant = 'card' }: KpiTileProps) {
  const interactive = Boolean(to || onClick)
  const base = cn('group relative flex min-w-0 flex-col gap-3 text-start', BASE[variant], interactive && variant === 'well' && 'transition-colors duration-200 hover:bg-well-hover')
  const style = accent ? ({ '--c': accent } as CSSProperties) : undefined
  const end = delta ? (
    <bdi className="pill pill-light shrink-0">{delta}</bdi>
  ) : icon ? (
    <span aria-hidden className="material-light inline-grid size-[30px] shrink-0 place-items-center rounded-full [&_svg]:size-4">
      {icon}
    </span>
  ) : (
    interactive && (
      <ArrowUpRight
        aria-hidden
        className="size-4 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 rtl:-scale-x-100"
      />
    )
  )
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="t-small-strong flex min-w-0 items-center gap-2 text-muted-foreground transition-[padding] duration-400 ease-spring group-hover:ps-[3px]">
          {accent && <span aria-hidden className="dot bg-(--c)" />}
          {label}
        </span>
        {end}
      </div>
      {loading ? (
        <Skeleton className="h-(--kpi-size) w-24 rounded-lg" />
      ) : (
        <span className="flex items-baseline gap-1">
          {/* bdi: a signed value such as "+29" keeps its sign on the left in Arabic */}
          <bdi className="t-kpi">
            <AnimatedValue value={value} />
          </bdi>
          {unit && <span className="t-unit">{unit}</span>}
        </span>
      )}
      {sub && <span className="text-sm text-muted-foreground">{sub}</span>}
      {children && <div className={cn('flex flex-col gap-2', variant === 'card' ? 'well' : 'rounded-inner bg-card p-3.5 text-card-foreground shadow-hairline')}>{children}</div>}
    </>
  )

  const tile = to ? (
    <Link to={to} style={style} className={cn(base, INTERACTIVE, term ? 'h-full' : className)}>
      {body}
    </Link>
  ) : onClick ? (
    <button type="button" onClick={onClick} style={style} className={cn(base, INTERACTIVE, term ? 'h-full w-full' : className)}>
      {body}
    </button>
  ) : (
    <div style={style} className={cn(base, term ? 'h-full' : className)}>
      {body}
    </div>
  )
  if (!term) return tile
  // The "?" sits beside the tile, not inside it, so a link tile never nests a button.
  return (
    <div className={cn('relative min-w-0', className)}>
      {tile}
      <TermHelp term={term} className="absolute end-3 bottom-3" />
    </div>
  )
}
