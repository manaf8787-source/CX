import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ClipboardCheck, Info, MessagesSquare, Send, UserSearch } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useInvestigations, usePatterns, useRequestInvestigation, useReturnInvestigation } from '@/services/queries'
import { INVESTIGATION_STATUS_TONE } from '@/lib/status'
import type { Pattern } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { signalCategoryLabel } from './components/labels'

const STATUS_LABEL: Record<'requested' | 'in_progress' | 'returned', { en: string; ar: string }> = {
  requested: { en: 'Requested', ar: 'مطلوب' },
  in_progress: { en: 'In progress', ar: 'قيد التنفيذ' },
  returned: { en: 'Returned', ar: 'عاد' },
}

const KIND_LABEL: Record<'customer_interviews' | 'mystery_shopper_check', { en: string; ar: string }> = {
  customer_interviews: { en: 'Customer interviews', ar: 'مقابلات عملاء' },
  mystery_shopper_check: { en: 'Mystery shopper check', ar: 'فحص تسوق سري' },
}


export default function Investigations() {
  const { t, L } = useI18n()
  const { data: investigations, isLoading } = useInvestigations()
  const { data: patterns } = usePatterns()
  const returnInv = useReturnInvestigation()
  const [returningId, setReturningId] = useState<string | null>(null)

  const thinPatterns = (patterns ?? []).filter((p) => !p.hasMinimumSample && !investigations?.some((i) => i.patternId === p.id))

  return (
    <div className="flex flex-col gap-4">
      <aside className="flex gap-3 rounded-xl border border-info/20 bg-info/8 p-4">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-info-text" />
        <p className="max-w-[80ch] text-sm">
          {t('When pattern evidence is thin, the system does not guess a fix — it requests customer interviews or a mystery shopper check, and only proposes an action once that evidence comes back.', 'عندما تكون أدلة النمط ضعيفة، لا يُخمَّن حل — بل يُطلب إجراء مقابلات مع العملاء أو فحص تسوق سري، ولا يُقترح إجراء إلا بعد عودة تلك الأدلة.')}
        </p>
      </aside>

      {thinPatterns.length > 0 && (
        <SectionCard title={t('Thin-evidence patterns awaiting a request', 'أنماط ذات أدلة ضعيفة بانتظار طلب')}>
          <ul className="flex flex-col divide-y">
            {thinPatterns.map((p) => (
              <RequestRow key={p.id} pattern={p} />
            ))}
          </ul>
        </SectionCard>
      )}

      {isLoading ? (
        <LoadingState rows={4} />
      ) : !investigations?.length && !thinPatterns.length ? (
        <EmptyState title={t('No investigations needed right now — every pattern has enough evidence.', 'لا حاجة لتحقيقات الآن — كل الأنماط لديها أدلة كافية.')} />
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {investigations?.map((inv) => {
            const pattern = patterns?.find((p) => p.id === inv.patternId)
            const Icon = inv.kind === 'customer_interviews' ? MessagesSquare : UserSearch
            return (
              <li key={inv.id} className="min-w-0">
                <Card className="h-full gap-0 py-0">
                  <CardContent className="flex h-full flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-3">
                        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="size-4" />
                        </span>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <h2 className="text-base font-semibold">{L(KIND_LABEL[inv.kind])}</h2>
                          <span className="text-sm text-muted-foreground">
                            <span>{pattern ? `${L(signalCategoryLabel(pattern.category))} — ${pattern.team}` : inv.environment}</span>
                            {inv.requestedCount ? ` · ${inv.requestedCount} ${t('interviews', 'مقابلات')}` : ''}
                            {inv.scenario ? ` · ${L(inv.scenario)}` : ''}
                          </span>
                        </div>
                      </div>
                      <StatusBadge tone={INVESTIGATION_STATUS_TONE[inv.status]} dot>
                        {L(STATUS_LABEL[inv.status])}
                      </StatusBadge>
                    </div>
                    {inv.resultSummary && <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm">{L(inv.resultSummary)}</p>}
                    {inv.status !== 'returned' && (
                      <div className="mt-auto flex justify-end">
                        <Button variant="outline" size="sm" className="h-9" onClick={() => setReturningId(inv.id)}>
                          <ClipboardCheck aria-hidden />
                          {t('Record evidence returned', 'تسجيل عودة الأدلة')}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {returningId && (
        <ReturnDialog
          onCancel={() => setReturningId(null)}
          onSubmit={(summary) => {
            returnInv.mutate({ id: returningId, resultSummary: summary })
            setReturningId(null)
            toast.success(t('Evidence recorded', 'تم تسجيل الأدلة'))
          }}
        />
      )}
    </div>
  )
}

function RequestRow({ pattern }: { pattern: Pattern }) {
  const { t, L } = useI18n()
  const request = useRequestInvestigation()
  const [kind, setKind] = useState<'customer_interviews' | 'mystery_shopper_check'>('customer_interviews')
  const selectId = `inv-kind-${pattern.id}`
  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm">
        {L(signalCategoryLabel(pattern.category))} — {pattern.team}{' '}
        <span className="text-muted-foreground">
          (<bdi dir="ltr" className="tabular-nums">{pattern.sampleSize}</bdi> {t('signals', 'إشارة')})
        </span>
      </span>
      <div className="flex items-center gap-2">
        <label htmlFor={selectId} className="sr-only">
          {t('Evidence to request', 'الأدلة المطلوبة')}
        </label>
        <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
          <SelectTrigger id={selectId} className="h-9 w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="customer_interviews">{L(KIND_LABEL.customer_interviews)}</SelectItem>
            <SelectItem value="mystery_shopper_check">{L(KIND_LABEL.mystery_shopper_check)}</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="h-9"
          onClick={() => {
            request.mutate({
              patternId: pattern.id,
              kind,
              requestedCount: kind === 'customer_interviews' ? 5 : undefined,
              environment: pattern.team,
              scenario: kind === 'mystery_shopper_check' ? `${signalCategoryLabel(pattern.category).en} scenario, ${pattern.team}` : undefined,
            })
            toast.success(t('Evidence requested', 'تم طلب الأدلة'))
          }}
        >
          <Send aria-hidden className="rtl:-scale-x-100" />
          {t('Request', 'طلب')}
        </Button>
      </div>
    </li>
  )
}

const returnSchema = z.object({ summary: z.string().trim().min(5, 'summary') })

function ReturnDialog({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (summary: string) => void }) {
  const { t } = useI18n()
  const { register, handleSubmit, formState: { errors } } = useForm<{ summary: string }>({
    resolver: zodResolver(returnSchema),
    defaultValues: { summary: '' },
  })
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit((v) => onSubmit(v.summary.trim()))} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{t('Record what came back', 'تسجيل ما عاد من نتائج')}</DialogTitle>
            <DialogDescription>{t('A short summary is enough; it becomes the evidence for the next proposal.', 'يكفي ملخص قصير؛ يصبح دليلاً للاقتراح التالي.')}</DialogDescription>
          </DialogHeader>
          <Field data-invalid={!!errors.summary}>
            <FieldLabel htmlFor="inv-summary">{t('What came back', 'ما عاد من نتائج')}</FieldLabel>
            <Textarea
              id="inv-summary"
              rows={4}
              aria-invalid={!!errors.summary}
              placeholder={t('Root cause confirmed, action proposed...', 'تم تأكيد السبب الجذري، واقتُرح إجراء...')}
              {...register('summary')}
            />
            {errors.summary && <FieldError>{t('Summarize what came back (at least 5 characters).', 'لخّص ما عاد من نتائج (5 أحرف على الأقل).')}</FieldError>}
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('Cancel', 'إلغاء')}
            </Button>
            <Button type="submit">{t('Save', 'حفظ')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
