import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useI18n } from '@/i18n'
import { INTERVIEW_OUTCOME_LABEL, REASON_CODE_LABEL, suggestReasonCode } from '@/utils/closeTheLoop'
import { JOURNEY_RULES } from '@/utils/journeyRules'
import { usePersonInteractions } from '@/services/queries'
import { useNow } from '@/hooks/useNow'
import { Input } from '@/components/ui/input'
import { SEVERITY_TONE } from '@/lib/status'
import type { DetractorCallItem, InterviewOutcome, ReasonCode } from '@/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/common/StatusBadge'

const REASON_CODES = Object.keys(REASON_CODE_LABEL) as [ReasonCode, ...ReasonCode[]]
const OUTCOMES = Object.keys(INTERVIEW_OUTCOME_LABEL) as [InterviewOutcome, ...InterviewOutcome[]]

const SEVERITY_LABEL = {
  critical: { en: 'Critical', ar: 'حرجة' },
  medium: { en: 'Medium', ar: 'متوسطة' },
  low: { en: 'Low', ar: 'منخفضة' },
} as const

const schema = z.object({
  q1: z.string().trim().min(1, 'required'),
  q2: z.string().trim().min(1, 'required'),
  q3: z.string().trim().min(1, 'required'),
  mayComeBack: z.enum(['yes', 'no']),
  reasonCode: z.enum(REASON_CODES),
  outcome: z.enum(OUTCOMES),
  notes: z.string().optional(),
  resurveyOn: z.string().min(1, 'required'),
})
type FormValues = z.infer<typeof schema>

/** FR-5.3 — exactly four questions, a 10-value reason code, and an outcome.
 * "Declined" is read downstream as "no retry" — there is no separate field
 * for it, the outcome value is the single source of truth. */
export function InterviewDialog({
  item,
  who,
  onCancel,
  onSubmit,
}: {
  item: DetractorCallItem
  /** Who is being called: the name for a role that may see names, else the reference (`P-005`). */
  who?: string
  onCancel: () => void
  onSubmit: (v: { reasonCode: ReasonCode; outcome: InterviewOutcome; notes?: string; resurveyOn: string }) => void
}) {
  const { t, L, lang } = useI18n()
  const { data: interactions } = usePersonInteractions(item.personId)
  const suggested = suggestReasonCode(interactions ?? [])
  const now = useNow()
  const defaultResurvey = new Date(now + 10 * 86_400_000).toISOString().slice(0, 10)
  const { register, handleSubmit, control, setValue, formState: { errors, dirtyFields } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { q1: '', q2: '', q3: '', outcome: 'reached', mayComeBack: 'yes', reasonCode: 'other', notes: '', resurveyOn: defaultResurvey },
  })
  // Agent 8's suggestion arrives with the timeline; the caller can still change it.
  useEffect(() => {
    if (interactions && !dirtyFields.reasonCode && suggested !== 'other') setValue('reasonCode', suggested, { shouldDirty: true })
  }, [interactions, suggested, dirtyFields.reasonCode, setValue])
  // KB §7: the brief — what happened, in date order, from the timeline (facts only).
  const brief = [...(interactions ?? [])]
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    .filter((i) => i.problemFlags.length || i.reason)
    .slice(-6)
  const required = t('Required', 'مطلوب')

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <form
          onSubmit={handleSubmit((v) => onSubmit({ reasonCode: v.reasonCode, outcome: v.outcome, notes: v.notes?.trim() || undefined, resurveyOn: v.resurveyOn }))}
          className="flex flex-col gap-5"
        >
          <DialogHeader>
            <DialogTitle>{t('Detractor interview — four questions', 'مقابلة المنتقد — أربعة أسئلة')}</DialogTitle>
            <DialogDescription asChild>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={SEVERITY_TONE[item.severity]} dot>
                  {L(SEVERITY_LABEL[item.severity])}
                </StatusBadge>
                {who && <span className="font-medium text-foreground">{who}</span>}
                <span>
                  {t('First score', 'النتيجة الأولى')}: <bdi dir="ltr" className="font-medium text-foreground tabular-nums">{item.firstScore}</bdi>
                </span>
              </div>
            </DialogDescription>
          </DialogHeader>

          <section aria-label={t('Brief', 'الملخص')} className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 p-3 text-sm">
            <span className="font-semibold">{t('Brief from the timeline (Agent 8)', 'ملخص من الجدول الزمني (الوكيل 8)')}</span>
            {brief.length === 0 ? (
              <span className="text-muted-foreground">{t('No events on the record yet.', 'لا أحداث في السجل بعد.')}</span>
            ) : (
              <ol className="flex flex-col gap-1">
                {brief.map((i) => (
                  <li key={i.id} className="flex gap-2">
                    <bdi dir="ltr" className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {new Date(i.occurredAt).toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-GB')}
                    </bdi>
                    <span>
                      {i.reason ?? ''}
                      {i.problemFlags.length > 0 && (
                        <span className="text-danger-text">
                          {' '}
                          · {i.problemFlags.map((f) => L(JOURNEY_RULES.find((r) => r.id === f)?.label ?? { en: 'Detractor', ar: 'منتقد' })).join(', ')}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <FieldGroup className="gap-4">
            <Field data-invalid={!!errors.q1}>
              <FieldLabel htmlFor="iv-q1">{t('1. What happened?', '١. ماذا حدث؟')}</FieldLabel>
              <Textarea id="iv-q1" rows={2} aria-invalid={!!errors.q1} {...register('q1')} />
              {errors.q1 && <FieldError>{required}</FieldError>}
            </Field>
            <Field data-invalid={!!errors.q2}>
              <FieldLabel htmlFor="iv-q2">{t('2. What did you expect?', '٢. ماذا كنت تتوقع؟')}</FieldLabel>
              <Textarea id="iv-q2" rows={2} aria-invalid={!!errors.q2} {...register('q2')} />
              {errors.q2 && <FieldError>{required}</FieldError>}
            </Field>
            <Field data-invalid={!!errors.q3}>
              <FieldLabel htmlFor="iv-q3">{t('3. What would have made it right?', '٣. ما الذي كان سيصلح الأمر؟')}</FieldLabel>
              <Textarea id="iv-q3" rows={2} aria-invalid={!!errors.q3} {...register('q3')} />
              {errors.q3 && <FieldError>{required}</FieldError>}
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="iv-back">{t('4. May we come back to you?', '٤. هل يمكننا التواصل معك لاحقاً؟')}</FieldLabel>
                <Controller
                  control={control}
                  name="mayComeBack"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="iv-back" className="h-9 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">{t('Yes', 'نعم')}</SelectItem>
                        <SelectItem value="no">{t('No', 'لا')}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="iv-reason">
                  {t('Reason code', 'رمز السبب')}
                  <span className="text-xs font-normal text-muted-foreground">{t(' (suggested from the timeline)', ' (مقترح من الجدول الزمني)')}</span>
                </FieldLabel>
                <Controller
                  control={control}
                  name="reasonCode"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="iv-reason" className="h-9 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REASON_CODES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {L(REASON_CODE_LABEL[c])}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="iv-outcome">{t('Outcome', 'النتيجة')}</FieldLabel>
                <Controller
                  control={control}
                  name="outcome"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="iv-outcome" className="h-9 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OUTCOMES.map((o) => (
                          <SelectItem key={o} value={o}>
                            {L(INTERVIEW_OUTCOME_LABEL[o])}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <Field>
                <FieldLabel htmlFor="iv-notes">{t('Notes', 'ملاحظات')}</FieldLabel>
                <Textarea id="iv-notes" rows={2} {...register('notes')} />
              </Field>
              <Field data-invalid={!!errors.resurveyOn}>
                <FieldLabel htmlFor="iv-resurvey">{t('Re-survey date', 'تاريخ إعادة الاستبيان')}</FieldLabel>
                <Input id="iv-resurvey" type="date" aria-invalid={!!errors.resurveyOn} {...register('resurveyOn')} />
                <span className="text-xs text-muted-foreground">{t('7 to 14 days after resolution', 'بعد 7 إلى 14 يوماً من الحل')}</span>
                {errors.resurveyOn && <FieldError>{required}</FieldError>}
              </Field>
            </div>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('Cancel', 'إلغاء')}
            </Button>
            <Button type="submit">{t('Save interview', 'حفظ المقابلة')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
