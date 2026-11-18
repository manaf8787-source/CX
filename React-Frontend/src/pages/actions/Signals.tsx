import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DeferredRender } from '@/components/common/DeferredRender'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Activity, ChevronDown, Layers, Megaphone, Plus, Settings2 } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useNow } from '@/hooks/useNow'
import { useRole } from '@/auth/RoleContext'
import { canActOnCorrectiveAction } from '@/auth/permissions'
import { useCorrectiveActions, useCreateActionFromPattern, usePatterns, useSignals, useSignalsAll } from '@/services/queries'
import { useFixDue, useInvestigationEvidence } from '@/services/queriesV40'
import { productOfPattern } from '@/utils/audit'
import { sortByThresholdCloseness } from '@/utils/patterns'
import { caId } from '@/utils/trace'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { CORRECTIVE_STATUS_LABEL, CORRECTIVE_STATUS_TONE } from '@/lib/status'
import { HowAiFoundThis } from './components/HowAiFoundThis'
import type { CorrectiveActionKind, Pattern } from '@/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { KpiTile } from '@/components/common/KpiTile'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { TraceId } from '@/components/common/TraceId'
import { WhatIfCard } from '@/components/signals/WhatIfCard'
import { RulesPointer } from '@/components/signals/RulesPointer'
import { SignalsTable } from './components/SignalsTable'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { PatternThresholdMeter } from './components/PatternThresholdMeter'
import { ScoresVsSignalsNotice } from './components/ScoresVsSignalsNotice'
import { signalCategoryLabel } from './components/labels'
import { envNameFromShort } from '@/data/environments'
import { useChartMotion } from '@/hooks/useChartMotion'

/** On a phone the pattern cards are the page's heaviest part; the rest wait behind "Show all". */
const PATTERNS_SHOWN_FIRST = 4

const CORRECTIVE_KINDS: CorrectiveActionKind[] = ['employee', 'service_behaviour', 'training_gap', 'product_app', 'process', 'environment', 'legal_privacy', 'marketing']

const KIND_LABEL: Record<CorrectiveActionKind, { en: string; ar: string }> = {
  employee: { en: 'Employee (management note)', ar: 'موظف (ملاحظة إدارية)' },
  service_behaviour: { en: 'Service & behaviour', ar: 'الخدمة والسلوك' },
  training_gap: { en: 'Training gap', ar: 'فجوة تدريبية' },
  product_app: { en: 'Product & app', ar: 'المنتج والتطبيق' },
  process: { en: 'Process', ar: 'العملية' },
  environment: { en: 'Environment', ar: 'البيئة' },
  legal_privacy: { en: 'Legal & privacy', ar: 'قانوني وخصوصية' },
  marketing: { en: 'Marketing', ar: 'تسويق' },
}


export default function Signals() {
  const chartMotion = useChartMotion()
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const now = useNow()
  const { data: signals, isLoading: signalsLoading } = useSignals()
  const { data: patterns, isLoading: patternsLoading } = usePatterns()
  const createAction = useCreateActionFromPattern()
  const [params] = useSearchParams()
  const [creatingFor, setCreatingFor] = useState<Pattern | null>(null)
  const [showAllPatterns, setShowAllPatterns] = useState(false)
  const [collapsedByUser, setCollapsedByUser] = useState(false)
  const orderedPatterns = useMemo(() => sortByThresholdCloseness(patterns ?? []), [patterns])
  // `?pt=<key>` (the Trace card, the signals table): the named pattern is scrolled to and highlighted, and the list opens when it sits past the first few.
  const targetPattern = params.get('pt')
  const targetIndex = targetPattern ? orderedPatterns.findIndex((p) => p.id === targetPattern || p.traceId === targetPattern) : -1
  const patternsOpen = showAllPatterns || (targetIndex >= PATTERNS_SHOWN_FIRST && !collapsedByUser)

  const volumeSeries = useMemo(() => {
    if (!signals) return []
    const byDay = new Map<string, number>()
    for (const s of signals) {
      const day = s.occurredAt.slice(0, 10)
      byDay.set(day, (byDay.get(day) ?? 0) + 1)
    }
    return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ day: day.slice(5), count }))
  }, [signals])

  const publicMentions = signals?.filter((s) => s.isPublic) ?? []
  const canCreate = canActOnCorrectiveAction(role.id, 'process')

  return (
    <div className="flex flex-col gap-4">
      <ScoresVsSignalsNotice register="signals" />

      <section aria-label={t('Signal totals', 'إجماليات الإشارات')} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiTile
          label={t('Signals (counted, not worked)', 'الإشارات (تُحصى ولا تُعالج فردياً)')}
          value={signals?.length}
          accent="var(--chart-1)"
          icon={<Activity />}
          loading={signalsLoading}
        />
        <KpiTile
          label={t('Patterns past threshold', 'أنماط تجاوزت الحد')}
          value={patterns?.length}
          accent="var(--warning)"
          icon={<Layers />}
          loading={patternsLoading}
        />
        <KpiTile
          label={t('Public mentions', 'الإشارات العامة')}
          value={signals ? publicMentions.length : undefined}
          sub={t('48-hour reply clock', 'ساعة رد 48 ساعة')}
          accent="var(--chart-4)"
          icon={<Megaphone />}
          loading={signalsLoading}
        />
      </section>

      <SectionCard
        title={t('Signal volume', 'حجم الإشارات')}
        term="Signal"
        description={t('Signals per day across live products.', 'الإشارات يومياً عبر المنتجات الفعالة.')}
        actions={
          <Button variant="ghost" size="sm" asChild className="text-primary">
            <Link to="/settings/rules">
              <Settings2 aria-hidden />
              {t('Edit thresholds', 'تعديل الحدود')}
            </Link>
          </Button>
        }
      >
        {signalsLoading ? (
          <LoadingState rows={2} />
        ) : (
          <div className="h-44" dir="ltr">
            <DeferredRender>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={lang === 'ar' ? [...volumeSeries].reverse() : volumeSeries}
                  margin={lang === 'ar' ? { top: 4, right: -20, bottom: 0, left: 4 } : { top: 4, right: 4, bottom: 0, left: -20 }}
                >
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} minTickGap={24} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                  <YAxis
                    allowDecimals={false}
                    orientation={lang === 'ar' ? 'right' : 'left'}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ stroke: 'var(--border)' }}
                    formatter={(v) => [v, t('Signals', 'الإشارات')]}
                    contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--popover-foreground)', fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="count" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.12} strokeWidth={2} {...chartMotion} />
                </AreaChart>
              </ResponsiveContainer>
            </DeferredRender>
          </div>
        )}
      </SectionCard>

      <div id="patterns" className="scroll-mt-24">
      <SectionCard
        title={t('Patterns', 'الأنماط')}
        description={t('Each pattern shows how far its signals are toward the rule that makes it actionable. Closest to or furthest past the threshold first.', 'يُظهر كل نمط مدى اقتراب إشاراته من القاعدة التي تجعله قابلاً للإجراء. الأقرب إلى الحد أو الأبعد بعده أولاً.')}
        term="Pattern"
      >
        {patternsLoading ? (
          <LoadingState rows={4} />
        ) : !patterns?.length ? (
          <EmptyState title={t('No patterns past threshold yet.', 'لا توجد أنماط تجاوزت الحد بعد.')} />
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {orderedPatterns.slice(0, PATTERNS_SHOWN_FIRST).map((p) => (
                <PatternCard key={p.id} pattern={p} canCreate={canCreate} onCreate={setCreatingFor} selected={orderedPatterns[targetIndex]?.id === p.id} />
              ))}
            </ul>
            {orderedPatterns.length > PATTERNS_SHOWN_FIRST && (
              <Collapsible
                open={patternsOpen}
                onOpenChange={(next) => {
                  setShowAllPatterns(next)
                  setCollapsedByUser(!next)
                }}
                className="mt-3"
              >
                <CollapsibleContent>
                  {/* Rendered only once opened: the rest of the cards are the page's heaviest part on a phone. */}
                  {patternsOpen && (
                    <ul className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                      {orderedPatterns.slice(PATTERNS_SHOWN_FIRST).map((p) => (
                        <PatternCard key={p.id} pattern={p} canCreate={canCreate} onCreate={setCreatingFor} selected={orderedPatterns[targetIndex]?.id === p.id} />
                      ))}
                    </ul>
                  )}
                </CollapsibleContent>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 w-full sm:w-auto">
                    <ChevronDown aria-hidden className={cn('transition-transform duration-200', patternsOpen && 'rotate-180')} />
                    {patternsOpen
                      ? t('Show fewer patterns', 'عرض أنماط أقل')
                      : t(`Show all patterns (${orderedPatterns.length})`, `عرض كل الأنماط (${orderedPatterns.length})`)}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            )}
          </>
        )}
      </SectionCard>
      </div>

      <SectionCard
        title={t('Signals', 'الإشارات')}
        term="Signal"
        description={t('Every signal with its id. Open one to see where it came from and where it leads. Counted, not worked one by one.', 'كل إشارة برقمها. افتح واحدة لترى من أين جاءت وإلى أين تقود. تُعدّ ولا تُعالج واحدة واحدة.')}
      >
        <SignalsTable signals={signals} patterns={patterns} isLoading={signalsLoading} />
      </SectionCard>

      <div>
        <SectionCard
          term="Public reputation index" title={t('Public mentions', 'الإشارات العامة')}
          description={t('Never tied to a person unless self-identified.', 'لا تُربط بشخص إلا إذا عرّف نفسه.')}
        >
          {signalsLoading ? (
            <LoadingState rows={3} />
          ) : publicMentions.length === 0 ? (
            <EmptyState title={t('No public mentions yet.', 'لا توجد إشارات عامة بعد.')} />
          ) : (
            <ul className="flex flex-col divide-y">
              {publicMentions.map((s) => {
                const dueMs = s.publicReplyDueAt ? new Date(s.publicReplyDueAt).getTime() - now : null
                const breached = dueMs !== null && dueMs <= 0
                return (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                    <span className="inline-flex items-center gap-2 text-sm">
                      <Megaphone aria-hidden className="size-4 text-muted-foreground" />
                      <TraceId kind="signal" id={s.id} />
                      <span>{L(signalCategoryLabel(s.category))}</span>
                      <span className="text-muted-foreground">· {L(envNameFromShort(s.environment))}</span>
                    </span>
                    {s.publicReplyDueAt ? (
                      <StatusBadge tone={breached ? 'danger' : 'warning'} dot>
                        {breached ? t('48h reply breached', 'تجاوز ساعة الرد 48') : t('48h reply clock running', 'ساعة الرد 48 جارية')}
                      </StatusBadge>
                    ) : (
                      <StatusBadge tone="neutral">{t('No reply clock', 'لا ساعة رد')}</StatusBadge>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      <section id="rules" aria-label={t('Rules for patterns', 'قواعد الأنماط')} className="flex scroll-mt-24 flex-col gap-4">
        <RulesPointer />
        <WhatIfCard />
      </section>

      {creatingFor && (
        <CreateActionDialog
          pattern={creatingFor}
          onCancel={() => setCreatingFor(null)}
          onCreate={(values) => {
            createAction.mutate({ pattern: creatingFor, ...values })
            setCreatingFor(null)
            toast.success(t('Corrective action proposed', 'تم اقتراح إجراء تصحيحي'))
          }}
        />
      )}
    </div>
  )
}

function PatternCard({ pattern: p, canCreate, onCreate, selected }: { pattern: Pattern; canCreate: boolean; onCreate: (p: Pattern) => void; selected: boolean }) {
  const { t, L } = useI18n()
  const { data: actions } = useCorrectiveActions()
  const { data: evidence } = useInvestigationEvidence()
  const ref = useRef<HTMLLIElement>(null)
  // KB §6: each pattern shows "the action it already has", and the same
  // "How the AI found this" panel as the action itself.
  const existing = actions?.find((a) => a.patternId === p.id)
  const found = evidence?.[p.id]

  // Opened from a Trace id (`?pt=`): scroll the card into view.
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView?.({ block: 'center' })
  }, [selected])

  return (
    <li ref={ref} id={`pattern-${p.traceId}`} data-pattern={p.traceId} data-selected={selected ? 'true' : undefined} className={cn('flex min-w-0 scroll-mt-24 flex-col gap-3 rounded-lg border bg-card p-4', selected && 'border-primary ring-2 ring-primary')}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold">
          <TraceId kind="pattern" id={p.traceId} plain />
          <span>
            {L(signalCategoryLabel(p.category))} <span className="font-normal text-muted-foreground">· {p.team}</span>
          </span>
        </h3>
      </div>
      {found && (
        <p className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm" data-testid="pattern-evidence">
          {t('Evidence from investigation', 'دليل من التحقيق')} · <bdi dir="ltr">{found.traceId}</bdi>: {L(found.result)}
        </p>
      )}
      <PatternThresholdMeter pattern={p} />
      <p className="text-sm">{L(p.aiSuggestion)}</p>
      <p className="text-xs text-muted-foreground">{L(p.recoveryFigure)}</p>
      {existing && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t('Action', 'الإجراء')}:</span>
          <TraceId kind="fix" id={existing.id} plain />
          <Link to={`/actions/corrective?fix=${caId(existing.id)}`} className="font-medium text-primary underline-offset-4 hover:underline">
            {L(existing.title)}
          </Link>
          <StatusBadge tone={CORRECTIVE_STATUS_TONE[existing.status]}>{L(CORRECTIVE_STATUS_LABEL[existing.status])}</StatusBadge>
        </div>
      )}
      <HowAiFoundThis actionId={existing?.id ?? ''} pattern={p} aiMade />
      {canCreate && p.hasMinimumSample && !existing && (
        <Button size="sm" className="h-9 self-start" onClick={() => onCreate(p)}>
          <Plus aria-hidden />
          {t('Create action', 'إنشاء إجراء')}
        </Button>
      )}
    </li>
  )
}

const createSchema = z.object({
  kind: z.enum(['employee', 'service_behaviour', 'training_gap', 'product_app', 'process', 'environment', 'legal_privacy', 'marketing']),
  owner: z.string().trim().min(2, 'owner'),
})
type CreateValues = z.infer<typeof createSchema>

function CreateActionDialog({ pattern, onCancel, onCreate }: { pattern: Pattern; onCancel: () => void; onCreate: (v: CreateValues & { dueDate: string }) => void }) {
  const { t, L, lang } = useI18n()
  const { data: signals } = useSignalsAll()
  const { register, handleSubmit, control, formState: { errors } } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { kind: 'process', owner: `${pattern.team.replace(' team', '')} environment manager` },
  })
  // The due date is not typed: approval sets it from the matrix "Resolve (h)" of the fix's product and kind, in working hours
  // (Agent 5's 14 days when that cell is empty). Here: what approval today would give, which is also the proposal's placeholder date.
  const kind = useWatch({ control, name: 'kind' })
  const product = productOfPattern(pattern, signals ?? [])
  const due = useFixDue({ kind, product, dueDate: '', dueSource: undefined })

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit((v) => onCreate({ ...v, dueDate: due?.dueAt ?? new Date().toISOString() }))} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{t('Create a corrective action', 'إنشاء إجراء تصحيحي')}</DialogTitle>
            <DialogDescription>
              {L(signalCategoryLabel(pattern.category))} — {pattern.team}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="ca-kind">{t('Kind', 'النوع')}</FieldLabel>
              <Controller
                control={control}
                name="kind"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="ca-kind" className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CORRECTIVE_KINDS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {L(KIND_LABEL[k])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field data-invalid={!!errors.owner}>
              <FieldLabel htmlFor="ca-owner">{t('Owner (title)', 'المالك (المسمى الوظيفي)')}</FieldLabel>
              <Input id="ca-owner" className="h-9" aria-invalid={!!errors.owner} {...register('owner')} />
              {errors.owner && <FieldError>{t('Owner title is required.', 'المسمى الوظيفي للمالك مطلوب.')}</FieldError>}
            </Field>
            <p className="text-sm text-muted-foreground" data-testid="create-due-note">
              {t('Due date: set when the fix is approved, from the escalation matrix (Resolve, in working hours).', 'تاريخ الاستحقاق: يُحدَّد عند اعتماد الحل من مصفوفة التصعيد (الحل، بساعات العمل).')}{' '}
              {due && (
                <>
                  {t('If approved today:', 'إن اعتُمد اليوم:')} <span className="text-foreground tabular-nums">{new Date(due.dueAt).toLocaleDateString(lang)}</span>
                  {due.source === 'fallback' ? ` (${t('the matrix cell is empty: 14-day fallback', 'خلية المصفوفة فارغة: البديل 14 يوماً')})` : ''}
                </>
              )}
            </p>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('Cancel', 'إلغاء')}
            </Button>
            <Button type="submit">{t('Propose action', 'اقتراح إجراء')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
