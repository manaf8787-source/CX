import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ClipboardCheck, Info, MessagesSquare, Send, UserSearch } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath } from '@/auth/access'
import { useInvestigations, usePatterns, useRequestInvestigation, useReturnInvestigation } from '@/services/queries'
import { INVESTIGATION_STATUS_TONE } from '@/lib/status'
import { caId, invId } from '@/utils/trace'
import { cn } from '@/lib/utils'
import type { Investigation, Pattern } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { TraceId } from '@/components/common/TraceId'
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
  const { t } = useI18n()
  const { data: investigations, isLoading } = useInvestigations()
  const { data: patterns } = usePatterns()
  const returnInv = useReturnInvestigation()
  const [returningId, setReturningId] = useState<string | null>(null)
  const [params] = useSearchParams()
  // `?inv=INV-1` (the inbox, a proposed fix's "Evidence" tag): that investigation is highlighted and scrolled to.
  const selectedInv = params.get('inv')

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
        <SectionCard term="Pattern" title={t('Thin-evidence patterns awaiting a request', 'أنماط ذات أدلة ضعيفة بانتظار طلب')}>
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
          {investigations?.map((inv) => (
            <InvestigationCard
              key={inv.id}
              inv={inv}
              pattern={patterns?.find((p) => p.id === inv.patternId)}
              selected={!!selectedInv && (selectedInv === invId(inv.id) || selectedInv === inv.id)}
              onRecord={setReturningId}
            />
          ))}
        </ul>
      )}

      {returningId && (
        <ReturnDialog
          onCancel={() => setReturningId(null)}
          onSubmit={(summary) => {
            // v40 F26: the result becomes evidence on the pattern; when the pattern had no fix, one is proposed for approval.
            returnInv.mutate(
              { id: returningId, resultSummary: summary },
              {
                onSuccess: (inv) =>
                  toast.success(
                    inv.proposedFixId
                      ? t('Result recorded as evidence; a fix was proposed for approval.', 'سُجّلت النتيجة كدليل؛ واقتُرح حل للاعتماد.')
                      : t('Result recorded as evidence.', 'سُجّلت النتيجة كدليل.'),
                  ),
              },
            )
            setReturningId(null)
          }}
        />
      )}
    </div>
  )
}

/** One investigation: its id, what was asked, and once the result is recorded the result, the pattern it is now evidence on and the fix it proposed. */
function InvestigationCard({ inv, pattern, selected, onRecord }: { inv: Investigation; pattern?: Pattern; selected: boolean; onRecord: (id: string) => void }) {
  const { t, L } = useI18n()
  const { role } = useRole()
  const ref = useRef<HTMLLIElement>(null)
  const Icon = inv.kind === 'customer_interviews' ? MessagesSquare : UserSearch

  useEffect(() => {
    if (selected) ref.current?.scrollIntoView?.({ block: 'center' })
  }, [selected])

  const canOpenFix = canAccessPath(role.id, '/actions/corrective')
  return (
    <li ref={ref} id={`inv-${invId(inv.id)}`} data-inv={invId(inv.id)} className="min-w-0 scroll-mt-24">
      <Card className={cn('h-full gap-0 py-0', selected && 'ring-2 ring-primary')}>
        <CardContent className="flex h-full flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-3">
              <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4" />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold">
                  <span className="inline-flex shrink-0 items-center rounded-md border bg-muted px-1.5 py-0.5 font-mono text-xs font-normal text-muted-foreground">
                    <bdi dir="ltr">{invId(inv.id)}</bdi>
                  </span>
                  {L(KIND_LABEL[inv.kind])}
                </h2>
                <span className="text-sm text-muted-foreground">
                  <span>{pattern ? `${L(signalCategoryLabel(pattern.category))} — ${pattern.team}` : inv.environment}</span>
                  {inv.requestedCount ? (
                    <>
                      {' · '}
                      <bdi dir="ltr" className="tabular-nums">
                        {inv.status === 'returned' && inv.doneCount !== undefined ? `${inv.doneCount}/${inv.requestedCount}` : inv.requestedCount}
                      </bdi>{' '}
                      {t('interviews', 'مقابلات')}
                    </>
                  ) : null}
                  {inv.scenario ? ` · ${L(inv.scenario)}` : ''}
                </span>
                {inv.lookFor && (
                  <span className="text-sm">
                    <span className="text-muted-foreground">{t('Look for', 'ما يُبحث عنه')}:</span> {L(inv.lookFor)}
                  </span>
                )}
              </div>
            </div>
            <StatusBadge tone={INVESTIGATION_STATUS_TONE[inv.status]} dot>
              {L(STATUS_LABEL[inv.status])}
            </StatusBadge>
          </div>
          {inv.resultSummary && (
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm" data-testid="inv-result">
              <span className="font-medium">{t('Result', 'النتيجة')}:</span> {L(inv.resultSummary)}
            </p>
          )}
          {inv.status === 'returned' && (pattern || inv.proposedFixId) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {pattern && (
                <span className="inline-flex items-center gap-1.5">
                  {t('Evidence on pattern', 'دليل على النمط')} <TraceId kind="pattern" id={pattern.traceId} />
                </span>
              )}
              {inv.proposedFixId && (
                <span className="inline-flex items-center gap-1.5" data-testid="inv-proposed-fix">
                  {t('Fix proposed', 'الحل المقترح')}:{' '}
                  {canOpenFix ? (
                    <Link to={`/actions/corrective?fix=${caId(inv.proposedFixId)}`} className="font-mono text-xs text-primary underline-offset-4 hover:underline">
                      <bdi dir="ltr">{caId(inv.proposedFixId)}</bdi>
                    </Link>
                  ) : (
                    <bdi dir="ltr" className="font-mono text-xs">
                      {caId(inv.proposedFixId)}
                    </bdi>
                  )}
                </span>
              )}
            </div>
          )}
          {inv.status !== 'returned' && (
            <div className="mt-auto flex justify-end">
              <Button size="sm" className="h-9" onClick={() => onRecord(inv.id)}>
                <ClipboardCheck aria-hidden />
                {t('Record the result', 'سجّل النتيجة')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </li>
  )
}

function RequestRow({ pattern }: { pattern: Pattern }) {
  const { t, L } = useI18n()
  const request = useRequestInvestigation()
  const [kind, setKind] = useState<'customer_interviews' | 'mystery_shopper_check'>('customer_interviews')
  const [formOpen, setFormOpen] = useState(false)
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
            // KB §6: a shopper check is requested with environment, scenario and what to look for.
            if (kind === 'mystery_shopper_check') {
              setFormOpen(true)
              return
            }
            request.mutate({ patternId: pattern.id, kind, requestedCount: 5, environment: pattern.team })
            toast.success(t('Five customer interviews requested — Close the loop picks the people', 'طُلبت خمس مقابلات مع العملاء — صفحة إغلاق الحلقة تختار الأشخاص'))
          }}
        >
          <Send aria-hidden className="rtl:-scale-x-100" />
          {t('Request', 'طلب')}
        </Button>
      </div>
      {formOpen && (
        <ShopperCheckDialog
          pattern={pattern}
          onCancel={() => setFormOpen(false)}
          onSubmit={(v) => {
            request.mutate({ patternId: pattern.id, kind: 'mystery_shopper_check', environment: v.environment, scenario: v.scenario, lookFor: v.lookFor })
            setFormOpen(false)
            toast.success(t('Mystery shopper check requested', 'طُلب فحص تسوق سري'))
          }}
        />
      )}
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
            <DialogTitle>{t('Record the result', 'سجّل النتيجة')}</DialogTitle>
            <DialogDescription>{t('A short summary is enough. It becomes evidence on the pattern, and a fix is proposed for approval when the pattern has none.', 'يكفي ملخص قصير. يصبح دليلاً على النمط، ويُقترح حل للاعتماد إن لم يكن للنمط حل.')}</DialogDescription>
          </DialogHeader>
          <Field data-invalid={!!errors.summary}>
            <FieldLabel htmlFor="inv-summary">{t('What came back', 'ما عاد من نتائج')}</FieldLabel>
            <Textarea
              id="inv-summary"
              rows={4}
              aria-invalid={!!errors.summary}
              placeholder={t('Interviews confirm the cause...', 'تؤكد المقابلات السبب...')}
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

const checkSchema = z.object({
  environment: z.string().trim().min(2, 'environment'),
  scenario: z.string().trim().min(5, 'scenario'),
  lookFor: z.string().trim().min(5, 'lookFor'),
})
type CheckValues = z.infer<typeof checkSchema>

/** KB §6 [investigate-form]: requesting a mystery shopper check — environment, scenario and what to look for. */
function ShopperCheckDialog({ pattern, onCancel, onSubmit }: { pattern: Pattern; onCancel: () => void; onSubmit: (v: CheckValues) => void }) {
  const { t, L } = useI18n()
  const { register, handleSubmit, formState: { errors } } = useForm<CheckValues>({
    resolver: zodResolver(checkSchema),
    defaultValues: { environment: pattern.team, scenario: '', lookFor: '' },
  })
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{t('Request a mystery shopper check', 'طلب فحص تسوق سري')}</DialogTitle>
            <DialogDescription>
              {L(signalCategoryLabel(pattern.category))} — {pattern.team}. {t('The result comes back as evidence on the pattern; only then is a fix proposed.', 'تعود النتيجة كدليل على النمط؛ وعندها فقط يُقترح إصلاح.')}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={!!errors.environment}>
              <FieldLabel htmlFor="chk-env">{t('Environment', 'البيئة')}</FieldLabel>
              <Input id="chk-env" aria-invalid={!!errors.environment} {...register('environment')} />
              {errors.environment && <FieldError>{t('Name the environment.', 'حدّد البيئة.')}</FieldError>}
            </Field>
            <Field data-invalid={!!errors.scenario}>
              <FieldLabel htmlFor="chk-scenario">{t('Scenario', 'السيناريو')}</FieldLabel>
              <Input id="chk-scenario" aria-invalid={!!errors.scenario} placeholder={t('e.g. walk-in with no lead', 'مثال: زيارة دون عميل محتمل')} {...register('scenario')} />
              {errors.scenario && <FieldError>{t('Describe the scenario (at least 5 characters).', 'صف السيناريو (5 أحرف على الأقل).')}</FieldError>}
            </Field>
            <Field data-invalid={!!errors.lookFor}>
              <FieldLabel htmlFor="chk-look">{t('What to look for', 'ما يُبحث عنه')}</FieldLabel>
              <Textarea id="chk-look" rows={3} aria-invalid={!!errors.lookFor} {...register('lookFor')} />
              {errors.lookFor && <FieldError>{t('Say what the shopper should look for.', 'وضّح ما يجب أن يبحث عنه المتسوق.')}</FieldError>}
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('Cancel', 'إلغاء')}
            </Button>
            <Button type="submit">{t('Request the check', 'طلب الفحص')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
