import { REASON_CODE_LABEL } from '@/utils/closeTheLoop'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { Bot, PhoneMissed, Phone, Plus, TrendingUp, X } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canAssignCalls, canRecordCallAttempt } from '@/auth/permissions'
import {
  useAiCampaigns,
  useCreateAiCampaign,
  useDetractorCallItems,
  usePersonsAll,
  useRecordInterview,
  useRecordResurvey,
} from '@/services/queries'
import { useRecordNoAnswer, useRules } from '@/services/queriesV40'
import {
  CLOSE_LOOP_DEFAULTS,
  INTERVIEW_OUTCOME_LABEL,
  SEVERITY_ORDER,
  INSTRUMENT_LABEL,
  RECOVERY_REASON_LABEL,
  computeMonthlyCapacity,
  instrumentRange,
  recoveryRate,
  recoveryStatus,
  sampleToCapacity,
} from '@/utils/closeTheLoop'
import { CALL_COPY, attemptLine, callRulesFrom } from '@/utils/callSchedule'
import { useAuth } from '@/auth/session'
import { useAuditActor } from '@/auth/useAuditActor'
import { useUsers } from '@/data/users'
import { assignCall, clearAskedAgain, moveCalls, unassignCall, useCallAssignments } from '@/data/callAssignments'
import { isAwayOn, unavailableReason, useAway } from '@/data/availability'
import { personLabel } from '@/utils/peopleExport'
import { envNameFromShort } from '@/data/environments'
import { CLOSE_LOOP_NEXT } from '@/data/steps'
import { useNow } from '@/hooks/useNow'
import { SEVERITY_TONE } from '@/lib/status'
import type { DetractorCallItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { NextBox } from '@/components/common/NextBox'
import { DataTable, SortableHeader } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { InterviewDialog } from '@/components/closeTheLoop/InterviewDialog'
import { CampaignDialog } from '@/components/closeTheLoop/CampaignDialog'
import { CampaignGate } from '@/components/campaigns/CampaignGate'
import { CAMPAIGN_AUDIT_COPY } from '@/data/campaignAudit'

const SEVERITY_LABEL = {
  critical: { en: 'Critical', ar: 'حرجة' },
  medium: { en: 'Medium', ar: 'متوسطة' },
  low: { en: 'Low', ar: 'منخفضة' },
} as const

const CAMPAIGN_STATUS: Record<string, { label: { en: string; ar: string }; tone: 'success' | 'warning' | 'neutral' }> = {
  running: { label: { en: 'Running', ar: 'جارية' }, tone: 'success' },
  closed: { label: { en: 'Closed', ar: 'مغلقة' }, tone: 'neutral' },
  draft: { label: { en: 'Draft', ar: 'مسودة' }, tone: 'warning' },
}

/** "مرتين" for two, "n مرات" otherwise (the English text says "2x"). */
function timesAr(n: number) {
  return n === 2 ? 'مرتين' : `${n} مرات`
}

/** FR-5.1–5.6 — the monthly detractor call list with real capacity math,
 * the four-question interview, re-survey/recovery delta, and AI interview
 * campaigns with the critical-exclusion hard rule.
 * v40 (F27): calling hours (config), up to three attempts with the next one on the following working day,
 * a "No answer" action, WhatsApp after the last attempt, then "needs a human" for the CX manager. A DNCR person
 * is never on the list. The next-step box says where this page sits in the six steps. */
export default function CloseTheLoop() {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const rules = useRules()
  const callRules = useMemo(() => callRulesFrom(rules), [rules])
  const [params, setParams] = useSearchParams()
  // The call-list register is edited in place: `dataUpdatedAt` is what tells this page that a row changed.
  const { data: items, isLoading: itemsLoading, dataUpdatedAt } = useDetractorCallItems()
  const { data: persons } = usePersonsAll()
  const { data: campaigns, isLoading: campaignsLoading } = useAiCampaigns()
  const recordInterview = useRecordInterview()
  const recordNoAnswer = useRecordNoAnswer()
  const recordResurvey = useRecordResurvey()
  const createCampaign = useCreateAiCampaign()

  const [people, setPeople] = useState(CLOSE_LOOP_DEFAULTS.people)
  const [hoursPerDay, setHoursPerDay] = useState(CLOSE_LOOP_DEFAULTS.hoursPerDay)
  const [workingDays, setWorkingDays] = useState(CLOSE_LOOP_DEFAULTS.workingDaysPerMonth)
  const [interviewing, setInterviewing] = useState<DetractorCallItem | null>(null)
  const [resurveyDraft, setResurveyDraft] = useState<Record<string, string>>({})
  const [creatingCampaign, setCreatingCampaign] = useState(false)

  const capacity = computeMonthlyCapacity(people, hoursPerDay, workingDays)
  // A DNCR person is never callable and never on this list, whatever the environment switch says.
  const dncrIds = useMemo(() => new Set((persons ?? []).filter((p) => p.consent.dncr).map((p) => p.id)), [persons])
  const sorted = useMemo(
    () =>
      (items ?? [])
        .filter((i) => !dncrIds.has(i.personId))
        .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [items, dataUpdatedAt, dncrIds],
  )
  const { selected, excluded } = useMemo(() => sampleToCapacity(sorted, capacity), [sorted, capacity])
  const usedPct = sorted.length ? Math.min(100, Math.round((selected.length / sorted.length) * 100)) : 0
  const canCreateCampaign = role.id === 'cxmgr' || role.id === 'cxteam'
  const canRecordAttempt = canRecordCallAttempt(role.id)
  const canAssign = canAssignCalls(role.id)
  const { session } = useAuth()
  const { log } = useAuditActor()
  const assignments = useCallAssignments()
  const directory = useUsers()
  const away = useAway()
  // new cases go only to people who are active and not on leave today
  const cxTeam = useMemo(() => directory.filter((u) => u.roleId === 'cxteam' && u.status === 'active' && !isAwayOn(away[u.id])), [directory, away])
  const whyOut = (userId: string) => unavailableReason(directory.find((u) => u.id === userId), away)
  // open cases held by someone who is on leave or has left, per person: the manager moves these
  const stranded = useMemo(() => {
    const by = new Map<string, DetractorCallItem[]>()
    for (const i of sorted) {
      const a = assignments[i.id]
      if (!a || i.outcome || i.status === 'done' || !whyOut(a.userId)) continue
      by.set(a.userId, [...(by.get(a.userId) ?? []), i])
    }
    return [...by.entries()]
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted, assignments, directory, away])
  const nameOf = (userId: string) => directory.find((u) => u.id === userId)?.name ?? userId
  const me = session?.userId
  const now = useNow()
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  const rate = useMemo(() => recoveryRate(items ?? [], now), [items, now, dataUpdatedAt])

  const locale = lang === 'ar' ? 'ar-AE' : 'en-GB'
  const fmtDay = (key: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(`${key}T00:00:00`))

  function personName(id: string) {
    const p = persons?.find((x) => x.id === id)
    return p ? personLabel(p, role.id) : id
  }

  function saveResurvey(item: DetractorCallItem) {
    const id = item.id
    const raw = resurveyDraft[id]
    const v = Number(raw)
    const { min, max } = instrumentRange(item.instrument ?? 'nps')
    if (raw === undefined || raw === '' || !Number.isInteger(v) || v < min || v > max) {
      toast.error(t(`Enter a whole score from ${min} to ${max}.`, `أدخل درجة صحيحة من ${min} إلى ${max}.`))
      return
    }
    recordResurvey.mutate({ id, secondScore: v })
    toast.success(t('Re-survey saved', 'تم حفظ إعادة الاستبيان'))
  }

  /** The manager gives the case to a CX team member (or takes it back to the pool); the team member can take an unassigned one. */
  function assignTo(item: DetractorCallItem, userId: string) {
    if (!me) return
    if (userId === 'none') {
      unassignCall(item.id)
      log('action', { en: `Took ${personName(item.personId)} off ${nameOf(assignments[item.id]?.userId ?? '')}`, ar: `سحب ${personName(item.personId)} من ${nameOf(assignments[item.id]?.userId ?? '')}` })
      return
    }
    assignCall(item.id, userId, me)
    log('action', { en: `Gave ${personName(item.personId)} to ${nameOf(userId)} to call`, ar: `أسند ${personName(item.personId)} إلى ${nameOf(userId)} للاتصال` })
    toast.success(t(`Given to ${nameOf(userId)}.`, `أُسندت إلى ${nameOf(userId)}.`))
  }

  function askAgain(item: DetractorCallItem) {
    const a = assignments[item.id]
    if (!me || !a) return
    assignCall(item.id, a.userId, me, { askedAgain: true })
    log('action', { en: `Asked ${nameOf(a.userId)} to call ${personName(item.personId)} again`, ar: `طلب من ${nameOf(a.userId)} الاتصال بـ${personName(item.personId)} مرة أخرى` })
    toast.success(t(`${nameOf(a.userId)} will see “call again”.`, `سيرى ${nameOf(a.userId)} طلب «اتصل مرة أخرى».`))
  }

  /** Moves every open case of someone who is away or left to the chosen person, or spreads them over everyone available. */
  function moveAll(fromUserId: string, cases: DetractorCallItem[], target: string) {
    if (!me) return
    const to = target === 'spread' ? cxTeam.map((u) => u.id) : [target]
    if (!to.length) {
      toast.error(t('Nobody is available to take them.', 'لا أحد متاح لاستلامها.'))
      return
    }
    moveCalls(cases.map((c) => c.id), to, me, whyOut(fromUserId) === 'left' ? 'left' : 'leave')
    const toName = target === 'spread' ? t('the available team', 'الفريق المتاح') : nameOf(target)
    log('action', {
      en: `Moved ${cases.length} cases from ${nameOf(fromUserId)} (${whyOut(fromUserId) === 'left' ? 'left' : 'on leave'}) to ${toName}`,
      ar: `نقل ${cases.length} حالة من ${nameOf(fromUserId)} إلى ${toName}`,
    })
    toast.success(t(`${cases.length} cases moved to ${toName}.`, `نُقلت ${cases.length} حالة إلى ${toName}.`))
  }

  /** "No answer": attempt + 1, the next one the following working day; after the last, WhatsApp goes out and the row needs a human. */
  function noAnswer(item: DetractorCallItem) {
    clearAskedAgain(item.id)
    recordNoAnswer.mutate(
      { id: item.id },
      {
        onSuccess: (res) => toast(L(res.toast)),
        onError: (e) => toast.error(e instanceof Error ? e.message : t('Could not record the attempt.', 'تعذّر تسجيل المحاولة.')),
      },
    )
  }

  const columns: ColumnDef<DetractorCallItem>[] = [
    {
      id: 'severity',
      accessorFn: (i) => SEVERITY_ORDER[i.severity],
      header: ({ column }) => <SortableHeader column={column}>{t('Severity', 'الخطورة')}</SortableHeader>,
      cell: ({ row }) => (
        <StatusBadge tone={SEVERITY_TONE[row.original.severity]} dot>
          {L(SEVERITY_LABEL[row.original.severity])}
        </StatusBadge>
      ),
    },
    {
      id: 'person',
      accessorFn: (i) => personName(i.personId),
      header: ({ column }) => <SortableHeader column={column}>{t('Person', 'الشخص')}</SortableHeader>,
      cell: ({ row, getValue }) => (
        <span className="inline-flex flex-col gap-0.5 leading-tight">
          <span className="font-medium text-foreground">{getValue<string>()}</span>
          <span className="text-xs text-muted-foreground">{L(envNameFromShort(row.original.environment))}</span>
        </span>
      ),
    },
    {
      id: 'channel',
      accessorFn: (i) => i.channel,
      header: t('Channel', 'القناة'),
      cell: ({ row }) =>
        row.original.channel === 'ai_campaign' ? (
          <span className="inline-flex items-center gap-1.5 text-foreground">
            <Bot aria-hidden className="size-4 text-muted-foreground" />
            {t('AI campaign', 'حملة ذكاء اصطناعي')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-foreground">
            <Phone aria-hidden className="size-4 text-muted-foreground" />
            {t('Human', 'بشري')}
          </span>
        ),
    },
    {
      id: 'firstScore',
      accessorKey: 'firstScore',
      header: ({ column }) => <SortableHeader column={column}>{t('First score', 'النتيجة الأولى')}</SortableHeader>,
      meta: { align: 'end', label: t('First score', 'النتيجة الأولى') },
      cell: ({ row }) => (
        <span className="inline-flex flex-col items-end leading-tight">
          <span className="tabular-nums">{row.original.firstScore}</span>
          <span className="text-xs text-muted-foreground">{L(INSTRUMENT_LABEL[row.original.instrument ?? 'nps'])}</span>
        </span>
      ),
    },
    {
      id: 'reason',
      accessorFn: (i) => (i.reasonCode ? L(REASON_CODE_LABEL[i.reasonCode]) : ''),
      header: t('Reason', 'السبب'),
      cell: ({ row }) =>
        row.original.reasonCode ? <span className="text-foreground">{L(REASON_CODE_LABEL[row.original.reasonCode])}</span> : <span className="text-muted-foreground">—</span>,
    },
    {
      id: 'assignee',
      accessorFn: (i) => (assignments[i.id] ? nameOf(assignments[i.id].userId) : ''),
      header: t('Assigned to', 'مُسندة إلى'),
      meta: { cellClassName: 'min-w-44' },
      cell: ({ row }) => {
        const i = row.original
        const a = assignments[i.id]
        if (i.status === 'done' || i.outcome) return a ? <span className="text-foreground">{nameOf(a.userId)}</span> : <span className="text-muted-foreground">—</span>
        const canAsk = canAssign && !!a && (i.status === 'no_answer' || i.status === 'needs_human')
        return (
          <span className="inline-flex flex-col items-start gap-1.5">
            {canAssign ? (
              <Select value={a?.userId ?? 'none'} onValueChange={(v) => assignTo(i, v)}>
                <SelectTrigger size="sm" className="h-8 min-w-40" aria-label={t('Assign to a CX team member', 'إسناد إلى موظف CX')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('Not assigned', 'غير مُسندة')}</SelectItem>
                  {a && whyOut(a.userId) && (
                    <SelectItem value={a.userId} disabled>
                      {nameOf(a.userId)} · {whyOut(a.userId) === 'left' ? t('left', 'غادر') : t('on leave', 'في إجازة')}
                    </SelectItem>
                  )}
                  {cxTeam.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : a ? (
              <span className="font-medium text-foreground">{a.userId === me ? t('You', 'أنت') : nameOf(a.userId)}</span>
            ) : canRecordAttempt && me ? (
              <Button variant="outline" size="xs" onClick={() => assignTo(i, me)}>
                {t('Take it', 'استلمها')}
              </Button>
            ) : (
              <span className="text-muted-foreground">{t('Not assigned', 'غير مُسندة')}</span>
            )}
            {a && whyOut(a.userId) && (
              <StatusBadge tone="danger" dot>
                {whyOut(a.userId) === 'left'
                  ? t(`With ${nameOf(a.userId)}, who left`, `لدى ${nameOf(a.userId)} الذي غادر`)
                  : t(`With ${nameOf(a.userId)}, on leave`, `لدى ${nameOf(a.userId)} وهو في إجازة`)}
                {i.severity === 'critical' ? ` · ${t('urgent', 'عاجل')}` : ''}
              </StatusBadge>
            )}
            {a?.movedFrom && !whyOut(a.userId) && (
              <span className="text-xs text-muted-foreground">{t(`Moved from ${nameOf(a.movedFrom)}`, `نُقلت من ${nameOf(a.movedFrom)}`)}</span>
            )}
            {a?.askedAgain && (
              <StatusBadge tone="warning" dot>
                {t('Manager asked to call again', 'المدير طلب الاتصال مرة أخرى')}
              </StatusBadge>
            )}
            {canAsk && !a?.askedAgain && (
              <Button variant="ghost" size="xs" onClick={() => askAgain(i)}>
                {t('Ask to call again', 'اطلب اتصالاً آخر')}
              </Button>
            )}
          </span>
        )
      },
    },
    {
      id: 'due',
      accessorFn: (i) => i.nextAttemptOn ?? i.dueOn ?? '',
      header: ({ column }) => <SortableHeader column={column}>{t('Due', 'المهلة')}</SortableHeader>,
      cell: ({ row }) => {
        const i = row.original
        const line = attemptLine(i, callRules)
        return (
          <span className="inline-flex flex-col gap-0.5 leading-tight">
            {i.dueOn ? <bdi dir="ltr" className="tabular text-foreground">{fmtDay(i.dueOn)}</bdi> : <span className="text-muted-foreground">–</span>}
            {line && (
              <span className="text-xs text-muted-foreground">
                {L(CALL_COPY.rowSuffix(line.attempt, line.of, line.next ? fmtDay(line.next) : undefined))}
              </span>
            )}
          </span>
        )
      },
    },
    {
      id: 'outcome',
      accessorFn: (i) => (i.outcome ? L(INTERVIEW_OUTCOME_LABEL[i.outcome]) : i.status),
      header: t('Status', 'الحالة'),
      cell: ({ row }) => {
        const i = row.original
        if (i.status === 'done' || i.outcome) return i.outcome ? <span className="text-foreground">{L(INTERVIEW_OUTCOME_LABEL[i.outcome])}</span> : <span className="text-muted-foreground">—</span>
        if (i.status === 'needs_human')
          return (
            <span className="inline-flex flex-col items-start gap-1">
              <StatusBadge tone="danger" dot>
                {L(CALL_COPY.needsHuman)}
              </StatusBadge>
              <span className="block max-w-52 text-xs whitespace-normal text-muted-foreground">
                {i.channel === 'ai_campaign' ? L(CALL_COPY.handedOverNote) : t('WhatsApp sent after the last attempt', 'أُرسل واتساب بعد آخر محاولة')}
              </span>
            </span>
          )
        if (i.status === 'no_answer')
          return (
            <StatusBadge tone="warning" icon={<PhoneMissed aria-hidden />}>
              {L(CALL_COPY.noAnswerButton)}
            </StatusBadge>
          )
        return <span className="text-muted-foreground">{t('Not called yet', 'لم يُتصل به بعد')}</span>
      },
    },
    {
      id: 'resurvey',
      header: t('Re-survey', 'إعادة الاستبيان'),
      enableSorting: false,
      cell: ({ row }) => {
        const i = row.original
        if (i.secondScore !== undefined) {
          const delta = i.secondScore - i.firstScore
          return (
            <StatusBadge tone={delta > 0 ? 'success' : 'neutral'} icon={delta > 0 ? <TrendingUp aria-hidden /> : undefined}>
              <bdi dir="ltr" className="tabular">
                {i.firstScore} → {i.secondScore} ({delta > 0 ? '+' : ''}
                {delta})
              </bdi>
            </StatusBadge>
          )
        }
        if (i.outcome === 'declined') return <span className="text-sm text-muted-foreground">{t('Declined — no retry', 'رفض — دون إعادة محاولة')}</span>
        if (!i.outcome) return <span className="text-muted-foreground">—</span>
        const { min, max } = instrumentRange(i.instrument ?? 'nps')
        return (
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              inputMode="numeric"
              min={min}
              max={max}
              placeholder={`${min}–${max}`}
              dir="ltr"
              aria-label={t(`Second score (${min} to ${max})`, `النتيجة الثانية (${min} إلى ${max})`)}
              className="tabular h-8 w-[4.5rem] px-2.5 text-sm"
              value={resurveyDraft[i.id] ?? ''}
              onChange={(e) => setResurveyDraft((d) => ({ ...d, [i.id]: e.target.value }))}
            />
            <Button variant="outline" size="xs" onClick={() => saveResurvey(i)}>
              {t('Save', 'حفظ')}
            </Button>
          </div>
        )
      },
    },
    {
      id: 'recovered',
      header: t('Recovered (60 days)', 'التعافي (60 يوماً)'),
      enableSorting: false,
      cell: ({ row }) => {
        const r = recoveryStatus(row.original, { now })
        const tone = r.status === 'recovered' ? 'success' : r.status === 'not_recovered' ? 'danger' : 'neutral'
        const label =
          r.status === 'recovered' ? t('Recovered', 'تعافى') : r.status === 'not_recovered' ? t('Not recovered', 'لم يتعافَ') : t('Too early', 'مبكر')
        return (
          <span className="inline-flex flex-col items-start gap-1">
            <StatusBadge tone={tone} dot>
              {label}
            </StatusBadge>
            <span className="block max-w-44 text-xs whitespace-normal text-muted-foreground">
              {r.status === 'too_early'
                ? r.provisional === 'recovered'
                  ? t('So far: a recovery event', 'حتى الآن: حدث تعافٍ')
                  : r.provisional === 'not_recovered'
                    ? t('So far: not recovering', 'حتى الآن: لا تعافي')
                    : t('Nothing decisive yet', 'لا شيء حاسم بعد')
                : L(RECOVERY_REASON_LABEL[r.reason])}
            </span>
          </span>
        )
      },
    },
    {
      id: 'call',
      header: () => <span className="sr-only">{t('Actions', 'الإجراءات')}</span>,
      enableSorting: false,
      // pinned to the end edge: the Call button stays in reach while the 10 columns scroll
      meta: { align: 'end', cellClassName: 'min-w-44', sticky: 'end' },
      cell: ({ row }) => rowActions(row.original),
    },
  ]

  /** Call (the four-question interview) and "No answer" (attempt + 1; after the last attempt the row needs a human). */
  // A plain function (not a component): the table rebuilds its columns every render, and a component defined here would remount its buttons and lose focus.
  function rowActions(item: DetractorCallItem) {
    if (item.outcome || item.status === 'done') return null
    // only the CX team member the case is given to makes the call; the manager gives it out and asks for another (no Call button)
    if (!canRecordAttempt || assignments[item.id]?.userId !== me) return null
    const canNoAnswer = item.status !== 'needs_human'
    return (
      <span className="inline-flex items-center justify-end gap-1.5">
        {canNoAnswer && (
          <Button variant="outline" size="xs" onClick={() => noAnswer(item)} disabled={recordNoAnswer.isPending}>
            <PhoneMissed aria-hidden />
            {L(CALL_COPY.noAnswerButton)}
          </Button>
        )}
        <Button size="xs" onClick={() => { clearAskedAgain(item.id); setInterviewing(item) }} data-tour="loop-call">
          <Phone aria-hidden />
          {t('Call', 'اتصال')}
        </Button>
      </span>
    )
  }

  // `?item=dcl-3` (My inbox "call" rows): show that row first, with its actions, whatever page of the table it is on.
  const focusId = params.get('item')
  const focusItem = focusId ? sorted.find((i) => i.id === focusId) : undefined

  return (
    <div data-density="dense" className="flex flex-col gap-6">
      <PageHeader
        title={t('Close the loop', 'إغلاق الحلقة')}
        term="Close the loop"
        description={t('Every detractor gets a human call, a reason code and a re-survey. Critical cases first.', 'كل منتقد يحصل على مكالمة بشرية ورمز سبب وإعادة استبيان. الحالات الحرجة أولاً.')}
      />

      <NextBox next={CLOSE_LOOP_NEXT} />

      <SectionCard
        title={t('Monthly capacity', 'السعة الشهرية')}
        description={t('Critical detractors are always called; the rest are sampled to fit the team’s hours.', 'المنتقدون الحرجون يُتصل بهم دائماً؛ ويُختار الباقون بالعينة بما يتسع له وقت الفريق.')}
      >
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 items-end gap-4 sm:grid-cols-4">
            <NumberField id="ctl-people" label={t('CX people', 'عدد موظفي تجربة العملاء')} value={people} min={1} onChange={setPeople} />
            <NumberField id="ctl-hours" label={t('Hours/day', 'ساعات/يوم')} value={hoursPerDay} min={1} max={12} onChange={setHoursPerDay} />
            <NumberField id="ctl-days" label={t('Working days', 'أيام العمل')} value={workingDays} min={1} max={31} onChange={setWorkingDays} />
            {/* the result sits in a well; the number is ink (colour is never a value) */}
            <div className="well col-span-2 flex items-center justify-between gap-3 px-4 py-2.5 sm:col-span-1">
              <span className="text-xs text-muted-foreground">{t('= capacity (4 calls/hour)', '= السعة (4 مكالمات/ساعة)')}</span>
              <span className="t-kpi" aria-live="polite">
                {capacity}
              </span>
            </div>
          </div>
          <Progress value={usedPct} aria-label={t('Share of detractors called', 'نسبة المنتقدين الذين سيُتصل بهم')} />
          <p className="text-sm text-muted-foreground">
            <bdi dir="ltr" className="tabular font-medium text-foreground">
              {selected.length} / {sorted.length}
            </bdi>{' '}
            {t('detractors called this month', 'منتقد سيُتصل بهم هذا الشهر')}
            {excluded.length > 0 && (
              <>
                {' '}
                — <span className="tabular">{excluded.length}</span>{' '}
                {t('sampled out (critical always called at 100%, the rest spread across products/environments)', 'مستبعدون من العينة (الحرج دائماً 100%، والباقي موزَّع على المنتجات والبيئات)')}
              </>
            )}
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title={t('Recovered within 60 days', 'التعافي خلال 60 يوماً')}
        term="Recovered"
        description={t(
          'Recovered: within 60 days a CSAT or CES of 4 or 5, an NPS promoter or passive, a transaction, renewal or new lead, or a new contact without a complaint. Not recovered: silent, a detractor again, cancelled or a runaway. Before 60 days: too early.',
          'التعافي: خلال 60 يوماً تقييم CSAT أو CES بـ 4 أو 5، أو مروّج أو محايد في NPS، أو معاملة أو تجديد أو عميل محتمل جديد، أو تواصل دون شكوى. عدم التعافي: الصمت، أو منتقد مجدداً، أو الإلغاء، أو الهروب. قبل 60 يوماً: مبكر.',
        )}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="well col-span-2 flex flex-col gap-2 sm:col-span-1">
            <span className="t-small-strong text-muted-foreground">{t('Recovered', 'تعافى')}</span>
            <span className="flex items-baseline gap-1">
              <span className="t-kpi">{rate.pct === null ? '–' : rate.pct}</span>
              {rate.pct !== null && <span className="t-unit">%</span>}
            </span>
            <span className="text-xs text-muted-foreground">
              <bdi dir="ltr" className="tabular">
                {rate.recovered} / {rate.decided}
              </bdi>{' '}
              {t('whose 60 days are over', 'ممن انقضت أيامهم الستون')}
            </span>
          </div>
          <div className="well flex flex-col gap-2">
            <span className="t-small-strong text-muted-foreground">{t('Not recovered', 'لم يتعافَ')}</span>
            <span className="t-kpi">{rate.decided - rate.recovered}</span>
          </div>
          <div className="well flex flex-col gap-2">
            <span className="t-small-strong text-muted-foreground">{t('Too early', 'مبكر')}</span>
            <span className="t-kpi">{rate.tooEarly}</span>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={t("This month's call list", 'قائمة الاتصال لهذا الشهر')}
        actions={<span className="tabular text-sm text-muted-foreground">{selected.length}</span>}
        contentClassName="flex flex-col gap-4"
      >
        {/* The calling rules (F27): hours, attempts, next attempt, WhatsApp, "needs a human". Configuration, from Settings → Rules. */}
        <div className="well flex flex-col gap-1 px-4 py-3.5 text-sm" data-testid="calling-rules">
          <p className="flex items-start gap-2.5 text-foreground">
            <span aria-hidden className="dot dot-info mt-1.5" />
            <span>{L(CALL_COPY.hint(callRules))}</span>
          </p>
          <p className="ps-4 text-xs text-muted-foreground">
            {L(CALL_COPY.hoursNote)} · {L(CALL_COPY.aiHandOff(rules.aiNoAnswers))} · {L(CALL_COPY.dncrNever)}
          </p>
        </div>

        {focusId && (
          <div role="region" aria-label={t('From your inbox', 'من صندوقك')} className="well flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <span className="t-small-strong flex items-center gap-2">
              <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-foreground" />
              {t('From your inbox', 'من صندوقك')}
            </span>
            {focusItem ? (
              <>
                <StatusBadge tone={SEVERITY_TONE[focusItem.severity]} dot>
                  {L(SEVERITY_LABEL[focusItem.severity])}
                </StatusBadge>
                <span className="font-medium text-foreground">{personName(focusItem.personId)}</span>
                <span className="text-muted-foreground">
                  {focusItem.reasonCode ? L(REASON_CODE_LABEL[focusItem.reasonCode]) : t('Reason not coded yet', 'السبب لم يُرمَّز بعد')}
                </span>
                {(() => {
                  const line = attemptLine(focusItem, callRules)
                  return line ? <span className="text-muted-foreground">{L(CALL_COPY.rowSuffix(line.attempt, line.of, line.next ? fmtDay(line.next) : undefined))}</span> : null
                })()}
                <span className="ms-auto flex items-center gap-1.5">
                  {rowActions(focusItem)}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">{itemsLoading ? t('Loading…', 'جارٍ التحميل…') : t('That row is not on the list in the current scope.', 'هذا السطر ليس في القائمة ضمن النطاق الحالي.')}</span>
            )}
            <Button variant="ghost" size="icon-sm" onClick={() => setParams({}, { replace: true })} aria-label={t('Close this row', 'إغلاق هذا السطر')}>
              <X aria-hidden />
            </Button>
          </div>
        )}

        {canAssign && stranded.length > 0 && (
          <div role="alert" className="flex flex-col gap-2.5" data-testid="stranded-cases">
            {stranded.map(([uid, cases]) => {
              const left = whyOut(uid) === 'left'
              const urgent = cases.filter((c) => c.severity === 'critical').length
              return (
                <div key={uid} className="well flex flex-wrap items-center gap-x-3 gap-y-2 border-s-4 px-4 py-3" style={{ borderColor: 'var(--status-warning-solid)' }}>
                  <span className="text-sm text-foreground">
                    <span className="font-medium">{t(`${cases.length} open ${cases.length === 1 ? 'case is' : 'cases are'} with ${nameOf(uid)}`, `${cases.length} حالة مفتوحة لدى ${nameOf(uid)}`)}</span>
                    {', '}
                    {left ? t('who has left the company.', 'الذي غادر الشركة.') : t('who is on leave.', 'وهو في إجازة.')}
                    {urgent > 0 && <span className="ms-1 font-medium text-destructive">{t(`${urgent} urgent.`, `${urgent} عاجلة.`)}</span>}
                  </span>
                  <span className="ms-auto flex items-center gap-2">
                    <Select onValueChange={(v) => moveAll(uid, cases, v)}>
                      <SelectTrigger size="sm" className="h-8 min-w-44" aria-label={t('Move these cases to…', 'انقل هذه الحالات إلى…')}>
                        <SelectValue placeholder={t('Move all to…', 'نقل الكل إلى…')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spread">{t('Spread across the available team', 'وزّع على الفريق المتاح')}</SelectItem>
                        {cxTeam.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </span>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-sm text-muted-foreground" data-testid="loop-summary">
          {(() => {
            const open = selected.filter((i) => !i.outcome && i.status !== 'done')
            const unassigned = open.filter((i) => !assignments[i.id]).length
            const today = new Date().toISOString().slice(0, 10)
            const late = open.filter((i) => (i.nextAttemptOn ?? i.dueOn ?? '9999') < today).length
            const asked = open.filter((i) => assignments[i.id]?.askedAgain).length
            return t(
              `${open.length} open · ${unassigned} not assigned · ${late} past their date · ${asked} asked to call again`,
              `${open.length} مفتوحة · ${unassigned} غير مُسندة · ${late} تجاوزت موعدها · ${asked} طُلب فيها اتصال آخر`,
            )
          })()}
        </p>

        <DataTable
          columns={columns}
          data={selected}
          isLoading={itemsLoading}
          getRowId={(i) => i.id}
          pageSize={10}
          emptyTitle={t("Nobody on this month's list.", 'لا أحد في قائمة هذا الشهر.')}
          // a phone: the person and the call on two lines, severity, due date and status as tags, the rest behind "Details"
          phone={{ title: 'person', meta: ['severity', 'assignee', 'due', 'outcome'], end: ['call'], detail: ['channel', 'firstScore', 'reason', 'resurvey', 'recovered'] }}
        />
      </SectionCard>

      <SectionCard
        term="Close the loop" title={t('AI interview campaigns', 'حملات المقابلات بالذكاء الاصطناعي')}
        description={t(
          `Humans call by default. Hand-off rules: ${rules.aiNoAnswers}x no-answer/hang-up → human; asks for a person or says anything critical → human the same day; declines → no retry. Critical detractors are never in a campaign.`,
          `الاتصال بشري افتراضياً. قواعد التسليم: عدم الرد ${timesAr(rules.aiNoAnswers)} ← بشري؛ طلب شخص أو قول أمر حرج ← بشري بنفس اليوم؛ الرفض ← دون إعادة محاولة. المنتقدون الحرجون لا يُدرجون في أي حملة أبداً.`,
        )}
        actions={
          canCreateCampaign && (
            <Button variant="outline" size="sm" onClick={() => setCreatingCampaign(true)}>
              <Plus aria-hidden />
              {t('Create campaign', 'إنشاء حملة')}
            </Button>
          )
        }
      >
        {campaignsLoading ? (
          <LoadingState rows={2} />
        ) : !campaigns?.length ? (
          <EmptyState title={t('No campaigns yet.', 'لا توجد حملات بعد.')} />
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {campaigns.map((c) => {
              const status = CAMPAIGN_STATUS[c.status] ?? { label: { en: c.status, ar: c.status }, tone: 'neutral' as const }
              return (
                <li key={c.id} className="well flex min-w-0 flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="t-ui-strong inline-flex items-center gap-2">
                      <Bot aria-hidden className="size-4 text-muted-foreground" />
                      {L(c.name)}
                    </span>
                    <StatusBadge tone={status.tone} dot>
                      {L(status.label)}
                    </StatusBadge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {L(c.segmentDescription)} · <span className="tabular">{c.memberIds.length}</span> {t('members', 'عضو')}
                  </span>
                  {(() => {
                    // KB §7: results come back as the same reason codes; people the
                    // hand-off rules sent back are listed as "handed to a human".
                    const members = (items ?? []).filter((i) => c.memberIds.includes(i.id))
                    const coded = members.filter((i) => i.reasonCode).length
                    const toHuman = members.filter((i) => i.outcome === 'callback_requested').length
                    return (
                      <span className="text-sm text-muted-foreground">
                        {t('Coded results', 'نتائج مرمّزة')}: <span className="tabular font-medium text-foreground">{coded}</span> ·{' '}
                        {t('Handed to a human', 'حُوّلوا إلى شخص')}: <span className="tabular font-medium text-foreground">{toHuman}</span>
                      </span>
                    )
                  })()}
                  {/* v42.1 (F33): nothing starts before the Internal Audit and Marketing Lead has cleared it */}
                  <CampaignGate sourceId={c.id} kind="ai" showStage={false} className="mt-1.5" />
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>

      <p className="text-sm text-muted-foreground">
        {t('Calling hours, attempts and the working week are configuration:', 'ساعات الاتصال والمحاولات وأسبوع العمل إعدادات:')}{' '}
        <Link to="/settings/rules" className="text-foreground underline underline-offset-4">
          {t('Settings → Rules as configuration', 'الإعدادات ← القواعد كإعدادات')}
        </Link>
      </p>

      {interviewing && (
        <InterviewDialog
          item={interviewing}
          who={personName(interviewing.personId)}
          onCancel={() => setInterviewing(null)}
          onSubmit={(v) => {
            recordInterview.mutate({ id: interviewing.id, ...v })
            setInterviewing(null)
            toast.success(t('Interview saved', 'تم حفظ المقابلة'))
          }}
        />
      )}

      {creatingCampaign && (
        <CampaignDialog
          eligibleItems={sorted.filter((i) => i.severity !== 'critical' && !i.outcome && i.status !== 'done')}
          noAnswers={rules.aiNoAnswers}
          onCancel={() => setCreatingCampaign(false)}
          onCreate={(v) => {
            createCampaign.mutate({
              name: { en: v.name, ar: v.name },
              segmentDescription: { en: v.segmentDescription, ar: v.segmentDescription },
              script: { en: v.scriptEn, ar: v.scriptAr },
              memberIds: v.memberIds,
            })
            setCreatingCampaign(false)
            toast.success(t('Campaign created', 'تم إنشاء الحملة'), { description: L(CAMPAIGN_AUDIT_COPY.gate.created) })
          }}
        />
      )}
    </div>
  )
}

function NumberField({ id, label, value, min, max, onChange }: { id: string; label: string; value: number; min: number; max?: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || min))}
        className="tabular h-9"
      />
    </div>
  )
}
