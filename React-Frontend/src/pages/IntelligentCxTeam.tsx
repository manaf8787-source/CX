import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Bot, ChevronDown, ChevronRight, FileJson, ShieldCheck, UserCheck } from 'lucide-react'
import {
  AGENT_JDS,
  AGENT_STAGE_LABEL,
  SUPERVISOR_CALIBRATION,
  SUPERVISOR_VERDICTS,
  SWITCH_ON_STAGES,
  WHAT_STAYS_WITH_PEOPLE,
  type AgentStage,
} from '@/data/v38Reference'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canViewAgentNames } from '@/auth/permissions'
import { AGENT_REGISTRY, ENVELOPE_FIELD_GROUPS, ROUTING_MATRIX, SUPERVISOR_CHECK_ORDER } from '@/data/agentRegistry'
import { useAgentActivity } from '@/services/queries'
import type { AgentActivityEntry, AgentProfile, CorrectiveActionKind } from '@/types'
import { AGENT_VERDICT_TONE } from '@/lib/status'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { AgentChip } from '@/components/common/AgentChip'
import { RankedBars } from '@/components/common/charts'
import { InlineNote } from '@/components/common/InlineNote'
import { DataTable, SortableHeader } from '@/components/common/DataTable'

const KIND_LABEL: Record<CorrectiveActionKind, { en: string; ar: string }> = {
  employee: { en: 'Employee', ar: 'موظف' },
  service_behaviour: { en: 'Service & behaviour', ar: 'الخدمة والسلوك' },
  training_gap: { en: 'Training gap', ar: 'فجوة تدريبية' },
  process: { en: 'Process', ar: 'العملية' },
  product_app: { en: 'Product & app', ar: 'المنتج والتطبيق' },
  environment: { en: 'Environment', ar: 'البيئة' },
  legal_privacy: { en: 'Legal & privacy', ar: 'قانوني وخصوصية' },
  marketing: { en: 'Marketing', ar: 'تسويق' },
}

const VERDICT_LABEL: Record<AgentActivityEntry['supervisorVerdict'], { en: string; ar: string }> = {
  approved: { en: 'Approved', ar: 'معتمد' },
  returned: { en: 'Returned', ar: 'مُعاد' },
  escalated: { en: 'Escalated', ar: 'مُصعَّد' },
}

/** A stage is a fact about the rollout, not a state that needs action, so none of them is a tinted tag: shadow and phase two are the plain
 * light tag, limited and live carry their status dot. */
const STAGE_TONE: Record<AgentStage, 'success' | 'info' | 'neutral'> = { shadow: 'neutral', limited: 'info', live: 'success', phase2: 'neutral' }

function rateTone(pct: number) {
  return pct >= 90 ? 'success' : pct >= 75 ? 'warning' : 'danger'
}

const RATE_DOT = { success: 'dot-success', warning: 'dot-warning', danger: 'dot-error' } as const

/** The two rows of the path: the main path on top, what feeds it (4, 8) or reads it (7, 9) below. */
const PATH_ROWS: (number | 'approve' | 'case' | 'receivers')[][] = [
  [1, 2, 3, 5, 'approve', 6],
  [4, 8, 7, 'case', 'receivers', 9],
]

/** APPLICATION_MODULES.md §E — "not a frontend module to build so much as a
 * contract the frontend must consume". This page is that contract made
 * legible: the envelope shape every agent shares, the ten agents + the one
 * supervisor who checks them (AI Agents Specification), the classification
 * routing matrix that decides who receives a corrective action, and a run
 * log derived from the same mock data every other page already reads.
 *
 * Meo restyle: comfortable density; the path every event walks is the ONE dark feature card; the agents are wells inside one card, the
 * envelope groups are wells, the approval rates are a bar list with printed values, the matrix and the run log are the skill's tables. */
export default function IntelligentCxTeam() {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { data: activity, isLoading } = useAgentActivity()
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const activityByAgent = useMemo(() => {
    const map = new Map<string, AgentActivityEntry[]>()
    for (const entry of activity ?? []) {
      const list = map.get(entry.agentKey) ?? []
      list.push(entry)
      map.set(entry.agentKey, list)
    }
    return map
  }, [activity])

  const approvalRate = useMemo(() => {
    const map = new Map<string, { approved: number; total: number }>()
    for (const entry of activity ?? []) {
      const row = map.get(entry.agentKey) ?? { approved: 0, total: 0 }
      row.total += 1
      if (entry.supervisorVerdict === 'approved') row.approved += 1
      map.set(entry.agentKey, row)
    }
    return map
  }, [activity])

  const columns = useMemo<ColumnDef<AgentActivityEntry>[]>(
    () => [
      {
        id: 'agent',
        accessorFn: (e) => {
          const agent = AGENT_REGISTRY.find((a) => a.key === e.agentKey)
          return agent ? L(agent.name) : e.agentKey
        },
        header: ({ column }) => <SortableHeader column={column}>{t('Agent', 'الوكيل')}</SortableHeader>,
        // v40 F33: the agent's chip names it in the active language ("Agent 9 · Reporting" / "الوكيل 9 · التقارير").
        cell: ({ row, getValue }) => {
          const agent = AGENT_REGISTRY.find((a) => a.key === row.original.agentKey)
          return typeof agent?.id === 'number' ? <AgentChip agent={agent.id} /> : <span className="font-medium text-foreground">{getValue<string>()}</span>
        },
      },
      {
        id: 'subject',
        accessorFn: (e) => L(e.subjectSummary),
        header: t('What ran', 'ما الذي عمل'),
        cell: ({ getValue }) => <span className="block min-w-56 whitespace-normal text-foreground">{getValue<string>()}</span>,
      },
      {
        accessorKey: 'supervisorVerdict',
        header: ({ column }) => <SortableHeader column={column}>{t('Supervisor verdict', 'قرار المشرف')}</SortableHeader>,
        cell: ({ row }) => (
          <StatusBadge tone={AGENT_VERDICT_TONE[row.original.supervisorVerdict]} dot>
            {L(VERDICT_LABEL[row.original.supervisorVerdict])}
          </StatusBadge>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <SortableHeader column={column}>{t('When', 'متى')}</SortableHeader>,
        cell: ({ row }) => (
          <span className="tabular whitespace-nowrap">
            {new Date(row.original.createdAt).toLocaleString(lang === 'ar' ? 'ar' : 'en', { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        ),
      },
    ],
    [t, L, lang],
  )

  return (
    <div data-density="comfortable" className="flex flex-col gap-8">
      <PageHeader
        term="Intelligent CX team"
        title={t('Intelligent CX team', 'فريق تجربة العملاء الذكي')}
        description={t(
          'Ten single-task agents and one supervisor that do the work of the CX team inside the portal — nothing else.',
          'عشرة وكلاء بمهمة واحدة ومشرف واحد يؤدون عمل فريق تجربة العملاء داخل البوابة — لا شيء غير ذلك.',
        )}
      />

      {/* The one dark feature card of the view. Inside it the text classes are remapped to the dark surface; the chips are white-7% tints. */}
      <Card variant="dark">
        <CardHeader>
          <CardTitle>{t('The path every event walks', 'المسار الذي يسلكه كل حدث')}</CardTitle>
          <CardDescription>
            {t(
              'Top row is the main path; the bottom row feeds it (4, 8) or reads it (7, 9). Agent 10 sits beside Agent 1, reading the same events. A person approves before anything leaves; the supervisor checks every arrow.',
              'الصف العلوي هو المسار الرئيسي؛ والصف السفلي يغذّيه (4، 8) أو يقرؤه (7، 9). الوكيل 10 بجانب الوكيل 1 يقرأ نفس الأحداث. شخص يعتمد قبل أن يخرج أي شيء؛ والمشرف يفحص كل سهم.',
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {PATH_ROWS.map((row, r) => (
            <ol key={r} className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {row.map((step, k) => {
                const agent = typeof step === 'number' ? AGENT_REGISTRY.find((a) => a.id === step) : undefined
                const special: Record<string, { title: string; body: string; dot?: string }> = {
                  approve: {
                    title: t('Approve', 'اعتماد'),
                    body: t('Direct manager · 5 working days · always a person', 'المدير المباشر · 5 أيام عمل · شخص دائماً'),
                  },
                  case: {
                    title: t('Case', 'حالة'),
                    body: t('Only a critical shopper finding or a legal and privacy event', 'فقط نتيجة تسوق حرجة أو حدث قانوني وخصوصية'),
                    dot: 'dot-warning',
                  },
                  receivers: {
                    title: t('Receivers', 'المستلمون'),
                    body: t(
                      'Managers, L&D, Marketing, IT, HR, Legal; a status comes back',
                      'المدراء، التعلم والتطوير، التسويق، تقنية المعلومات، الموارد البشرية، القانونية؛ تعود الحالة',
                    ),
                    dot: 'dot-success',
                  },
                }
                const box: { title: string; body: string; dot?: string } = agent
                  ? { title: t(`Agent ${agent.id}`, `الوكيل ${agent.id}`), body: L(agent.name) }
                  : special[step as string]
                // The approval is the one step that is always a person: the lit chip (the card colour on the dark surface, so it is right in both themes).
                const lit = step === 'approve'
                return (
                  <li
                    key={String(step)}
                    className={cn(
                      'relative flex min-h-20 min-w-0 flex-col gap-1 rounded-well px-3.5 py-3',
                      lit ? 'bg-card text-primary' : 'bg-(--on-dark-tint)',
                    )}
                  >
                    <span className={cn('flex items-center gap-1.5 text-xs font-medium', lit ? 'text-primary' : 'text-muted-foreground')}>
                      {box.dot && <span aria-hidden className={cn('dot', box.dot)} />}
                      {box.title}
                    </span>
                    <span className={cn('text-sm leading-snug', lit ? 'text-primary' : 'text-foreground')}>{box.body}</span>
                    {k < row.length - 1 && (
                      <ChevronRight
                        aria-hidden
                        className="absolute end-[-13px] top-1/2 z-10 hidden size-3.5 -translate-y-1/2 text-muted-foreground xl:block rtl:rotate-180"
                      />
                    )}
                  </li>
                )
              })}
            </ol>
          ))}
          <div className="mt-1 grid grid-cols-1 gap-3 md:grid-cols-2">
            <p className="flex items-start gap-2.5 rounded-well bg-(--on-dark-tint) px-4 py-3 text-sm">
              <span aria-hidden className="dot mt-1.5" />
              <span>
                <span className="font-medium">{t('Agent 10 · beside Agent 1, reading the same events', 'الوكيل 10 · بجانب الوكيل 1، يقرأ نفس الأحداث')}</span>
                {' — '}
                {L(AGENT_REGISTRY.find((a) => a.id === 10)?.name ?? { en: '', ar: '' })}
              </span>
            </p>
            <p className="flex items-start gap-2.5 rounded-well bg-(--on-dark-tint) px-4 py-3 text-sm">
              <span aria-hidden className="dot mt-1.5" />
              <span>
                <span className="font-medium">{t('CX Supervisor', 'المشرف الذكي')}</span>{' '}
                {t('checks every output before it moves to the next box.', 'يفحص كل مخرج قبل أن ينتقل إلى الصندوق التالي.')}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      <SectionCard
        title={
          <span className="flex flex-col gap-1.5">
            <span className="label-style">{t('The shape', 'الشكل')}</span>
            {t('One output shape, for every agent', 'شكل مخرجات واحد لكل وكيل')}
          </span>
        }
        description={t(
          'Every agent writes the same eleven-field envelope. The "how the AI found this" panel on actions, patterns and AI Insights reads straight from it — nothing is rendered from a bespoke shape.',
          'يكتب كل وكيل نفس المغلف المكوَّن من أحد عشر حقلاً. تقرأ لوحة "كيف توصّل الذكاء الاصطناعي لهذا" في الإجراءات والأنماط ورؤى الذكاء الاصطناعي من هذا المغلف مباشرة — دون أي شكل مخصص.',
        )}
        contentClassName="grid grid-cols-1 gap-3 md:grid-cols-3"
      >
        {ENVELOPE_FIELD_GROUPS.map((g) => (
          <div key={g.title.en} className="well flex min-w-0 flex-col gap-2.5">
            <span className="t-small-strong flex items-center gap-2">
              <FileJson aria-hidden className="size-4 text-muted-foreground" />
              {L(g.title)}
            </span>
            {/* real field names (code): the one place the system mono stack is right */}
            <span className="font-mono text-xs break-words text-muted-foreground" dir="ltr">
              {L(g.fields)}
            </span>
          </div>
        ))}
      </SectionCard>

      <section aria-labelledby="agents-heading">
        <Card>
          <CardHeader>
            <h2 id="agents-heading" className="t-card-title">
              {t('The ten agents', 'الوكلاء العشرة')}
            </h2>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {AGENT_REGISTRY.map((agent) => (
              <AgentCard
                key={agent.key}
                agent={agent}
                recent={activityByAgent.get(agent.key) ?? []}
                rate={approvalRate.get(agent.key)}
                expanded={expandedKey === agent.key}
                onToggle={(open) => setExpandedKey(open ? agent.key : null)}
              />
            ))}
          </CardContent>
        </Card>
      </section>

      <SectionCard
        title={
          <span className="flex items-center gap-2.5">
            <span aria-hidden className="material-light inline-grid size-[30px] place-items-center rounded-full [&_svg]:size-4">
              <ShieldCheck />
            </span>
            {t('The CX Supervisor', 'المشرف الذكي')}
          </span>
        }
        description={t(
          'Checks every worker output before it is released: approve, return with a reason, or escalate. It never edits a worker’s output and never approves its own escalation.',
          'يراجع مخرجات كل وكيل قبل اعتمادها: الموافقة، أو الإعادة بسبب، أو التصعيد. لا يُعدّل مخرجات الوكيل أبداً ولا يعتمد تصعيده الخاص.',
        )}
        contentClassName="flex flex-col gap-6"
      >
        <StatusBadge tone="info" className="self-start">
          {t('Different model family, temperature 0', 'عائلة نموذج مختلفة، درجة حرارة 0')}
        </StatusBadge>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <h3 className="t-ui-strong">{t('Order of checks', 'ترتيب الفحوصات')}</h3>
            <ol className="flex flex-col">
              {SUPERVISOR_CHECK_ORDER.map((c, i) => (
                <li key={i} className="row-divider flex items-start gap-3 py-3 text-sm first:pt-0 last:pb-0">
                  <span aria-hidden className="material-light t-badge tabular inline-grid size-6 shrink-0 place-items-center rounded-full">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-muted-foreground">{L(c)}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col gap-4">
            <h3 className="t-ui-strong">{t('Approved first time, per agent (sample)', 'المعتمد من أول مرة لكل وكيل (عينة)')}</h3>
            <RankedBars
              layout="stacked"
              max={100}
              label={t('Approved first time, per agent (sample)', 'المعتمد من أول مرة لكل وكيل (عينة)')}
              items={AGENT_REGISTRY.filter((a) => a.key !== 'supervisor').map((a) => {
                const r = approvalRate.get(a.key)
                const jdPct = AGENT_JDS.find((j) => j.id === a.id)?.approvalPct
                const pct = jdPct !== undefined ? jdPct : r && r.total > 0 ? Math.round((r.approved / r.total) * 100) : null
                const tone = pct === null ? null : rateTone(pct)
                return {
                  key: a.key,
                  label: L(a.name),
                  value: pct ?? 0,
                  // Under 90% is the row to look at: the dark material; the rest are the grey comparison fill. The value is always printed.
                  hero: tone !== null && tone !== 'success',
                  display:
                    pct === null ? (
                      <span className="text-xs text-muted-foreground">{t('no run sampled', 'لا يوجد تشغيل في العينة')}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        {tone && <span aria-hidden className={cn('dot', RATE_DOT[tone])} />}
                        <bdi dir="ltr">{pct}%</bdi>
                      </span>
                    ),
                }
              })}
            />
            <p className="t-body-s">
              {t(
                'Share of each agent’s outputs approved first time (sample figures). Every week 50 passed outputs are read by eye.',
                'نسبة مخرجات كل وكيل المعتمدة من أول مرة (أرقام تجريبية). كل أسبوع تُقرأ 50 مخرجاً معتمداً بالعين.',
              )}
            </p>
          </div>
        </div>
        <dl className="well grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <KeyValue plain label={t('Verdicts', 'الأحكام')} value={L(SUPERVISOR_VERDICTS)} />
          <KeyValue plain label={t('Calibration', 'المعايرة')} value={L(SUPERVISOR_CALIBRATION)} />
        </dl>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard
          well
          title={
            <span className="flex items-center gap-2.5">
              <span aria-hidden className="material-light inline-grid size-[30px] place-items-center rounded-full [&_svg]:size-4">
                <UserCheck />
              </span>
              {t('What stays with people', 'ما يبقى مع الناس')}
            </span>
          }
        >
          <p className="text-sm text-muted-foreground">{L(WHAT_STAYS_WITH_PEOPLE)}</p>
        </SectionCard>
        <SectionCard title={t('How it is switched on', 'كيف يُفعَّل')}>
          <ol className="flex flex-col">
            {SWITCH_ON_STAGES.map((st, i) => (
              <li key={st.stage.en} className="row-divider flex gap-3 py-3.5 text-sm first:pt-0 last:pb-0">
                <span aria-hidden className="material-light t-badge tabular inline-grid size-6 shrink-0 place-items-center rounded-full">
                  {i + 1}
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="t-ui-strong">{L(st.stage)}</span>
                  <span className="text-muted-foreground">{L(st.what)}</span>
                  <span className="t-body-s">
                    {t('Exit', 'الخروج')}: {L(st.exit)}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </SectionCard>
      </div>

      <SectionCard
        title={t('Routing of corrective actions by classification', 'توجيه الإجراءات التصحيحية حسب التصنيف')}
        description={t(
          'Agent 5 tags every action with one classification, and the classification chooses the path — the matrix supplies the names, the path itself does not change per product.',
          'يضع الوكيل 5 تصنيفاً واحداً لكل إجراء، والتصنيف يحدد المسار — المصفوفة تزوّد الأسماء، أما المسار نفسه فلا يتغير حسب المنتج.',
        )}
      >
        <Table density="comfortable">
          <TableHeader>
            <TableRow className="row-divider-none h-auto">
              <TableHead>{t('Classification', 'التصنيف')}</TableHead>
              <TableHead>{t('Typical signal', 'إشارة نموذجية')}</TableHead>
              <TableHead>{t('Path', 'المسار')}</TableHead>
              <TableHead>{t('Receiver', 'المستلم')}</TableHead>
              <TableHead>{t('What comes back', 'ما يعود')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(Object.keys(ROUTING_MATRIX) as CorrectiveActionKind[]).map((kind) => {
              const row = ROUTING_MATRIX[kind]
              return (
                <TableRow key={kind} className="align-top">
                  <TableCell className="py-3.5 font-medium whitespace-nowrap text-foreground">{L(KIND_LABEL[kind])}</TableCell>
                  <TableCell className="min-w-44 py-3.5 whitespace-normal">{L(row.typicalSignal)}</TableCell>
                  <TableCell className="min-w-44 py-3.5 whitespace-normal text-foreground">{L(row.path)}</TableCell>
                  <TableCell className="min-w-36 py-3.5 whitespace-normal text-foreground">{L(row.receiver)}</TableCell>
                  <TableCell className="min-w-44 py-3.5 whitespace-normal">{L(row.whatComesBack)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </SectionCard>

      {/* The run log is a table: dense rows. */}
      <SectionCard title={t('Recent activity', 'النشاط الأخير')} density="dense">
        <DataTable
          columns={columns}
          data={activity}
          isLoading={isLoading}
          getRowId={(e) => e.id}
          initialSorting={[{ id: 'createdAt', desc: true }]}
          pageSize={8}
          emptyTitle={t('No runs sampled yet.', 'لا يوجد تشغيل في العينة بعد.')}
        />
      </SectionCard>

      {!canViewAgentNames(role.id) && (
        <InlineNote tone="neutral">
          {t(
            'This page never names a human agent — only the AI agents themselves and the roles they escalate to.',
            'هذه الصفحة لا تذكر اسم أي موظف بشري أبداً — فقط وكلاء الذكاء الاصطناعي والأدوار التي يصعّدون إليها.',
          )}
        </InlineNote>
      )}
    </div>
  )
}

/** One agent as a well inside the agents card: number tile, name, stage and rate tags, the task, the latest run, and the job description
 * behind a light pill trigger. The well is the Collapsible root (`data-slot="collapsible"`: e2e finds the card by it). */
function AgentCard({
  agent,
  recent,
  rate,
  expanded,
  onToggle,
}: {
  agent: AgentProfile
  recent: AgentActivityEntry[]
  rate?: { approved: number; total: number }
  expanded: boolean
  onToggle: (open: boolean) => void
}) {
  const { t, L, lang } = useI18n()
  const latest = recent[0]
  const notBuilt = !!agent.phaseNote
  const jd = AGENT_JDS.find((j) => j.id === agent.id)
  // KB §11 roster: the pass rate at the supervisor (prototype figure); the run log is only a sample.
  const pct = jd ? jd.approvalPct : rate && rate.total > 0 ? Math.round((rate.approved / rate.total) * 100) : null

  return (
    <div data-slot="collapsible" className="well flex min-w-0 flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span aria-hidden className="material-light t-small-strong tabular inline-grid size-8 shrink-0 place-items-center rounded-full">
            {typeof agent.id === 'number' ? agent.id : <Bot className="size-4" />}
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="label-style">{typeof agent.id === 'number' ? t(`Agent ${agent.id}`, `الوكيل ${agent.id}`) : t('Supervisor', 'المشرف')}</span>
            <span className="t-ui-strong">{L(agent.name)}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {jd && <StatusBadge tone={STAGE_TONE[jd.stage]}>{L(AGENT_STAGE_LABEL[jd.stage])}</StatusBadge>}
          {pct !== null && (
            <StatusBadge tone={rateTone(pct)}>
              <bdi dir="ltr">{pct}%</bdi>
            </StatusBadge>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{L(agent.task)}</p>

      {notBuilt && (
        <p className="flex items-start gap-2.5 text-sm text-foreground">
          <span aria-hidden className="dot dot-warning mt-1.5" />
          {L(agent.phaseNote!)}
        </p>
      )}

      {latest && !notBuilt && (
        <p className="text-xs text-muted-foreground">
          {L(latest.subjectSummary)} — {new Date(latest.createdAt).toLocaleDateString(lang === 'ar' ? 'ar' : 'en')}
        </p>
      )}

      {/* 26 Nov (owner): the job description opens in a pop-up */}
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => onToggle(true)}
        className="material-light t-small-strong mt-auto inline-flex h-8 w-fit cursor-pointer items-center gap-2 rounded-full ps-3.5 pe-3 pt-px outline-hidden transition-opacity hover:opacity-80"
      >
        {t('Job description', 'الوصف الوظيفي')}
        <ChevronDown aria-hidden className="size-3.5 -rotate-90 rtl:rotate-90" />
      </button>
      <Dialog open={expanded} onOpenChange={onToggle}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{L(agent.name)}</DialogTitle>
            <DialogDescription>{L(agent.task)}</DialogDescription>
          </DialogHeader>
          <dl className="flex flex-col gap-3 text-sm">
            <KeyValue label={t('Trigger', 'المحفّز')} value={L(agent.trigger)} />
            <KeyValue label={t('Runs on', 'يعمل وفق')} value={L(agent.runsOn)} />
            {jd && (
              <>
                <KeyValue label={t('Inputs', 'المدخلات')} value={L(jd.inputs)} />
                <KeyValue label={t('Rules in code (read from Settings, never invented)', 'القواعد بالكود (تُقرأ من الإعدادات ولا تُخترع)')} value={L(jd.rules)} />
                <KeyValue label={t('Model step', 'خطوة النموذج')} value={L(jd.model)} />
                <KeyValue label={t('Output', 'المخرج')} value={L(jd.output)} />
                <KeyValue label={t('Supervisor checks', 'فحوصات المشرف')} value={L(jd.supervisorChecks)} />
                {jd.approvalPct !== null && <KeyValue label={t('Approved first time (sample)', 'يُعتمد من أول مرة (عينة)')} value={`${jd.approvalPct}%`} />}
                {!!jd.wrongThisWeek && (
                  <KeyValue
                    label={t('Lowered by the weekly sample', 'خُفّضت بسبب العينة الأسبوعية')}
                    value={t(
                      `${jd.wrongThisWeek} wrong this week, each now a supervisor test (${jd.supervisorTests ?? jd.wrongThisWeek}); the rate was ${jd.baseApprovalPct}% before`,
                      `${jd.wrongThisWeek} خطأ هذا الأسبوع، كل واحد صار اختباراً للسوبرفايزر (${jd.supervisorTests ?? jd.wrongThisWeek})؛ كانت النسبة ${jd.baseApprovalPct}% قبل ذلك`,
                    )}
                  />
                )}
              </>
            )}
            <KeyValue label={t('Escalates to', 'يصعّد إلى')} value={L(agent.escalatesTo)} />
            {jd && <KeyValue label={t('Shows on the portal as', 'يظهر على البوابة في')} value={L(jd.showsOn)} />}
            <KeyValue label={t('Must not', 'يُمنع من')} value={L(agent.mustNot)} danger />
          </dl>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** A label above its value, divided from the next by the row divider (`plain` for a grid). `danger` marks the one item that is a prohibition with a 6px error dot (colour is a dot, never the text). */
function KeyValue({ label, value, danger, plain }: { label: string; value: string; danger?: boolean; plain?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-1', !plain && 'row-divider pb-3 last:pb-0')}>
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {danger && <span aria-hidden className="dot dot-error" />}
        {label}
      </dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  )
}
