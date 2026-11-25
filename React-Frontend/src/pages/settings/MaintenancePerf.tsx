import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle2, ClipboardCheck, Clock, FolderOpen, Star, Wrench } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { Bad, Good, Rate } from '@/components/common/Trend'
import { SortHead, useSort } from '@/components/common/SortHead'
import {
  AMC_VISITS,
  CHECKERS,
  CRITERIA,
  CRITERION_LABEL,
  MAINT_NOW,
  MAINT_REQUESTS,
  PRIORITY,
  RATER_LABEL,
  SIGNOFF_DAYS,
  STAGES,
  STAGE_LABEL,
  VENDORS,
  VENDOR_WEIGHTS,
  addEvaluation,
  avgScore,
  completeDue,
  completedOnTime,
  isBreached,
  isOpen,
  respondedOnTime,
  useEvaluations,
  vendorScore,
  visitMissed,
  type CheckerId,
  type Criterion,
  type Evaluation,
  type Priority,
  type Rater,
} from '@/data/maintenance'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Segmented } from '@/components/ui/segmented'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { KpiTile } from '@/components/common/KpiTile'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { InlineNote } from '@/components/common/InlineNote'
import { EmptyState } from '@/components/common/EmptyState'
import { IN_CARD, SubPageHeader } from './SubPageHeader'
import { cn } from '@/lib/utils'

/**
 * Maintenance follow-up (owner, 25 Nov): the PSI follow-up team (checkers) against the Property Management service levels
 * (PM BRD 4 · SLA and Alerts v3.1), and the outsourced maintenance vendors, scored on the same clocks plus an evaluation form filled
 * by the customer (tenant or owner) and by the PSI staff member who checked the job after the vendor. Data model: data/maintenance.ts.
 */
const TABS = ['team', 'vendors', 'form'] as const
type Tab = (typeof TABS)[number]
type Period = '7' | '30' | '60'
const DAY = 86_400_000
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : null)
const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null)

export default function MaintenancePerf() {
  const { t } = useI18n()
  const [params, setParams] = useSearchParams()
  const asked = params.get('tab')
  const tab: Tab = (TABS as readonly string[]).includes(asked ?? '') ? (asked as Tab) : 'team'
  const [period, setPeriod] = useState<Period>('30')
  const since = MAINT_NOW - Number(period) * DAY

  return (
    <section data-density="comfortable" className="flex flex-col gap-4">
      <SubPageHeader
        title={t('Maintenance follow-up', 'متابعة الصيانة')}
        description={t(
          'How the PSI follow-up team and the outsourced maintenance vendors keep to the Property Management service levels, and how customers and checkers rate each vendor’s work.',
          'مدى التزام فريق متابعة PSI ومقاولي الصيانة الخارجيين بمستويات خدمة إدارة العقارات، وكيف يقيّم العملاء والمدققون عمل كل مقاول.',
        )}
      />
      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })} className="gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="-m-1 max-w-full overflow-x-auto p-1">
            <TabsList className="min-w-max" aria-label={t('Maintenance follow-up', 'متابعة الصيانة')}>
              <TabsTrigger value="team">{t('Follow-up team (SLA)', 'فريق المتابعة (SLA)')}</TabsTrigger>
              <TabsTrigger value="vendors">{t('Outsourced vendors', 'المقاولون الخارجيون')}</TabsTrigger>
              <TabsTrigger value="form">{t('Evaluation form', 'نموذج التقييم')}</TabsTrigger>
            </TabsList>
          </div>
          {tab !== 'form' && (
            <div className="ms-auto">
              <Segmented<Period>
                label={t('Period', 'الفترة')}
                variant="pressed"
                value={period}
                onValueChange={setPeriod}
                options={[
                  { value: '7', label: t('7 days', '7 أيام') },
                  { value: '30', label: t('30 days', '30 يوماً') },
                  { value: '60', label: t('60 days', '60 يوماً') },
                ]}
              />
            </div>
          )}
        </div>
        <TabsContent value="team">
          <TeamTab since={since} />
        </TabsContent>
        <TabsContent value="vendors">
          <VendorsTab since={since} />
        </TabsContent>
        <TabsContent value="form">
          <FormTab />
        </TabsContent>
      </Tabs>
    </section>
  )
}

// --- Follow-up team ------------------------------------------------------------------------------------------------------

function TeamTab({ since }: { since: number }) {
  const { t, L } = useI18n()
  const evals = useEvaluations()
  const rows = MAINT_REQUESTS.filter((x) => x.loggedAt >= since)
  const open = rows.filter(isOpen)
  const breached = open.filter((x) => isBreached(x))
  const done = rows.filter((x) => x.completedAt)
  const metPct = pct(done.filter(completedOnTime).length, done.length)
  const waiting = open.filter((x) => x.stage === 'quotation' || x.stage === 'owner_approval').length + rows.filter((x) => x.signOff === 'waiting').length

  const people = CHECKERS.map((c) => {
    const mine = rows.filter((x) => x.checker === c.id)
    const answered = mine.filter((x) => x.respondedAt)
    const completed = mine.filter((x) => x.completedAt)
    const signOffSent = completed.filter((x) => x.signOffSentAfterDays != null)
    const checked = completed.filter((x) => evals.some((e) => e.requestId === x.id && e.rater === 'checker'))
    return {
      c,
      handled: mine.length,
      respond: pct(answered.filter(respondedOnTime).length, answered.length),
      complete: pct(completed.filter(completedOnTime).length, completed.length),
      breached: mine.filter((x) => isBreached(x)).length,
      escalated: mine.filter((x) => x.escalatedAt).length,
      signOff: pct(signOffSent.filter((x) => (x.signOffSentAfterDays ?? 99) <= 1).length, signOffSent.length),
      checked: pct(checked.length, completed.length),
      stale: mine.filter((x) => x.quoteStale && isOpen(x)).length,
    }
  })
  type K = 'handled' | 'respond' | 'complete' | 'breached' | 'escalated' | 'signOff' | 'checked'
  const { sorted, sort, toggle } = useSort<(typeof people)[number], K>(people, (p, k) => p[k])
  const worst = [...breached].sort((a, b) => completeDue(a) - completeDue(b)).slice(0, 8)
  const hours = (ms: number) => Math.round(ms / 3_600_000)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-(--grid-gap) lg:grid-cols-4">
        <KpiTile
          label={t('Open under SLA', 'مفتوحة ضمن SLA')}
          value={open.length}
          icon={<FolderOpen />}
          sub={t(`${open.filter((x) => x.priority === 'emergency').length} emergency`, `${open.filter((x) => x.priority === 'emergency').length} طارئة`)}
        />
        <KpiTile
          label={t('Breached', 'متجاوزة')}
          value={breached.length ? <Bad>{breached.length}</Bad> : <Good>0</Good>}
          accent={breached.length ? 'var(--destructive)' : undefined}
          icon={<AlertTriangle />}
          sub={t('No first response or not completed in time', 'بلا رد أول أو لم تكتمل في الوقت')}
        />
        <KpiTile
          label={t('Met the target', 'حققت الهدف')}
          value={<Rate value={metPct}>{metPct ?? '—'}</Rate>}
          unit="%"
          icon={<CheckCircle2 />}
          sub={t(`${done.length} completed`, `${done.length} مكتملة`)}
        />
        <KpiTile
          label={t('Waiting on someone', 'بانتظار طرف آخر')}
          value={waiting}
          icon={<Clock />}
          sub={t('Vendor quote, owner approval or sign-off', 'عرض المقاول أو موافقة المالك أو التوقيع')}
        />
      </div>

      <SectionCard
        title={t('By follow-up staff member', 'حسب موظف المتابعة')}
        description={t(
          'The PSI staff who log a repair, chase it and check it after the vendor. Click a column title to sort.',
          'موظفو PSI الذين يسجّلون الإصلاح ويتابعونه ويدققونه بعد المقاول. انقر عنوان العمود للترتيب.',
        )}
        contentClassName={IN_CARD}
      >
        <Table density="comfortable">
          <TableHeader>
            <TableRow>
              <TableHead>{t('Staff member', 'الموظف')}</TableHead>
              <SortHead className="h-auto whitespace-normal align-bottom" sortKey="handled" sort={sort} onSort={toggle} label={t('Requests', 'الطلبات')} />
              <SortHead
                className="h-auto whitespace-normal align-bottom"
                sortKey="respond"
                sort={sort}
                onSort={toggle}
                label={t('Responded on time', 'رد في الوقت')}
              />
              <SortHead
                className="h-auto whitespace-normal align-bottom"
                sortKey="complete"
                sort={sort}
                onSort={toggle}
                label={t('Completed on time', 'اكتمل في الوقت')}
              />
              <SortHead
                className="h-auto whitespace-normal align-bottom"
                sortKey="breached"
                sort={sort}
                onSort={toggle}
                label={t('Breached now', 'متجاوزة الآن')}
              />
              <SortHead className="h-auto whitespace-normal align-bottom" sortKey="escalated" sort={sort} onSort={toggle} label={t('Escalated', 'صُعّدت')} />
              <SortHead
                className="h-auto whitespace-normal align-bottom"
                sortKey="signOff"
                sort={sort}
                onSort={toggle}
                label={t('Sign-off sent in 1 day', 'التوقيع خلال يوم')}
              />
              <SortHead
                className="h-auto whitespace-normal align-bottom"
                sortKey="checked"
                sort={sort}
                onSort={toggle}
                label={t('Checked after the vendor', 'دُقق بعد المقاول')}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((p) => (
              <TableRow key={p.c.id}>
                <TableCell className="font-medium text-foreground">{L(p.c.name)}</TableCell>
                <TableCell className="text-end tabular">{p.handled}</TableCell>
                <TableCell className="text-end tabular">
                  <Rate value={p.respond} />
                </TableCell>
                <TableCell className="text-end tabular">
                  <Rate value={p.complete} />
                </TableCell>
                <TableCell className="text-end tabular">{p.breached ? <Bad>{p.breached}</Bad> : 0}</TableCell>
                <TableCell className="text-end tabular">{p.escalated ? <Bad>{p.escalated}</Bad> : 0}</TableCell>
                <TableCell className="text-end tabular">
                  <Rate value={p.signOff} />
                </TableCell>
                <TableCell className="text-end tabular">
                  <Rate value={p.checked} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title={t('By priority', 'حسب الأولوية')}
          description={t('The targets from the Property Management SLA.', 'الأهداف من SLA إدارة العقارات.')}
          contentClassName={IN_CARD}
        >
          <Table density="comfortable">
            <TableHeader>
              <TableRow>
                <TableHead>{t('Priority', 'الأولوية')}</TableHead>
                <TableHead className="text-end">{t('Respond in', 'الرد خلال')}</TableHead>
                <TableHead className="text-end">{t('Complete in', 'الإنجاز خلال')}</TableHead>
                <TableHead className="text-end">{t('Open', 'مفتوحة')}</TableHead>
                <TableHead className="text-end">{t('Breached', 'متجاوزة')}</TableHead>
                <TableHead className="text-end">{t('Met', 'حققت')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(Object.keys(PRIORITY) as Priority[]).map((k) => {
                const mine = rows.filter((x) => x.priority === k)
                const d = mine.filter((x) => x.completedAt)
                return (
                  <TableRow key={k}>
                    <TableCell className="font-medium text-foreground">{L(PRIORITY[k].label)}</TableCell>
                    <TableCell className="text-end tabular">{t(`${PRIORITY[k].respondH} h`, `${PRIORITY[k].respondH} س`)}</TableCell>
                    <TableCell className="text-end tabular">{t(`${PRIORITY[k].completeH} h`, `${PRIORITY[k].completeH} س`)}</TableCell>
                    <TableCell className="text-end tabular">{mine.filter(isOpen).length}</TableCell>
                    <TableCell className="text-end tabular">{mine.filter((x) => isBreached(x)).length || 0}</TableCell>
                    <TableCell className="text-end tabular">
                      <Rate value={pct(d.filter(completedOnTime).length, d.length)} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </SectionCard>
        <SectionCard
          title={t('Requests by stage', 'الطلبات حسب المرحلة')}
          description={t('Open requests, as the CRM shows them.', 'الطلبات المفتوحة كما يعرضها CRM.')}
        >
          <ul className="flex flex-col gap-2">
            {STAGES.filter((s) => s !== 'completed' && s !== 'cancelled').map((s) => {
              const n = open.filter((x) => x.stage === s).length
              const max = Math.max(1, ...STAGES.map((y) => open.filter((x) => x.stage === y).length))
              return (
                <li key={s} className="grid grid-cols-[minmax(0,11rem)_1fr_2.5rem] items-center gap-3 text-sm">
                  <span className="truncate text-muted-foreground">{L(STAGE_LABEL[s])}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-well">
                    <span className="block h-full rounded-full bg-(--chart-1)" style={{ width: `${(n / max) * 100}%` }} />
                  </span>
                  <span className="text-end tabular text-foreground">{n}</span>
                </li>
              )
            })}
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title={t('Most overdue', 'الأكثر تأخراً')}
        description={t('Open requests past a target now.', 'طلبات مفتوحة تجاوزت هدفاً الآن.')}
        contentClassName={IN_CARD}
      >
        {worst.length === 0 ? (
          <EmptyState title={t('Nothing is past its target.', 'لا شيء تجاوز هدفه.')} />
        ) : (
          <Table density="comfortable">
            <TableHeader>
              <TableRow>
                <TableHead>{t('Request', 'الطلب')}</TableHead>
                <TableHead>{t('Unit', 'الوحدة')}</TableHead>
                <TableHead>{t('Priority', 'الأولوية')}</TableHead>
                <TableHead>{t('Stage', 'المرحلة')}</TableHead>
                <TableHead>{t('Follow-up', 'المتابع')}</TableHead>
                <TableHead>{t('Escalated', 'التصعيد')}</TableHead>
                <TableHead className="text-end">{t('Late by', 'متأخر')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {worst.map((x) => (
                <TableRow key={x.id}>
                  <TableCell className="tabular font-medium text-foreground">{x.id}</TableCell>
                  <TableCell>{x.unit}</TableCell>
                  <TableCell>{L(PRIORITY[x.priority].label)}</TableCell>
                  <TableCell>{L(STAGE_LABEL[x.stage])}</TableCell>
                  <TableCell>{L(CHECKERS.find((c) => c.id === x.checker)!.name)}</TableCell>
                  <TableCell>
                    {x.escalatedAt ? <StatusBadge tone="warning">{t('Escalated', 'صُعّد')}</StatusBadge> : t('Not escalated yet', 'لم يُصعّد بعد')}
                  </TableCell>
                  <TableCell className="text-end">
                    <StatusBadge tone="danger">
                      {MAINT_NOW > completeDue(x)
                        ? t(`${hours(MAINT_NOW - completeDue(x))} h`, `${hours(MAINT_NOW - completeDue(x))} س`)
                        : t('first response', 'الرد الأول')}
                    </StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </div>
  )
}

// --- Vendors -------------------------------------------------------------------------------------------------------------

function VendorsTab({ since }: { since: number }) {
  const { t } = useI18n()
  const evals = useEvaluations()
  const rows = MAINT_REQUESTS.filter((x) => x.loggedAt >= since)
  const scored = VENDORS.map((v) => {
    const mine = rows.filter((x) => x.vendor === v.id)
    const answered = mine.filter((x) => x.respondedAt)
    const done = mine.filter((x) => x.completedAt)
    const accepted = pct(answered.filter(respondedOnTime).length, answered.length)
    const onTime = pct(done.filter(completedOnTime).length, done.length)
    const clocks = accepted == null && onTime == null ? null : Math.round(((accepted ?? onTime)! + (onTime ?? accepted)!) / 2)
    const ev = evals.filter((e) => e.vendor === v.id && mine.some((x) => x.id === e.requestId))
    const cust = avg(ev.filter((e) => e.rater === 'customer').map(avgScore))
    const chk = avg(ev.filter((e) => e.rater === 'checker').map(avgScore))
    const visits = AMC_VISITS.filter((a) => a.vendor === v.id && a.plannedFor >= since && a.plannedFor <= MAINT_NOW)
    return {
      v,
      jobs: mine.length,
      accepted,
      onTime,
      notDone: mine.filter((x) => x.notDoneYet >= 2).length,
      rework: mine.filter((x) => x.rework).length,
      firstTime: pct(ev.filter((e) => e.fixedFirstTime).length, ev.length),
      amcMissed: visits.filter((a) => visitMissed(a)).length,
      amcTotal: visits.length,
      cust,
      custN: ev.filter((e) => e.rater === 'customer').length,
      chk,
      chkN: ev.filter((e) => e.rater === 'checker').length,
      score: vendorScore(clocks, cust, chk),
    }
  })
  type K = 'jobs' | 'accepted' | 'onTime' | 'notDone' | 'rework' | 'firstTime' | 'amcMissed' | 'cust' | 'chk' | 'score'
  const { sorted, sort, toggle } = useSort<(typeof scored)[number], K>(scored, (r, k) => r[k])
  const best = [...scored].filter((x) => x.score != null).sort((a, b) => b.score! - a.score!)[0]
  const worst = [...scored].filter((x) => x.score != null).sort((a, b) => a.score! - b.score!)[0]
  const all = evals.filter((e) => rows.some((x) => x.id === e.requestId))
  const custAll = avg(all.filter((e) => e.rater === 'customer').map(avgScore))
  const stars = (n: number | null) => (n == null ? '—' : n.toFixed(1))

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-(--grid-gap) lg:grid-cols-4">
        <KpiTile
          label={t('Vendor jobs', 'أعمال المقاولين')}
          value={rows.length}
          icon={<Wrench />}
          sub={t(`${VENDORS.length} vendors`, `${VENDORS.length} مقاولين`)}
        />
        <KpiTile
          label={t('Customer rating', 'تقييم العملاء')}
          value={stars(custAll)}
          unit="/5"
          icon={<Star />}
          sub={t(`${all.filter((e) => e.rater === 'customer').length} forms`, `${all.filter((e) => e.rater === 'customer').length} نموذجاً`)}
        />
        <KpiTile label={t('Best vendor', 'أفضل مقاول')} value={best ? <Good>{best.score}</Good> : '—'} unit="/100" sub={best?.v.name} />
        <KpiTile
          label={t('Weakest vendor', 'أضعف مقاول')}
          value={worst ? <Bad>{worst.score}</Bad> : '—'}
          unit="/100"
          sub={worst?.v.name}
          accent="var(--destructive)"
        />
      </div>

      <SectionCard
        title={t('Vendor scorecard', 'بطاقة أداء المقاولين')}
        description={t(
          `Score out of 100: ${VENDOR_WEIGHTS.clocks} on the clocks (accepted and done on time), ${VENDOR_WEIGHTS.customer} on the customer’s form, ${VENDOR_WEIGHTS.checker} on the PSI checker’s form. Weights proposed, to confirm.`,
          `الدرجة من 100: ${VENDOR_WEIGHTS.clocks} للمواعيد (القبول والإنجاز في الوقت)، ${VENDOR_WEIGHTS.customer} لنموذج العميل، ${VENDOR_WEIGHTS.checker} لنموذج مدقق PSI. الأوزان مقترحة للتأكيد.`,
        )}
        contentClassName={IN_CARD}
      >
        <Table density="comfortable">
          <TableHeader>
            <TableRow>
              <TableHead>{t('Vendor', 'المقاول')}</TableHead>
              <SortHead className="h-auto whitespace-normal align-bottom" sortKey="score" sort={sort} onSort={toggle} label={t('Score', 'الدرجة')} />
              <SortHead className="h-auto whitespace-normal align-bottom" sortKey="jobs" sort={sort} onSort={toggle} label={t('Jobs', 'الأعمال')} />
              <SortHead
                className="h-auto whitespace-normal align-bottom"
                sortKey="accepted"
                sort={sort}
                onSort={toggle}
                label={t('Accepted on time', 'قبل في الوقت')}
              />
              <SortHead
                className="h-auto whitespace-normal align-bottom"
                sortKey="onTime"
                sort={sort}
                onSort={toggle}
                label={t('Done on time', 'أنجز في الوقت')}
              />
              <SortHead className="h-auto whitespace-normal align-bottom" sortKey="notDone" sort={sort} onSort={toggle} label={t('Late twice', 'تأخر مرتين')} />
              <SortHead className="h-auto whitespace-normal align-bottom" sortKey="rework" sort={sort} onSort={toggle} label={t('Sent back', 'أُعيد للمقاول')} />
              <SortHead
                className="h-auto whitespace-normal align-bottom"
                sortKey="firstTime"
                sort={sort}
                onSort={toggle}
                label={t('Fixed first time', 'أُصلح من أول مرة')}
              />
              <SortHead
                className="h-auto whitespace-normal align-bottom"
                sortKey="amcMissed"
                sort={sort}
                onSort={toggle}
                label={t('AMC missed', 'AMC فائتة')}
              />
              <SortHead className="h-auto whitespace-normal align-bottom" sortKey="cust" sort={sort} onSort={toggle} label={t('Customer /5', 'العميل /5')} />
              <SortHead className="h-auto whitespace-normal align-bottom" sortKey="chk" sort={sort} onSort={toggle} label={t('Checker /5', 'المدقق /5')} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r) => (
              <TableRow key={r.v.id}>
                <TableCell className="min-w-40 font-medium whitespace-normal text-foreground">{r.v.name}</TableCell>
                <TableCell className="text-end tabular font-medium">
                  <Rate value={r.score}>{r.score ?? '—'}</Rate>
                </TableCell>
                <TableCell className="text-end tabular">{r.jobs}</TableCell>
                <TableCell className="text-end tabular">
                  <Rate value={r.accepted} />
                </TableCell>
                <TableCell className="text-end tabular">
                  <Rate value={r.onTime} />
                </TableCell>
                <TableCell className="text-end tabular">{r.notDone ? <Bad>{r.notDone}</Bad> : 0}</TableCell>
                <TableCell className="text-end tabular">{r.rework ? <Bad>{r.rework}</Bad> : 0}</TableCell>
                <TableCell className="text-end tabular">
                  <Rate value={r.firstTime} />
                </TableCell>
                <TableCell className="text-end tabular">
                  {r.amcMissed ? <Bad>{r.amcMissed}</Bad> : 0}
                  <span className="text-muted-foreground"> / {r.amcTotal}</span>
                </TableCell>
                <TableCell className="text-end tabular" title={t(`${r.custN} forms`, `${r.custN} نموذج`)}>
                  {stars(r.cust)}
                </TableCell>
                <TableCell className="text-end tabular" title={t(`${r.chkN} forms`, `${r.chkN} نموذج`)}>
                  {stars(r.chk)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  )
}

// --- Evaluation form -----------------------------------------------------------------------------------------------------

function FormTab() {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const evals = useEvaluations()
  const [open, setOpen] = useState(false)
  const recent = useMemo(() => [...evals].sort((a, b) => b.at - a.at).slice(0, 12), [evals])
  const canRecord = role.id === 'cxmgr' || role.id === 'cxteam' || role.id === 'envmgmt'
  const day = (ms: number) => new Date(ms).toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short' })

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title={t('The form', 'النموذج')}
        description={t(
          `Sent once the work is completed, with the sign-off link (valid ${SIGNOFF_DAYS} days): to the customer who reported it (tenant or owner), and to the PSI staff member who follows the job, who visits or calls to check it after the vendor.`,
          `يُرسل بعد اكتمال العمل مع رابط التوقيع (صالح ${SIGNOFF_DAYS} أيام): للعميل الذي أبلغ (المستأجر أو المالك)، ولموظف PSI المتابع الذي يزور أو يتصل للتحقق بعد المقاول.`,
        )}
        actions={
          canRecord && (
            <Button size="sm" onClick={() => setOpen(true)}>
              <ClipboardCheck aria-hidden />
              {t('Record an evaluation', 'تسجيل تقييم')}
            </Button>
          )
        }
      >
        <ol className="grid gap-3 md:grid-cols-2">
          {CRITERIA.map((k, i) => (
            <li key={k} className="well flex flex-col gap-1 p-4">
              <span className="text-sm font-medium text-foreground">
                {i + 1}. {L(CRITERION_LABEL[k].label)}
              </span>
              <span className="text-xs text-muted-foreground">{L(CRITERION_LABEL[k].hint)}</span>
              <span className="mt-1 text-xs text-muted-foreground">{t('1 (poor) to 5 (excellent)', '1 (ضعيف) إلى 5 (ممتاز)')}</span>
            </li>
          ))}
          <li className="well flex flex-col gap-1 p-4">
            <span className="text-sm font-medium text-foreground">5. {t('Was it fixed the first time?', 'هل أُصلح من أول مرة؟')}</span>
            <span className="text-xs text-muted-foreground">{t('Yes or no', 'نعم أو لا')}</span>
          </li>
          <li className="well flex flex-col gap-1 p-4">
            <span className="text-sm font-medium text-foreground">6. {t('Comment', 'ملاحظة')}</span>
            <span className="text-xs text-muted-foreground">{t('Required when any answer is 1 or 2', 'مطلوبة إذا كانت أي إجابة 1 أو 2')}</span>
          </li>
        </ol>
        <InlineNote className="mt-4" tone="info">
          {t(
            'The vendor’s score on the Outsourced vendors tab uses both forms. Proposed: a low score (any answer 1 or 2) opens a follow-up with the vendor for the property manager.',
            'درجة المقاول في تبويب المقاولين الخارجيين تستخدم النموذجين. مقترح: أي درجة منخفضة (1 أو 2) تفتح متابعة مع المقاول لمدير العقار.',
          )}
        </InlineNote>
      </SectionCard>

      <SectionCard title={t('Latest evaluations', 'آخر التقييمات')} contentClassName={IN_CARD}>
        <Table density="comfortable">
          <TableHeader>
            <TableRow>
              <TableHead>{t('Date', 'التاريخ')}</TableHead>
              <TableHead>{t('Request', 'الطلب')}</TableHead>
              <TableHead>{t('Vendor', 'المقاول')}</TableHead>
              <TableHead>{t('By', 'بواسطة')}</TableHead>
              <TableHead className="text-end">{t('Average', 'المتوسط')}</TableHead>
              <TableHead>{t('Fixed first time', 'من أول مرة')}</TableHead>
              <TableHead>{t('Comment', 'ملاحظة')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent.map((e) => {
              const a = avgScore(e)
              return (
                <TableRow key={e.id}>
                  <TableCell className="tabular">{day(e.at)}</TableCell>
                  <TableCell className="tabular font-medium text-foreground">{e.requestId}</TableCell>
                  <TableCell>{VENDORS.find((v) => v.id === e.vendor)?.name}</TableCell>
                  <TableCell>{e.rater === 'checker' && e.by ? L(CHECKERS.find((c) => c.id === e.by)!.name) : L(RATER_LABEL[e.rater])}</TableCell>
                  <TableCell className={cn('text-end tabular', a < 3 && 'text-(--status-error-text)')}>{a.toFixed(1)}</TableCell>
                  <TableCell>{e.fixedFirstTime ? t('Yes', 'نعم') : <Bad>{t('No', 'لا')}</Bad>}</TableCell>
                  <TableCell className="max-w-64 truncate text-muted-foreground">{e.comment || '—'}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </SectionCard>
      {open && <EvaluationDialog onClose={() => setOpen(false)} />}
    </div>
  )
}

function EvaluationDialog({ onClose }: { onClose: () => void }) {
  const { t, L } = useI18n()
  const evals = useEvaluations()
  const [rater, setRater] = useState<Rater>('checker')
  const [checker, setChecker] = useState<CheckerId>(CHECKERS[0].id)
  const candidates = MAINT_REQUESTS.filter((x) => x.completedAt && !evals.some((e: Evaluation) => e.requestId === x.id && e.rater === rater))
    .sort((a, b) => b.completedAt! - a.completedAt!)
    .slice(0, 30)
  const [requestId, setRequestId] = useState<string>(candidates[0]?.id ?? '')
  const [scores, setScores] = useState<Record<Criterion, number>>({ time: 0, quality: 0, clean: 0, conduct: 0 })
  const [firstTime, setFirstTime] = useState<'yes' | 'no' | ''>('')
  const [comment, setComment] = useState('')
  const low = CRITERIA.some((k) => scores[k] > 0 && scores[k] <= 2)
  const ready = requestId && CRITERIA.every((k) => scores[k] > 0) && firstTime && (!low || comment.trim().length >= 10)
  const req = MAINT_REQUESTS.find((x) => x.id === requestId)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('Record an evaluation', 'تسجيل تقييم')}</DialogTitle>
          <DialogDescription>{t('The vendor’s work on one completed request.', 'عمل المقاول على طلب مكتمل واحد.')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t('Filled by', 'عبّأه')}
            <Select value={rater} onValueChange={(v) => setRater(v as Rater)}>
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['checker', 'customer'] as Rater[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {L(RATER_LABEL[r])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          {rater === 'checker' && (
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t('Checker', 'المدقق')}
              <Select value={checker} onValueChange={(v) => setChecker(v as CheckerId)}>
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHECKERS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {L(c.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          )}
          <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:col-span-2">
            {t('Completed request', 'الطلب المكتمل')}
            <Select value={requestId} onValueChange={setRequestId}>
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {candidates.map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {x.id} · {x.unit} · {VENDORS.find((v) => v.id === x.vendor)?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
        <div className="flex flex-col gap-3">
          {CRITERIA.map((k) => (
            <div key={k} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-foreground">{L(CRITERION_LABEL[k].label)}</span>
              <div role="radiogroup" aria-label={L(CRITERION_LABEL[k].label)} className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={scores[k] === n}
                    onClick={() => setScores((s) => ({ ...s, [k]: n }))}
                    className={cn(
                      'grid size-8 place-items-center rounded-full text-sm tabular outline-hidden focus-visible:ring-2',
                      scores[k] === n ? 'material-dark' : 'material-light hover:opacity-80',
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-foreground">{t('Fixed the first time?', 'أُصلح من أول مرة؟')}</span>
            <Segmented<'yes' | 'no' | ''>
              label={t('Fixed the first time?', 'أُصلح من أول مرة؟')}
              variant="pressed"
              value={firstTime}
              onValueChange={setFirstTime}
              options={[
                { value: 'yes', label: t('Yes', 'نعم') },
                { value: 'no', label: t('No', 'لا') },
              ]}
            />
          </div>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {low ? t('Comment (required: what went wrong)', 'ملاحظة (مطلوبة: ما الخطأ)') : t('Comment (optional)', 'ملاحظة (اختيارية)')}
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('Cancel', 'إلغاء')}
          </Button>
          <Button
            disabled={!ready}
            onClick={() => {
              if (!req) return
              addEvaluation({
                requestId,
                vendor: req.vendor,
                rater,
                by: rater === 'checker' ? checker : undefined,
                scores,
                fixedFirstTime: firstTime === 'yes',
                comment: comment.trim() || undefined,
              })
              toast.success(t('Evaluation saved. The vendor’s score is updated.', 'حُفظ التقييم. حُدّثت درجة المقاول.'))
              onClose()
            }}
          >
            {t('Save', 'حفظ')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
