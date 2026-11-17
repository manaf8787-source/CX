import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowRight, BrainCircuit, ListChecks, PhoneCall, Search, ShieldAlert, Target, Users, UserX } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useNow } from '@/hooks/useNow'
import { usePersonSearch } from '@/hooks/usePersonSearch'
import {
  useAgentActivity,
  useCorrectiveActions,
  useHomeSummary,
  usePatterns,
  useShopperCases,
  useSignals,
} from '@/services/queries'
import { AGENT_REGISTRY } from '@/data/agentRegistry'
import { liveProducts } from '@/data/products'
import { AGENT_VERDICT_TONE, CORRECTIVE_STATUS_LABEL, CORRECTIVE_STATUS_TONE } from '@/lib/status'
import { formatMonth, formatRelative } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/common/PageHeader'
import { KpiTile } from '@/components/common/KpiTile'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ProductTag } from '@/components/common/Chip'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'

function SeeAll({ to, label }: { to: string; label: string }) {
  return (
    <Button variant="ghost" size="sm" asChild className="text-primary">
      <Link to={to}>
        {label}
        <ArrowRight aria-hidden className="rtl:rotate-180" />
      </Link>
    </Button>
  )
}

/** FR-1.1–1.5: one search box, then the day's picture built only from the mock repository. */
export default function Home() {
  const { t, L, lang } = useI18n()
  const now = useNow()
  const search = usePersonSearch()
  const [query, setQuery] = useState('')

  const { data: summary, isLoading: summaryLoading } = useHomeSummary()
  const { data: signals, isLoading: signalsLoading } = useSignals()
  const { data: patterns, isLoading: patternsLoading } = usePatterns()
  const { data: actions, isLoading: actionsLoading } = useCorrectiveActions()
  const { data: cases, isLoading: casesLoading } = useShopperCases()
  const { data: activity, isLoading: activityLoading } = useAgentActivity()

  const { live, signalsByMonth } = useMemo(() => {
    const live = liveProducts()
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now)
      d.setDate(1)
      d.setMonth(d.getMonth() - (5 - i))
      return d
    })
    const signalsByMonth = months.map((m) => {
      const row: Record<string, string | number> = { month: formatMonth(m, lang) }
      for (const p of live) {
        row[p.id] = (signals ?? []).filter((s) => {
          const d = new Date(s.occurredAt)
          return s.product === p.id && d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth()
        }).length
      }
      return row
    })
    return { live, signalsByMonth }
  }, [signals, now, lang])

  const criticalOpenCases = (cases ?? []).filter((c) => c.severity === 'critical' && c.status !== 'closed')
  const overdueActions = (actions ?? []).filter(
    (a) => new Date(a.dueDate).getTime() < now && !['effective', 'partial', 'failed', 'verification'].includes(a.status),
  )
  const patternsByProgress = [...(patterns ?? [])].sort((a, b) => b.currentValue / b.thresholdTarget - a.currentValue / a.thresholdTarget)
  const recentActivity = [...(activity ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('Home', 'الرئيسية')}
        description={t(
          'One search box. A name, mobile, ID or unit opens a person; below is today’s picture.',
          'مربع بحث واحد. اسم أو رقم جوال أو هوية أو وحدة يفتح ملف الشخص؛ وفي الأسفل صورة اليوم.',
        )}
      />

      <Card className="py-5">
        <CardContent className="px-5">
          <form
            role="search"
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault()
              search(query)
            }}
          >
            <div className="relative flex-1">
              <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={t('Search for a person', 'ابحث عن شخص')}
                placeholder={t('Name, mobile, ID or unit', 'اسم، جوال، هوية أو وحدة')}
                className="h-12 ps-10 text-base md:text-base"
              />
            </div>
            <Button type="submit" size="lg" className="h-12 px-6">
              {t('Search', 'بحث')}
            </Button>
          </form>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('A match opens the person’s journey; anything else lists matching customers.', 'المطابقة تفتح رحلة الشخص؛ وغير ذلك يعرض العملاء المطابقين.')}
          </p>
        </CardContent>
      </Card>

      <section aria-label={t('Today at a glance', 'نظرة سريعة على اليوم')} className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <KpiTile
          label={t('Runaway customers', 'العملاء الهاربون')}
          value={summary?.runawayCount}
          sub={t('No contact for 30+ days', 'لا تواصل منذ أكثر من 30 يوماً')}
          accent="var(--destructive)"
          icon={<UserX />}
          to="/runaway"
          loading={summaryLoading}
        />
        <KpiTile
          label={t('Open corrective actions', 'الإجراءات التصحيحية المفتوحة')}
          value={summary?.openActions}
          sub={t('Not yet verified', 'لم يتم التحقق بعد')}
          accent="var(--warning)"
          icon={<ListChecks />}
          to="/actions/corrective"
          loading={summaryLoading}
        />
        <KpiTile
          label={t('Detractors to call', 'منتقدون للاتصال')}
          value={summary?.toCall}
          sub={t('Close-the-loop list', 'قائمة إغلاق الحلقة')}
          accent="var(--success)"
          icon={<PhoneCall />}
          to="/close-the-loop"
          loading={summaryLoading}
        />
        <KpiTile
          label={t('People on record', 'الأشخاص المسجلون')}
          value={summary?.journeysViewed}
          sub={t('One journey each', 'رحلة واحدة لكل شخص')}
          accent="var(--chart-4)"
          icon={<Users />}
          to="/customers"
          loading={summaryLoading}
        />
        <KpiTile
          label={t('Personas', 'الشخصيات')}
          value={summary?.personaCount}
          sub={t('Rule-built segments', 'شرائح مبنية بالقواعد')}
          accent="var(--chart-1)"
          icon={<Target />}
          to="/personas"
          loading={summaryLoading}
          className="col-span-2 md:col-span-1"
        />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
        <SectionCard
          className="lg:col-span-3"
          title={t('Needs attention', 'يحتاج إلى انتباه')}
          description={t('Critical shopper cases still open, and corrective actions past their due date.', 'حالات التسوق السري الحرجة المفتوحة، والإجراءات التصحيحية المتأخرة.')}
        >
          {casesLoading || actionsLoading ? (
            <LoadingState rows={3} />
          ) : criticalOpenCases.length + overdueActions.length === 0 ? (
            <EmptyState title={t('Nothing urgent right now', 'لا شيء عاجل الآن')} />
          ) : (
            <ul className="flex flex-col divide-y">
              {criticalOpenCases.slice(0, 3).map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                  <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/12 text-danger-text">
                    <ShieldAlert className="size-4" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {t('Critical shopper finding', 'نتيجة تسوق سري حرجة')} · {c.environment}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t('Respond', 'الرد')} {formatRelative(c.respondDueAt, now, lang)}
                    </span>
                  </div>
                  <ProductTag productId={c.product} lang={lang} />
                </li>
              ))}
              {overdueActions.slice(0, 3).map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                  <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning/12 text-warning-text">
                    <ListChecks className="size-4" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{L(a.title)}</span>
                    <span className="text-xs text-muted-foreground">
                      {a.owner} · {t('due', 'الاستحقاق')} {formatRelative(a.dueDate, now, lang)}
                    </span>
                  </div>
                  <StatusBadge tone={CORRECTIVE_STATUS_TONE[a.status]}>{L(CORRECTIVE_STATUS_LABEL[a.status])}</StatusBadge>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-1">
            <SeeAll to="/actions/shopper-cases" label={t('Shopper cases', 'حالات التسوق السري')} />
            <SeeAll to="/actions/corrective" label={t('Corrective actions', 'الإجراءات التصحيحية')} />
          </div>
        </SectionCard>

        <SectionCard
          className="lg:col-span-3"
          title={t('Signals by month', 'الإشارات حسب الشهر')}
          description={t('Counted, not worked — live products, last six months.', 'تُحتسب ولا تُعالج فردياً — المنتجات الفعالة، آخر ستة أشهر.')}
        >
          {signalsLoading ? (
            <LoadingState rows={3} />
          ) : (
            <div className="h-56" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lang === 'ar' ? [...signalsByMonth].reverse() : signalsByMonth} margin={lang === 'ar' ? { top: 4, right: -20, bottom: 0, left: 4 } : { top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                  <YAxis
                    allowDecimals={false}
                    orientation={lang === 'ar' ? 'right' : 'left'}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--muted)' }}
                    contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--popover-foreground)', fontSize: 12 }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span style={{ color: 'var(--muted-foreground)' }}>{value}</span>}
                  />
                  {live.map((p, i) => (
                    <Bar
                      key={p.id}
                      dataKey={p.id}
                      name={L(p.name)}
                      stackId="signals"
                      fill={`var(${p.colorVar})`}
                      radius={i === live.length - 1 ? [4, 4, 0, 0] : 0}
                      maxBarSize={36}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-3">
            <SeeAll to="/actions/signals" label={t('Signals and patterns', 'الإشارات والأنماط')} />
          </div>
        </SectionCard>

        <SectionCard
          className="lg:col-span-3"
          title={t('Patterns against threshold', 'الأنماط مقابل الحد')}
          description={t('A pattern past its threshold gets one corrective action with an owner.', 'النمط الذي يتجاوز حده يحصل على إجراء تصحيحي واحد بمالك.')}
        >
          {patternsLoading ? (
            <LoadingState rows={3} />
          ) : patternsByProgress.length === 0 ? (
            <EmptyState title={t('No patterns yet', 'لا أنماط بعد')} />
          ) : (
            <ul className="flex flex-col gap-3">
              {patternsByProgress.slice(0, 4).map((p) => {
                const pct = Math.min(100, Math.round((p.currentValue / p.thresholdTarget) * 100))
                const crossed = p.currentValue >= p.thresholdTarget
                const unit = p.thresholdKind === 'environment_concentration' ? '%' : ''
                return (
                  <li key={p.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium capitalize">
                        {p.category.replace(/_/g, ' ')} <span className="font-normal text-muted-foreground">· {p.team}</span>
                      </span>
                      <bdi dir="ltr" className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {p.currentValue}
                        {unit} / {p.thresholdTarget}
                        {unit}
                      </bdi>
                    </div>
                    <Progress
                      value={pct}
                      aria-label={`${p.category} ${pct}%`}
                      className={crossed ? '[&>[data-slot=progress-indicator]]:bg-destructive' : '[&>[data-slot=progress-indicator]]:bg-warning'}
                    />
                    {crossed && (
                      <StatusBadge tone="danger" className="self-start">
                        {t('Past threshold', 'تجاوز الحد')}
                      </StatusBadge>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          className="lg:col-span-3"
          title={t('AI team activity', 'نشاط الفريق الذكي')}
          description={t('Latest runs and the supervisor’s verdict on each.', 'أحدث التشغيلات وحكم المشرف على كل منها.')}
        >
          {activityLoading ? (
            <LoadingState rows={3} />
          ) : recentActivity.length === 0 ? (
            <EmptyState title={t('No runs yet', 'لا تشغيلات بعد')} />
          ) : (
            <ol className="flex flex-col gap-3">
              {recentActivity.map((entry) => {
                const agent = AGENT_REGISTRY.find((a) => a.key === entry.agentKey)
                return (
                  <li key={entry.id} className="flex gap-3">
                    <span aria-hidden className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <BrainCircuit className="size-4" />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{agent ? L(agent.name) : entry.agentKey}</span>
                        <StatusBadge tone={AGENT_VERDICT_TONE[entry.supervisorVerdict]}>
                          {
                            {
                              approved: t('Approved', 'معتمد'),
                              returned: t('Returned', 'مُعاد'),
                              escalated: t('Escalated', 'مُصعّد'),
                            }[entry.supervisorVerdict]
                          }
                        </StatusBadge>
                        <span className="text-xs text-muted-foreground">{formatRelative(entry.createdAt, now, lang)}</span>
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{L(entry.subjectSummary)}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
          <div className="mt-3">
            <SeeAll to="/intelligent-cx-team" label={t('Intelligent CX team', 'فريق تجربة العملاء الذكي')} />
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
