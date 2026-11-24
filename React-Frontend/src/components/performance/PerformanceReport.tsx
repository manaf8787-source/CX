import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, CheckCircle2, Clock, Download, Inbox, MessageCircle, Reply, ShieldAlert, TrendingUp } from 'lucide-react'
import { useI18n } from '@/i18n'
import { Bad, Good, Rate } from '@/components/common/Trend'
import { useNow } from '@/hooks/useNow'
import { useAuditActor } from '@/auth/useAuditActor'
import { useUsers } from '@/data/users'
import { envName } from '@/data/environments'
import { useCallAssignments } from '@/data/callAssignments'
import { computeMetrics, fixOwnerKey, inRange, presetRange, useAllPerfCases, ymd, type PerfCase, type RangePreset } from '@/data/performance'
import { ownerTitle } from '@/data/ownerTitles'
import { useCorrectiveActionsAll, useDetractorCallItems } from '@/services/queries'
import { usePublicMentions } from '@/services/referenceQueries'
import { useRules } from '@/services/queriesV40'
import { SourceBadge } from '@/components/customers/SourceBadge'
import { downloadCsv } from '@/utils/csv'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { KpiTile } from '@/components/common/KpiTile'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { InlineNote } from '@/components/common/InlineNote'
import { ChartTooltip, ChartWell, ChartLegend } from '@/components/common/charts'
import { chartAxis, chartBar, chartBarMuted, chartColor, chartCursorBar, chartGrid } from '@/components/common/chartTheme'
import { ViewOnlyNotice } from '@/pages/settings/SubPageHeader'

/**
 * The performance report, one component for two pages: the CX manager's team report (his three CX team members, for appraisal) and
 * the user performance dashboard (every user, for the Admin and the Super admin). The date range drives the tiles, the table, the
 * chart and the export, so what is on screen is what is exported.
 */
interface Props {
  scope: 'team' | 'all'
  canExport: boolean
}

const fmtPct = (n: number | null) => (n === null ? '—' : `${n}%`)

export function PerformanceReport({ scope, canExport }: Props) {
  const { t, L, lang } = useI18n()
  const now = useNow()
  const { log } = useAuditActor()
  const users = useUsers()
  const assignments = useCallAssignments()
  const { data: items } = useDetractorCallItems()
  const { data: fixes } = useCorrectiveActionsAll()
  const { data: mentions, dataUpdatedAt: mentionsAt } = usePublicMentions()
  const rules = useRules()
  // the mentions register is edited in place (a reply, a reassignment): a fresh array when it changes
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  const mentionList = useMemo(() => [...(mentions ?? [])], [mentions, mentionsAt])
  const allCases = useAllPerfCases({ users, items, assignments, fixes, mentions: mentionList, replySlaHours: rules.publicReplyHours, nowMs: now })
  /** 23 Nov (owner): the work filter, so public comments (social media) can be read on their own, or left out. */
  const [work, setWork] = useState<'all' | 'social' | 'other'>('all')
  const all = useMemo(() => (work === 'all' ? allCases : allCases.filter((c) => (c.kind === 'mention') === (work === 'social'))), [allCases, work])

  const [preset, setPreset] = useState<RangePreset>('last_90')
  const initial = presetRange('last_90', now)
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [personId, setPersonId] = useState<string>('all')

  const choosePreset = (p: RangePreset) => {
    setPreset(p)
    if (p !== 'custom') {
      const r = presetRange(p, now)
      setFrom(r.from)
      setTo(r.to)
    }
  }

  /** The people this report covers: the CX team, or every person who received work (plus the whole CX team). */
  const people = useMemo(() => {
    const list = new Map<string, { id: string; name: string; role: string; external: boolean }>()
    for (const u of users) {
      if (u.roleId === 'cxteam') list.set(u.id, { id: u.id, name: u.name || u.email, role: L({ en: 'CX team', ar: 'فريق CX' }), external: false })
    }
    if (scope === 'all') {
      for (const c of all) {
        if (list.has(c.userId)) continue
        const u = users.find((x) => x.id === c.userId)
        if (u)
          list.set(u.id, {
            id: u.id,
            name: u.name || u.email,
            role: u.roleId === 'envmgmt' ? `${L(envName(u.envId ?? 'dub'))} – CEO` : roleText(u.roleId, L),
            external: false,
          })
        else if (c.userId.startsWith('ext:')) {
          const label = c.userId.slice(4)
          list.set(c.userId, {
            id: c.userId,
            name: L(ownerTitle(label)),
            role: t('Owner with no portal user yet', 'مسؤول بلا مستخدم في البوابة بعد'),
            external: true,
          })
        }
      }
    }
    return [...list.values()]
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [users, all, scope, lang])

  const scoped = useMemo(() => all.filter((c) => people.some((p) => p.id === c.userId) && inRange(c, from, to)), [all, people, from, to])

  const rows = useMemo(
    () =>
      people
        .map((p) => ({
          person: p,
          m: computeMetrics(
            scoped.filter((c) => c.userId === p.id),
            now,
          ),
        }))
        .filter((r) => scope === 'team' || r.m.received > 0)
        .sort((a, b) => b.m.breached - a.m.breached || b.m.received - a.m.received),
    [people, scoped, now, scope],
  )

  const selected = personId === 'all' ? scoped : scoped.filter((c) => c.userId === personId)
  const total = computeMetrics(selected, now)

  // monthly trend for the selection, across the chosen range
  const trend = useMemo(() => {
    const byMonth = new Map<string, PerfCase[]>()
    for (const c of selected) byMonth.set(c.receivedAt.slice(0, 7), [...(byMonth.get(c.receivedAt.slice(0, 7)) ?? []), c])
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, cs]) => {
        const m = computeMetrics(cs, now)
        const d = new Date(`${month}-01T00:00:00`)
        return {
          month: new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { month: 'short', year: '2-digit' }).format(d),
          received: m.received,
          breached: m.breached,
        }
      })
  }, [selected, now, lang])

  // approved fixes whose owner is past the date: shown clearly, whatever the date range
  const lateFixes = useMemo(
    () =>
      (fixes ?? [])
        .filter((f) => (f.status === 'approved' || f.status === 'in_progress') && f.decision !== 'rejected' && new Date(f.dueDate).getTime() < now)
        .map((f) => ({ f, who: fixOwnerKey(f.owner, users), daysLate: Math.max(1, Math.round((now - new Date(f.dueDate).getTime()) / 86_400_000)) }))
        .sort((a, b) => b.daysLate - a.daysLate),
    [fixes, users, now],
  )

  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? id

  // public comments still without a reply, for the people in view (owner, 23 Nov): each opens the comment on Public mentions
  const unanswered = useMemo(
    () =>
      mentionList
        .filter((m) => !m.replied && m.assignee && people.some((p) => p.id === m.assignee) && (personId === 'all' || m.assignee === personId))
        .map((m) => {
          const hoursWaiting = Math.max(1, Math.round((now - Date.parse(`${m.date}T09:00:00`)) / 3_600_000))
          return { m, hoursWaiting, late: hoursWaiting > rules.publicReplyHours }
        })
        .sort((a, b) => b.hoursWaiting - a.hoursWaiting),
    [mentionList, people, personId, now, rules.publicReplyHours],
  )
  const dayFmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  const baseName = scope === 'team' ? 'team-performance' : 'user-performance'
  const rangeTag = `${from}_to_${to}`

  function exportSummary() {
    const c = {
      person: t('Person', 'الشخص'),
      role: t('Role', 'الدور'),
      received: t('Received', 'المستلمة'),
      onTime: t('Closed on time', 'أُغلقت في موعدها'),
      breached: t('Breached', 'متجاوزة للموعد'),
      open: t('Open now', 'مفتوحة الآن'),
      onTimeRate: t('On-time rate %', 'نسبة الإغلاق في الموعد %'),
      response: t('Response rate %', 'نسبة الاستجابة %'),
      resolve: t('Resolving rate %', 'نسبة الحل %'),
      escalated: t('Escalated', 'المصعّدة'),
      avg: t('Avg hours to first reply', 'متوسط ساعات أول رد'),
      from: t('From', 'من'),
      to: t('To', 'إلى'),
    }
    downloadCsv(
      `${baseName}-summary-${rangeTag}.csv`,
      rows.map(({ person, m }) => ({
        [c.person]: person.name,
        [c.role]: person.role,
        [c.received]: m.received,
        [c.onTime]: m.closedOnTime,
        [c.breached]: m.breached,
        [c.open]: m.open,
        [c.onTimeRate]: m.onTimeRate ?? '',
        [c.response]: m.responseRate ?? '',
        [c.resolve]: m.resolveRate ?? '',
        [c.escalated]: m.escalated,
        [c.avg]: m.avgResponseHours ?? '',
        [c.from]: from,
        [c.to]: to,
      })),
    )
    log('action', {
      en: `Exported the ${scope === 'team' ? 'team' : 'user'} performance summary, ${from} to ${to}`,
      ar: `صدّر ملخص الأداء، من ${from} إلى ${to}`,
    })
  }

  function exportCases() {
    const c = {
      person: t('Person', 'الشخص'),
      kind: t('Type', 'النوع'),
      ref: t('Reference', 'المرجع'),
      received: t('Received', 'المستلمة'),
      due: t('Due', 'الاستحقاق'),
      closed: t('Closed', 'الإغلاق'),
      status: t('Status', 'الحالة'),
      replied: t('Replied', 'تم الرد'),
      hours: t('Hours to first reply', 'ساعات أول رد'),
      resolved: t('Resolved', 'محلولة'),
      escalated: t('Escalated', 'مصعّدة'),
      source: t('Source', 'المصدر'),
    }
    const yes = t('yes', 'نعم')
    const no = t('no', 'لا')
    downloadCsv(
      `${baseName}-cases-${rangeTag}.csv`,
      selected
        .slice()
        .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))
        .map((k) => ({
          [c.person]: nameOf(k.userId),
          [c.kind]:
            k.kind === 'call'
              ? t('Customer call', 'مكالمة عميل')
              : k.kind === 'mention'
                ? t('Public comment', 'تعليق عام')
                : t('Corrective action', 'إجراء تصحيحي'),
          [c.ref]: k.ref,
          [c.received]: k.receivedAt.slice(0, 10),
          [c.due]: k.dueAt.slice(0, 10),
          [c.closed]: k.closedAt?.slice(0, 10) ?? '',
          [c.status]: k.closedAt
            ? k.closedAt <= k.dueAt
              ? t('Closed on time', 'أُغلقت في موعدها')
              : t('Closed late', 'أُغلقت متأخرة')
            : new Date(k.dueAt).getTime() < now
              ? t('Open, breached', 'مفتوحة، متجاوزة')
              : t('Open', 'مفتوحة'),
          [c.replied]: k.responded ? yes : no,
          [c.hours]: k.responseHours ?? '',
          [c.resolved]: k.closedAt ? (k.resolved ? yes : no) : '',
          [c.escalated]: k.escalated ? yes : no,
          [c.source]: k.sample ? t('Sample history', 'سجل تجريبي') : t('Live', 'مباشر'),
        })),
    )
    log('action', {
      en: `Exported every case behind the ${scope === 'team' ? 'team' : 'user'} performance report, ${from} to ${to}`,
      ar: `صدّر كل الحالات خلف تقرير الأداء، من ${from} إلى ${to}`,
    })
  }

  const title = scope === 'team' ? t('Team performance', 'أداء الفريق') : t('User performance dashboard', 'لوحة أداء المستخدمين')
  const description =
    scope === 'team'
      ? t(
          'How each CX team member is doing: cases received, answered and closed on time, breached, resolved and escalated. For the team’s appraisal. Only you see this.',
          'أداء كل موظف في فريق CX: الحالات المستلمة والمُجاب عنها والمغلقة في موعدها والمتجاوزة والمحلولة والمصعّدة. لتقييم الفريق. أنت وحدك ترى هذا.',
        )
      : t(
          'Work received by every user and how fast it was handled, including owners of corrective actions such as the L&D manager. For reporting: it shows who is late.',
          'العمل الذي استلمه كل مستخدم وسرعة معالجته، بما فيهم مسؤولو الإجراءات التصحيحية مثل مدير التعلم والتطوير. للتقارير: يُظهر من يتأخر.',
        )

  return (
    <div className="flex flex-col gap-4" data-density="comfortable">
      <PageHeader
        title={title}
        description={description}
        actions={
          canExport && (
            <>
              <Button variant="outline" onClick={exportCases}>
                <Download aria-hidden />
                {t('Export every case', 'تصدير كل الحالات')}
              </Button>
              <Button onClick={exportSummary}>
                <Download aria-hidden />
                {t('Export summary', 'تصدير الملخص')}
              </Button>
            </>
          )
        }
      />
      {!canExport && (
        <ViewOnlyNotice>
          {t('You can read this dashboard. Exporting is for the Super admin and the CX manager.', 'يمكنك قراءة هذه اللوحة. التصدير للمدير العام ومدير CX.')}
        </ViewOnlyNotice>
      )}

      {lateFixes.length > 0 && (
        <SectionCard
          className="border-s-4"
          title={
            <span className="inline-flex items-center gap-2">
              <AlertTriangle aria-hidden className="size-4 text-destructive" />
              {t(`${lateFixes.length} approved ${lateFixes.length === 1 ? 'fix is' : 'fixes are'} running late`, `${lateFixes.length} إجراء معتمد متأخر`)}
            </span>
          }
          description={t(
            'The AI raised these, the CX manager approved them, and the owner has passed the date. Chase the owner or move the date.',
            'رفعها الذكاء الاصطناعي واعتمدها مدير CX وتجاوز المسؤول الموعد. تابع المسؤول أو غيّر الموعد.',
          )}
        >
          <div data-testid="late-fixes">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Fix', 'الإجراء')}</TableHead>
                  <TableHead>{t('Owner', 'المسؤول')}</TableHead>
                  <TableHead>{t('Was due', 'كان مستحقاً')}</TableHead>
                  <TableHead>{t('Late by', 'متأخر بـ')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lateFixes.slice(0, 8).map(({ f, who, daysLate }) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <Link to="/actions/corrective" className="font-medium text-foreground underline-offset-2 hover:underline">
                        {L(f.title)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="flex flex-col">
                        <span className="text-foreground">{L(ownerTitle(f.owner))}</span>
                        {!who.external && <span className="text-xs text-muted-foreground">{who.label}</span>}
                      </span>
                    </TableCell>
                    <TableCell className="tabular text-muted-foreground">{dayFmt.format(new Date(f.dueDate))}</TableCell>
                    <TableCell>
                      <StatusBadge tone="danger" dot>
                        {t(`${daysLate} ${daysLate === 1 ? 'day' : 'days'}`, `${daysLate} يوم`)}
                      </StatusBadge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      )}

      <SectionCard>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <Segmented<RangePreset>
            label={t('Period', 'الفترة')}
            variant="pressed"
            value={preset}
            onValueChange={choosePreset}
            options={[
              { value: 'month', label: t('This month', 'هذا الشهر') },
              { value: 'last_month', label: t('Last month', 'الشهر الماضي') },
              { value: 'last_90', label: t('Last 90 days', 'آخر 90 يوماً') },
              { value: 'ytd', label: t('This year', 'هذا العام') },
              { value: 'custom', label: t('Custom', 'مخصص') },
            ]}
          />
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t('From', 'من')}
            <Input
              type="date"
              className="h-9 w-40"
              value={from}
              max={to}
              onChange={(e) => {
                setPreset('custom')
                setFrom(e.target.value)
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t('To', 'إلى')}
            <Input
              type="date"
              className="h-9 w-40"
              value={to}
              min={from}
              max={ymd(new Date(now))}
              onChange={(e) => {
                setPreset('custom')
                setTo(e.target.value)
              }}
            />
          </label>
          <Segmented<'all' | 'social' | 'other'>
            label={t('Work', 'نوع العمل')}
            variant="pressed"
            value={work}
            onValueChange={setWork}
            options={[
              { value: 'all', label: t('All work', 'كل العمل') },
              { value: 'social', label: t('Public comments (social media)', 'التعليقات العامة (السوشيال ميديا)') },
              { value: 'other', label: t('Calls and fixes', 'المكالمات والإجراءات') },
            ]}
          />
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t('Person', 'الشخص')}
            <Select value={personId} onValueChange={setPersonId}>
              <SelectTrigger className="h-9 min-w-48" aria-label={t('Person', 'الشخص')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{scope === 'team' ? t('Whole team', 'الفريق كله') : t('Everyone', 'الجميع')}</SelectItem>
                {people.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
      </SectionCard>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="perf-tiles">
        <KpiTile label={t('Received', 'المستلمة')} value={total.received} icon={<Inbox />} sub={t(`${total.open} open now`, `${total.open} مفتوحة الآن`)} />
        <KpiTile
          label={t('Closed on time', 'في موعدها')}
          value={<Rate value={total.onTimeRate}>{fmtPct(total.onTimeRate)}</Rate>}
          icon={<CheckCircle2 />}
          sub={t(`${total.closedOnTime} of ${total.closed} closed`, `${total.closedOnTime} من ${total.closed} مغلقة`)}
        />
        <KpiTile
          label={t('Breached', 'متجاوزة')}
          value={total.breached ? <Bad>{total.breached}</Bad> : <Good>0</Good>}
          icon={<ShieldAlert />}
          accent={total.breached ? 'var(--destructive)' : undefined}
          sub={t(`${total.breachedOpen} still open`, `${total.breachedOpen} ما زالت مفتوحة`)}
        />
        <KpiTile label={t('Response rate', 'نسبة الاستجابة')} value={<Rate value={total.responseRate}>{fmtPct(total.responseRate)}</Rate>} icon={<Reply />} />
        <KpiTile
          label={t('Resolving rate', 'نسبة الحل')}
          value={<Rate value={total.resolveRate}>{fmtPct(total.resolveRate)}</Rate>}
          icon={<TrendingUp />}
          sub={t('of closed cases', 'من المغلقة')}
        />
        <KpiTile label={t('Escalated', 'المصعّدة')} value={total.escalated ? <Bad>{total.escalated}</Bad> : <Good>0</Good>} icon={<AlertTriangle />} />
        <KpiTile
          label={t('First reply', 'أول رد')}
          value={total.avgResponseHours === null ? '—' : total.avgResponseHours}
          unit={total.avgResponseHours === null ? undefined : t('h avg', 'س')}
          icon={<Clock />}
        />
      </div>

      {work !== 'other' && unanswered.length > 0 && (
        <SectionCard
          className="border-s-4"
          title={
            <span className="inline-flex items-center gap-2">
              <MessageCircle aria-hidden className="size-4" />
              {t(
                `${unanswered.length} public ${unanswered.length === 1 ? 'comment has' : 'comments have'} no reply yet`,
                `${unanswered.length} تعليق عام بلا رد بعد`,
              )}
            </span>
          }
          description={t(
            'Facebook, Instagram, LinkedIn and Google. Open one to see the post, the other comments and reply. Past the SLA they are escalated to the CX manager.',
            'فيسبوك وإنستغرام ولينكد إن وGoogle. افتح أياً منها لترى المنشور والتعليقات الأخرى وترد. بعد المهلة تُصعَّد لمدير CX.',
          )}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Comment', 'التعليق')}</TableHead>
                <TableHead>{t('Platform', 'المنصة')}</TableHead>
                <TableHead>{t('Assigned to', 'مُسند إلى')}</TableHead>
                <TableHead>{t('Waiting', 'ينتظر')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unanswered.map(({ m, hoursWaiting, late }) => (
                <TableRow key={m.id}>
                  <TableCell className="max-w-96 whitespace-normal">
                    <Link to={`/settings/public-mentions?open=${m.id}`} className="font-medium text-foreground underline-offset-2 hover:underline">
                      {m.text}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <SourceBadge channel={m.platform} />
                  </TableCell>
                  <TableCell>{nameOf(m.assignee ?? '')}</TableCell>
                  <TableCell>
                    <StatusBadge tone={late ? 'danger' : 'warning'} dot>
                      {hoursWaiting >= 48
                        ? t(`${Math.round(hoursWaiting / 24)} days`, `${Math.round(hoursWaiting / 24)} يوم`)
                        : t(`${hoursWaiting} h`, `${hoursWaiting} س`)}
                      {late ? t(' · escalated', ' · مُصعَّد') : ''}
                    </StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      )}

      <SectionCard
        title={scope === 'team' ? t('By team member', 'حسب الموظف') : t('By user', 'حسب المستخدم')}
        description={t('Sorted by most breached first. Click a name to look at one person.', 'مرتبة بالأكثر تجاوزاً أولاً. اضغط على اسم لعرض شخص واحد.')}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Person', 'الشخص')}</TableHead>
              <TableHead className="text-end">{t('Received', 'المستلمة')}</TableHead>
              <TableHead className="text-end">{t('On time', 'في الموعد')}</TableHead>
              <TableHead className="text-end">{t('Breached', 'متجاوزة')}</TableHead>
              <TableHead className="text-end">{t('On-time %', 'في الموعد %')}</TableHead>
              <TableHead className="text-end">{t('Response %', 'الاستجابة %')}</TableHead>
              <TableHead className="text-end">{t('Resolving %', 'الحل %')}</TableHead>
              <TableHead className="text-end">{t('Escalated', 'مصعّدة')}</TableHead>
              <TableHead className="text-end">{t('First reply (h)', 'أول رد (س)')}</TableHead>
              <TableHead className="text-end">{t('Open now', 'مفتوحة')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-muted-foreground">
                  {t('Nobody received work in this period.', 'لم يستلم أحد عملاً في هذه الفترة.')}
                </TableCell>
              </TableRow>
            )}
            {rows.map(({ person, m }) => (
              <TableRow key={person.id} data-state={personId === person.id ? 'selected' : undefined}>
                <TableCell>
                  <button
                    type="button"
                    className="flex flex-col items-start text-start outline-hidden focus-visible:ring-2"
                    onClick={() => setPersonId(personId === person.id ? 'all' : person.id)}
                  >
                    <span className="font-medium text-foreground">{person.name}</span>
                    <span className="text-xs text-muted-foreground">{person.role}</span>
                  </button>
                </TableCell>
                <TableCell className="tabular text-end">{m.received}</TableCell>
                <TableCell className="tabular text-end">{m.closedOnTime}</TableCell>
                <TableCell className="tabular text-end">
                  {m.breached > 0 ? (
                    <StatusBadge tone="danger" dot>
                      {m.breached}
                    </StatusBadge>
                  ) : (
                    0
                  )}
                </TableCell>
                <TableCell className="tabular text-end">
                  <Rate value={m.onTimeRate}>{fmtPct(m.onTimeRate)}</Rate>
                </TableCell>
                <TableCell className="tabular text-end">
                  <Rate value={m.responseRate}>{fmtPct(m.responseRate)}</Rate>
                </TableCell>
                <TableCell className="tabular text-end">
                  <Rate value={m.resolveRate}>{fmtPct(m.resolveRate)}</Rate>
                </TableCell>
                <TableCell className="tabular text-end">{m.escalated ? <Bad>{m.escalated}</Bad> : m.escalated}</TableCell>
                <TableCell className="tabular text-end">{m.avgResponseHours ?? '—'}</TableCell>
                <TableCell className="tabular text-end">{m.open}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <InlineNote className="mt-3" tone="info">
          {t(
            'Prototype: earlier months of the CX team are sample history; today’s calls and fixes are read live. In the real platform every figure comes from the time stamps on the case.',
            'نموذج أولي: الأشهر السابقة لفريق CX بيانات تجريبية؛ مكالمات اليوم والإجراءات تُقرأ مباشرة. في المنصة الفعلية تأتي كل الأرقام من الأختام الزمنية على الحالة.',
          )}
        </InlineNote>
      </SectionCard>

      <SectionCard
        title={t('Month by month', 'شهراً بشهر')}
        description={personId === 'all' ? (scope === 'team' ? t('The whole team', 'الفريق كله') : t('Everyone', 'الجميع')) : nameOf(personId)}
      >
        {trend.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('Nothing to chart in this period.', 'لا شيء للعرض في هذه الفترة.')}</p>
        ) : (
          <ChartWell
            height={220}
            label={t('Cases received and breached per month', 'الحالات المستلمة والمتجاوزة شهرياً')}
            legend={
              <ChartLegend
                items={[
                  { label: t('Received', 'المستلمة'), color: chartColor(0) },
                  { label: t('Breached', 'المتجاوزة'), color: chartColor(1) },
                ]}
              />
            }
          >
            <BarChart data={trend}>
              <CartesianGrid {...chartGrid} />
              <XAxis dataKey="month" {...chartAxis} />
              <YAxis {...chartAxis} width={32} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={chartCursorBar} />
              <Bar dataKey="received" name={t('Received', 'المستلمة')} {...chartBar} radius={[6, 6, 0, 0]} fill="var(--chart-1)" />
              <Bar dataKey="breached" name={t('Breached', 'المتجاوزة')} {...chartBarMuted} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartWell>
        )}
      </SectionCard>
    </div>
  )
}

function roleText(roleId: string, L: (b: { en: string; ar: string }) => string): string {
  const names: Record<string, { en: string; ar: string }> = {
    ld: { en: 'L&D manager', ar: 'مدير التعلم والتطوير' },
    envmgmt: { en: 'Environment manager', ar: 'مدير البيئة' },
    auditmkt: { en: 'Internal Audit and Marketing Lead', ar: 'مسؤول التدقيق الداخلي والتسويق' },
    marketing: { en: 'Marketing manager', ar: 'مدير التسويق' },
    cxmgr: { en: 'CX manager', ar: 'مدير CX' },
  }
  return names[roleId] ? L(names[roleId]) : roleId
}
