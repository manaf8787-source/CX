import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ShieldAlert } from 'lucide-react'
import { useI18n } from '@/i18n'
import { envNameFromShort } from '@/data/environments'
import type { DetractorCallItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const schema = z.object({
  name: z.string().trim().min(2, 'required'),
  segmentDescription: z.string().trim().min(2, 'required'),
  scriptEn: z.string().trim().min(2, 'required'),
  scriptAr: z.string().trim().min(2, 'required'),
  memberIds: z.array(z.string()).min(1, 'members'),
})
export type CampaignFormValues = z.infer<typeof schema>

const SEVERITY_LABEL = {
  critical: { en: 'Critical', ar: 'حرجة' },
  medium: { en: 'Medium', ar: 'متوسطة' },
  low: { en: 'Low', ar: 'منخفضة' },
} as const

/**
 * FR-5.6 — `eligibleItems` is filtered by the caller to exclude critical
 * detractors before this form ever renders a checkbox for them, so the hard
 * rule is already true here at the UI layer; `createAiCampaign` (queries.ts)
 * filters again at write time as the second, code-level enforcement.
 */
export function CampaignDialog({
  eligibleItems,
  noAnswers = 2,
  onCancel,
  onCreate,
}: {
  eligibleItems: DetractorCallItem[]
  /** No-answers before the campaign hands over to a person (decided 18 Nov: 2; the rule `rule_ai_no_answers`). */
  noAnswers?: number
  onCancel: () => void
  onCreate: (v: CampaignFormValues) => void
}) {
  const { t, L } = useI18n()
  const { register, handleSubmit, formState: { errors } } = useForm<CampaignFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', segmentDescription: '', scriptEn: '', scriptAr: '', memberIds: [] },
  })
  const required = t('Required', 'مطلوب')
  const timesEn = noAnswers === 2 ? 'twice' : `${noAnswers} times`
  const timesAr = noAnswers === 2 ? 'مرتين' : `${noAnswers} مرات`

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={handleSubmit(onCreate)} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{t('Create an AI interview campaign', 'إنشاء حملة مقابلات بالذكاء الاصطناعي')}</DialogTitle>
            <DialogDescription className="flex items-start gap-2">
              <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-foreground" />
              {t('Critical detractors are never offered here — human call only.', 'المنتقدون الحرجون لا يُعرضون هنا أبداً — مكالمة بشرية فقط.')}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="cmp-name">{t('Name', 'الاسم')}</FieldLabel>
                <Input id="cmp-name" aria-invalid={!!errors.name} {...register('name')} />
                {errors.name && <FieldError>{required}</FieldError>}
              </Field>
              <Field data-invalid={!!errors.segmentDescription}>
                <FieldLabel htmlFor="cmp-segment">{t('Segment', 'الشريحة')}</FieldLabel>
                <Input id="cmp-segment" aria-invalid={!!errors.segmentDescription} {...register('segmentDescription')} />
                {errors.segmentDescription && <FieldError>{required}</FieldError>}
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.scriptEn}>
                <FieldLabel htmlFor="cmp-en">{t('Script (English)', 'النص (إنجليزي)')}</FieldLabel>
                <Textarea id="cmp-en" dir="ltr" rows={4} aria-invalid={!!errors.scriptEn} {...register('scriptEn')} />
                {errors.scriptEn && <FieldError>{required}</FieldError>}
              </Field>
              <Field data-invalid={!!errors.scriptAr}>
                <FieldLabel htmlFor="cmp-ar">{t('Script (Arabic)', 'النص (عربي)')}</FieldLabel>
                <Textarea id="cmp-ar" dir="rtl" rows={4} aria-invalid={!!errors.scriptAr} {...register('scriptAr')} />
                {errors.scriptAr && <FieldError>{required}</FieldError>}
              </Field>
            </div>

            <div className="well flex flex-col gap-1.5 px-4 py-3.5 text-sm text-muted-foreground">
              <span className="t-small-strong">{t('Hand-off rules (always on)', 'قواعد التحويل (مفعّلة دائماً)')}</span>
              <span>
                {t(`Hangs up or does not answer ${timesEn} → needs a human`, `أغلق الخط أو لم يرد ${timesAr} ← يحتاج شخصاً`)}
              </span>
              <span>{t('Asks for a person or says anything critical → a human the same day', 'طلب شخصاً أو قال أمراً حرجاً ← شخص في نفس اليوم')}</span>
              <span>{t('Declines → no retry', 'رفض ← دون إعادة محاولة')}</span>
            </div>

            <FieldSet data-invalid={!!errors.memberIds} className="gap-2">
              <FieldLegend variant="label">{t('Members (non-critical, not yet called)', 'الأعضاء (غير حرجين، لم يُتصل بهم بعد)')}</FieldLegend>
              {/* a well of rows divided by the row divider: no outline box */}
              <div className="well flex max-h-48 flex-col overflow-y-auto p-1.5">
                {eligibleItems.map((i) => (
                  <label key={i.id} className="row-divider flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200 hover:bg-(--hover-tint)">
                    <input type="checkbox" value={i.id} className="size-4 shrink-0 cursor-pointer accent-primary" {...register('memberIds')} />
                    <span className="tabular text-xs text-muted-foreground">{i.id}</span>
                    <span className="text-foreground">{L(SEVERITY_LABEL[i.severity])}</span>
                    <span className="text-muted-foreground">· {L(envNameFromShort(i.environment))}</span>
                  </label>
                ))}
                {!eligibleItems.length && <p className="p-3 text-sm text-muted-foreground">{t('No eligible members right now.', 'لا يوجد أعضاء مؤهلون حالياً.')}</p>}
              </div>
              {errors.memberIds && <FieldError>{t('Pick at least one member.', 'اختر عضواً واحداً على الأقل.')}</FieldError>}
            </FieldSet>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('Cancel', 'إلغاء')}
            </Button>
            <Button type="submit">{t('Create campaign', 'إنشاء الحملة')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
