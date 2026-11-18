import { REASON_CODE_LABEL } from '@/utils/closeTheLoop'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { Bot, ClockAlert, PhoneMissed, Phone, Plus, TrendingUp, X } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canRecordCallAttempt } from '@/auth/permissions'
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
import { personLabel } from '@/utils/peopleExport'
import { envNameFromShort } from '@/data/environments'
import { CLOSE_LOOP_NEXT } from '@/data/steps'
import { useNow } from '@/hooks/useNow'
import { SEVERITY_TONE } from '@/lib/status'
import type { DetractorCallItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

  /** "No answer": attempt + 1, the next one the following working day; after the last, WhatsApp goes out and the row needs a human. */
  function noAnswer(item: DetractorCallItem) {
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
        <span className="inline-flex flex-col leading-tight">
          <span className="font-medium">{getValue<string>()}</span>
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
          <span className="inline-flex items-center gap-1.5">
            <Bot aria-hidden className="size-4 text-muted-foreground" />
            {t('AI campaign', 'حملة ذكاء اصطناعي')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Phone aria-hidden className="size-4 text-muted-foreground" />
            {t('Human', 'بشري')}
          </span>
        ),
    },
    {
      id: 'firstScore',
      accessorKey: 'firstScore',
      header: ({ column }) => <SortableHeader column={column}>{t('First score', 'النتيجة الأولى')}</SortableHeader>,
      meta: { align: 'end' },
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
        row.original.reasonCode ? L(REASON_CODE_LABEL[row.original.reasonCode]) : <span className="text-muted-foreground">—</span>,
    },
    {
      id: 'due',
      accessorFn: (i) => i.nextAttemptOn ?? i.dueOn ?? '',
      header: ({ column }) => <SortableHeader column={column}>{t('Due', 'المهلة')}</SortableHeader>,
      cell: ({ row }) => {
        const i = row.original
        const line = attemptLine(i, callRules)
        return (
          <span className="inline-flex flex-col leading-tight">
            {i.dueOn ? <bdi dir="ltr" className="tabular-nums">{fmtDay(i.dueOn)}</bdi> : <span className="text-muted-foreground">–</span>}
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
        if (i.status === 'done' || i.outcome) return i.outcome ? L(INTERVIEW_OUTCOME_LABEL[i.outcome]) : <span className="text-muted-foreground">—</span>
        if (i.status === 'needs_human')
          return (
            <span className="inline-flex flex-col gap-0.5">
              <StatusBadge tone="danger" dot>
                {L(CALL_COPY.needsHuman)}
              </StatusBadge>
              <span className="text-xs text-muted-foreground">
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
      id: 'call',
      header: () => <span className="sr-only">{t('Actions', 'الإجراءات')}</span>,
      enableSorting: false,
      meta: { align: 'end', cellClassName: 'min-w-44' },
      cell: ({ row }) => rowActions(row.original),
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
              <bdi dir="ltr" className="tabular-nums">
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
              className="h-9 w-16"
              value={resurveyDraft[i.id] ?? ''}
              onChange={(e) => setResurveyDraft((d) => ({ ...d, [i.id]: e.target.value }))}
            />
            <Button variant="outline" size="sm" className="h-9" onClick={() => saveResurvey(i)}>
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
          <span className="inline-flex flex-col gap-0.5">
            <StatusBadge tone={tone} dot>
              {label}
            </StatusBadge>
            <span className="text-xs text-muted-foreground">
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
  ]

  /** Call (the four-question interview) and "No answer" (attempt + 1; after the last attempt the row needs a human). */
  // A plain function (not a component): the table rebuilds its columns every render, and a component defined here would remount its buttons and lose focus.
  function rowActions(item: DetractorCallItem) {
    if (item.outcome || item.status === 'done') return null
    const canNoAnswer = canRecordAttempt && item.status !== 'needs_human'
    return (
      <span className="inline-flex items-center justify-end gap-1.5">
        {canNoAnswer && (
          <Button variant="outline" size="sm" className="h-9" onClick={() => noAnswer(item)} disabled={recordNoAnswer.isPending}>
            <PhoneMissed aria-hidden />
            {L(CALL_COPY.noAnswerButton)}
          </Button>
        )}
        <Button size="sm" className="h-9" onClick={() => setInterviewing(item)}>
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
    <div className="flex flex-col gap-6">
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
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <NumberField id="ctl-people" label={t('CX people', 'عدد موظفي تجربة العملاء')} value={people} min={1} onChange={setPeople} />
            <NumberField id="ctl-hours" label={t('Hours/day', 'ساعات/يوم')} value={hoursPerDay} min={1} max={12} onChange={setHoursPerDay} />
            <NumberField id="ctl-days" label={t('Working days', 'أيام العمل')} value={workingDays} min={1} max={31} onChange={setWorkingDays} />
            <div className="flex flex-col justify-end gap-1 rounded-lg bg-primary/5 px-3 py-2">
              <span className="text-xs text-muted-foreground">{t('= capacity (4 calls/hour)', '= السعة (4 مكالمات/ساعة)')}</span>
              <span className="text-2xl font-semibold text-primary tabular-nums" aria-live="polite">
                {capacity}
              </span>
            </div>
          </div>
          <Progress value={usedPct} aria-label={t('Share of detractors called', 'نسبة المنتقدين الذين سيُتصل بهم')} className="h-2 bg-muted" />
          <p className="text-sm text-muted-foreground">
            <bdi dir="ltr" className="font-medium text-foreground tabular-nums">
              {selected.length} / {sorted.length}
            </bdi>{' '}
            {t('detractors called this month', 'منتقد سيُتصل بهم هذا الشهر')}
            {excluded.length > 0 && (
              <>
                {' '}
                — <span className="tabular-nums">{excluded.length}</span>{' '}
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1 rounded-lg bg-success/10 px-3 py-2">
            <span className="text-xs text-muted-foreground">{t('Recovered', 'تعافى')}</span>
            <span className="text-2xl font-semibold tabular-nums">
              {rate.pct === null ? '–' : `${rate.pct}%`}
            </span>
            <span className="text-xs text-muted-foreground">
              <bdi dir="ltr" className="tabular-nums">
                {rate.recovered} / {rate.decided}
              </bdi>{' '}
              {t('whose 60 days are over', 'ممن انقضت أيامهم الستون')}
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-lg bg-muted/50 px-3 py-2">
            <span className="text-xs text-muted-foreground">{t('Not recovered', 'لم يتعافَ')}</span>
            <span className="text-2xl font-semibold tabular-nums">{rate.decided - rate.recovered}</span>
          </div>
          <div className="flex flex-col gap-1 rounded-lg bg-muted/50 px-3 py-2">
            <span className="text-xs text-muted-foreground">{t('Too early', 'مبكر')}</span>
            <span className="text-2xl font-semibold tabular-nums">{rate.tooEarly}</span>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={t("This month's call list", 'قائمة الاتصال لهذا الشهر')}
        actions={<span className="text-sm text-muted-foreground tabular-nums">{selected.length}</span>}
        contentClassName="flex flex-col gap-4"
      >
        {/* The calling rules (F27): hours, attempts, next attempt, WhatsApp, "needs a human". Configuration, from Settings → Rules. */}
        <div className="flex flex-col gap-1 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm" data-testid="calling-rules">
          <p className="flex items-start gap-2">
            <ClockAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>{L(CALL_COPY.hint(callRules))}</span>
          </p>
          <p className="ps-6 text-xs text-muted-foreground">
            {L(CALL_COPY.hoursNote)} · {L(CALL_COPY.aiHandOff(rules.aiNoAnswers))} · {L(CALL_COPY.dncrNever)}
          </p>
        </div>

        {focusId && (
          <div role="region" aria-label={t('From your inbox', 'من صندوقك')} className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm">
            <span className="font-semibold">{t('From your inbox', 'من صندوقك')}</span>
            {focusItem ? (
              <>
                <StatusBadge tone={SEVERITY_TONE[focusItem.severity]} dot>
                  {L(SEVERITY_LABEL[focusItem.severity])}
                </StatusBadge>
                <span className="font-medium">{personName(focusItem.personId)}</span>
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
            <Button variant="ghost" size="sm" className="h-8" onClick={() => setParams({}, { replace: true })} aria-label={t('Close this row', 'إغلاق هذا السطر')}>
              <X aria-hidden />
            </Button>
          </div>
        )}

        <DataTable
          columns={columns}
          data={selected}
          isLoading={itemsLoading}
          getRowId={(i) => i.id}
          pageSize={10}
          emptyTitle={t("Nobody on this month's list.", 'لا أحد في قائمة هذا الشهر.')}
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
            <Button variant="outline" size="sm" className="h-9" onClick={() => setCreatingCampaign(true)}>
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
                <li key={c.id} className="flex min-w-0 flex-col gap-1.5 rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold">
                      <Bot aria-hidden className="size-4 text-primary" />
                      {L(c.name)}
                    </span>
                    <StatusBadge tone={status.tone} dot>
                      {L(status.label)}
                    </StatusBadge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {L(c.segmentDescription)} · <span className="tabular-nums">{c.memberIds.length}</span> {t('members', 'عضو')}
                  </span>
                  {(() => {
                    // KB §7: results come back as the same reason codes; people the
                    // hand-off rules sent back are listed as "handed to a human".
                    const members = (items ?? []).filter((i) => c.memberIds.includes(i.id))
                    const coded = members.filter((i) => i.reasonCode).length
                    const toHuman = members.filter((i) => i.outcome === 'callback_requested').length
                    return (
                      <span className="text-sm">
                        {t('Coded results', 'نتائج مرمّزة')}: <span className="font-medium tabular-nums">{coded}</span> ·{' '}
                        {t('Handed to a human', 'حُوّلوا إلى شخص')}: <span className="font-medium tabular-nums">{toHuman}</span>
                      </span>
                    )
                  })()}
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>

      <p className="text-sm text-muted-foreground">
        {t('Calling hours, attempts and the working week are configuration:', 'ساعات الاتصال والمحاولات وأسبوع العمل إعدادات:')}{' '}
        <Link to="/settings/rules" className="text-primary underline underline-offset-4">
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
            toast.success(t('Campaign created', 'تم إنشاء الحملة'))
          }}
        />
      )}
    </div>
  )
}

function NumberField({ id, label, value, min, max, onChange }: { id: string; label: string; value: number; min: number; max?: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || min))}
        className="h-9 tabular-nums"
      />
    </div>
  )
}
