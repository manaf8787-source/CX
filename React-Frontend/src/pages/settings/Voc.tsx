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
import { cn } from '@/lib/utils'
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
 * trigger/cap model. */
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
  const filters: { id: ProductId | 'all'; label: string }[] = [{ id: 'all', label: t('All', 'الكل') }, ...launched.map((p) => ({ id: p.id, label: L(p.name) }))]

  const legend = [
    { cls: 'bg-success', label: t('Promoters', 'المروّجون') },
    { cls: 'bg-muted-foreground/40', label: t('Passives', 'المحايدون') },
    { cls: 'bg-destructive', label: t('Detractors', 'المنتقدون') },
  ]

  return (
    <section className="flex flex-col gap-4">
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {launched.map((p) => {
            const rows = (vocRows ?? []).filter((r) => r.product === p.id)
            return (
              <SectionCard
                key={p.id}
                title={<ProductTag productId={p.id} lang={lang} />}
                actions={
                  <span className="text-sm text-muted-foreground">
                    NPS <bdi dir="ltr" className="font-semibold text-foreground tabular-nums">{fmtSigned(nps(rows))}</bdi>
                  </span>
                }
                contentClassName="flex flex-col gap-3"
              >
                {rows.length ? (
                  <ul className="flex flex-col gap-2.5">
                    {rows.map((r) => {
                      const n = Math.max(1, r.n)
                      return (
                        <li key={r.channel} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3">
                          <span className="truncate text-sm">{VOC_CHANNEL_LABEL[r.channel] ? L(VOC_CHANNEL_LABEL[r.channel]) : r.channel}</span>
                          <div
                            className="flex h-2.5 overflow-hidden rounded-full bg-muted"
                            role="img"
                            aria-label={`${r.channel}: ${r.promoters} ${t('promoters', 'مروّجون')}, ${r.passives} ${t('passives', 'محايدون')}, ${r.detractors} ${t('detractors', 'منتقدون')}`}
                          >
                            <span className="bg-success" style={{ width: `${(r.promoters / n) * 100}%` }} />
                            <span className="bg-muted-foreground/40" style={{ width: `${(r.passives / n) * 100}%` }} />
                            <span className="bg-destructive" style={{ width: `${(r.detractors / n) * 100}%` }} />
                          </div>
                          <span className="w-16 text-end text-xs text-muted-foreground tabular-nums">
                            {r.n} {t('resp.', 'ردّ')}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <span className="text-sm text-muted-foreground">{t('no data yet', 'لا توجد بيانات بعد')}</span>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {legend.map((l) => (
                    <span key={l.label} className="inline-flex items-center gap-1.5">
                      <span aria-hidden className={cn('size-2.5 rounded-full', l.cls)} />
                      {l.label}
                    </span>
                  ))}
                </div>
              </SectionCard>
            )
          })}
        </div>
      )}

      <SectionCard title={t('Comments and free text', 'التعليقات والنصوص الحرة')}>
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={t('Filter by product', 'تصفية حسب المنتج')}>
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filterProduct === f.id}
              onClick={() => setFilterProduct(f.id)}
              className={cn(
                'inline-flex h-8 cursor-pointer items-center rounded-full border px-3 text-sm outline-none transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50',
                filterProduct === f.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        {commentsLoading ? (
          <LoadingState rows={3} />
        ) : visibleComments.length ? (
          <ul className="flex flex-col divide-y">
            {visibleComments.map((c, i) => (
              <li key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <MessageSquareQuote aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <ProductTag productId={c.product} lang={lang} />
                    <span className="text-xs text-muted-foreground">{VOC_CHANNEL_LABEL[c.channel] ? L(VOC_CHANNEL_LABEL[c.channel]) : c.channel}</span>
                    <StatusBadge>{L(c.theme)}</StatusBadge>
                  </div>
                  <p className="text-sm">{L(c.text)}</p>
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
