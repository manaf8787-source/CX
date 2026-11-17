import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Bot, ChevronDown, FileJson, ShieldCheck } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canViewAgentNames } from '@/auth/permissions'
import { AGENT_REGISTRY, ENVELOPE_FIELD_GROUPS, ROUTING_MATRIX, SUPERVISOR_CHECK_ORDER } from '@/data/agentRegistry'
import { useAgentActivity } from '@/services/queries'
import type { AgentActivityEntry, AgentProfile, CorrectiveActionKind } from '@/types'
import { AGENT_VERDICT_TONE } from '@/lib/status'
import { cn } from '@/lib/utils'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
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

function rateTone(pct: number) {
  return pct >= 90 ? 'success' : pct >= 75 ? 'warning' : 'danger'
}

/** APPLICATION_MODULES.md §E — "not a frontend module to build so much as a
 * contract the frontend must consume". This page is that contract made
 * legible: the envelope shape every agent shares, the ten agents + the one
 * supervisor who checks them (AI Agents Specification), the classification
 * routing matrix that decides who receives a corrective action, and a run
 * log derived from the same mock data every other page already reads. */
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
        cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
      },
      {
        id: 'subject',
        accessorFn: (e) => L(e.subjectSummary),
        header: t('What ran', 'ما الذي عمل'),
        cell: ({ getValue }) => <span className="block min-w-56 whitespace-normal">{getValue<string>()}</span>,
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
          <span className="whitespace-nowrap text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleString(lang === 'ar' ? 'ar' : 'en', { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        ),
      },
    ],
    [t, L, lang],
  )

  const th = 'px-3 text-xs font-semibold text-muted-foreground'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('Intelligent CX team', 'فريق تجربة العملاء الذكي')}
        description={t(
          'Ten single-task agents and one supervisor that do the work of the CX team inside the portal — nothing else.',
          'عشرة وكلاء بمهمة واحدة ومشرف واحد يؤدون عمل فريق تجربة العملاء داخل البوابة — لا شيء غير ذلك.',
        )}
      />

      <SectionCard
        title={
          <span className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-wide text-gold-text uppercase">{t('The shape', 'الشكل')}</span>
            {t('One output shape, for every agent', 'شكل مخرجات واحد لكل وكيل')}
          </span>
        }
        description={t(
          'Every agent writes the same eleven-field envelope. The "how the AI found this" panel on actions, patterns and AI Insights reads straight from it — nothing is rendered from a bespoke shape.',
          'يكتب كل وكيل نفس المغلف المكوَّن من أحد عشر حقلاً. تقرأ لوحة "كيف توصّل الذكاء الاصطناعي لهذا" في الإجراءات والأنماط ورؤى الذكاء الاصطناعي من هذا المغلف مباشرة — دون أي شكل مخصص.',
        )}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {ENVELOPE_FIELD_GROUPS.map((g) => (
            <div key={g.title.en} className="relative flex min-w-0 flex-col gap-1.5 overflow-hidden rounded-lg border bg-muted/40 p-4 before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-primary">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <FileJson aria-hidden className="size-4 text-primary" />
                {L(g.title)}
              </span>
              <span className="font-mono text-xs break-words text-muted-foreground" dir="ltr">
                {L(g.fields)}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>

      <section aria-labelledby="agents-heading" className="flex flex-col gap-3">
        <h2 id="agents-heading" className="text-lg font-semibold">
          {t('The ten agents', 'الوكلاء العشرة')}
        </h2>
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
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
        </div>
      </section>

      <SectionCard
        className="relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gold"
        title={
          <span className="flex items-center gap-2">
            <ShieldCheck aria-hidden className="size-5 text-gold-text" />
            {t('The CX Supervisor', 'المشرف الذكي')}
          </span>
        }
        description={t(
          'Checks every worker output before it is released: approve, return with a reason, or escalate. It never edits a worker’s output and never approves its own escalation.',
          'يراجع مخرجات كل وكيل قبل اعتمادها: الموافقة، أو الإعادة بسبب، أو التصعيد. لا يُعدّل مخرجات الوكيل أبداً ولا يعتمد تصعيده الخاص.',
        )}
        contentClassName="flex flex-col gap-4"
      >
        <StatusBadge tone="info" className="self-start">
          {t('Different model family, temperature 0', 'عائلة نموذج مختلفة، درجة حرارة 0')}
        </StatusBadge>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">{t('Order of checks', 'ترتيب الفحوصات')}</h3>
            <ol className="flex flex-col gap-2">
              {SUPERVISOR_CHECK_ORDER.map((c, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary tabular-nums">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{L(c)}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">{t('Approval rate per agent (sample)', 'معدل الاعتماد لكل وكيل (عينة)')}</h3>
            <ul className="flex flex-col gap-2.5">
              {AGENT_REGISTRY.filter((a) => a.key !== 'supervisor').map((a) => {
                const r = approvalRate.get(a.key)
                const pct = r && r.total > 0 ? Math.round((r.approved / r.total) * 100) : null
                const tone = pct === null ? null : rateTone(pct)
                return (
                  <li key={a.key} className="grid grid-cols-[minmax(0,9rem)_1fr_2.75rem] items-center gap-3 sm:grid-cols-[minmax(0,12rem)_1fr_2.75rem]">
                    <span className="truncate text-sm" title={L(a.name)}>
                      {L(a.name)}
                    </span>
                    {pct === null ? (
                      <span className="col-span-2 text-xs text-muted-foreground">{t('no run sampled', 'لا يوجد تشغيل في العينة')}</span>
                    ) : (
                      <>
                        <Progress
                          value={pct}
                          aria-label={L(a.name)}
                          className={cn(
                            'h-2',
                            tone === 'success' && '[&>[data-slot=progress-indicator]]:bg-success',
                            tone === 'warning' && '[&>[data-slot=progress-indicator]]:bg-warning',
                            tone === 'danger' && '[&>[data-slot=progress-indicator]]:bg-destructive',
                          )}
                        />
                        <span className="text-end text-sm font-medium tabular-nums">
                          <bdi dir="ltr">{pct}%</bdi>
                        </span>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
            <p className="text-xs text-muted-foreground">
              {t(
                'From this prototype’s own sample run log below — a real calibration sample is 50 outputs reviewed weekly.',
                'من سجل التشغيل التجريبي أدناه — العينة الفعلية للمعايرة هي 50 مخرجاً تُراجَع أسبوعياً.',
              )}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={t('Routing of corrective actions by classification', 'توجيه الإجراءات التصحيحية حسب التصنيف')}
        description={t(
          'Agent 5 tags every action with one classification, and the classification chooses the path — the matrix supplies the names, the path itself does not change per product.',
          'يضع الوكيل 5 تصنيفاً واحداً لكل إجراء، والتصنيف يحدد المسار — المصفوفة تزوّد الأسماء، أما المسار نفسه فلا يتغير حسب المنتج.',
        )}
      >
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className={th}>{t('Classification', 'التصنيف')}</TableHead>
                <TableHead className={th}>{t('Typical signal', 'إشارة نموذجية')}</TableHead>
                <TableHead className={th}>{t('Path', 'المسار')}</TableHead>
                <TableHead className={th}>{t('Receiver', 'المستلم')}</TableHead>
                <TableHead className={th}>{t('What comes back', 'ما يعود')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(Object.keys(ROUTING_MATRIX) as CorrectiveActionKind[]).map((kind) => {
                const row = ROUTING_MATRIX[kind]
                return (
                  <TableRow key={kind} className="align-top">
                    <TableCell className="px-3 py-3 text-sm font-semibold whitespace-nowrap">{L(KIND_LABEL[kind])}</TableCell>
                    <TableCell className="min-w-44 px-3 py-3 text-sm whitespace-normal text-muted-foreground">{L(row.typicalSignal)}</TableCell>
                    <TableCell className="min-w-44 px-3 py-3 text-sm whitespace-normal">{L(row.path)}</TableCell>
                    <TableCell className="min-w-36 px-3 py-3 text-sm whitespace-normal">{L(row.receiver)}</TableCell>
                    <TableCell className="min-w-44 px-3 py-3 text-sm whitespace-normal text-muted-foreground">{L(row.whatComesBack)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <SectionCard title={t('Recent activity', 'النشاط الأخير')}>
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
        <p className="text-sm text-muted-foreground">
          {t(
            'This page never names a human agent — only the AI agents themselves and the roles they escalate to.',
            'هذه الصفحة لا تذكر اسم أي موظف بشري أبداً — فقط وكلاء الذكاء الاصطناعي والأدوار التي يصعّدون إليها.',
          )}
        </p>
      )}
    </div>
  )
}

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
  const pct = rate && rate.total > 0 ? Math.round((rate.approved / rate.total) * 100) : null
  const notBuilt = !!agent.phaseNote

  return (
    <Collapsible
      open={expanded}
      onOpenChange={onToggle}
      className={cn(
        'relative flex min-w-0 flex-col gap-3 overflow-hidden rounded-xl border bg-card p-4 shadow-xs before:absolute before:inset-x-0 before:top-0 before:h-0.5',
        notBuilt ? 'bg-muted/40 before:bg-muted-foreground/40' : 'before:bg-primary',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-lg',
              notBuilt ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary',
            )}
          >
            {typeof agent.id === 'number' ? <span className="text-sm font-semibold tabular-nums">{agent.id}</span> : <Bot className="size-4" />}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-xs font-semibold tracking-wide text-gold-text uppercase">
              {typeof agent.id === 'number' ? t(`Agent ${agent.id}`, `الوكيل ${agent.id}`) : t('Supervisor', 'المشرف')}
            </span>
            <span className="text-base leading-snug font-semibold">{L(agent.name)}</span>
          </div>
        </div>
        {pct !== null && (
          <StatusBadge tone={rateTone(pct)}>
            <bdi dir="ltr">{pct}%</bdi>
          </StatusBadge>
        )}
      </div>

      <p className="text-sm">{L(agent.task)}</p>

      {notBuilt && <StatusBadge tone="warning" className="h-auto self-start py-1 whitespace-normal">{L(agent.phaseNote!)}</StatusBadge>}

      {latest && !notBuilt && (
        <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          {L(latest.subjectSummary)} — {new Date(latest.createdAt).toLocaleDateString(lang === 'ar' ? 'ar' : 'en')}
        </p>
      )}

      <CollapsibleTrigger className="-mx-2 -mb-1 mt-auto flex h-9 cursor-pointer items-center justify-between rounded-md px-2 text-sm font-semibold text-primary outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50">
        {t('Details', 'التفاصيل')}
        <ChevronDown aria-hidden className={cn('size-4 transition-transform duration-200 motion-reduce:transition-none', expanded && 'rotate-180')} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <dl className="flex flex-col gap-3 border-t pt-3 text-sm">
          <KeyValue label={t('Trigger', 'المحفّز')} value={L(agent.trigger)} />
          <KeyValue label={t('Runs on', 'يعمل وفق')} value={L(agent.runsOn)} />
          <KeyValue label={t('Escalates to', 'يصعّد إلى')} value={L(agent.escalatesTo)} />
          <KeyValue label={t('Must not', 'يُمنع من')} value={L(agent.mustNot)} danger />
        </dl>
      </CollapsibleContent>
    </Collapsible>
  )
}

function KeyValue({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className={cn('text-xs font-semibold tracking-wide uppercase', danger ? 'text-danger-text' : 'text-muted-foreground')}>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
