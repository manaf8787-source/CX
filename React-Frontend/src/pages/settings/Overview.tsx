import { Link } from 'react-router-dom'
import { ArrowRight, Ban, Globe2, ListChecks, Package, ShieldAlert, TrendingUp } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useCorrectiveActions, useProducts, useShopperCases, useToggleProductLaunch, useVocRows } from '@/services/queries'
import type { ProductId, VocRow } from '@/types'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { KpiTile } from '@/components/common/KpiTile'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ProductTag } from '@/components/common/Chip'
import { LoadingState } from '@/components/common/LoadingState'
import { SubPageHeader } from './SubPageHeader'

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

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiTile
          label={t('Open corrective actions', 'الإجراءات التصحيحية المفتوحة')}
          value={openActions}
          icon={<ListChecks />}
          accent="var(--warning)"
          to="/actions/corrective"
          loading={actionsLoading}
        />
        <KpiTile
          label={t('Critical shopper cases open', 'حالات متسوق حرجة مفتوحة')}
          value={criticalCases}
          icon={<ShieldAlert />}
          accent={criticalCases ? 'var(--destructive)' : 'var(--chart-1)'}
          to="/actions/shopper-cases"
          loading={casesLoading}
        />
        <KpiTile
          label={t('Products live', 'المنتجات المفعّلة')}
          value={<bdi dir="ltr">{`${launched.length} / ${products?.length ?? 6}`}</bdi>}
          icon={<Package />}
          accent="var(--chart-1)"
          loading={productsLoading}
        />
        <KpiTile
          label={t('Group NPS', 'مؤشر NPS الإجمالي')}
          value={<span className="text-xl">{t('None, by design', 'لا يوجد، بالتصميم')}</span>}
          icon={<Ban />}
          accent="var(--muted-foreground)"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <SectionCard className="xl:col-span-3" title={t('Per-product experience', 'التجربة لكل منتج')}>
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
                  {(products ?? []).map((p) => {
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
          title={t('Product launch', 'إطلاق المنتج')}
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col items-start gap-2 rounded-xl border bg-muted/40 p-5">
          <StatusBadge tone="info" icon={<TrendingUp aria-hidden />}>
            {t('Lead funnel', 'مسار العملاء المحتملين')}
          </StatusBadge>
          <p className="text-sm">
            {t('The enquiry-to-signed funnel and its source split live on Surveys and triggers.', 'يوجد مسار الاستفسار حتى التوقيع وتوزيع مصادره في صفحة الاستبيانات والمحفزات.')}
          </p>
          <Button variant="outline" size="sm" asChild className="mt-auto">
            <Link to="/surveys">
              {t('Open Surveys and triggers', 'فتح الاستبيانات والمحفزات')}
              <ArrowRight aria-hidden className="rtl:rotate-180" />
            </Link>
          </Button>
        </div>
        <div className="flex flex-col items-start gap-2 rounded-xl border bg-muted/40 p-5">
          <StatusBadge tone="warning" icon={<Globe2 aria-hidden />}>
            {t('Public reputation index', 'مؤشر السمعة العامة')}
          </StatusBadge>
          <p className="text-sm">
            {t(
              'Facebook/Instagram/LinkedIn/Google mentions are never surveyed — replied to within 48 hours instead, tracked under Signals & patterns.',
              'إشارات فيسبوك وإنستغرام ولينكدإن وجوجل لا تُستطلع أبداً — يُرد عليها خلال 48 ساعة، وتُتابع ضمن الإشارات والأنماط.',
            )}
          </p>
          <Button variant="outline" size="sm" asChild className="mt-auto">
            <Link to="/actions/signals">
              {t('Open Signals & patterns', 'فتح الإشارات والأنماط')}
              <ArrowRight aria-hidden className="rtl:rotate-180" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
