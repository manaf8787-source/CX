import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { useI18n } from '../../../i18n'

const schema = z
  .object({
    decision: z.enum(['approved', 'modified', 'rejected', 'confirmed']),
    reason: z.string().optional(),
  })
  .refine((v) => v.decision === 'approved' || v.decision === 'confirmed' || (v.reason?.trim().length ?? 0) > 0, {
    message: 'A reason is required to modify or reject.',
    path: ['reason'],
  })

type FormValues = z.infer<typeof schema>

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
  onSubmit: (v: { decision: 'approved' | 'modified' | 'rejected' | 'confirmed'; reason?: string }) => void
}) {
  const { t } = useI18n()
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({ defaultValues: { decision: approveLabel } })
  const decision = useWatch({ control, name: 'decision' })

  function submit(values: FormValues) {
    const parsed = schema.safeParse(values)
    if (!parsed.success) return
    onSubmit(parsed.data)
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit(submit)}>
        <h2>{title}</h2>
        <div className="col" role="radiogroup">
          <label className="row"><input type="radio" value={approveLabel} {...register('decision')} /> {t('Approve', 'اعتماد')}</label>
          <label className="row"><input type="radio" value="modified" {...register('decision')} /> {t('Modify', 'تعديل')}</label>
          <label className="row"><input type="radio" value="rejected" {...register('decision')} /> {t('Reject', 'رفض')}</label>
        </div>
        {decision !== approveLabel && (
          <div className="col">
            <label className="text-sm muted">{t('Reason (required)', 'السبب (مطلوب)')}</label>
            <textarea {...register('reason')} />
            {errors.reason && <span className="text-sm" style={{ color: 'var(--crit)' }}>{t('A reason is required.', 'السبب مطلوب.')}</span>}
          </div>
        )}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onCancel}>{t('Cancel', 'إلغاء')}</button>
          <button type="submit" className="btn primary">{t('Save decision', 'حفظ القرار')}</button>
        </div>
      </form>
    </div>
  )
}
