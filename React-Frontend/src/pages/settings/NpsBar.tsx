import { useI18n } from '@/i18n'
import { ChartLegend } from '@/components/common/charts'
import { cn } from '@/lib/utils'

/**
 * Promoters, passives and detractors share one 12px pill track. The skill keeps colour categorical and caps it, so the three segments
 * are not green, grey and red any more: promoters are the ink hero, passives the light grey, detractors the amber of the chart palette
 * (up to four categories). The segments are decoration; the counts are printed beside the bar by the caller and `label` (when given)
 * names the bar for assistive technology.
 */
const NPS_SEGMENT_COLOR = { promoters: 'var(--chart-1)', passives: 'var(--chart-5)', detractors: 'var(--chart-4)' } as const

export function NpsBar({ promoters, passives, detractors, label, className }: { promoters: number; passives: number; detractors: number; label?: string; className?: string }) {
  const n = Math.max(1, promoters + passives + detractors)
  const seg = (v: number, color: string) => <span className="block h-full" style={{ width: `${(v / n) * 100}%`, backgroundColor: color }} />
  return (
    <div
      className={cn('flex h-3 overflow-hidden rounded-full bg-line shadow-inset-track', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {seg(promoters, NPS_SEGMENT_COLOR.promoters)}
      {seg(passives, NPS_SEGMENT_COLOR.passives)}
      {seg(detractors, NPS_SEGMENT_COLOR.detractors)}
    </div>
  )
}

/** The legend of `NpsBar`: 6px dots and the three words. */
export function NpsLegend({ className }: { className?: string }) {
  const { t } = useI18n()
  return (
    <ChartLegend
      className={className}
      items={[
        { label: t('Promoters', 'المروّجون'), color: NPS_SEGMENT_COLOR.promoters },
        { label: t('Passives', 'المحايدون'), color: NPS_SEGMENT_COLOR.passives },
        { label: t('Detractors', 'المنتقدون'), color: NPS_SEGMENT_COLOR.detractors },
      ]}
    />
  )
}
