import { Ban, ListChecks, Package, ShieldAlert, UserX, Users, Activity } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useCorrectiveActions, useHomeSummary, usePatterns, useProducts, useShopperCases, useSignals, useToggleProductLaunch, useVocRows } from '@/services/queries'
import { canAccessPath } from '@/auth/access'
import type { ProductId, VocRow } from '@/types'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { KpiTile } from '@/components/common/KpiTile'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ProductTag } from '@/components/common/Chip'
import { LoadingState } from '@/components/common/LoadingState'
import { SubPageHeader } from './SubPageHeader'
import { FunnelSummary, OverviewCharts, ReputationIndex } from './OverviewInsights'

function nps(rows: VocRow[]): number | null {
  const n = rows.reduce((s, r) => s + r.n, 0)
  if (!n) return null
  const p = rows.reduce((s, r) => s + r.promoters, 0)
  const d = rows.reduce((s, r) => s + r.detractors, 0)
  return Math.round(((p - d) / n) * 100)
}
function csat(rows: VocRow[]): number | null {
  const n = rows.reduce((s, r) => s + r.n, 0)
  if (!n) return null
  return Math.round(rows.reduce((s, r) => s + r.csat * r.n, 0) / n)
}
function fmtSigned(v: number | null) {
  if (v == null) return '–'
  return (v > 0 ? '+' : '') + v
}

/** Ported and upgraded from `frontend/src/pages/Overview.tsx`
 * (APPLICATION_MODULES.md §C) — adds the per-product "no group NPS" framing
 * that v38 insists on (FR-7.4): this page never shows one blended number
 * across products, only each product's own line plus links out to the
 * lead funnel and public reputation index that actually live on
 * Surveys and triggers, rather than re-deriving them here. */
export default function SettingsOverview() {
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
  const th = 'px-3 text-xs font-semibold text-muted-foreground'

  function rowsFor(id: ProductId) {
    return (vocRows ?? []).filter((r) => r.product === id)
  }

  return (
    <section className="flex flex-col gap-4">
      <SubPageHeader
        title={t('Overview', 'نظرة عامة')}
        description={t('Headline experience scores, per product — never one blended number (FR-7.4).', 'مؤشرات التجربة الرئيسية لكل منتج — دون رقم إجمالي واحد أبداً.')}
      />

      <section aria-labelledby="ov-cust" className="flex flex-col gap-2">
        <h3 id="ov-cust" className="text-sm font-semibold text-muted-foreground">{t('Customers and runaways', 'العملاء والهاربون')}</h3>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <KpiTile label={t('People on record', 'الأشخاص المسجلون')} value={summary?.journeysViewed} icon={<Users />} accent="var(--chart-4)" to={linkIf('/customers')} loading={summaryLoading} />
          <KpiTile term="Runaway" label={t('Runaway customers', 'العملاء الهاربون')} value={summary?.runawayCount} icon={<UserX />} accent="var(--destructive)" to={linkIf('/runaway')} loading={summaryLoading} />
          <KpiTile label={t('Detractors to call', 'منتقدون للاتصال')} value={summary?.toCall} accent="var(--success)" to={linkIf('/close-the-loop')} loading={summaryLoading} />
          <KpiTile label={t('Personas', 'الشخصيات')} value={summary?.personaCount} accent="var(--chart-1)" to={linkIf('/personas')} loading={summaryLoading} />
        </div>
      </section>

      <section aria-labelledby="ov-sig" className="flex flex-col gap-2">
        <h3 id="ov-sig" className="text-sm font-semibold text-muted-foreground">{t('Signals and actions', 'الإشارات والإجراءات')}</h3>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <KpiTile term="Signal" label={t('Signals, counted not worked', 'الإشارات، تُحتسب ولا تُعالج فردياً')} value={signals?.length} icon={<Activity />} accent="var(--info)" to={linkIf('/actions/signals')} loading={signalsLoading} />
          <KpiTile term="Pattern" label={t('Patterns past threshold', 'أنماط تجاوزت الحد')} value={(patterns ?? []).filter((p) => p.currentValue >= p.thresholdTarget).length} accent="var(--warning)" to={linkIf('/actions/signals')} loading={patternsLoading} />
          <KpiTile label={t('Open corrective actions', 'الإجراءات التصحيحية المفتوحة')} value={openActions} icon={<ListChecks />} accent="var(--warning)" to={linkIf('/actions/corrective')} loading={actionsLoading} />
          <KpiTile
            label={t('Critical shopper cases open', 'حالات متسوق حرجة مفتوحة')}
            value={criticalCases}
            icon={<ShieldAlert />}
            accent={criticalCases ? 'var(--destructive)' : 'var(--chart-1)'}
            to={linkIf('/actions/shopper-cases')}
            loading={casesLoading}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <SectionCard
          className="xl:col-span-3"
          term="NPS" title={t('Indicators per product', 'المؤشرات لكل منتج')}
          actions={
            <StatusBadge tone="neutral" icon={<Ban aria-hidden />}>
              {t('Group NPS: none, by design', 'NPS الموحد: لا يوجد، بالتصميم')}
            </StatusBadge>
          }
        >
          {productsLoading ? (
            <LoadingState rows={4} />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader className="bg-muted/60">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={th}>{t('Product', 'المنتج')}</TableHead>
                    <TableHead className={`${th} text-end`}>NPS</TableHead>
                    <TableHead className={`${th} text-end`}>CSAT</TableHead>
                    <TableHead className={`${th} text-end`}>{t('Responses', 'الردود')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(products ?? []).filter((p) => p.live || role.id === 'cxmgr' || role.id === 'cxteam').map((p) => {
                    const rows = rowsFor(p.id)
                    const c = csat(rows)
                    return (
                      <TableRow key={p.id} className={p.live ? undefined : 'text-muted-foreground'}>
                        <TableCell className="px-3">
                          <span className="flex flex-wrap items-center gap-2">
                            <ProductTag productId={p.id} lang={lang} />
                            {!p.live && <span className="text-xs">{t('hidden', 'مخفي')}</span>}
                          </span>
                        </TableCell>
                        <TableCell className="px-3 text-end text-sm tabular-nums">
                          <bdi dir="ltr">{fmtSigned(nps(rows))}</bdi>
                        </TableCell>
                        <TableCell className="px-3 text-end text-sm tabular-nums">
                          <bdi dir="ltr">{c != null ? `${c}%` : '–'}</bdi>
                        </TableCell>
                        <TableCell className="px-3 text-end text-sm tabular-nums">{rows.reduce((s, r) => s + r.n, 0)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>

        <SectionCard
          className="xl:col-span-2"
          title={
            <span className="inline-flex items-center gap-2">
              <Package aria-hidden className="size-4 text-muted-foreground" />
              {t('Product launch', 'إطلاق المنتج')}
              <bdi dir="ltr" className="text-sm font-normal text-muted-foreground">{`${launched.length} / ${products?.length ?? 6}`}</bdi>
            </span>
          }
          description={t('Hidden products disappear from menus, cards and filters everywhere in the portal.', 'تختفي المنتجات المخفية من القوائم والبطاقات والفلاتر في كل أنحاء البوابة.')}
        >
          {productsLoading ? (
            <LoadingState rows={4} />
          ) : (
            <ul className="flex flex-col divide-y">
              {(products ?? []).map((p) => {
                const status = (
                  <StatusBadge tone={p.live ? 'success' : 'neutral'} dot>
                    {p.live ? t('Live', 'مُفعّل') : t('Hidden', 'مخفي')}
                  </StatusBadge>
                )
                return (
                  <li key={p.id} className="flex min-h-11 items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                    <ProductTag productId={p.id} lang={lang} />
                    {canEdit ? (
                      <label className="flex cursor-pointer items-center gap-2">
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
