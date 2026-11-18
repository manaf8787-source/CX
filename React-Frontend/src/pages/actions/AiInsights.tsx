import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Lightbulb, Plus, Send } from 'lucide-react'
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
import { RankedBars } from '@/components/common/charts'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { TermHelp } from '@/components/common/TermHelp'
import { PercentagesExplainer } from './components/PercentagesExplainer'
import { InlineNote } from '@/components/common/InlineNote'
import { ScoresVsSignalsNotice } from './components/ScoresVsSignalsNotice'
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
    <div data-density="dense" className="flex flex-col gap-4">
      <ScoresVsSignalsNotice register="ai-insights" />
      <PercentagesExplainer />

      {isLoading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !insights?.length ? (
        <EmptyState title={t('No AI Insights yet', 'لا توجد رؤى بعد')} />
      ) : (
        <ul className="grid grid-cols-1 gap-(--grid-gap) xl:grid-cols-2">
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

/**
 * One insight (FR-4): a dense card that reads top to bottom as header, the recovery sentence, the comparison in a well, the AI's
 * suggestions as divided rows, and the "Send to a case" pill. The old low-score and recovered columns (red and green) are the skill's
 * bar comparison: the recovered series is the dark hero row, the low-score series grey, and the case counts are printed as text.
 */
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
  const { t, L } = useI18n()
  const navigate = useNavigate()
  const p = envelope.payload
  const info = INSIGHT_CATEGORIES[p.category as InsightCategory]
  const small = p.sampleSize < MINIMUM_SAMPLE
  const series = p.chartSeries.map((s, i, all) => ({
    key: s.label,
    label: SERIES_LABEL[s.label] ? L(SERIES_LABEL[s.label]) : s.label,
    value: s.value,
    hero: i === all.length - 1,
  }))

  return (
    <li className="min-w-0">
      <Card className="h-full">
        <CardContent className="flex h-full flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <h2 className="t-h4">{info ? L(info.label) : p.category}</h2>
              <span className="text-sm text-muted-foreground">
                {p.environment} · {L(p.serviceTimeBand)}
              </span>
            </div>
            {small ? (
              <StatusBadge tone="warning">{t('Small sample', 'عينة صغيرة')}</StatusBadge>
            ) : (
              <StatusBadge tone="neutral">
                {t('Sample', 'العينة')} <bdi dir="ltr" className="tabular">{p.sampleSize}</bdi>
              </StatusBadge>
            )}
          </div>
          <p className="text-sm">{L(p.recoveryFigure)}</p>
          <div className="well flex flex-col gap-3">
            <span className="t-body-s">{t('Cases', 'حالات')}</span>
            <RankedBars
              label={info ? L(info.label) : p.category}
              items={series.map((r) => ({ key: r.key, label: r.label, value: r.value, hero: r.hero }))}
            />
          </div>

          {info && (
            <section aria-label={t('Suggested corrective actions', 'الإجراءات التصحيحية المقترحة')} className="flex flex-col gap-1">
              <h3 className="t-h4 flex items-center gap-1.5">
                <Lightbulb aria-hidden className="size-4 text-muted-foreground" />
                {t('AI suggests', 'يقترح الذكاء الاصطناعي')}
                <TermHelp term="Corrective action" />
              </h3>
              <ul className="flex flex-col">
                {info.suggestions.map((s) => {
                  const pct = suggestionPercent(s)
                  const done = proposedIds.has(s.id)
                  return (
                    <li key={s.id} className="row-divider flex flex-col gap-2 py-3.5">
                      <p className="t-ui-strong">{L(s.text)}</p>
                      <p className="t-body-s">{L(suggestionSentence(s))}</p>
                      <Progress value={pct} aria-label={t(`Recovered ${pct}%`, `تعافى ${pct}%`)} className="h-1.5" />
                      {s.tried < SMALL_SAMPLE && (
                        <p className="t-body-s flex items-start gap-2">
                          <span aria-hidden className="dot dot-warning mt-1.5" />
                          {t('Fewer than 10 similar cases: read this figure with care.', 'أقل من 10 حالات مشابهة: اقرأ هذا الرقم بحذر.')}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {done ? (
                          <StatusBadge tone="success">
                            <Link to="/actions/corrective" className="underline underline-offset-4">
                              {t('Proposed — see Corrective actions', 'مقترح — انظر الإجراءات التصحيحية')}
                            </Link>
                          </StatusBadge>
                        ) : canPropose ? (
                          <Button size="sm" variant="outline" onClick={() => onPropose(s)}>
                            <Plus aria-hidden />
                            {t('Make it a proposed action', 'اجعله إجراءً مقترحاً')}
                          </Button>
                        ) : (
                          <span className="t-body-s">{t('CX creates the action.', 'فريق تجربة العملاء ينشئ الإجراء.')}</span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
              <p className="t-body-s">{L(info.guidance)}</p>
            </section>
          )}

          <div className="mt-auto flex flex-wrap items-center justify-end gap-2">
            {!p.sendToCaseEligibleCaseId && (
              <span className="t-body-s me-auto">
                {t('Only available when a shopper case in the same category is open.', 'متاح فقط عند وجود حالة تسوق سري بنفس الفئة ومفتوحة.')}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
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
          <InlineNote tone="neutral">
            {t(
              'A suggestion is never an order. It goes to the receiver as proposed; they approve, change, reject or ask for an investigation first. Heads and C-level are informed only.',
              'الاقتراح ليس أمراً أبداً. يصل إلى المستلم كمقترح؛ فيعتمده أو يعدّله أو يرفضه أو يطلب تحقيقاً أولاً. الرؤساء والإدارة العليا للعلم فقط.',
            )}
          </InlineNote>
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
                    <SelectTrigger id="pi-kind" className="w-full">
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
              <Input id="pi-owner" aria-invalid={!!errors.owner} aria-describedby="pi-owner-help" {...register('owner')} />
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
              <Input id="pi-due" type="date" aria-invalid={!!errors.dueDate} {...register('dueDate')} />
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
