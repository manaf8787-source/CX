import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useI18n } from '@/i18n'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const schema = z
  .object({
    decision: z.enum(['approved', 'modified', 'rejected', 'confirmed']),
    reason: z.string().optional(),
  })
  .refine((v) => v.decision === 'approved' || v.decision === 'confirmed' || (v.reason?.trim().length ?? 0) > 0, {
    message: 'reason_required',
    path: ['reason'],
  })

type FormValues = z.infer<typeof schema>
type Decision = FormValues['decision']

/** FR-4.4 — a proposed action can be approved, modified, or rejected (with
 * reason); modified/rejected need CX manager approval before a case can
 * close (enforced upstream by who gets `canActOnCorrectiveAction`). */
export function DecisionDialog({
  title,
  approveLabel,
  onCancel,
  onSubmit,
}: {
  title: string
  approveLabel: 'approved' | 'confirmed'
  onCancel: () => void
  onSubmit: (v: { decision: Decision; reason?: string }) => void
}) {
  const { t } = useI18n()
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { decision: approveLabel, reason: '' },
  })
  const decision = useWatch({ control, name: 'decision' })

  const options: { value: Decision; label: string; note: string }[] = [
    { value: approveLabel, label: t('Approve', 'اعتماد'), note: t('Goes ahead as proposed.', 'يمضي كما اقتُرح.') },
    { value: 'modified', label: t('Modify', 'تعديل'), note: t('Changes the scope; needs a reason.', 'يغيّر النطاق؛ يتطلب سبباً.') },
    { value: 'rejected', label: t('Reject', 'رفض'), note: t('Does not go ahead; needs a reason.', 'لا يمضي؛ يتطلب سبباً.') },
  ]

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit((v) => onSubmit({ decision: v.decision, reason: v.reason?.trim() || undefined }))} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{t('A person decides; the AI only proposes.', 'الشخص يقرر؛ الذكاء الاصطناعي يقترح فقط.')}</DialogDescription>
          </DialogHeader>

          <FieldSet>
            <FieldLegend variant="label" className="sr-only">{t('Decision', 'القرار')}</FieldLegend>
            <Controller
              control={control}
              name="decision"
              render={({ field }) => (
                <div role="radiogroup" aria-label={t('Decision', 'القرار')} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {options.map((o) => {
                    const checked = field.value === o.value
                    return (
                      <label
                        key={o.value}
                        className={cn(
                          'flex min-h-10 cursor-pointer flex-col gap-0.5 rounded-lg border p-3 transition-colors duration-150',
                          'has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50',
                          checked ? 'border-primary bg-primary/5' : 'hover:bg-accent',
                        )}
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          name={field.name}
                          value={o.value}
                          checked={checked}
                          onChange={() => field.onChange(o.value)}
                        />
                        <span className="text-sm font-semibold">{o.label}</span>
                        <span className="text-xs text-muted-foreground">{o.note}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            />
          </FieldSet>

          {decision !== approveLabel && (
            <Field data-invalid={!!errors.reason}>
              <FieldLabel htmlFor="decision-reason">{t('Reason (required)', 'السبب (مطلوب)')}</FieldLabel>
              <Textarea id="decision-reason" rows={3} aria-invalid={!!errors.reason} {...register('reason')} />
              {errors.reason && <FieldError>{t('A reason is required.', 'السبب مطلوب.')}</FieldError>}
            </Field>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('Cancel', 'إلغاء')}
            </Button>
            <Button type="submit">{t('Save decision', 'حفظ القرار')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
