import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath } from '@/auth/access'
import { INDICATOR_COPY, INDICATOR_SENTENCE, type IndicatorKind } from '@/data/indicators'
import { indicatorTone, type IndicatorTone } from '@/utils/indicators'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AnimatedValue } from '@/components/common/AnimatedValue'
import { TermHelp } from '@/components/common/TermHelp'
import { cn } from '@/lib/utils'
import type { IndicatorSet, Product } from '@/types'

const TONE_TEXT: Record<IndicatorTone, string> = {
  good: 'text-success-text',
  warn: 'text-warning-text',
  crit: 'text-danger-text',
  none: 'text-muted-foreground',
}

interface TileProps {
  kind: IndicatorKind
  /** The glossary term the "?" opens. */
  term: string
  label: string
  value: ReactNode
  raw: number | null
}

function Tile({ kind, term, label, value, raw }: TileProps) {
  const { t, L } = useI18n()
  const tone = indicatorTone(kind, raw)
  return (
    <div data-indicator={kind} data-tone={tone} className="flex min-w-0 flex-col gap-0.5 rounded-lg border bg-muted/30 px-3 py-2.5">
      <span className="flex items-center gap-0.5 text-xs font-semibold tracking-wide text-muted-foreground">
        {label}
        <TermHelp term={term} className="size-5" />
      </span>
      <span className={cn('text-2xl font-semibold tracking-tight tabular-nums', TONE_TEXT[tone])}>
        <bdi dir="ltr">{raw == null ? <span aria-label={t('too early', 'مبكر')}>–</span> : value}</bdi>
      </span>
      <span className="text-xs text-muted-foreground">{L(INDICATOR_SENTENCE[kind])}</span>
    </div>
  )
}

/**
 * One live product's indicators (v40 F03, S1): NPS, CSAT, CES with the plain sentence under each and a "?" beside each
 * label. NPS, CSAT and CES come from `useIndicators` (the same set the brief reads, so the number and the sentence about
 * it cannot disagree); there is no group figure. "Open {product}" and "All numbers" only appear for a role that can open them.
 */
export function IndicatorCard({ set, product }: { set: IndicatorSet; product: Product }) {
  const { L } = useI18n()
  const { role } = useRole()
  const style = { '--c': `var(${product.colorVar})` } as CSSProperties
  const productPath = `/products/${product.id}`
  const nps = set.nps
  return (
    <Card data-product={product.id} style={style} className="min-w-0 gap-4 border-t-4 border-t-(--c) py-5">
      <div className="flex flex-col gap-0.5 px-5">
        <h3 className="text-lg font-semibold">{L(product.name)}</h3>
        <p className="text-sm text-muted-foreground">{L(INDICATOR_COPY.meta(set.answers))}</p>
      </div>
      <div className="grid grid-cols-1 gap-2 px-5 min-[420px]:grid-cols-3">
        <Tile
          kind="nps"
          term="NPS"
          label="NPS"
          raw={nps}
          value={
            nps == null ? null : (
              <>
                {nps > 0 && '+'}
                <AnimatedValue value={nps} />
              </>
            )
          }
        />
        <Tile kind="csat" term="CSAT" label="CSAT" raw={set.csat} value={set.csat == null ? null : <AnimatedValue value={`${set.csat}%`} />} />
        <Tile kind="ces" term="CES" label="CES" raw={set.ces} value={set.ces == null ? null : <AnimatedValue value={`${set.ces}%`} />} />
      </div>
      <div className="flex flex-wrap items-center gap-2 px-5">
        {canAccessPath(role.id, productPath) && (
          <Button asChild variant="outline" size="sm">
            <Link to={productPath}>
              {L(INDICATOR_COPY.open(product.name))}
              <ArrowRight aria-hidden className="rtl:rotate-180" />
            </Link>
          </Button>
        )}
        {canAccessPath(role.id, '/overview') && (
          <Button asChild variant="ghost" size="sm" className="text-primary">
            <Link to="/overview">{L(INDICATOR_COPY.allNumbers)}</Link>
          </Button>
        )}
      </div>
    </Card>
  )
}
