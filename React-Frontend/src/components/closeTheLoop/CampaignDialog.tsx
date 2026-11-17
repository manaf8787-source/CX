import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useI18n } from '../../i18n'
import type { DetractorCallItem } from '../../types'

const schema = z.object({
  name: z.string().min(2, 'Required'),
  segmentDescription: z.string().min(2, 'Required'),
  scriptEn: z.string().min(2, 'Required'),
  scriptAr: z.string().min(2, 'Required'),
  memberIds: z.array(z.string()).min(1, 'Pick at least one member'),
})
export type CampaignFormValues = z.infer<typeof schema>

/**
 * FR-5.6 — `eligibleItems` is filtered by the caller to exclude critical
 * detractors before this form ever renders a checkbox for them, so the hard
 * rule is already true here at the UI layer; `createAiCampaign` (queries.ts)
 * filters again at write time as the second, code-level enforcement.
 */
export function CampaignDialog({
  eligibleItems,
  onCancel,
  onCreate,
}: {
  eligibleItems: DetractorCallItem[]
  onCancel: () => void
  onCreate: (v: CampaignFormValues) => void
}) {
  const { t } = useI18n()
  const { register, handleSubmit, formState: { errors } } = useForm<CampaignFormValues>({ defaultValues: { memberIds: [] } })

  function submit(values: CampaignFormValues) {
    const parsed = schema.safeParse(values)
    if (!parsed.success) return
    onCreate(parsed.data)
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal wide" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit(submit)}>
        <h2>{t('Create an AI interview campaign', 'إنشاء حملة مقابلات بالذكاء الاصطناعي')}</h2>
        <p className="text-sm" style={{ color: 'var(--warn)' }}>
          {t('Critical detractors are never offered here — human call only.', 'المنتقدون الحرجون لا يُعرضون هنا أبداً — مكالمة بشرية فقط.')}
        </p>
        <label className="col text-sm">{t('Name', 'الاسم')}
          <input type="text" {...register('name')} />
          {errors.name && <span style={{ color: 'var(--crit)' }}>{t('Required', 'مطلوب')}</span>}
        </label>
        <label className="col text-sm">{t('Segment', 'الشريحة')}<input type="text" {...register('segmentDescription')} /></label>
        <label className="col text-sm">{t('Script (English)', 'النص (إنجليزي)')}<textarea {...register('scriptEn')} /></label>
        <label className="col text-sm">{t('Script (Arabic)', 'النص (عربي)')}<textarea {...register('scriptAr')} dir="rtl" /></label>
        <div className="col text-sm">
          <span className="muted">{t('Members (non-critical, not yet called)', 'الأعضاء (غير حرجين، لم يُتصل بهم بعد)')}</span>
          <div className="col" style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 8, padding: 8 }}>
            {eligibleItems.map((i) => (
              <label key={i.id} className="row">
                <input type="checkbox" value={i.id} {...register('memberIds')} /> {i.id} — {i.severity} — {i.environment}
              </label>
            ))}
            {!eligibleItems.length && <span className="muted">{t('No eligible members right now.', 'لا يوجد أعضاء مؤهلون حالياً.')}</span>}
          </div>
          {errors.memberIds && <span style={{ color: 'var(--crit)' }}>{t('Pick at least one member.', 'اختر عضواً واحداً على الأقل.')}</span>}
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onCancel}>{t('Cancel', 'إلغاء')}</button>
          <button type="submit" className="btn primary">{t('Create campaign', 'إنشاء الحملة')}</button>
        </div>
      </form>
    </div>
  )
}
