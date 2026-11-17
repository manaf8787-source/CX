import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useI18n } from '@/i18n'
import { INTERVIEW_OUTCOME_LABEL, REASON_CODE_LABEL } from '@/utils/closeTheLoop'
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
})
type FormValues = z.infer<typeof schema>

/** FR-5.3 — exactly four questions, a 10-value reason code, and an outcome.
 * "Declined" is read downstream as "no retry" — there is no separate field
 * for it, the outcome value is the single source of truth. */
export function InterviewDialog({
  item,
  onCancel,
  onSubmit,
}: {
  item: DetractorCallItem
  onCancel: () => void
  onSubmit: (v: { reasonCode: ReasonCode; outcome: InterviewOutcome }) => void
}) {
  const { t, L } = useI18n()
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { q1: '', q2: '', q3: '', outcome: 'reached', mayComeBack: 'yes', reasonCode: REASON_CODES[0] },
  })
  const required = t('Required', 'مطلوب')

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={handleSubmit((v) => onSubmit({ reasonCode: v.reasonCode, outcome: v.outcome }))} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{t('Detractor interview — four questions', 'مقابلة المنتقد — أربعة أسئلة')}</DialogTitle>
            <DialogDescription asChild>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={SEVERITY_TONE[item.severity]} dot>
                  {L(SEVERITY_LABEL[item.severity])}
                </StatusBadge>
                <span>
                  {t('First score', 'النتيجة الأولى')}: <bdi dir="ltr" className="font-medium text-foreground tabular-nums">{item.firstScore}</bdi>
                </span>
              </div>
            </DialogDescription>
          </DialogHeader>

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
                <FieldLabel htmlFor="iv-reason">{t('Reason code', 'رمز السبب')}</FieldLabel>
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
