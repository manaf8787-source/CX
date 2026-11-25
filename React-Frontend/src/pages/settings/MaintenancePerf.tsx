import { createContext, useContext, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, ClipboardCheck, Clock, FolderOpen, Star, Wrench } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useEnvScope } from '@/services/envScope'
import { ENVIRONMENTS, envName } from '@/data/environments'
import { GiftFlow } from '@/components/gifts/GiftFlow'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { EnvId, EnvScope } from '@/types'
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
  checkerById,
  vendorById,
  CATEGORY,
  visitMissed,
  type CheckerId,
  type Criterion,
  type Evaluation,
  type Priority,
  type Rater,
  type VendorId,
  type MaintRequest,
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
type Detail = { kind: 'request' | 'staff' | 'vendor'; id: string }
/** The page's filters and the open detail (25 Nov, owner): environment (fixed for an environment's own management), sub-contractors (multi-select). */
const PageCtx = createContext<{ vendors: VendorId[]; open: (d: Detail) => void }>({ vendors: [], open: () => {} })
const inEnv = (env: EnvScope, e: EnvId) => env === 'all' || e === env
/** Everything on the page reads through this: the environment of the top bar (or the role's own) and the chosen sub-contractors. */
function useScoped() {
  const { env } = useEnvScope()
  const { vendors } = useContext(PageCtx)
  const pick = (v: VendorId) => !vendors.length || vendors.includes(v)
  return {
    env,
    requests: MAINT_REQUESTS.filter((x) => inEnv(env, x.envId) && pick(x.vendor)),
    visits: AMC_VISITS.filter((x) => inEnv(env, x.envId) && pick(x.vendor)),
    staff: CHECKERS.filter((c) => inEnv(env, c.envId)),
    vendorList: VENDORS.filter((v) => (env === 'all' || (v.envs as readonly EnvId[]).includes(env)) && pick(v.id)),
  }
}
const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null)

export default function MaintenancePerf() {
  const { t } = useI18n()
  const [params, setParams] = useSearchParams()
  const asked = params.get('tab')
  const tab: Tab = (TABS as readonly string[]).includes(asked ?? '') ? (asked as Tab) : 'team'
  const [period, setPeriod] = useState<Period>('30')
  const since = MAINT_NOW - Number(period) * DAY
  const { env } = useEnvScope()
  const [picked, setPicked] = useState<VendorId[]>([])
  // a sub-contractor that does not work in the chosen environment drops out of the selection
  const vendors = picked.filter((id) => env === 'all' || (vendorById(id).envs as readonly EnvId[]).includes(env))
  const [stack, setStack] = useState<Detail[]>([])
  const ctx = useMemo(() => ({ vendors, open: (d: Detail) => setStack((x) => [...x, d]) }), [vendors])

  return (
    <PageCtx.Provider value={ctx}>
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
          <FilterBar picked={vendors} setPicked={setPicked} />
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
        {stack.length > 0 && (
          <DetailDialog
            detail={stack[stack.length - 1]}
            canGoBack={stack.length > 1}
            onBack={() => setStack((x) => x.slice(0, -1))}
            onClose={() => setStack([])}
          />
        )}
      </section>
    </PageCtx.Provider>
  )
}

// --- Follow-up team ------------------------------------------------------------------------------------------------------

function TeamTab({ since }: { since: number }) {
  const { t, L } = useI18n()
  const evals = useEvaluations()
  const scoped = useScoped()
  const { open: openDetail } = useContext(PageCtx)
  const rows = scoped.requests.filter((x) => x.loggedAt >= since)
  const open = rows.filter(isOpen)
  const breached = open.filter((x) => isBreached(x))
  const done = rows.filter((x) => x.completedAt)
  const metPct = pct(done.filter(completedOnTime).length, done.length)
  const waiting = open.filter((x) => x.stage === 'quotation' || x.stage === 'owner_approval').length + rows.filter((x) => x.signOff === 'waiting').length

  const people = scoped.staff.map((c) => {
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
              <SortHead
                className="h-auto min-w-24 whitespace-normal align-bottom"
                sortKey="handled"
                sort={sort}
                onSort={toggle}
                label={t('Requests', 'الطلبات')}
              />
              <SortHead
                className="h-auto min-w-24 whitespace-normal align-bottom"
                sortKey="respond"
                sort={sort}
                onSort={toggle}
                label={t('Responded on time', 'رد في الوقت')}
              />
              <SortHead
                className="h-auto min-w-24 whitespace-normal align-bottom"
                sortKey="complete"
                sort={sort}
                onSort={toggle}
                label={t('Completed on time', 'اكتمل في الوقت')}
              />
              <SortHead
                className="h-auto min-w-24 whitespace-normal align-bottom"
                sortKey="breached"
                sort={sort}
                onSort={toggle}
                label={t('Breached now', 'متجاوزة الآن')}
              />
              <SortHead
                className="h-auto min-w-24 whitespace-normal align-bottom"
                sortKey="escalated"
                sort={sort}
                onSort={toggle}
                label={t('Escalated', 'صُعّدت')}
              />
              <SortHead
                className="h-auto min-w-24 whitespace-normal align-bottom"
                sortKey="signOff"
                sort={sort}
                onSort={toggle}
                label={t('Sign-off sent in 1 day', 'التوقيع خلال يوم')}
              />
              <SortHead
                className="h-auto min-w-24 whitespace-normal align-bottom"
                sortKey="checked"
                sort={sort}
                onSort={toggle}
                label={t('Checked after the vendor', 'دُقق بعد المقاول')}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((p) => (
              <TableRow key={p.c.id} className="cursor-pointer" onClick={() => openDetail({ kind: 'staff', id: p.c.id })}>
                <TableCell className="min-w-40 whitespace-normal">
                  <span className="flex flex-col">
                    <span className="font-medium text-foreground underline-offset-4 hover:underline">{L(p.c.name)}</span>
                    <span className="text-xs text-muted-foreground">
                      {L(p.c.title)}
                      {scoped.env === 'all' ? ` · ${L(envName(p.c.envId))}` : ''}
                    </span>
                  </span>
                </TableCell>
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
                <TableRow key={x.id} className="cursor-pointer" onClick={() => openDetail({ kind: 'request', id: x.id })}>
                  <TableCell className="tabular font-medium text-foreground underline-offset-4 hover:underline">{x.id}</TableCell>
                  <TableCell>{x.unit}</TableCell>
                  <TableCell>{L(PRIORITY[x.priority].label)}</TableCell>
                  <TableCell>{L(STAGE_LABEL[x.stage])}</TableCell>
                  <TableCell>{L(checkerById(x.checker).name)}</TableCell>
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
  const { t, L } = useI18n()
  const evals = useEvaluations()
  const scoped = useScoped()
  const rows = scoped.requests.filter((x) => x.loggedAt >= since)
  const { open: openDetail } = useContext(PageCtx)
  const scored = scoped.vendorList.map((v) => {
    const mine = rows.filter((x) => x.vendor === v.id)
    const answered = mine.filter((x) => x.respondedAt)
    const done = mine.filter((x) => x.completedAt)
    const accepted = pct(answered.filter(respondedOnTime).length, answered.length)
    const onTime = pct(done.filter(completedOnTime).length, done.length)
    const clocks = accepted == null && onTime == null ? null : Math.round(((accepted ?? onTime)! + (onTime ?? accepted)!) / 2)
    const ev = evals.filter((e) => e.vendor === v.id && mine.some((x) => x.id === e.requestId))
    const cust = avg(ev.filter((e) => e.rater === 'customer').map(avgScore))
    const chk = avg(ev.filter((e) => e.rater === 'checker').map(avgScore))
    const visits = scoped.visits.filter((a) => a.vendor === v.id && a.plannedFor >= since && a.plannedFor <= MAINT_NOW)
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
  const best = [...scored].filter((x) => x.score != null && x.jobs >= 3).sort((a, b) => b.score! - a.score!)[0]
  const worst = [...scored].filter((x) => x.score != null && x.jobs >= 3).sort((a, b) => a.score! - b.score!)[0]
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
          sub={t(`${scoped.vendorList.length} sub-contractors`, `${scoped.vendorList.length} مقاولين`)}
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
              <SortHead className="h-auto min-w-24 whitespace-normal align-bottom" sortKey="score" sort={sort} onSort={toggle} label={t('Score', 'الدرجة')} />
              <SortHead className="h-auto min-w-24 whitespace-normal align-bottom" sortKey="jobs" sort={sort} onSort={toggle} label={t('Jobs', 'الأعمال')} />
              <SortHead
                className="h-auto min-w-24 whitespace-normal align-bottom"
                sortKey="accepted"
                sort={sort}
                onSort={toggle}
                label={t('Accepted on time', 'قبل في الوقت')}
              />
              <SortHead
                className="h-auto min-w-24 whitespace-normal align-bottom"
                sortKey="onTime"
                sort={sort}
                onSort={toggle}
                label={t('Done on time', 'أنجز في الوقت')}
              />
              <SortHead
                className="h-auto min-w-24 whitespace-normal align-bottom"
                sortKey="notDone"
                sort={sort}
                onSort={toggle}
                label={t('Late twice', 'تأخر مرتين')}
              />
              <SortHead
                className="h-auto min-w-24 whitespace-normal align-bottom"
                sortKey="rework"
                sort={sort}
                onSort={toggle}
                label={t('Sent back', 'أُعيد للمقاول')}
              />
              <SortHead
                className="h-auto min-w-24 whitespace-normal align-bottom"
                sortKey="firstTime"
                sort={sort}
                onSort={toggle}
                label={t('Fixed first time', 'أُصلح من أول مرة')}
              />
              <SortHead
                className="h-auto min-w-24 whitespace-normal align-bottom"
                sortKey="amcMissed"
                sort={sort}
                onSort={toggle}
                label={t('AMC missed', 'AMC فائتة')}
              />
              <SortHead
                className="h-auto min-w-24 whitespace-normal align-bottom"
                sortKey="cust"
                sort={sort}
                onSort={toggle}
                label={t('Customer /5', 'العميل /5')}
              />
              <SortHead
                className="h-auto min-w-24 whitespace-normal align-bottom"
                sortKey="chk"
                sort={sort}
                onSort={toggle}
                label={t('Checker /5', 'المدقق /5')}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r) => (
              <TableRow key={r.v.id} className="cursor-pointer" onClick={() => openDetail({ kind: 'vendor', id: r.v.id })}>
                <TableCell className="min-w-40 whitespace-normal">
                  <span className="flex flex-col">
                    <span className="font-medium text-foreground underline-offset-4 hover:underline">{r.v.name}</span>
                    <span className="text-xs text-muted-foreground">{L(CATEGORY[r.v.trade])}</span>
                  </span>
                </TableCell>
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
  const scoped = useScoped()
  const { open: openDetail } = useContext(PageCtx)
  const ids = useMemo(() => new Set(scoped.requests.map((x) => x.id)), [scoped.requests])
  const recent = useMemo(
    () =>
      [...evals]
        .filter((e) => ids.has(e.requestId))
        .sort((a, b) => b.at - a.at)
        .slice(0, 12),
    [evals, ids],
  )
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
            'Draft: the CRM has no sign-off or acceptance form yet; once one is confirmed, this form takes its fields as they are. A single low rating is not a case: the ratings are read together per vendor, and only a pattern (the same vendor rated low again and again) becomes one corrective action.',
            'مسودة: لا يوجد في CRM نموذج قبول أو توقيع بعد؛ عند تأكيده يأخذ هذا النموذج حقوله كما هي. التقييم المنخفض الواحد ليس حالة: تُقرأ التقييمات معاً لكل مقاول، والنمط وحده (تقييم منخفض متكرر للمقاول نفسه) يصبح إجراءً تصحيحياً واحداً.',
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
                <TableRow key={e.id} className="cursor-pointer" onClick={() => openDetail({ kind: 'request', id: e.requestId })}>
                  <TableCell className="tabular">{day(e.at)}</TableCell>
                  <TableCell className="tabular font-medium text-foreground">{e.requestId}</TableCell>
                  <TableCell>{vendorById(e.vendor).name}</TableCell>
                  <TableCell>{e.rater === 'checker' && e.by ? L(checkerById(e.by).name) : L(RATER_LABEL[e.rater])}</TableCell>
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
  const scope = useScoped()
  const [checker, setChecker] = useState<CheckerId>((scope.staff[0] ?? CHECKERS[0]).id)
  const candidates = useScoped()
    .requests.filter((x) => x.completedAt && !evals.some((e: Evaluation) => e.requestId === x.id && e.rater === rater))
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
                  {scope.staff.map((c) => (
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
                    {x.id} · {x.unit} · {vendorById(x.vendor).name}
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

// --- Filters -------------------------------------------------------------------------------------------------------------

/** Environment (the same switch as the top bar; fixed for an environment's own management) and the sub-contractors working there. */
function FilterBar({ picked, setPicked }: { picked: VendorId[]; setPicked: (v: VendorId[]) => void }) {
  const { t, L } = useI18n()
  const { env, setEnv, allowed, fixed } = useEnvScope()
  const options = VENDORS.filter((v) => env === 'all' || (v.envs as readonly EnvId[]).includes(env))
  const label =
    picked.length === 0
      ? t('All sub-contractors', 'كل المقاولين')
      : picked.length === 1
        ? vendorById(picked[0]).name
        : t(`${picked.length} sub-contractors`, `${picked.length} مقاولين`)
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        {t('Environment', 'البيئة')}
        {fixed ? (
          <span className="flex h-9 items-center rounded-md bg-well px-3 text-sm text-foreground shadow-field">{L(envName(fixed))}</span>
        ) : (
          <Select value={env} onValueChange={(v) => setEnv(v as EnvScope)}>
            <SelectTrigger size="sm" className="min-w-48" aria-label={t('Environment', 'البيئة')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All environments', 'كل البيئات')}</SelectItem>
              {ENVIRONMENTS.filter((e) => allowed.includes(e.id as EnvId)).map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {L(e.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </label>
      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        {t('Sub-contractor', 'المقاول')}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 min-w-56 justify-between">
              <span className="truncate">{label}</span>
              <ChevronDown aria-hidden className="size-4 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuLabel className="font-normal text-muted-foreground">
              {env === 'all' ? t('Every environment', 'كل البيئات') : t(`Working in ${L(envName(env as EnvId))}`, `يعملون في ${L(envName(env as EnvId))}`)}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {options.map((v) => (
              <DropdownMenuCheckboxItem
                key={v.id}
                checked={picked.includes(v.id)}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={(on) => setPicked(on ? [...picked, v.id] : picked.filter((x) => x !== v.id))}
              >
                <span className="flex flex-col">
                  <span>{v.name}</span>
                  <span className="text-xs text-muted-foreground">{L(CATEGORY[v.trade])}</span>
                </span>
              </DropdownMenuCheckboxItem>
            ))}
            {picked.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setPicked([])}>{t('Clear the selection', 'مسح الاختيار')}</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// --- Details (25 Nov, owner: "clickable, with the full information the CRM has") -------------------------------------------

function DetailDialog({ detail, canGoBack, onBack, onClose }: { detail: Detail; canGoBack: boolean; onBack: () => void; onClose: () => void }) {
  const { t } = useI18n()
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        {canGoBack && (
          <Button variant="ghost" size="xs" className="w-fit" onClick={onBack}>
            <ArrowLeft aria-hidden className="rtl:rotate-180" />
            {t('Back', 'رجوع')}
          </Button>
        )}
        {detail.kind === 'request' ? (
          <RequestDetail id={detail.id} />
        ) : detail.kind === 'staff' ? (
          <ListDetail kind="staff" id={detail.id} />
        ) : (
          <ListDetail kind="vendor" id={detail.id} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function useFmt() {
  const { lang } = useI18n()
  const loc = lang === 'ar' ? 'ar-AE' : 'en-GB'
  return {
    day: (ms: number) => new Date(ms).toLocaleDateString(loc, { day: 'numeric', month: 'short' }),
    when: (ms: number) => new Date(ms).toLocaleString(loc, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
  }
}

function SlaBadge({ x }: { x: MaintRequest }) {
  const { t } = useI18n()
  if (x.cancelled) return <StatusBadge tone="neutral">{t('Cancelled', 'ملغى')}</StatusBadge>
  if (x.completedAt)
    return completedOnTime(x) ? (
      <StatusBadge tone="success">{t('On time', 'في الوقت')}</StatusBadge>
    ) : (
      <StatusBadge tone="danger">{t('Late', 'متأخر')}</StatusBadge>
    )
  return isBreached(x) ? (
    <StatusBadge tone="danger">{t('Past the target', 'تجاوز الهدف')}</StatusBadge>
  ) : (
    <StatusBadge tone="info">{t('Open', 'مفتوح')}</StatusBadge>
  )
}

/** A staff member's or a sub-contractor's requests; each one opens. */
function ListDetail({ kind, id }: { kind: 'staff' | 'vendor'; id: string }) {
  const { t, L } = useI18n()
  const { open } = useContext(PageCtx)
  const { requests } = useScoped()
  const f = useFmt()
  const mine = requests.filter((x) => (kind === 'staff' ? x.checker === id : x.vendor === id)).sort((a, b) => b.loggedAt - a.loggedAt)
  const done = mine.filter((x) => x.completedAt)
  const c = kind === 'staff' ? checkerById(id as CheckerId) : null
  const v = kind === 'vendor' ? vendorById(id as VendorId) : null
  return (
    <>
      <DialogHeader>
        <DialogTitle>{c ? L(c.name) : v!.name}</DialogTitle>
        <DialogDescription>
          {c ? `${L(c.title)} · ${L(envName(c.envId))}` : `${L(CATEGORY[v!.trade])} · ${v!.envs.map((e) => L(envName(e))).join(', ')}`}
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { l: t('Requests', 'الطلبات'), v: mine.length },
          { l: t('Open', 'مفتوحة'), v: mine.filter(isOpen).length },
          { l: t('Completed on time', 'اكتملت في الوقت'), v: done.length ? `${pct(done.filter(completedOnTime).length, done.length)}%` : '—' },
          { l: t('Escalated', 'صُعّدت'), v: mine.filter((x) => x.escalatedAt).length },
        ].map((k) => (
          <div key={k.l} className="well flex flex-col gap-1 px-4 py-3">
            <span className="text-xs text-muted-foreground">{k.l}</span>
            <span className="t-kpi tabular text-foreground">{k.v}</span>
          </div>
        ))}
      </div>
      {mine.length === 0 ? (
        <EmptyState title={t('No requests in this scope.', 'لا طلبات ضمن هذا النطاق.')} />
      ) : (
        <Table density="comfortable">
          <TableHeader>
            <TableRow>
              <TableHead>{t('Request', 'الطلب')}</TableHead>
              <TableHead>{t('What', 'المشكلة')}</TableHead>
              <TableHead>{kind === 'staff' ? t('Sub-contractor', 'المقاول') : t('Follow-up', 'المتابع')}</TableHead>
              <TableHead>{t('Logged', 'سُجّل')}</TableHead>
              <TableHead>{t('Stage', 'المرحلة')}</TableHead>
              <TableHead className="text-end">{t('SLA', 'SLA')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mine.slice(0, 40).map((x) => (
              <TableRow key={x.id} className="cursor-pointer" onClick={() => open({ kind: 'request', id: x.id })}>
                <TableCell className="tabular font-medium text-foreground underline-offset-4 hover:underline">{x.id}</TableCell>
                <TableCell className="max-w-56 truncate" title={L(x.problem)}>
                  {L(x.problem)}
                </TableCell>
                <TableCell>{kind === 'staff' ? vendorById(x.vendor).name : L(checkerById(x.checker).name)}</TableCell>
                <TableCell className="tabular">{f.day(x.loggedAt)}</TableCell>
                <TableCell>{L(STAGE_LABEL[x.stage])}</TableCell>
                <TableCell className="text-end">
                  <SlaBadge x={x} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  )
}

/** One request with everything the CRM holds: when, what, who, the clocks, both comments, the evaluations; a gift for the customer. */
function RequestDetail({ id }: { id: string }) {
  const { t, L, lang } = useI18n()
  const { open } = useContext(PageCtx)
  const evals = useEvaluations().filter((e) => e.requestId === id)
  const f = useFmt()
  const x = MAINT_REQUESTS.find((r) => r.id === id)
  if (!x) return null
  const c = checkerById(x.checker)
  const v = vendorById(x.vendor)
  const cust = evals.find((e) => e.rater === 'customer')
  const low = evals.some((e) => avgScore(e) < 3) || x.rework || !completedOnTime(x)
  const P = PRIORITY[x.priority]
  const fact = (label: string, value: React.ReactNode) => (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  )
  const steps: { label: string; at?: number; note?: React.ReactNode }[] = [
    {
      label: t('Logged', 'سُجّل'),
      at: x.loggedAt,
      note: x.reportedBy === 'tenant' ? t('Reported by the tenant', 'أبلغ عنه المستأجر') : t('Reported by the property manager', 'أبلغ عنه مدير العقار'),
    },
    {
      label: t('First response', 'الرد الأول'),
      at: x.respondedAt,
      note: x.respondedAt ? (
        respondedOnTime(x) ? (
          <Good>{t(`within ${P.respondH} h`, `خلال ${P.respondH} س`)}</Good>
        ) : (
          <Bad>{t(`after the ${P.respondH} h target`, `بعد هدف ${P.respondH} س`)}</Bad>
        )
      ) : (
        t('Not yet', 'لم يتم بعد')
      ),
    },
    ...(x.escalatedAt
      ? [{ label: t('Escalated', 'صُعّد'), at: x.escalatedAt, note: t('Still late 24 h after the target', 'ما زال متأخراً بعد 24 ساعة من الهدف') }]
      : []),
    ...(x.notDoneYet >= 1
      ? [
          {
            label: t('“Is the job done?”', '«هل أُنجز العمل؟»'),
            note: t(`The vendor answered “not done yet” ${x.notDoneYet} time(s)`, `أجاب المقاول «لم يُنجز بعد» ${x.notDoneYet} مرة`),
          },
        ]
      : []),
    {
      label: t('Completed', 'اكتمل'),
      at: x.completedAt,
      note: x.completedAt ? (
        completedOnTime(x) ? (
          <Good>{t(`within ${P.completeH} h`, `خلال ${P.completeH} س`)}</Good>
        ) : (
          <Bad>{t(`after the ${P.completeH} h target`, `بعد هدف ${P.completeH} س`)}</Bad>
        )
      ) : (
        L(STAGE_LABEL[x.stage])
      ),
    },
    ...(x.completedAt
      ? [
          {
            label: t('Sign-off', 'التوقيع'),
            note: {
              none: '—',
              waiting: t('Link sent, waiting for the customer', 'أُرسل الرابط، بانتظار العميل'),
              signed: t('Signed by the customer', 'وقّع العميل'),
              rejected: t('Rejected: sent back to the vendor', 'رُفض: أُعيد للمقاول'),
              expired: t('Link expired without an answer', 'انتهى الرابط دون رد'),
            }[x.signOff],
          },
        ]
      : []),
  ]

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2">
          {x.id} · {L(x.problem)}
          <SlaBadge x={x} />
        </DialogTitle>
        <DialogDescription>
          {x.unit} · {L(envName(x.envId))}
        </DialogDescription>
      </DialogHeader>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        {fact(t('Customer', 'العميل'), x.customer)}
        {fact(t('Category', 'الفئة'), L(CATEGORY[x.category]))}
        {fact(
          t('Priority', 'الأولوية'),
          `${L(P.label)} · ${t(`respond ${P.respondH} h, complete ${P.completeH} h`, `رد ${P.respondH} س، إنجاز ${P.completeH} س`)}`,
        )}
        {fact(
          t('PSI follow-up', 'متابع PSI'),
          <button type="button" className="text-start underline-offset-4 hover:underline" onClick={() => open({ kind: 'staff', id: c.id })}>
            {L(c.name)} · {L(c.title)}
          </button>,
        )}
        {fact(
          t('Sub-contractor', 'المقاول'),
          <button type="button" className="text-start underline-offset-4 hover:underline" onClick={() => open({ kind: 'vendor', id: v.id })}>
            {v.name}
          </button>,
        )}
        {fact(t('Stage', 'المرحلة'), L(STAGE_LABEL[x.stage]))}
      </dl>

      <section className="flex flex-col gap-2">
        <h3 className="t-small-strong">{t('What happened, in order', 'ما حدث بالترتيب')}</h3>
        <ol className="flex flex-col gap-2">
          {steps.map((st) => (
            <li key={st.label} className="grid grid-cols-[9rem_8rem_1fr] items-baseline gap-3 text-sm max-sm:grid-cols-1 max-sm:gap-0.5">
              <span className="font-medium text-foreground">{st.label}</span>
              <span className="tabular text-muted-foreground">{st.at ? f.when(st.at) : '—'}</span>
              <span className="text-muted-foreground">{st.note}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="well flex flex-col gap-1 p-4">
          <span className="text-xs text-muted-foreground">{t('Customer’s comment', 'تعليق العميل')}</span>
          <span className="text-sm text-foreground">{x.customerComment ? `“${L(x.customerComment)}”` : t('No comment yet', 'لا تعليق بعد')}</span>
          {cust && (
            <span className="text-xs text-muted-foreground">{t(`Rating ${avgScore(cust).toFixed(1)} / 5`, `التقييم ${avgScore(cust).toFixed(1)} / 5`)}</span>
          )}
        </div>
        <div className="well flex flex-col gap-1 p-4">
          <span className="text-xs text-muted-foreground">
            {t('PSI follow-up’s comment', 'تعليق متابع PSI')} · {L(c.name)}
          </span>
          <span className="text-sm text-foreground">
            {x.checkerComment ? `“${L(x.checkerComment)}”` : t('Not checked after the vendor yet', 'لم يُدقق بعد المقاول بعد')}
          </span>
          {evals.find((e) => e.rater === 'checker') && (
            <span className="text-xs text-muted-foreground">
              {t(
                `Rating ${avgScore(evals.find((e) => e.rater === 'checker')!).toFixed(1)} / 5`,
                `التقييم ${avgScore(evals.find((e) => e.rater === 'checker')!).toFixed(1)} / 5`,
              )}
            </span>
          )}
        </div>
      </section>

      {x.completedAt && (
        <GiftFlow
          relatedRef={`maint:${x.id}`}
          fullName={x.customer}
          reason={low ? 'recovery' : 'thanks'}
          justification={
            lang === 'ar'
              ? `${x.id} (${L(x.problem)}) في ${x.unit}. ${low ? 'تجربة الصيانة لم تكن كما يجب' : 'تجربة صيانة جيدة'}${x.customerComment ? `: «${L(x.customerComment)}»` : '.'}`
              : `${x.id} (${L(x.problem)}) at ${x.unit}. ${low ? 'The maintenance experience fell short' : 'A good maintenance experience'}${x.customerComment ? `: “${L(x.customerComment)}”` : '.'}`
          }
        />
      )}
    </>
  )
}
