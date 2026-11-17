import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useI18n } from '../../i18n'
import { INTERVIEW_OUTCOME_LABEL, REASON_CODE_LABEL } from '../../utils/closeTheLoop'
import type { DetractorCallItem, InterviewOutcome, ReasonCode } from '../../types'

const REASON_CODES = Object.keys(REASON_CODE_LABEL) as [ReasonCode, ...ReasonCode[]]
const OUTCOMES = Object.keys(INTERVIEW_OUTCOME_LABEL) as [InterviewOutcome, ...InterviewOutcome[]]

const schema = z.object({
  q1: z.string().min(1, 'Required'),
  q2: z.string().min(1, 'Required'),
  q3: z.string().min(1, 'Required'),
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
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ defaultValues: { outcome: 'reached', mayComeBack: 'yes' } })

  function submit(values: FormValues) {
    const parsed = schema.safeParse(values)
    if (!parsed.success) return
    onSubmit({ reasonCode: parsed.data.reasonCode, outcome: parsed.data.outcome })
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal wide" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit(submit)}>
        <h2>{t('Detractor interview — four questions', 'مقابلة المنتقد — أربعة أسئلة')}</h2>
        <p className="text-sm muted">{t('Severity', 'الخطورة')}: {item.severity} · {t('First score', 'النتيجة الأولى')}: {item.firstScore}</p>

        <label className="col text-sm">{t('1. What happened?', '١. ماذا حدث؟')}
          <textarea {...register('q1')} />
          {errors.q1 && <span style={{ color: 'var(--crit)' }}>{t('Required', 'مطلوب')}</span>}
        </label>
        <label className="col text-sm">{t('2. What did you expect?', '٢. ماذا كنت تتوقع؟')}<textarea {...register('q2')} /></label>
        <label className="col text-sm">{t('3. What would have made it right?', '٣. ما الذي كان سيصلح الأمر؟')}<textarea {...register('q3')} /></label>
        <label className="col text-sm">{t('4. May we come back to you?', '٤. هل يمكننا التواصل معك لاحقاً؟')}
          <select {...register('mayComeBack')}>
            <option value="yes">{t('Yes', 'نعم')}</option>
            <option value="no">{t('No', 'لا')}</option>
          </select>
        </label>
        <label className="col text-sm">{t('Reason code', 'رمز السبب')}
          <select {...register('reasonCode')}>
            {REASON_CODES.map((c) => <option key={c} value={c}>{L(REASON_CODE_LABEL[c])}</option>)}
          </select>
        </label>
        <label className="col text-sm">{t('Outcome', 'النتيجة')}
          <select {...register('outcome')}>
            {OUTCOMES.map((o) => <option key={o} value={o}>{L(INTERVIEW_OUTCOME_LABEL[o])}</option>)}
          </select>
        </label>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onCancel}>{t('Cancel', 'إلغاء')}</button>
          <button type="submit" className="btn primary">{t('Save interview', 'حفظ المقابلة')}</button>
        </div>
      </form>
    </div>
  )
}
