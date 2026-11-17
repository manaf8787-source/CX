import { REASON_CODE_LABEL } from '@/utils/closeTheLoop'
import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { Bot, Phone, Plus, TrendingUp } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import {
  useAiCampaigns,
  useCreateAiCampaign,
  useDetractorCallItems,
  usePersons,
  useRecordInterview,
  useRecordResurvey,
} from '@/services/queries'
import {
  CLOSE_LOOP_DEFAULTS,
  INTERVIEW_OUTCOME_LABEL,
  SEVERITY_ORDER,
  computeMonthlyCapacity,
  isRecovered,
  sampleToCapacity,
} from '@/utils/closeTheLoop'
import { SEVERITY_TONE } from '@/lib/status'
import type { DetractorCallItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
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

/** FR-5.1–5.6 — the monthly detractor call list with real capacity math,
 * the four-question interview, re-survey/recovery delta, and AI interview
 * campaigns with the critical-exclusion hard rule. */
export default function CloseTheLoop() {
  const { t, L } = useI18n()
  const { role } = useRole()
  const { data: items, isLoading: itemsLoading } = useDetractorCallItems()
  const { data: persons } = usePersons()
  const { data: campaigns, isLoading: campaignsLoading } = useAiCampaigns()
  const recordInterview = useRecordInterview()
  const recordResurvey = useRecordResurvey()
  const createCampaign = useCreateAiCampaign()

  const [people, setPeople] = useState(CLOSE_LOOP_DEFAULTS.people)
  const [hoursPerDay, setHoursPerDay] = useState(CLOSE_LOOP_DEFAULTS.hoursPerDay)
  const [workingDays, setWorkingDays] = useState(CLOSE_LOOP_DEFAULTS.workingDaysPerMonth)
  const [interviewing, setInterviewing] = useState<DetractorCallItem | null>(null)
  const [resurveyDraft, setResurveyDraft] = useState<Record<string, string>>({})
  const [creatingCampaign, setCreatingCampaign] = useState(false)

  const capacity = computeMonthlyCapacity(people, hoursPerDay, workingDays)
  const sorted = useMemo(() => [...(items ?? [])].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]), [items])
  const { selected, excluded } = useMemo(() => sampleToCapacity(sorted, capacity), [sorted, capacity])
  const usedPct = sorted.length ? Math.min(100, Math.round((selected.length / sorted.length) * 100)) : 0
  const canCreateCampaign = role.id === 'cxmgr' || role.id === 'cxteam'

  function personName(id: string) {
    return persons?.find((p) => p.id === id)?.name ?? id
  }

  function saveResurvey(id: string) {
    const raw = resurveyDraft[id]
    const v = Number(raw)
    if (raw === undefined || raw === '' || !Number.isFinite(v) || v < 0 || v > 10) {
      toast.error(t('Enter a score from 0 to 10.', 'أدخل درجة من 0 إلى 10.'))
      return
    }
    recordResurvey.mutate({ id, secondScore: v })
    toast.success(t('Re-survey saved', 'تم حفظ إعادة الاستبيان'))
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
      cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
    },
    { id: 'environment', accessorKey: 'environment', header: t('Environment', 'البيئة') },
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
    },
    {
      id: 'reason',
      accessorFn: (i) => (i.reasonCode ? L(REASON_CODE_LABEL[i.reasonCode]) : ''),
      header: t('Reason', 'السبب'),
      cell: ({ row }) =>
        row.original.reasonCode ? L(REASON_CODE_LABEL[row.original.reasonCode]) : <span className="text-muted-foreground">—</span>,
    },
    {
      id: 'outcome',
      accessorFn: (i) => (i.outcome ? L(INTERVIEW_OUTCOME_LABEL[i.outcome]) : ''),
      header: t('Outcome', 'النتيجة'),
      cell: ({ row }) =>
        row.original.outcome ? (
          L(INTERVIEW_OUTCOME_LABEL[row.original.outcome])
        ) : (
          <span className="text-muted-foreground">{t('Not called yet', 'لم يُتصل به بعد')}</span>
        ),
    },
    {
      id: 'recovery',
      header: t('Re-survey / recovery', 'إعادة الاستبيان / التعافي'),
      enableSorting: false,
      cell: ({ row }) => {
        const i = row.original
        if (i.secondScore !== undefined) {
          const recovered = isRecovered(i)
          return (
            <StatusBadge tone={recovered ? 'success' : 'neutral'} icon={recovered ? <TrendingUp aria-hidden /> : undefined}>
              <bdi dir="ltr" className="tabular-nums">
                {i.firstScore} → {i.secondScore}
              </bdi>
              {recovered && ` · ${t('Recovered', 'تعافى')}`}
            </StatusBadge>
          )
        }
        if (i.outcome === 'declined') return <span className="text-sm text-muted-foreground">{t('Declined — no retry', 'رفض — دون إعادة محاولة')}</span>
        if (!i.outcome) return <span className="text-muted-foreground">—</span>
        return (
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={10}
              placeholder="0–10"
              aria-label={t('Second score (0 to 10)', 'النتيجة الثانية (0 إلى 10)')}
              className="h-9 w-20"
              value={resurveyDraft[i.id] ?? ''}
              onChange={(e) => setResurveyDraft((d) => ({ ...d, [i.id]: e.target.value }))}
            />
            <Button variant="outline" size="sm" className="h-9" onClick={() => saveResurvey(i.id)}>
              {t('Save', 'حفظ')}
            </Button>
          </div>
        )
      },
    },
    {
      id: 'call',
      header: () => <span className="sr-only">{t('Call', 'اتصال')}</span>,
      enableSorting: false,
      meta: { align: 'end' },
      cell: ({ row }) =>
        !row.original.outcome && (
          <Button size="sm" className="h-9" onClick={() => setInterviewing(row.original)}>
            <Phone aria-hidden />
            {t('Call', 'اتصال')}
          </Button>
        ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('Close the loop', 'إغلاق الحلقة')}
        description={t('Every detractor gets a human call, a reason code and a re-survey. Critical cases first.', 'كل منتقد يحصل على مكالمة بشرية ورمز سبب وإعادة استبيان. الحالات الحرجة أولاً.')}
      />

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
        title={t("This month's call list", 'قائمة الاتصال لهذا الشهر')}
        actions={<span className="text-sm text-muted-foreground tabular-nums">{selected.length}</span>}
      >
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
        title={t('AI interview campaigns', 'حملات المقابلات بالذكاء الاصطناعي')}
        description={t(
          'Humans call by default. Hand-off rules: 2x no-answer/hang-up → human; asks for a person or says anything critical → human the same day; declines → no retry. Critical detractors are never in a campaign.',
          'الاتصال بشري افتراضياً. قواعد التسليم: عدم الرد مرتين → بشري؛ طلب شخص أو قول أمر حرج → بشري بنفس اليوم؛ الرفض → دون إعادة محاولة. المنتقدون الحرجون لا يُدرجون في أي حملة أبداً.',
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

      {interviewing && (
        <InterviewDialog
          item={interviewing}
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
          eligibleItems={(items ?? []).filter((i) => i.severity !== 'critical' && !i.outcome)}
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
