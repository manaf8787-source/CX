import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useProducts } from '@/services/queries'
import { useBriefInputs, useIndicators } from '@/services/queriesV40'
import { BRIEF_LINES_BY_ROLE, briefTitle, buildBriefTiles, type BriefTile } from '@/utils/brief'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** The tile colours: red needs someone now, amber is to watch, grey is information. */
const TONE: Record<BriefTile['tone'], { box: string; dot?: string }> = {
  neutral: { box: 'bg-well border-line' },
  alert: { box: 'bg-(--status-error-bg) border-(--status-error-bg)', dot: 'dot-error' },
  warn: { box: 'bg-(--status-warning-bg) border-(--status-warning-bg)', dot: 'dot-warning' },
}

/**
 * The Daily brief (26 Nov, owner: "your day in N numbers", for every role): Agent 9's numbers for the signed-in role, from the same
 * sources the pages show, one tile each. A tile opens its page when the role may open it, and is plain when not. Four tiles a row on a
 * computer, two on a phone. Renders nothing for a role with no brief. `surface` is kept for the landing pages; both read the same.
 */
export function DailyBrief({ className }: { className?: string; surface?: 'dark' | 'light' }) {
  const { t, L } = useI18n()
  const { role } = useRole()
  const inputs = useBriefInputs()
  const indicators = useIndicators()
  const { data: products } = useProducts()

  const tiles = useMemo(
    () =>
      inputs.data && indicators.data && products
        ? buildBriefTiles({ role: role.id, product: role.product, inputs: inputs.data, indicators: indicators.data, products })
        : undefined,
    [role.id, role.product, inputs.data, indicators.data, products],
  )

  if (BRIEF_LINES_BY_ROLE[role.id].length === 0) return null

  return (
    <Card data-tour="brief" className={cn('gap-4 px-(--card-pad)', className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="flex flex-col gap-1">
          <span className="label-style">{t('Daily brief · 07:00', 'الموجز اليومي · 07:00')}</span>
          <h2 className="t-h4">{tiles ? L(briefTitle(tiles.length)) : L(briefTitle(0))}</h2>
        </div>
        <span className="hidden text-sm text-muted-foreground sm:inline">{t('Click a number to open its page', 'اضغط على رقم لفتح صفحته')}</span>
      </div>
      {!tiles ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <ul aria-label={t('Daily brief', 'الموجز اليومي')} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map((tile) => (
            <li key={tile.id}>
              <Tile tile={tile} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function Tile({ tile }: { tile: BriefTile }) {
  const { L } = useI18n()
  const tone = TONE[tile.tone]
  const body = (
    <>
      <span className="flex items-start gap-1.5 text-sm text-muted-foreground">
        {tone.dot && <span aria-hidden className={cn('dot mt-[7px] shrink-0', tone.dot)} />}
        {L(tile.label)}
      </span>
      <span className="t-kpi tabular">
        <bdi dir="ltr">{tile.value}</bdi>
        {tile.of && <span className="ms-1 text-base font-normal text-muted-foreground">{tile.of}</span>}
      </span>
      <span
        className={cn(
          'text-sm',
          tile.trend === 'up' ? 'text-(--status-success-text)' : tile.trend === 'down' ? 'text-(--status-error-text)' : 'text-foreground',
        )}
      >
        {L(tile.sub)}
      </span>
    </>
  )
  const cls = cn('flex h-full min-h-32 flex-col gap-1.5 rounded-2xl border p-4 text-start', tone.box)
  return tile.to ? (
    <Link
      to={tile.to}
      data-brief-line={tile.kind}
      className={cn(cls, 'outline-hidden transition-shadow duration-200 hover:shadow-(--shadow-card-sm) focus-visible:ring-2 focus-visible:ring-ring/40')}
    >
      {body}
    </Link>
  ) : (
    <div data-brief-line={tile.kind} className={cls}>
      {body}
    </div>
  )
}
