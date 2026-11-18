import { useState } from 'react'
import { MessageSquareQuote } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useProducts, useVocComments, useVocRows } from '@/services/queries'
import type { ProductId, VocRow } from '@/types'
import { ProductTag } from '@/components/common/Chip'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { NpsBar, NpsLegend } from './NpsBar'
import { Segmented } from '@/components/ui/segmented'
import { SubPageHeader } from './SubPageHeader'

const VOC_CHANNEL_LABEL: Record<string, { en: string; ar: string }> = {
  digital: { en: 'Digital', ar: 'رقمي' },
  call: { en: 'Call', ar: 'اتصال' },
  app: { en: 'App', ar: 'التطبيق' },
  branch: { en: 'Branch', ar: 'الفرع' },
  event: { en: 'Event', ar: 'فعالية' },
}

function nps(rows: VocRow[]): number | null {
  const n = rows.reduce((s, r) => s + r.n, 0)
  if (!n) return null
  const p = rows.reduce((s, r) => s + r.promoters, 0)
  const d = rows.reduce((s, r) => s + r.detractors, 0)
  return Math.round(((p - d) / n) * 100)
}
function fmtSigned(v: number | null) {
  return v == null ? '–' : (v > 0 ? '+' : '') + v
}

/** Ported from `frontend/src/pages/VoiceOfCustomer.tsx` (APPLICATION_MODULES.md
 * §C) — "what customers say across every channel," reusing the results view
 * as-is while the Surveys and triggers page (net-new) owns the current
 * trigger/cap model.
 *
 * Composition (comfortable): the per-product summaries are wells on the page (the product tag and its NPS in the head, a row per channel
 * with the three-segment bar and the response count), not a card each; the legend is written once under them. The comments are one
 * card: the product filter is the skill's sliding pill filter, each comment a divided row with its tags. */
export default function Voc() {
  const { t, L, lang } = useI18n()
  const { data: products, isLoading: productsLoading } = useProducts()
  const { data: vocRows } = useVocRows()
  const { data: comments, isLoading: commentsLoading } = useVocComments()
  const [filterProduct, setFilterProduct] = useState<ProductId | 'all'>('all')

  const launched = (products ?? []).filter((p) => p.live)
  const visibleComments = (comments ?? []).filter(
    (c) => launched.some((p) => p.id === c.product) && (filterProduct === 'all' || c.product === filterProduct),
  )
  const filters: { value: ProductId | 'all'; label: string }[] = [{ value: 'all', label: t('All', 'الكل') }, ...launched.map((p) => ({ value: p.id, label: L(p.name) }))]

  return (
    <section data-density="comfortable" className="flex flex-col gap-8">
      <SubPageHeader
        title={t('Voice of Customer', 'صوت العميل')}
        description={t(
          'Comments, IVR feedback and survey free text across every channel, with themes and sentiment.',
          'التعليقات وملاحظات الرد الصوتي والنصوص الحرة عبر كل القنوات، مع المواضيع والمشاعر.',
        )}
      />

      {productsLoading ? (
        <LoadingState rows={4} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-(--grid-gap) md:grid-cols-2">
            {launched.map((p) => {
              const rows = (vocRows ?? []).filter((r) => r.product === p.id)
              return (
                <div key={p.id} role="group" aria-label={L(p.name)} className="well flex flex-col gap-5">
                  <div className="flex items-center justify-between gap-2">
                    <ProductTag productId={p.id} lang={lang} />
                    <span className="t-body-s">
                      NPS <bdi dir="ltr" className="t-ui-strong tabular">{fmtSigned(nps(rows))}</bdi>
                    </span>
                  </div>
                  {rows.length ? (
                    <ul className="flex flex-col gap-3.5">
                      {rows.map((r) => (
                        <li key={r.channel} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3">
                          <span className="t-small-strong truncate">{VOC_CHANNEL_LABEL[r.channel] ? L(VOC_CHANNEL_LABEL[r.channel]) : r.channel}</span>
                          <NpsBar
                            promoters={r.promoters}
                            passives={r.passives}
                            detractors={r.detractors}
                            label={`${r.channel}: ${r.promoters} ${t('promoters', 'مروّجون')}, ${r.passives} ${t('passives', 'محايدون')}, ${r.detractors} ${t('detractors', 'منتقدون')}`}
                          />
                          <span className="t-body-s w-16 text-end tabular">
                            {r.n} {t('resp.', 'ردّ')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="t-body-s">{t('no data yet', 'لا توجد بيانات بعد')}</span>
                  )}
                </div>
              )
            })}
          </div>
          <NpsLegend />
        </div>
      )}

      <SectionCard title={t('Comments and free text', 'التعليقات والنصوص الحرة')} contentClassName="flex flex-col gap-5">
        <Segmented variant="pressed" label={t('Filter by product', 'تصفية حسب المنتج')} value={filterProduct} onValueChange={setFilterProduct} options={filters} />
        {commentsLoading ? (
          <LoadingState rows={3} />
        ) : visibleComments.length ? (
          <ul className="flex flex-col">
            {visibleComments.map((c, i) => (
              <li key={i} className="row-divider flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                <MessageSquareQuote aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <ProductTag productId={c.product} lang={lang} />
                    <span className="t-body-s">{VOC_CHANNEL_LABEL[c.channel] ? L(VOC_CHANNEL_LABEL[c.channel]) : c.channel}</span>
                    <StatusBadge>{L(c.theme)}</StatusBadge>
                  </div>
                  <p className="text-base text-foreground">{L(c.text)}</p>
                </div>
                <StatusBadge tone={c.sentiment === 'positive' ? 'success' : c.sentiment === 'negative' ? 'danger' : 'neutral'}>{c.sentiment}</StatusBadge>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t('No comments for this filter.', 'لا توجد تعليقات لهذا الفلتر.')} />
        )}
      </SectionCard>
    </section>
  )
}
