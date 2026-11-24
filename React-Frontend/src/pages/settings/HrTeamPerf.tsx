import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Clock, FolderOpen, PhoneCall, UserPlus } from 'lucide-react'
import { useI18n } from '@/i18n'
import { Bad, Good, Rate } from '@/components/common/Trend'
import { SortHead, useSort } from '@/components/common/SortHead'
import { useNow } from '@/hooks/useNow'
import { useHrPool, useShopperCases } from '@/services/queries'
import { ENVIRONMENTS } from '@/data/environments'
import { hrCasesBySpecialist } from '@/data/pendingWork'
import {
  HR_NOW,
  IVR_REASON,
  IVR_REQUESTS,
  IVR_TARGET_HOURS,
  OPS_REQUESTS,
  OPS_TYPE,
  RECRUITMENT,
  STAGES,
  STAGE_LABEL,
  STUCK_DAYS,
  daysBetween,
  hoursBetween,
  type IvrRequest,
} from '@/data/hrOps'
import type { EnvId } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Segmented } from '@/components/ui/segmented'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LandingBrief } from '@/components/home/LandingBrief'
import { KpiTile } from '@/components/common/KpiTile'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { RankedBars } from '@/components/common/charts'
import { IN_CARD, SubPageHeader } from './SubPageHeader'

/**
 * HR performance (Chairman's request, 22 Nov): four tabs. IVR callbacks (when HR called back the people who asked for HR through the
 * call center's IVR; the most important), Recruitment (candidates moving through Odoo), Operations (HR requests against their target
 * days), Conduct cases (the mystery-shopper conduct cases, numbers only as before).
 * Open to the HR roles, the Super admin and the Admin; not to the CX manager or the CX team (see `blocked` in auth/access.ts).
 * The first three tabs are sample data until the IVR platform and Odoo are connected (data/hrOps.ts says what each API must give).
 */
const TABS = ['ivr', 'recruitment', 'operations', 'conduct'] as const
type Tab = (typeof TABS)[number]
type Period = '7' | '30' | '60'
const ALL = 'all'

export default function HrTeamPerf() {
  const { t, L } = useI18n()
  const [params, setParams] = useSearchParams()
  const asked = params.get('tab')
  const tab: Tab = (TABS as readonly string[]).includes(asked ?? '') ? (asked as Tab) : 'ivr'
  const [period, setPeriod] = useState<Period>('30')
  const [env, setEnv] = useState<EnvId | typeof ALL>(ALL)
  const since = HR_NOW - Number(period) * 86_400_000
  const inScope = (iso: string, e: EnvId) => Date.parse(iso) >= since && (env === ALL || e === env)

  return (
    <section data-density="comfortable" className="flex flex-col gap-4">
      <SubPageHeader
        title={t('HR team performance', 'أداء فريق الموارد البشرية')}
        description={t(
          'How fast HR answers people who ask for it through the call center, how candidates move in recruitment, how HR requests are handled, and the conduct cases.',
          'مدى سرعة رد الموارد البشرية على من طلبها عبر مركز الاتصال، وتقدّم المرشحين في التوظيف، ومعالجة طلبات الموارد البشرية، وحالات السلوك.',
        )}
      />
      {/* v40 F09: the HR manager lands here, not on Home, so the Daily brief sits at the top of this page. */}
      <LandingBrief roles={['hrmgr']} />

      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })} className="gap-4">
        {/* 24 Nov (owner): period and environment sit on the tabs row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="-m-1 max-w-full overflow-x-auto p-1">
            <TabsList className="min-w-max" aria-label={t('HR performance', 'أداء الموارد البشرية')}>
              <TabsTrigger value="ivr">{t('Call-center requests (IVR)', 'طلبات مركز الاتصال (IVR)')}</TabsTrigger>
              <TabsTrigger value="recruitment">{t('Recruitment (Odoo)', 'التوظيف (Odoo)')}</TabsTrigger>
              <TabsTrigger value="operations">{t('Operations', 'العمليات')}</TabsTrigger>
              <TabsTrigger value="conduct">{t('Conduct cases', 'حالات السلوك')}</TabsTrigger>
            </TabsList>
          </div>
          <div className="ms-auto flex flex-wrap items-center gap-3">
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
            <Select value={env} onValueChange={(v) => setEnv(v as EnvId | typeof ALL)}>
              <SelectTrigger aria-label={t('Environment', 'البيئة')} className="h-9 min-w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('All environments', 'كل البيئات')}</SelectItem>
                {ENVIRONMENTS.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {L(e.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <TabsContent value="ivr">
          <IvrTab inScope={inScope} />
        </TabsContent>
        <TabsContent value="recruitment">
          <RecruitmentTab env={env} since={since} />
        </TabsContent>
        <TabsContent value="operations">
          <OperationsTab inScope={inScope} />
        </TabsContent>
        <TabsContent value="conduct">
          <ConductTab />
        </TabsContent>
      </Tabs>
    </section>
  )
}

const fmtH = (h: number, t: (en: string, ar: string) => string) =>
  h < 1
    ? t(`${Math.round(h * 60)} min`, `${Math.round(h * 60)} دقيقة`)
    : h < 48
      ? t(`${h.toFixed(1)} h`, `${h.toFixed(1)} ساعة`)
      : t(`${(h / 24).toFixed(1)} days`, `${(h / 24).toFixed(1)} يوم`)

// --- IVR ------------------------------------------------------------------------------------------------------------

type IvrView = 'all' | 'waiting' | 'late'

function IvrTab({ inScope }: { inScope: (iso: string, e: EnvId) => boolean }) {
  const { t, L, lang } = useI18n()
  const [view, setView] = useState<IvrView>('all')
  const rows = IVR_REQUESTS.filter((x) => inScope(x.receivedAt, x.envId))
  const called = rows.filter((x) => x.calledBackAt)
  const waiting = rows.filter((x) => !x.calledBackAt)
  const delay = (x: IvrRequest) => hoursBetween(x.receivedAt, x.calledBackAt)
  const onTime = called.filter((x) => delay(x) <= IVR_TARGET_HOURS)
  const avg = called.length ? called.reduce((s, x) => s + delay(x), 0) / called.length : 0
  const oldestWaiting = waiting.length ? Math.max(...waiting.map((x) => delay(x))) : 0
  const late = (x: IvrRequest) => delay(x) > IVR_TARGET_HOURS
  const listed = rows.filter((x) => (view === 'waiting' ? !x.calledBackAt : view === 'late' ? late(x) : true))
  const when = (iso: string) =>
    new Date(iso).toLocaleString(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  const buckets = [
    { key: 'h1', label: t('Within 1 hour', 'خلال ساعة'), value: called.filter((x) => delay(x) <= 1).length },
    {
      key: 'h4',
      label: t(`1 to ${IVR_TARGET_HOURS} hours`, `من 1 إلى ${IVR_TARGET_HOURS} ساعات`),
      value: called.filter((x) => delay(x) > 1 && delay(x) <= IVR_TARGET_HOURS).length,
    },
    {
      key: 'd1',
      label: t(`${IVR_TARGET_HOURS} to 24 hours`, `من ${IVR_TARGET_HOURS} إلى 24 ساعة`),
      value: called.filter((x) => delay(x) > IVR_TARGET_HOURS && delay(x) <= 24).length,
    },
    { key: 'more', label: t('More than a day', 'أكثر من يوم'), value: called.filter((x) => delay(x) > 24).length },
    { key: 'none', label: t('Not called back yet', 'لم يُعاد الاتصال بعد'), value: waiting.length },
  ]
  const specialists = [...new Set(rows.map((x) => x.assignedTo))].sort()
  // 24 Nov (owner): the specialist table sorts on any column
  const specRows = specialists.map((s) => {
    const mine = rows.filter((x) => x.assignedTo === s)
    const done = mine.filter((x) => x.calledBackAt)
    const ok = done.filter((x) => delay(x) <= IVR_TARGET_HOURS).length
    return {
      s,
      requests: mine.length,
      onTime: mine.length ? Math.round((ok / mine.length) * 100) : 0,
      avg: done.length ? done.reduce((sum, x) => sum + delay(x), 0) / done.length : 0,
      waiting: mine.length - done.length,
    }
  })
  type SpecCol = 'name' | 'requests' | 'onTime' | 'avg' | 'waiting'
  const {
    sorted: specSorted,
    sort: specSort,
    toggle: specToggle,
  } = useSort<(typeof specRows)[number], SpecCol>(specRows, (r, k) =>
    k === 'name' ? r.s : k === 'requests' ? r.requests : k === 'onTime' ? r.onTime : k === 'avg' ? r.avg : r.waiting,
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-(--grid-gap) lg:grid-cols-4">
        <KpiTile label={t('Asked for HR', 'طلبوا الموارد البشرية')} value={rows.length} icon={<PhoneCall />} />
        <KpiTile
          label={t(`Called back within ${IVR_TARGET_HOURS} h`, `أُعيد الاتصال خلال ${IVR_TARGET_HOURS} ساعات`)}
          value={
            <Rate value={rows.length ? Math.round((onTime.length / rows.length) * 100) : 0}>
              {rows.length ? Math.round((onTime.length / rows.length) * 100) : 0}
            </Rate>
          }
          unit="%"
          sub={t(`${onTime.length} of ${rows.length}`, `${onTime.length} من ${rows.length}`)}
        />
        <KpiTile label={t('Average time to call back', 'متوسط وقت إعادة الاتصال')} value={fmtH(avg, t)} icon={<Clock />} />
        <KpiTile
          label={t('Still waiting for a call', 'ما زالوا بانتظار الاتصال')}
          value={waiting.length ? <Bad>{waiting.length}</Bad> : <Good>0</Good>}
          accent={waiting.length ? 'var(--destructive)' : undefined}
          sub={
            waiting.length ? t(`oldest waiting ${fmtH(oldestWaiting, t)}`, `الأقدم ينتظر منذ ${fmtH(oldestWaiting, t)}`) : t('nobody waiting', 'لا أحد ينتظر')
          }
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title={t('How long people waited', 'كم انتظر الناس')}>
          <RankedBars
            label={t('How long people waited', 'كم انتظر الناس')}
            items={buckets.map((b, i) => ({ ...b, hero: i === buckets.length - 1 && b.value > 0 }))}
          />
        </SectionCard>
        <SectionCard title={t('By specialist', 'حسب الأخصائي')} contentClassName={IN_CARD}>
          <Table density="comfortable">
            <TableHeader>
              <TableRow>
                <SortHead sortKey="name" sort={specSort} onSort={specToggle} align="start" label={t('Specialist', 'الأخصائي')} />
                <SortHead sortKey="requests" sort={specSort} onSort={specToggle} label={t('Requests', 'الطلبات')} />
                <SortHead sortKey="onTime" sort={specSort} onSort={specToggle} label={t('On time', 'في الموعد')} />
                <SortHead sortKey="avg" sort={specSort} onSort={specToggle} label={t('Average', 'المتوسط')} />
                <SortHead sortKey="waiting" sort={specSort} onSort={specToggle} label={t('Waiting', 'بالانتظار')} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {specSorted.map((r) => (
                <TableRow key={r.s}>
                  <TableCell className="font-medium text-foreground">{r.s}</TableCell>
                  <TableCell className="text-end tabular">{r.requests}</TableCell>
                  <TableCell className="text-end tabular">
                    <Rate value={r.onTime}>{r.onTime}%</Rate>
                  </TableCell>
                  <TableCell className="text-end tabular">{fmtH(r.avg, t)}</TableCell>
                  <TableCell className="text-end tabular">{r.waiting ? <StatusBadge tone="danger">{r.waiting}</StatusBadge> : 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      </div>
      <SectionCard
        title={t('Every request', 'كل الطلبات')}
        description={t('Newest first. The caller’s number is masked.', 'الأحدث أولاً. رقم المتصل مخفي جزئياً.')}
        actions={
          <Segmented<IvrView>
            label={t('Show', 'اعرض')}
            variant="pressed"
            value={view}
            onValueChange={setView}
            options={[
              { value: 'all', label: t('All', 'الكل') },
              { value: 'waiting', label: t('Waiting', 'بالانتظار') },
              { value: 'late', label: t('Late', 'متأخرة') },
            ]}
          />
        }
        contentClassName={IN_CARD}
      >
        {listed.length === 0 ? (
          <EmptyState title={t('Nothing to show.', 'لا شيء للعرض.')} />
        ) : (
          <Table density="comfortable">
            <TableHeader>
              <TableRow>
                <TableHead>{t('Received', 'وصل')}</TableHead>
                <TableHead>{t('Caller', 'المتصل')}</TableHead>
                <TableHead>{t('Asked about', 'السبب')}</TableHead>
                <TableHead>{t('With', 'لدى')}</TableHead>
                <TableHead>{t('Called back', 'أُعيد الاتصال')}</TableHead>
                <TableHead className="text-end">{t('Waited', 'الانتظار')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listed.slice(0, 40).map((x) => (
                <TableRow key={x.id}>
                  <TableCell className="tabular">{when(x.receivedAt)}</TableCell>
                  <TableCell className="tabular" dir="ltr">
                    {x.caller}
                  </TableCell>
                  <TableCell>{L(IVR_REASON[x.reason])}</TableCell>
                  <TableCell>{x.assignedTo}</TableCell>
                  <TableCell className="tabular">
                    {x.calledBackAt ? (
                      <>
                        {when(x.calledBackAt)}
                        {x.outcome === 'no_answer' && <span className="ms-1 text-xs text-muted-foreground">({t('no answer', 'لم يرد')})</span>}
                      </>
                    ) : (
                      <StatusBadge tone="danger">{t('Not yet', 'ليس بعد')}</StatusBadge>
                    )}
                  </TableCell>
                  <TableCell className="text-end">
                    <StatusBadge tone={!late(x) ? 'success' : x.calledBackAt ? 'warning' : 'danger'}>{fmtH(delay(x), t)}</StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {listed.length > 40 && (
          <p className="px-2.5 pt-2 text-xs text-muted-foreground">{t(`Showing 40 of ${listed.length}.`, `يُعرض 40 من ${listed.length}.`)}</p>
        )}
      </SectionCard>
    </div>
  )
}

// --- Recruitment ----------------------------------------------------------------------------------------------------

function RecruitmentTab({ env, since }: { env: EnvId | typeof ALL; since: number }) {
  const { t, L } = useI18n()
  const jobs = RECRUITMENT.jobs.filter((j) => env === ALL || j.envId === env)
  const ids = new Set(jobs.map((j) => j.id))
  const cands = RECRUITMENT.candidates.filter((c) => ids.has(c.jobId))
  const open = cands.filter((c) => c.stage !== 'hired' && c.stage !== 'refused')
  const hiredInPeriod = cands.filter((c) => c.stage === 'hired' && Date.parse(c.stageSince) >= since)
  const stuck = open.filter((c) => daysBetween(c.stageSince) > STUCK_DAYS).sort((a, b) => a.stageSince.localeCompare(b.stageSince))
  const hired = (jobId: string) => cands.filter((c) => c.jobId === jobId && c.stage === 'hired').length
  const toFill = jobs.reduce((s, j) => s + Math.max(0, j.target - hired(j.id)), 0)
  const jobName = (id: string) => {
    const j = RECRUITMENT.jobs.find((x) => x.id === id)
    return j ? `${L(j.title)} · ${L(ENVIRONMENTS.find((e) => e.id === j.envId)?.name ?? { en: '', ar: '' })}` : id
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-(--grid-gap) lg:grid-cols-4">
        <KpiTile
          label={t('Places still to fill', 'شواغر لم تُملأ بعد')}
          value={toFill}
          icon={<UserPlus />}
          sub={t(`${jobs.length} open positions`, `${jobs.length} وظائف مفتوحة`)}
        />
        <KpiTile label={t('Candidates in progress', 'مرشحون قيد المتابعة')} value={open.length} />
        <KpiTile label={t('Hired in the period', 'عُيّنوا في الفترة')} value={<Good>{hiredInPeriod.length}</Good>} icon={<CheckCircle2 />} />
        <KpiTile
          label={t(`Stuck over ${STUCK_DAYS} days`, `عالقون أكثر من ${STUCK_DAYS} أيام`)}
          value={stuck.length ? <Bad>{stuck.length}</Bad> : <Good>0</Good>}
          accent={stuck.length ? 'var(--destructive)' : undefined}
          icon={<AlertTriangle />}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <SectionCard title={t('Where candidates are', 'أين المرشحون')}>
          <RankedBars
            label={t('Candidates by stage', 'المرشحون حسب المرحلة')}
            items={STAGES.map((s) => ({ key: s, label: L(STAGE_LABEL[s]), value: cands.filter((c) => c.stage === s).length, hero: s === 'hired' }))}
          />
        </SectionCard>
        <SectionCard title={t('By position', 'حسب الوظيفة')} contentClassName={IN_CARD}>
          <Table density="comfortable">
            <TableHeader>
              <TableRow>
                <TableHead>{t('Position', 'الوظيفة')}</TableHead>
                <TableHead className="text-end">{t('Open for', 'مفتوحة منذ')}</TableHead>
                <TableHead className="text-end">{t('In progress', 'قيد المتابعة')}</TableHead>
                <TableHead className="text-end">{t('Hired', 'عُيّن')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="whitespace-normal">
                    <span className="font-medium text-foreground">{jobName(j.id)}</span>
                    <span className="block text-xs text-muted-foreground">{L(j.department)}</span>
                  </TableCell>
                  <TableCell className="text-end tabular">
                    {t(`${Math.round(daysBetween(j.openedAt))} days`, `${Math.round(daysBetween(j.openedAt))} يوماً`)}
                  </TableCell>
                  <TableCell className="text-end tabular">
                    {cands.filter((c) => c.jobId === j.id && c.stage !== 'hired' && c.stage !== 'refused').length}
                  </TableCell>
                  <TableCell className="text-end tabular">
                    <StatusBadge tone={hired(j.id) >= j.target ? 'success' : 'neutral'}>{`${hired(j.id)} / ${j.target}`}</StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      </div>
      <SectionCard
        title={t('Candidates waiting too long', 'مرشحون ينتظرون طويلاً')}
        description={t(`In the same stage for more than ${STUCK_DAYS} days.`, `في المرحلة نفسها لأكثر من ${STUCK_DAYS} أيام.`)}
        contentClassName={IN_CARD}
      >
        {stuck.length === 0 ? (
          <EmptyState title={t('Nobody is stuck.', 'لا أحد عالق.')} />
        ) : (
          <Table density="comfortable">
            <TableHeader>
              <TableRow>
                <TableHead>{t('Odoo reference', 'رقم Odoo')}</TableHead>
                <TableHead>{t('Position', 'الوظيفة')}</TableHead>
                <TableHead>{t('Stage', 'المرحلة')}</TableHead>
                <TableHead>{t('Source', 'المصدر')}</TableHead>
                <TableHead className="text-end">{t('In this stage', 'في هذه المرحلة')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stuck.slice(0, 25).map((c) => (
                <TableRow key={c.ref}>
                  <TableCell className="tabular font-medium text-foreground">{c.ref}</TableCell>
                  <TableCell className="whitespace-normal">{jobName(c.jobId)}</TableCell>
                  <TableCell>{L(STAGE_LABEL[c.stage])}</TableCell>
                  <TableCell>{L(c.source)}</TableCell>
                  <TableCell className="text-end">
                    <StatusBadge tone="warning">
                      {t(`${Math.round(daysBetween(c.stageSince))} days`, `${Math.round(daysBetween(c.stageSince))} يوماً`)}
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

// --- Operations -----------------------------------------------------------------------------------------------------

function OperationsTab({ inScope }: { inScope: (iso: string, e: EnvId) => boolean }) {
  const { t, L, lang } = useI18n()
  const rows = OPS_REQUESTS.filter((x) => inScope(x.openedAt, x.envId))
  const isLate = (x: (typeof rows)[number]) => daysBetween(x.openedAt, x.closedAt) > OPS_TYPE[x.type].targetDays
  const open = rows.filter((x) => !x.closedAt)
  const closed = rows.filter((x) => x.closedAt)
  const lateOpen = open.filter(isLate).sort((a, b) => a.openedAt.localeCompare(b.openedAt))
  const onTime = closed.filter((x) => !isLate(x)).length
  const day = (iso: string) => new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short' })

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-(--grid-gap) lg:grid-cols-4">
        <KpiTile label={t('Open requests', 'طلبات مفتوحة')} value={open.length} icon={<FolderOpen />} />
        <KpiTile
          label={t('Open and past the target', 'مفتوحة وتجاوزت الهدف')}
          value={lateOpen.length ? <Bad>{lateOpen.length}</Bad> : <Good>0</Good>}
          accent={lateOpen.length ? 'var(--destructive)' : undefined}
          icon={<AlertTriangle />}
        />
        <KpiTile label={t('Closed in the period', 'أُغلقت في الفترة')} value={closed.length} icon={<CheckCircle2 />} />
        <KpiTile
          label={t('Closed on time', 'أُغلقت في الموعد')}
          value={
            <Rate value={closed.length ? Math.round((onTime / closed.length) * 100) : 0}>{closed.length ? Math.round((onTime / closed.length) * 100) : 0}</Rate>
          }
          unit="%"
        />
      </div>
      <SectionCard title={t('By request type', 'حسب نوع الطلب')} contentClassName={IN_CARD}>
        <Table density="comfortable">
          <TableHeader>
            <TableRow>
              <TableHead>{t('Request', 'الطلب')}</TableHead>
              <TableHead className="text-end">{t('Target', 'الهدف')}</TableHead>
              <TableHead className="text-end">{t('Average', 'المتوسط')}</TableHead>
              <TableHead className="text-end">{t('Open', 'مفتوحة')}</TableHead>
              <TableHead className="text-end">{t('Past the target', 'تجاوزت الهدف')}</TableHead>
              <TableHead className="text-end">{t('On time', 'في الموعد')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(OPS_TYPE).map(([k, v]) => {
              const mine = rows.filter((x) => x.type === k)
              const done = mine.filter((x) => x.closedAt)
              const avg = done.length ? done.reduce((s, x) => s + daysBetween(x.openedAt, x.closedAt), 0) / done.length : 0
              const late = mine.filter(isLate).length
              return (
                <TableRow key={k}>
                  <TableCell className="font-medium text-foreground">{L(v.label)}</TableCell>
                  <TableCell className="text-end tabular">{t(`${v.targetDays} d`, `${v.targetDays} يوم`)}</TableCell>
                  <TableCell className="text-end tabular">{done.length ? t(`${avg.toFixed(1)} d`, `${avg.toFixed(1)} يوم`) : '—'}</TableCell>
                  <TableCell className="text-end tabular">{mine.length - done.length}</TableCell>
                  <TableCell className="text-end tabular">{late ? <StatusBadge tone="danger">{late}</StatusBadge> : 0}</TableCell>
                  <TableCell className="text-end tabular">
                    {done.length ? `${Math.round((done.filter((x) => !isLate(x)).length / done.length) * 100)}%` : '—'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </SectionCard>
      <SectionCard title={t('Open requests past their target', 'طلبات مفتوحة تجاوزت هدفها')} contentClassName={IN_CARD}>
        {lateOpen.length === 0 ? (
          <EmptyState title={t('None. Everything open is within its target.', 'لا شيء. كل المفتوح ضمن هدفه.')} />
        ) : (
          <Table density="comfortable">
            <TableHeader>
              <TableRow>
                <TableHead>{t('Reference', 'المرجع')}</TableHead>
                <TableHead>{t('Request', 'الطلب')}</TableHead>
                <TableHead>{t('With', 'لدى')}</TableHead>
                <TableHead>{t('Opened', 'فُتح')}</TableHead>
                <TableHead className="text-end">{t('Open for', 'مفتوح منذ')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lateOpen.map((x) => (
                <TableRow key={x.id}>
                  <TableCell className="tabular font-medium text-foreground">{x.id.toUpperCase()}</TableCell>
                  <TableCell>{L(OPS_TYPE[x.type].label)}</TableCell>
                  <TableCell>{x.owner}</TableCell>
                  <TableCell className="tabular">{day(x.openedAt)}</TableCell>
                  <TableCell className="text-end">
                    <StatusBadge tone="danger">
                      {t(
                        `${Math.round(daysBetween(x.openedAt))} d (target ${OPS_TYPE[x.type].targetDays})`,
                        `${Math.round(daysBetween(x.openedAt))} يوم (الهدف ${OPS_TYPE[x.type].targetDays})`,
                      )}
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

// --- Conduct cases (as before) --------------------------------------------------------------------------------------

function ConductTab() {
  const { t } = useI18n()
  const now = useNow()
  const { data: cases, isLoading: casesLoading } = useShopperCases()
  const { data: hrPool, isLoading: poolLoading } = useHrPool()
  const conductCases = useMemo(() => (cases ?? []).filter((c) => c.isConductIssue), [cases])
  const open = conductCases.filter((c) => c.status !== 'closed')
  const late = open.filter((c) => new Date(c.resolveDueAt).getTime() < now)
  const bySpecialist = hrCasesBySpecialist(cases ?? [], hrPool ?? [])

  return (
    <div className="flex flex-col gap-4">
      <p className="t-body-s">
        {t(
          'Informed only: team numbers and a late alert. No access to individual cases.',
          'للعلم فقط: أرقام الفريق وتنبيه التأخير. لا صلاحية وصول للحالات الفردية.',
        )}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiTile label={t('Open conduct cases', 'حالات السلوك المفتوحة')} value={open.length} icon={<FolderOpen />} loading={casesLoading} />
        <KpiTile
          label={t('Late or at risk', 'متأخرة أو في خطر')}
          value={late.length ? <Bad>{late.length}</Bad> : <Good>0</Good>}
          icon={<AlertTriangle />}
          accent={late.length ? 'var(--destructive)' : undefined}
          loading={casesLoading}
        />
        <KpiTile
          label={t('Closed total', 'إجمالي المغلقة')}
          value={conductCases.filter((c) => c.status === 'closed').length}
          icon={<CheckCircle2 />}
          loading={casesLoading}
        />
      </div>
      <SectionCard title={t('By specialist', 'حسب الأخصائي')} contentClassName={IN_CARD}>
        {poolLoading ? (
          <LoadingState rows={3} />
        ) : !hrPool?.length ? (
          <EmptyState title={t('No specialists in the pool yet', 'لا يوجد أخصائيون في المجموعة بعد')} />
        ) : (
          <Table density="comfortable">
            <TableHeader>
              <TableRow>
                <TableHead>{t('Specialist', 'الأخصائي')}</TableHead>
                <TableHead className="text-end">{t('Assigned cases', 'الحالات المسندة')}</TableHead>
                <TableHead className="text-end">{t('Late', 'متأخرة')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hrPool.map((h) => (
                <TableRow key={h.title}>
                  <TableCell className="font-medium text-foreground">{h.title}</TableCell>
                  <TableCell className="text-end font-medium tabular text-foreground">{bySpecialist.get(h.title)?.length ?? 0}</TableCell>
                  <TableCell className="text-end tabular">
                    {(() => {
                      const n = (bySpecialist.get(h.title) ?? []).filter((c) => new Date(c.resolveDueAt).getTime() < now).length
                      return n > 0 ? <StatusBadge tone="danger">{n}</StatusBadge> : 0
                    })()}
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
