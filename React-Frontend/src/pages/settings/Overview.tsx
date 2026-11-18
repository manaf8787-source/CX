import { Ban, Package } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useCorrectiveActions, useHomeSummary, usePatterns, useProducts, useShopperCases, useSignals, useToggleProductLaunch, useVocRows } from '@/services/queries'
import { canAccessPath } from '@/auth/access'
import type { ProductId } from '@/types'
import { csatOf, fmtSigned, npsOf } from '@/utils/indicators'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ProductTag } from '@/components/common/Chip'
import { LoadingState } from '@/components/common/LoadingState'
import { IN_CARD, SubPageHeader } from './SubPageHeader'
import { StatWell } from './StatWell'
import { FunnelSummary, OverviewCharts, ReputationIndex } from './OverviewInsights'

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
  const canEdit = role.id === 'cxmgr'
  const { data: products, isLoading: productsLoading } = useProducts()
  const { data: vocRows } = useVocRows()
  const { data: actions, isLoading: actionsLoading } = useCorrectiveActions()
  const { data: cases, isLoading: casesLoading } = useShopperCases()
  const toggleLaunch = useToggleProductLaunch()
  const { data: summary, isLoading: summaryLoading } = useHomeSummary()
  const { data: signals, isLoading: signalsLoading } = useSignals()
  const { data: patterns, isLoading: patternsLoading } = usePatterns()
  const linkIf = (path: string) => (canAccessPath(role.id, path) ? path : undefined)

  const launched = (products ?? []).filter((p) => p.live)
  const openActions = (actions ?? []).filter((a) => a.status !== 'effective' && a.status !== 'failed').length
  const criticalCases = (cases ?? []).filter((c) => c.severity === 'critical' && c.status !== 'closed').length

  function rowsFor(id: ProductId) {
    return (vocRows ?? []).filter((r) => r.product === id)
  }

  return (
    <section data-density="comfortable" className="flex flex-col gap-8">
      {!hideHeader && (
        <SubPageHeader
          title={t('Overview', 'نظرة عامة')}
          description={t('Headline experience scores, per product — never one blended number (FR-7.4).', 'مؤشرات التجربة الرئيسية لكل منتج — دون رقم إجمالي واحد أبداً.')}
        />
      )}

      <div className="grid grid-cols-1 gap-(--grid-gap) xl:grid-cols-2">
        <section aria-labelledby="ov-cust">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>
                <h3 id="ov-cust">{t('Customers and runaways', 'العملاء والهاربون')}</h3>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <StatWell label={t('People on record', 'الأشخاص المسجلون')} value={summary?.journeysViewed} to={linkIf('/customers')} loading={summaryLoading} />
              <StatWell term="Runaway" label={t('Runaway customers', 'العملاء الهاربون')} value={summary?.runawayCount} to={linkIf('/runaway')} loading={summaryLoading} />
              <StatWell label={t('Detractors to call', 'منتقدون للاتصال')} value={summary?.toCall} to={linkIf('/close-the-loop')} loading={summaryLoading} />
              <StatWell label={t('Personas', 'الشخصيات')} value={summary?.personaCount} to={linkIf('/personas')} loading={summaryLoading} />
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
              <StatWell term="Signal" label={t('Signals, counted not worked', 'الإشارات، تُحتسب ولا تُعالج فردياً')} value={signals?.length} to={linkIf('/actions/signals')} loading={signalsLoading} />
              <StatWell term="Pattern" label={t('Patterns past threshold', 'أنماط تجاوزت الحد')} value={(patterns ?? []).filter((p) => p.currentValue >= p.thresholdTarget).length} to={linkIf('/actions/signals')} loading={patternsLoading} />
              <StatWell label={t('Open corrective actions', 'الإجراءات التصحيحية المفتوحة')} value={openActions} to={linkIf('/actions/corrective')} loading={actionsLoading} />
              <StatWell label={t('Critical shopper cases open', 'حالات متسوق حرجة مفتوحة')} value={criticalCases} to={linkIf('/actions/shopper-cases')} loading={casesLoading} />
            </CardContent>
          </Card>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-(--grid-gap) xl:grid-cols-5">
        <SectionCard
          className="xl:col-span-3"
          term="NPS" title={t('Indicators per product', 'المؤشرات لكل منتج')}
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
                {(products ?? []).filter((p) => p.live || role.id === 'cxmgr' || role.id === 'cxteam').map((p) => {
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
                        <bdi dir="ltr">{fmtSigned(npsOf(rows))}</bdi>
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

        <SectionCard
          className="xl:col-span-2"
          title={
            <span className="inline-flex items-center gap-2">
              <Package aria-hidden className="size-4 text-muted-foreground" />
              {t('Product launch', 'إطلاق المنتج')}
              <bdi dir="ltr" className="text-sm font-normal text-muted-foreground tabular">{`${launched.length} / ${products?.length ?? 6}`}</bdi>
            </span>
          }
          description={t('Hidden products disappear from menus, cards and filters everywhere in the portal.', 'تختفي المنتجات المخفية من القوائم والبطاقات والفلاتر في كل أنحاء البوابة.')}
        >
          {productsLoading ? (
            <LoadingState rows={4} />
          ) : (
            <ul className="flex flex-col">
              {(products ?? []).map((p) => {
                const status = (
                  <StatusBadge tone={p.live ? 'success' : 'neutral'} dot>
                    {p.live ? t('Live', 'مُفعّل') : t('Hidden', 'مخفي')}
                  </StatusBadge>
                )
                return (
                  <li key={p.id} className="row-divider flex min-h-14 items-center justify-between gap-3 py-2">
                    <ProductTag productId={p.id} lang={lang} />
                    {canEdit ? (
                      <label className="flex cursor-pointer items-center gap-3">
                        {status}
                        <Switch
                          checked={p.live}
                          onCheckedChange={() => toggleLaunch.mutate({ id: p.id })}
                          aria-label={`${L(p.name)}: ${t('show in the portal', 'إظهار في البوابة')}`}
                        />
                      </label>
                    ) : (
                      status
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      <FunnelSummary />
      <ReputationIndex />
      <OverviewCharts products={launched} vocRows={vocRows ?? []} />
    </section>
  )
}
