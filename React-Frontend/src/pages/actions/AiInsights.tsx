import { useState } from 'react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { Link, useNavigate } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle2, Lightbulb, Plus, Send } from 'lucide-react'
import { DeferredRender } from '@/components/common/DeferredRender'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { isTopManagementTitle } from '@/auth/permissions'
import { useAiInsights, useCorrectiveActions } from '@/services/queries'
import { useProposeFromInsight } from '@/services/referenceQueries'
import {
  DEFAULT_OWNER_BY_KIND,
  INSIGHT_CATEGORIES,
  SMALL_SAMPLE,
  suggestionPercent,
  suggestionSentence,
  type InsightCategory,
  type InsightSuggestion,
} from '@/data/insightSuggestions'
import { ACTION_KIND } from '@/lib/actionKinds'
import type { AgentOutputEnvelope, AiInsightPayload, CorrectiveActionKind } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { TermHelp } from '@/components/common/TermHelp'
import { PercentagesExplainer } from './components/PercentagesExplainer'
import { ScoresVsSignalsNotice } from './components/ScoresVsSignalsNotice'
import { useChartMotion } from '@/hooks/useChartMotion'
import { useNow } from '@/hooks/useNow'

const MINIMUM_SAMPLE = 10

const SERIES_LABEL: Record<string, { en: string; ar: string }> = {
  'Low score': { en: 'Low score', ar: 'تقييم منخفض' },
  'Recovered after action': { en: 'Recovered after action', ar: 'تعافى بعد الإجراء' },
}

const KINDS = Object.keys(ACTION_KIND) as CorrectiveActionKind[]

interface Proposing {
  envelope: AgentOutputEnvelope<AiInsightPayload>
  suggestion: InsightSuggestion
}

export default function AiInsights() {
  const { t } = useI18n()
  const { role } = useRole()
  const { data: insights, isLoading, error, refetch } = useAiInsights()
  const { data: actions } = useCorrectiveActions()
  const propose = useProposeFromInsight()
  const [proposing, setProposing] = useState<Proposing | null>(null)
  // Prototype: "CX creates the action"; the receiver then approves, changes, rejects or investigates.
  const canPropose = role.id === 'cxmgr' || role.id === 'cxteam'

  return (
    <div className="flex flex-col gap-4">
      <ScoresVsSignalsNotice register="ai-insights" />
      <PercentagesExplainer />

      {isLoading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !insights?.length ? (
        <EmptyState title={t('No AI Insights yet', 'لا توجد رؤى بعد')} />
      ) : (
        <ul className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {insights.map((envelope) => (
            <InsightCard
              key={envelope.subjectId}
              envelope={envelope}
              canPropose={canPropose}
              proposedIds={new Set((actions ?? []).filter((a) => a.fromInsight?.subjectId === envelope.subjectId).map((a) => a.fromInsight!.suggestionId))}
              onPropose={(suggestion) => setProposing({ envelope, suggestion })}
            />
          ))}
        </ul>
      )}

      {proposing && (
        <ProposeDialog
          proposing={proposing}
          pending={propose.isPending}
          onCancel={() => setProposing(null)}
          onSubmit={(values) =>
            propose.mutate(
              {
                insightSubjectId: proposing.envelope.subjectId,
                suggestion: proposing.suggestion,
                environment: proposing.envelope.payload.environment,
                ...values,
              },
              {
                onSuccess: () => {
                  setProposing(null)
                  toast.success(t('Proposed corrective action created. The receiver approves, changes, rejects or investigates it.', 'أُنشئ إجراء تصحيحي مقترح. يعتمده المستلم أو يعدّله أو يرفضه أو يحقق فيه.'))
                },
                onError: () => toast.error(t('The receiver is the person who can fix it, never top management.', 'المستلم هو من يستطيع الإصلاح، وليس الإدارة العليا أبداً.')),
              },
            )
          }
        />
      )}
    </div>
  )
}

function InsightCard({
  envelope,
  canPropose,
  proposedIds,
  onPropose,
}: {
  envelope: AgentOutputEnvelope<AiInsightPayload>
  canPropose: boolean
  proposedIds: Set<string>
  onPropose: (s: InsightSuggestion) => void
}) {
  const chartMotion = useChartMotion()
  const { t, L, lang } = useI18n()
  const navigate = useNavigate()
  const p = envelope.payload
  const info = INSIGHT_CATEGORIES[p.category as InsightCategory]
  const small = p.sampleSize < MINIMUM_SAMPLE
  const series = p.chartSeries.map((s, i) => ({ ...s, name: SERIES_LABEL[s.label] ? L(SERIES_LABEL[s.label]) : s.label, i }))
  const ordered = lang === 'ar' ? [...series].reverse() : series

  return (
    <li className="min-w-0">
      <Card className="h-full gap-0 py-0">
        <CardContent className="flex h-full flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <h2 className="text-base font-semibold">{info ? L(info.label) : p.category}</h2>
              <span className="text-sm text-muted-foreground">
                {p.environment} · {L(p.serviceTimeBand)}
              </span>
            </div>
            {small ? (
              <StatusBadge tone="warning" icon={<AlertTriangle aria-hidden />}>
                {t('Small sample', 'عينة صغيرة')}
              </StatusBadge>
            ) : (
              <StatusBadge tone="neutral">
                {t('Sample', 'العينة')} <bdi dir="ltr" className="tabular-nums">{p.sampleSize}</bdi>
              </StatusBadge>
            )}
          </div>
          <p className="text-sm">{L(p.recoveryFigure)}</p>
          <div className="h-28" dir="ltr">
            <DeferredRender>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ordered} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: 'var(--muted)' }}
                    formatter={(v) => [v, t('Cases', 'حالات')]}
                    contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--popover-foreground)', fontSize: 12 }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56} {...chartMotion}>
                    {ordered.map((entry) => (
                      <Cell key={entry.label} fill={entry.i === 0 ? 'var(--destructive)' : 'var(--success)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </DeferredRender>
          </div>

          {info && (
            <section aria-label={t('Suggested corrective actions', 'الإجراءات التصحيحية المقترحة')} className="flex flex-col gap-2 border-t pt-3">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <Lightbulb aria-hidden className="size-4 text-gold-text" />
                {t('AI suggests', 'يقترح الذكاء الاصطناعي')}
                <TermHelp term="Corrective action" />
              </h3>
              <ul className="flex flex-col gap-2">
                {info.suggestions.map((s) => {
                  const pct = suggestionPercent(s)
                  const done = proposedIds.has(s.id)
                  return (
                    <li key={s.id} className="flex flex-col gap-1.5 rounded-lg border bg-muted/30 p-3">
                      <p className="text-sm font-medium">{L(s.text)}</p>
                      <p className="text-xs text-muted-foreground">{L(suggestionSentence(s))}</p>
                      <Progress value={pct} aria-label={t(`Recovered ${pct}%`, `تعافى ${pct}%`)} className="h-1.5 bg-muted" />
                      {s.tried < SMALL_SAMPLE && (
                        <p className="flex items-start gap-1.5 text-xs text-warning-text">
                          <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0" />
                          {t('Fewer than 10 similar cases: read this figure with care.', 'أقل من 10 حالات مشابهة: اقرأ هذا الرقم بحذر.')}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {done ? (
                          <StatusBadge tone="success" icon={<CheckCircle2 aria-hidden />}>
                            <Link to="/actions/corrective" className="underline-offset-4 hover:underline">
                              {t('Proposed — see Corrective actions', 'مقترح — انظر الإجراءات التصحيحية')}
                            </Link>
                          </StatusBadge>
                        ) : canPropose ? (
                          <Button size="sm" variant="outline" className="h-9" onClick={() => onPropose(s)}>
                            <Plus aria-hidden />
                            {t('Make it a proposed action', 'اجعله إجراءً مقترحاً')}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">{t('CX creates the action.', 'فريق تجربة العملاء ينشئ الإجراء.')}</span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
              <p className="text-xs text-muted-foreground">{L(info.guidance)}</p>
            </section>
          )}

          <div className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t pt-3">
            {!p.sendToCaseEligibleCaseId && (
              <span className="me-auto text-xs text-muted-foreground">
                {t('Only available when a shopper case in the same category is open.', 'متاح فقط عند وجود حالة تسوق سري بنفس الفئة ومفتوحة.')}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              disabled={!p.sendToCaseEligibleCaseId}
              onClick={() => p.sendToCaseEligibleCaseId && navigate('/actions/shopper-cases')}
            >
              <Send aria-hidden className="rtl:-scale-x-100" />
              {t('Send to a case', 'إرسال إلى حالة')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </li>
  )
}

const proposeSchema = z.object({
  kind: z.enum(['employee', 'service_behaviour', 'training_gap', 'product_app', 'process', 'environment', 'legal_privacy', 'marketing']),
  owner: z
    .string()
    .trim()
    .min(2, 'owner')
    .refine((v) => !isTopManagementTitle(v), 'top'),
  dueDate: z.string().min(1, 'due'),
})
type ProposeValues = z.infer<typeof proposeSchema>

function ProposeDialog({
  proposing,
  pending,
  onCancel,
  onSubmit,
}: {
  proposing: Proposing
  pending: boolean
  onCancel: () => void
  onSubmit: (v: ProposeValues) => void
}) {
  const { t, L } = useI18n()
  const { suggestion, envelope } = proposing
  const now = useNow()
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<ProposeValues>({
    resolver: zodResolver(proposeSchema),
    defaultValues: {
      kind: suggestion.kind,
      owner: L(DEFAULT_OWNER_BY_KIND[suggestion.kind]),
      dueDate: new Date(now + 14 * 86_400_000).toISOString().slice(0, 10),
    },
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{t('Make it a proposed corrective action', 'اجعله إجراءً تصحيحياً مقترحاً')}</DialogTitle>
            <DialogDescription>
              {L(suggestion.text)} — {envelope.payload.environment}
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            {t(
              'A suggestion is never an order. It goes to the receiver as proposed; they approve, change, reject or ask for an investigation first. Heads and C-level are informed only.',
              'الاقتراح ليس أمراً أبداً. يصل إلى المستلم كمقترح؛ فيعتمده أو يعدّله أو يرفضه أو يطلب تحقيقاً أولاً. الرؤساء والإدارة العليا للعلم فقط.',
            )}
          </p>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="pi-kind">{t('Kind', 'النوع')}</FieldLabel>
              <Controller
                control={control}
                name="kind"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v)
                      if (!dirtyFields.owner) setValue('owner', L(DEFAULT_OWNER_BY_KIND[v as CorrectiveActionKind]))
                    }}
                  >
                    <SelectTrigger id="pi-kind" className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KINDS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {L(ACTION_KIND[k].label)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field data-invalid={!!errors.owner}>
              <FieldLabel htmlFor="pi-owner">{t('Receiver (title)', 'المستلم (المسمى الوظيفي)')}</FieldLabel>
              <Input id="pi-owner" className="h-9" aria-invalid={!!errors.owner} aria-describedby="pi-owner-help" {...register('owner')} />
              <FieldDescription id="pi-owner-help">
                {t('A title, not a name. The exact title per product comes from the escalation matrix, still awaiting the product owners.', 'مسمى وظيفي لا اسم. المسمى الدقيق لكل منتج يأتي من مصفوفة التصعيد التي ما زالت بانتظار مالكي المنتجات.')}
              </FieldDescription>
              {errors.owner?.message === 'top' ? (
                <FieldError>{t('The receiver is the person who can fix it, never top management.', 'المستلم هو من يستطيع الإصلاح، وليس الإدارة العليا أبداً.')}</FieldError>
              ) : errors.owner ? (
                <FieldError>{t('Receiver title is required.', 'المسمى الوظيفي للمستلم مطلوب.')}</FieldError>
              ) : null}
            </Field>
            <Field data-invalid={!!errors.dueDate}>
              <FieldLabel htmlFor="pi-due">{t('Due date', 'تاريخ الاستحقاق')}</FieldLabel>
              <Input id="pi-due" type="date" className="h-9" aria-invalid={!!errors.dueDate} {...register('dueDate')} />
              {errors.dueDate && <FieldError>{t('Due date is required.', 'تاريخ الاستحقاق مطلوب.')}</FieldError>}
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('Cancel', 'إلغاء')}
            </Button>
            <Button type="submit" disabled={pending}>
              {t('Propose action', 'اقتراح إجراء')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
