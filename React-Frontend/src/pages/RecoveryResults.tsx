import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from 'recharts'
import { PhoneCall } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useDetractorCallItems, usePersonsAll, useProducts } from '@/services/queries'
import { useIndicators } from '@/services/queriesV40'
import { useGifts } from '@/data/gifts'
import { INSTRUMENT_LABEL, INTERVIEW_OUTCOME_LABEL, REASON_CODE_LABEL } from '@/utils/closeTheLoop'
import { fmtSigned } from '@/utils/indicators'
import { REACHED_VIA, recoverySummary, type ReachedVia } from '@/utils/resurvey'
import { personLabel } from '@/utils/peopleExport'
import type { Bi, FeedbackInstrument, ProductId } from '@/types'
import { useEnvScope } from '@/services/envScope'
import { SectionCard } from '@/components/common/SectionCard'
import { KpiTile } from '@/components/common/KpiTile'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ProductTag } from '@/components/common/Chip'
import { ChartLegend, ChartTooltip, ChartWell } from '@/components/common/charts'
import { chartAxis, chartCursorBar, chartGrid } from '@/components/common/chartTheme'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const ALL = 'all'

const VIA_LABEL: Record<ReachedVia, Bi> = {
  call: { en: 'Phone call', ar: 'مكالمة' },
  gift: { en: 'Gift', ar: 'هدية' },
  call_and_gift: { en: 'Call and gift', ar: 'مكالمة وهدية' },
  none: { en: 'Neither recorded', ar: 'غير مسجّل' },
}

/**
 * 26 Nov (owner): the re-survey results. Everyone who was a detractor, was reached (a phone call to understand the problem, a gift, or
 * both; it is not tied to gifts) and was sent a new survey. The call notes sit beside the score, the chart shows how many detractors
 * there were before and how many are left, and the indicators elsewhere already count the second rating instead of the first.
 * Read by CX only (the call notes are conversation text).
 */
/** The old address: the re-survey results are now the Contacted detractors tab of Detractor analysis. */
export default function RecoveryResults() {
  return <Navigate to="/detractors?tab=contacted" replace />
}

/**
 * 26 Nov (owner): the Contacted detractors tab of Detractor analysis (overall, and on each product page with `productIds`).
 */
export function RecoveryPanel({ productIds }: { productIds?: ProductId[] } = {}) {
  const { t, L, lang } = useI18n()
  const { env } = useEnvScope()
  const { role } = useRole()
  const { data: items, isLoading } = useDetractorCallItems()
  const { data: persons } = usePersonsAll()
  const { data: products } = useProducts()
  const { data: indicators } = useIndicators()
  const gifts = useGifts().gifts
  const [product, setProduct] = useState<string>(ALL)
  const [instrument, setInstrument] = useState<string>(ALL)
  const [via, setVia] = useState<string>(ALL)

  const summary = useMemo(
    () =>
      recoverySummary(items ?? [], gifts, {
        products: productIds,
        env,
        product: product === ALL ? undefined : product,
        instrument: instrument === ALL ? undefined : instrument,
        via: via === ALL ? undefined : (via as ReachedVia),
      }),
    [items, gifts, product, instrument, via, productIds, env],
  )
  const label = (id: string) => {
    const p = persons?.find((x) => x.id === id)
    return p ? personLabel(p, role.id) : id
  }
  const fmt = (d?: string) =>
    d ? new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d)) : '–'

  const chart = [
    { name: t('Before the re-survey', 'قبل إعادة الاستبيان'), value: summary.before },
    { name: t('After the re-survey', 'بعد إعادة الاستبيان'), value: summary.after },
  ]
  const live = (products ?? []).filter((p) => p.live && p.id !== 'af' && (!productIds || productIds.includes(p.id as ProductId)))

  return (
    <div data-density="comfortable" className="flex flex-col gap-6">
      <p className="max-w-[80ch] text-sm text-muted-foreground">
        {t(
          'Detractors we spoke to or sent a gift, then surveyed again: what they said, and how the score moved. The second rating replaces the first in every indicator.',
          'العملاء المنتقدون الذين تحدثنا معهم أو أرسلنا لهم هدية ثم أعدنا استبيانهم: ماذا قالوا وكيف تغيّر التقييم. التقييم الثاني يحلّ محل الأول في كل المؤشرات.',
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        {(!productIds || productIds.length > 1) && (
          <FilterSelect label={t('Product', 'المنتج')} value={product} onChange={setProduct} allLabel={t('All products', 'كل المنتجات')}>
            {(products ?? [])
              .filter((p) => p.live && (!productIds || productIds.includes(p.id as ProductId)))
              .map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {L(p.name)}
                </SelectItem>
              ))}
          </FilterSelect>
        )}
        <FilterSelect label={t('Measure', 'المقياس')} value={instrument} onChange={setInstrument} allLabel={t('All measures', 'كل المقاييس')}>
          {(['nps', 'csat', 'ces'] as FeedbackInstrument[]).map((i) => (
            <SelectItem key={i} value={i}>
              {L(INSTRUMENT_LABEL[i])}
            </SelectItem>
          ))}
        </FilterSelect>
        <FilterSelect label={t('How we reached them', 'كيف تواصلنا معهم')} value={via} onChange={setVia} allLabel={t('Any way', 'أي طريقة')}>
          {REACHED_VIA.map((v) => (
            <SelectItem key={v} value={v}>
              {L(VIA_LABEL[v])}
            </SelectItem>
          ))}
        </FilterSelect>
      </div>

      {isLoading ? (
        <LoadingState rows={4} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 desktop:grid-cols-4">
            <KpiTile
              label={t('Detractors before', 'المنتقدون قبل')}
              value={summary.before}
              sub={t('first rating 0 to 6 (NPS) or 1 to 2', 'التقييم الأول 0 إلى 6 (NPS) أو 1 إلى 2')}
            />
            <KpiTile
              label={t('Re-surveyed', 'أُعيد استبيانهم')}
              value={summary.reSurveyed}
              sub={t(`${summary.notYet} not yet re-surveyed`, `${summary.notYet} لم يُعاد استبيانهم بعد`)}
            />
            <KpiTile
              label={t('Detractors after', 'المنتقدون بعد')}
              value={summary.after}
              sub={t(`${summary.recovered} no longer a detractor`, `${summary.recovered} لم يعودوا منتقدين`)}
            />
            <KpiTile
              label={t('Average change', 'متوسط التغيّر')}
              value={summary.averageDelta == null ? '–' : fmtSigned(summary.averageDelta)}
              sub={t('second rating minus first', 'التقييم الثاني ناقص الأول')}
            />
          </div>

          <SectionCard
            title={t('Before and after', 'قبل وبعد')}
            description={
              summary.before === 0
                ? undefined
                : t(
                    `${summary.before} detractors became ${summary.after} after the re-survey.`,
                    `كان عدد المنتقدين ${summary.before} وأصبح ${summary.after} بعد إعادة الاستبيان.`,
                  )
            }
          >
            {summary.before === 0 ? (
              <EmptyState
                title={t('No detractors in this view', 'لا يوجد منتقدون في هذا العرض')}
                note={t('Change a filter or the environment switch.', 'غيّر أحد المرشّحات أو مفتاح البيئة.')}
              />
            ) : (
              <div className="grid gap-6 desktop:grid-cols-2">
                <ChartWell
                  height={240}
                  label={t('Detractors before and after the re-survey', 'المنتقدون قبل وبعد إعادة الاستبيان')}
                  legend={<ChartLegend items={[{ label: t('Detractors', 'منتقدون'), color: 'var(--chart-1)' }]} />}
                >
                  <BarChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid {...chartGrid} />
                    <XAxis dataKey="name" {...chartAxis} />
                    <YAxis allowDecimals={false} {...chartAxis} width={32} />
                    <Tooltip cursor={chartCursorBar} content={<ChartTooltip />} />
                    <Bar
                      dataKey="value"
                      name={t('Detractors', 'منتقدون')}
                      fill="var(--chart-1)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={72}
                      label={{ position: 'top', fill: 'var(--ink-secondary)', fontSize: 12 }}
                    />
                    <Legend content={() => null} />
                  </BarChart>
                </ChartWell>
                <dl className="flex flex-col gap-3 text-sm">
                  {(
                    [
                      [t('No longer a detractor', 'لم يعودوا منتقدين'), summary.movement.noLongerDetractor],
                      [t('Better, still a detractor', 'أفضل، لكنهم ما زالوا منتقدين'), summary.movement.betterStill],
                      [t('Same rating', 'التقييم نفسه'), summary.movement.same],
                      [t('Worse', 'أسوأ'), summary.movement.worse],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between border-b border-line pb-2">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="font-medium tabular">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title={t('Indicators now count the second rating', 'المؤشرات تحتسب الآن التقييم الثاني')}
            description={t(
              'Live NPS and CSAT per product, with the re-survey in place of the first rating (the same numbers as Home and CX indicators).',
              'NPS وCSAT الحاليان لكل منتج مع إعادة الاستبيان بدل التقييم الأول (الأرقام نفسها في الرئيسية ومؤشرات التجربة).',
            )}
          >
            <Table density="comfortable">
              <TableHeader>
                <TableRow className="row-divider-none">
                  <TableHead>{t('Product', 'المنتج')}</TableHead>
                  <TableHead className="text-end">NPS</TableHead>
                  <TableHead className="text-end">CSAT %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {live.map((p) => {
                  const ind = indicators?.find((i) => i.productId === p.id)
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <ProductTag productId={p.id as ProductId} lang={lang} />
                      </TableCell>
                      <TableCell className="text-end tabular">
                        <bdi dir="ltr">{fmtSigned(ind?.nps ?? null)}</bdi>
                      </TableCell>
                      <TableCell className="text-end tabular">{ind?.csat == null ? '–' : `${ind.csat}%`}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </SectionCard>

          <SectionCard
            title={t('The conversations', 'المحادثات')}
            description={t('Call notes are read by the CX team only.', 'ملاحظات المكالمات يقرؤها فريق تجربة العملاء فقط.')}
            density="dense"
          >
            {summary.rows.length === 0 ? (
              <EmptyState
                icon={<PhoneCall aria-hidden />}
                title={t('No re-survey answers yet', 'لا توجد إجابات إعادة استبيان بعد')}
                note={t('They appear here once a re-survey answer is recorded in Close the loop.', 'تظهر هنا عند تسجيل إجابة إعادة الاستبيان في إغلاق الحلقة.')}
              />
            ) : (
              <Table density="comfortable">
                <TableHeader>
                  <TableRow className="row-divider-none">
                    <TableHead>{t('Customer', 'العميل')}</TableHead>
                    <TableHead>{t('Product', 'المنتج')}</TableHead>
                    <TableHead>{t('How reached', 'طريقة التواصل')}</TableHead>
                    <TableHead className="text-end">{t('First', 'الأول')}</TableHead>
                    <TableHead className="text-end">{t('Second', 'الثاني')}</TableHead>
                    <TableHead className="text-end">{t('Change', 'التغيّر')}</TableHead>
                    <TableHead>{t('Re-surveyed', 'تاريخ الإعادة')}</TableHead>
                    <TableHead>{t('What they said', 'ماذا قالوا')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.rows.map(({ item, via: how, delta, recovered }) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{label(item.personId)}</TableCell>
                      <TableCell>
                        <ProductTag productId={item.product} lang={lang} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone="neutral">{L(VIA_LABEL[how])}</StatusBadge>
                      </TableCell>
                      <TableCell className="text-end tabular">{item.firstScore}</TableCell>
                      <TableCell className="text-end tabular">{item.secondScore}</TableCell>
                      <TableCell className="text-end">
                        <StatusBadge tone={recovered ? 'success' : delta < 0 ? 'danger' : 'neutral'}>
                          <bdi dir="ltr">{fmtSigned(delta)}</bdi>
                        </StatusBadge>
                      </TableCell>
                      <TableCell>{fmt(item.resurveyedAt)}</TableCell>
                      <TableCell className="max-w-[34ch] whitespace-normal text-sm">
                        {item.outcome && <span className="text-muted-foreground">{L(INTERVIEW_OUTCOME_LABEL[item.outcome])}</span>}
                        {item.reasonCode && <span className="block text-muted-foreground">{L(REASON_CODE_LABEL[item.reasonCode])}</span>}
                        {item.notes?.trim() ? (
                          <span className="block">{item.notes}</span>
                        ) : (
                          <span className="block text-muted-foreground">{t('No notes recorded', 'لا ملاحظات مسجّلة')}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </SectionCard>
        </>
      )}
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  allLabel,
  children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  allLabel: string
  children: React.ReactNode
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="h-9 min-w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {children}
      </SelectContent>
    </Select>
  )
}
