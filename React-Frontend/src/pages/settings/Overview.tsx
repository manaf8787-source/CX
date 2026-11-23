import { useState } from 'react'
import { Ban } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useCorrectiveActions, useHomeSummary, usePatterns, useProducts, useShopperCases, useSignals, useVocRows } from '@/services/queries'
import { canAccessPath } from '@/auth/access'
import type { ProductId } from '@/types'
import { csatOf, fmtSigned, npsOf } from '@/utils/indicators'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ProductTag } from '@/components/common/Chip'
import { LoadingState } from '@/components/common/LoadingState'
import { IN_CARD, SubPageHeader } from './SubPageHeader'
import { KpiTile } from '@/components/common/KpiTile'
import { FunnelSummary, OverviewCharts, ReputationIndex } from './OverviewInsights'
import Voc from './Voc'
import { Delta, Signed } from '@/components/common/Trend'
import { useNpsTrend } from '@/services/referenceQueries'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const CHANNEL_NAME: Record<string, { en: string; ar: string }> = {
  digital: { en: 'Digital', ar: 'رقمي' },
  call: { en: 'Call', ar: 'اتصال' },
  app: { en: 'App', ar: 'التطبيق' },
  branch: { en: 'Branch', ar: 'الفرع' },
  event: { en: 'Event', ar: 'فعالية' },
}

/** Ported and upgraded from `frontend/src/pages/Overview.tsx`
 * (APPLICATION_MODULES.md §C) — adds the per-product "no group NPS" framing
 * that v38 insists on (FR-7.4): this page never shows one blended number
 * across products, only each product's own line plus links out to the
 * lead funnel and public reputation index that actually live on
 * Surveys and triggers, rather than re-deriving them here.
 *
 * Composition (comfortable, 48px between the sections): the eight numbers are two cards of four stat wells (card -> well -> text), not
 * eight cards; the per-product table and the launch list are one card each (the table sits on the card, the list is divided rows);
 * the funnel, the reputation index and the charts follow in `OverviewInsights`. No number is coloured. */
export default function SettingsOverview({ hideHeader = false }: { hideHeader?: boolean }) {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { data: products, isLoading: productsLoading } = useProducts()
  const { data: vocRows } = useVocRows()
  const { data: trend } = useNpsTrend()
  const { data: actions, isLoading: actionsLoading } = useCorrectiveActions()
  const { data: cases, isLoading: casesLoading } = useShopperCases()
  const { data: summary, isLoading: summaryLoading } = useHomeSummary()
  const { data: signals, isLoading: signalsLoading } = useSignals()
  const { data: patterns, isLoading: patternsLoading } = usePatterns()
  const linkIf = (path: string) => (canAccessPath(role.id, path) ? path : undefined)

  const launched = (products ?? []).filter((p) => p.live)
  const openActions = (actions ?? []).filter((a) => a.status !== 'effective' && a.status !== 'failed').length
  const criticalCases = (cases ?? []).filter((c) => c.severity === 'critical' && c.status !== 'closed').length

  // 23 Nov (owner): one page, one set of filters; the environment is the switch at the top of every page
  const [product, setProduct] = useState<'all' | ProductId>('all')
  const [channel, setChannel] = useState('all')
  const channels = [...new Set((vocRows ?? []).map((r) => r.channel))]
  const vocFiltered = (vocRows ?? []).filter((r) => (product === 'all' || r.product === product) && (channel === 'all' || r.channel === channel))
  const shown = launched.filter((p) => product === 'all' || p.id === product)
  function rowsFor(id: ProductId) {
    return vocFiltered.filter((r) => r.product === id)
  }

  return (
    <section data-density="comfortable" className="flex flex-col gap-8">
      {!hideHeader && (
        <SubPageHeader
          title={t('Overview', 'نظرة عامة')}
          description={t(
            'Headline experience scores, per product — never one blended number (FR-7.4).',
            'مؤشرات التجربة الرئيسية لكل منتج — دون رقم إجمالي واحد أبداً.',
          )}
        />
      )}

      <div className="sticky top-14 z-10 flex flex-wrap items-center gap-3 rounded-2xl border bg-card/95 p-3 backdrop-blur" data-testid="indicator-filters">
        <span className="t-small-strong">{t('Show', 'اعرض')}</span>
        <Select value={product} onValueChange={(v) => setProduct(v as 'all' | ProductId)}>
          <SelectTrigger className="h-9 min-w-44" aria-label={t('Product', 'المنتج')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All products', 'كل المنتجات')}</SelectItem>
            {launched.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {L(p.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger className="h-9 min-w-40" aria-label={t('Channel', 'القناة')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All channels', 'كل القنوات')}</SelectItem>
            {channels.map((c) => (
              <SelectItem key={c} value={c}>
                {L(CHANNEL_NAME[c] ?? { en: c, ar: c })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="t-body-s">
          {t(
            'The scores, Voice of Customer, the public reputation and the charts follow these filters. Environment: the switch at the top of the page.',
            'المؤشرات وصوت العميل والسمعة العامة والرسوم تتبع هذه الفلاتر. البيئة: من المفتاح أعلى الصفحة.',
          )}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-(--grid-gap) xl:grid-cols-2">
        <section aria-labelledby="ov-cust">
          <Card data-tour="overview-card" className="h-full">
            <CardHeader>
              <CardTitle>
                <h3 id="ov-cust">{t('Customers and runaways', 'العملاء والهاربون')}</h3>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <KpiTile
                variant="well"
                label={t('People on record', 'الأشخاص المسجلون')}
                value={summary?.journeysViewed}
                to={linkIf('/customers')}
                loading={summaryLoading}
              />
              <KpiTile
                variant="well"
                term="Runaway"
                label={t('Runaway customers', 'العملاء الهاربون')}
                value={summary?.runawayCount}
                to={linkIf('/runaway')}
                loading={summaryLoading}
              />
              <KpiTile
                variant="well"
                label={t('Detractors to call', 'منتقدون للاتصال')}
                value={summary?.toCall}
                to={linkIf('/close-the-loop')}
                loading={summaryLoading}
              />
              <KpiTile variant="well" label={t('Personas', 'الشخصيات')} value={summary?.personaCount} to={linkIf('/personas')} loading={summaryLoading} />
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="ov-sig">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>
                <h3 id="ov-sig">{t('Signals and actions', 'الإشارات والإجراءات')}</h3>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <KpiTile
                variant="well"
                term="Signal"
                label={t('Signals, counted not worked', 'الإشارات، تُحتسب ولا تُعالج فردياً')}
                value={signals?.length}
                to={linkIf('/actions/signals')}
                loading={signalsLoading}
              />
              <KpiTile
                variant="well"
                term="Pattern"
                label={t('Patterns past threshold', 'أنماط تجاوزت الحد')}
                value={(patterns ?? []).filter((p) => p.currentValue >= p.thresholdTarget).length}
                to={linkIf('/actions/signals')}
                loading={patternsLoading}
              />
              <KpiTile
                variant="well"
                label={t('Open corrective actions', 'الإجراءات التصحيحية المفتوحة')}
                value={openActions}
                to={linkIf('/actions/corrective')}
                loading={actionsLoading}
              />
              <KpiTile
                variant="well"
                label={t('Critical shopper cases open', 'حالات متسوق حرجة مفتوحة')}
                value={criticalCases}
                to={linkIf('/actions/shopper-cases')}
                loading={casesLoading}
              />
            </CardContent>
          </Card>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-(--grid-gap) xl:grid-cols-5">
        <SectionCard
          className="xl:col-span-5"
          term="NPS"
          title={t('Indicators per product', 'المؤشرات لكل منتج')}
          contentClassName={IN_CARD}
          description={
            <StatusBadge tone="neutral" icon={<Ban aria-hidden />}>
              {t('Group NPS: none, by design', 'NPS الموحد: لا يوجد، بالتصميم')}
            </StatusBadge>
          }
        >
          {productsLoading ? (
            <LoadingState rows={4} />
          ) : (
            <Table density="comfortable">
              <TableHeader>
                <TableRow className="row-divider-none">
                  <TableHead>{t('Product', 'المنتج')}</TableHead>
                  <TableHead className="text-end">NPS</TableHead>
                  <TableHead className="text-end">CSAT</TableHead>
                  <TableHead className="text-end">{t('Responses', 'الردود')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(products ?? [])
                  .filter((p) => (p.live || role.id === 'cxmgr' || role.id === 'cxteam') && (product === 'all' || p.id === product))
                  .map((p) => {
                    const rows = rowsFor(p.id)
                    const c = csatOf(rows)
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <span className="flex flex-wrap items-center gap-2">
                            <ProductTag productId={p.id} lang={lang} />
                            {!p.live && <span className="t-body-s">{t('hidden', 'مخفي')}</span>}
                          </span>
                        </TableCell>
                        <TableCell className="text-end font-medium tabular text-foreground">
                          <span className="inline-flex items-center justify-end gap-2">
                            <Signed value={npsOf(rows)}>
                              <bdi dir="ltr">{fmtSigned(npsOf(rows))}</bdi>
                            </Signed>
                            {(() => {
                              // 23 Nov (owner): green arrow when NPS rose against last month, red when it fell
                              const tr = trend?.[p.id] ?? []
                              return tr.length > 1 ? (
                                <Delta
                                  now={tr[tr.length - 1]}
                                  before={tr[tr.length - 2]}
                                  goodWhen="up"
                                  label={t('vs last month', 'عن الشهر الماضي')}
                                  className="text-xs"
                                />
                              ) : null
                            })()}
                          </span>
                        </TableCell>
                        <TableCell className="text-end font-medium tabular text-foreground">
                          <bdi dir="ltr">{c != null ? `${c}%` : '–'}</bdi>
                        </TableCell>
                        <TableCell className="text-end tabular">{rows.reduce((s, r) => s + r.n, 0)}</TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          )}
        </SectionCard>
      </div>

      <Voc embedded product={product} channel={channel} />
      <FunnelSummary />
      <ReputationIndex productFilter={product} />
      <OverviewCharts products={shown} vocRows={vocFiltered} />
    </section>
  )
}
