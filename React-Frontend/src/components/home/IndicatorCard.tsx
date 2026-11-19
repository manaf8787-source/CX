import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath } from '@/auth/access'
import { INDICATOR_COPY, INDICATOR_SENTENCE, type IndicatorKind } from '@/data/indicators'
import { indicatorTone, type IndicatorTone } from '@/utils/indicators'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { AnimatedValue } from '@/components/common/AnimatedValue'
import { TermHelp } from '@/components/common/TermHelp'
import { cn } from '@/lib/utils'
import type { IndicatorSet, Product } from '@/types'

/** Colour is categorical: the tone of an indicator is a 6px dot beside its label, never the colour of the number. */
const TONE_DOT: Record<IndicatorTone, string> = {
  good: 'dot-success',
  warn: 'dot-warning',
  crit: 'dot-error',
  none: '',
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
    <div data-indicator={kind} data-tone={tone} className="well flex min-w-0 flex-col gap-1.5">
      <span className="t-small-strong flex items-center gap-1.5 text-muted-foreground">
        {tone !== 'none' && <span aria-hidden className={cn('dot', TONE_DOT[tone])} />}
        {label}
        <TermHelp term={term} />
      </span>
      <span className="t-kpi">
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
 *
 * Design: card -> three wells -> text. The product hue is the 6px dot before the name (the one place colour appears), the numbers are
 * ink. The wells run at dense size (32px value, 16px padding) because three of them share a half-width card.
 */
export function IndicatorCard({ set, product }: { set: IndicatorSet; product: Product }) {
  const { L } = useI18n()
  const { role } = useRole()
  const style = { '--c': `var(${product.colorVar})` } as CSSProperties
  const productPath = `/products/${product.id}`
  const nps = set.nps
  const canOpenProduct = canAccessPath(role.id, productPath)
  const canOpenOverview = canAccessPath(role.id, '/overview')
  return (
    <Card data-product={product.id} data-tour="indicator-card" style={style} className="min-w-0">
      <CardHeader>
        <h3 className="t-card-title flex items-center gap-2.5">
          <span aria-hidden className="dot bg-(--c)" />
          {L(product.name)}
        </h3>
        <p className="text-sm text-muted-foreground">{L(INDICATOR_COPY.meta(set.answers))}</p>
      </CardHeader>
      <CardContent>
        {/* the data-density sits on an inner box: on CardContent itself it would also change the card's own side padding */}
        <div data-density="dense" className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-3">
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
      </CardContent>
      {(canOpenProduct || canOpenOverview) && (
        <CardFooter className="flex-wrap gap-2">
          {canOpenProduct && (
            <Button asChild variant="outline" size="sm">
              <Link to={productPath}>
                {L(INDICATOR_COPY.open(product.name))}
                <ArrowRight aria-hidden className="rtl:rotate-180" />
              </Link>
            </Button>
          )}
          {canOpenOverview && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/overview">{L(INDICATOR_COPY.allNumbers)}</Link>
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  )
}
