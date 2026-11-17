import { useState } from 'react'
import { ArrowRight, Check, Gavel, Info, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canActOnShopperCase, isInformedOnly } from '@/auth/permissions'
import { useAdvanceShopperCase, useDecideShopperCaseAction, useShopperCases } from '@/services/queries'
import { SEVERITY_TONE } from '@/lib/status'
import type { ShopperCase, Severity } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ProductTag } from '@/components/common/Chip'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { cn } from '@/lib/utils'
import { ClockBadge } from './components/ClockBadge'
import { DecisionDialog } from './components/DecisionDialog'

const DAY_MS = 86_400_000
const FLOW: ShopperCase['status'][] = ['open', 'triaged', 'owner_decision', 'hr_review', 'closed']

const STEP_LABEL: Record<ShopperCase['status'], { en: string; ar: string }> = {
  open: { en: 'Open', ar: 'مفتوحة' },
  triaged: { en: 'Triaged', ar: 'مصنّفة' },
  owner_decision: { en: 'Owner decision', ar: 'قرار المالك' },
  hr_review: { en: 'HR review', ar: 'مراجعة الموارد البشرية' },
  closed: { en: 'Closed', ar: 'مغلقة' },
}

const SEVERITY_LABEL: Record<Severity, { en: string; ar: string }> = {
  critical: { en: 'Critical', ar: 'حرجة' },
  medium: { en: 'Medium', ar: 'متوسطة' },
  low: { en: 'Low', ar: 'منخفضة' },
}

const LINE_DECISION: Record<ShopperCase['proposedActions'][number]['decision'], { label: { en: string; ar: string }; tone: 'success' | 'danger' | 'warning' | 'neutral' }> = {
  pending: { label: { en: 'Pending', ar: 'معلّق' }, tone: 'neutral' },
  confirmed: { label: { en: 'Confirmed', ar: 'مؤكد' }, tone: 'success' },
  modified: { label: { en: 'Modified', ar: 'معدّل' }, tone: 'warning' },
  rejected: { label: { en: 'Rejected', ar: 'مرفوض' }, tone: 'danger' },
}

export default function ShopperCases() {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { data: cases, isLoading, error, refetch } = useShopperCases()
  const decideLine = useDecideShopperCaseAction()
  const advance = useAdvanceShopperCase()
  const [decidingLine, setDecidingLine] = useState<{ caseId: string; n: number } | null>(null)
  const canAct = canActOnShopperCase(role.id)
  const informedOnly = isInformedOnly(role.id)

  return (
    <div className="flex flex-col gap-4">
      <aside className="flex gap-3 rounded-xl border border-info/20 bg-info/8 p-4">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-info-text" />
        <p className="max-w-[80ch] text-sm">
          {t('Critical opens same-day: respond within 1 working day, resolve within 5. A visit scoring under 60% is at least medium regardless of individual item results.', 'الحالة الحرجة تُفتح في اليوم نفسه: الرد خلال يوم عمل واحد والحل خلال 5 أيام. أي زيارة تقل درجتها عن 60% تُصنَّف متوسطة على الأقل بغض النظر عن نتائج البنود الفردية.')}
        </p>
      </aside>

      {isLoading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !cases?.length ? (
        <EmptyState title={t('No shopper cases yet.', 'لا توجد حالات تسوق سري بعد.')} />
      ) : (
        <ul className="flex flex-col gap-4">
          {cases.map((c) => {
            const flow = FLOW.filter((step) => step !== 'hr_review' || c.isConductIssue)
            const currentIndex = flow.indexOf(c.status)
            const next = FLOW[Math.min(FLOW.length - 1, FLOW.indexOf(c.status) + 1)]
            return (
              <li key={c.id}>
                <Card className="gap-0 py-0">
                  <CardContent className="flex flex-col gap-4 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge tone={SEVERITY_TONE[c.severity]} dot>
                            {L(SEVERITY_LABEL[c.severity])}
                          </StatusBadge>
                          <h2 className="text-base font-semibold capitalize">{c.category.replace(/_/g, ' ')}</h2>
                          <ProductTag productId={c.product} lang={lang} />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {c.environment} · {t('visit score', 'درجة الزيارة')}{' '}
                          <bdi dir="ltr" className="font-medium text-foreground tabular-nums">
                            {c.visitScorePct}%
                          </bdi>
                        </span>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                          <span className="inline-flex items-center gap-2">
                            <span className="text-muted-foreground">{t('Respond', 'الرد')}</span>
                            <ClockBadge dueIso={c.respondDueAt} totalWindowMs={1 * DAY_MS} stoppedAtIso={c.respondedAt} />
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <span className="text-muted-foreground">{t('Resolve', 'الحل')}</span>
                            <ClockBadge dueIso={c.resolveDueAt} totalWindowMs={5 * DAY_MS} stoppedAtIso={c.closedAt} />
                          </span>
                        </div>
                      </div>
                      <StatusBadge tone={informedOnly ? 'neutral' : 'info'} icon={<UserRound aria-hidden />} className="self-start">
                        {informedOnly ? t('Informed only', 'للعلم فقط') : `${t('Owner', 'المالك')}: ${c.ownerTitle}`}
                      </StatusBadge>
                    </div>

                    <ol aria-label={t('Case flow', 'مسار الحالة')} className="flex flex-wrap items-center gap-1.5">
                      {flow.map((step, i) => {
                        const done = i < currentIndex
                        const current = i === currentIndex
                        return (
                          <li key={step} className="flex items-center gap-1.5" aria-current={current ? 'step' : undefined}>
                            <span
                              className={cn(
                                'inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap',
                                done && 'border-success/25 bg-success/10 text-success-text',
                                current && 'border-primary bg-primary text-primary-foreground',
                                !done && !current && 'border-border bg-card text-muted-foreground',
                              )}
                            >
                              {done && <Check aria-hidden className="size-3.5" />}
                              {L(STEP_LABEL[step])}
                            </span>
                            {i < flow.length - 1 && <span aria-hidden className={cn('hidden h-px w-3 bg-border sm:block', done && 'bg-success/50')} />}
                          </li>
                        )
                      })}
                    </ol>
                    {c.isConductIssue && (
                      <p className="text-sm text-muted-foreground">
                        {t("Conduct issue — routes through HR, then the agent's direct manager reviews HR's actions.", 'قضية سلوكية — تمر عبر الموارد البشرية، ثم يراجعها المدير المباشر للوكيل.')}
                      </p>
                    )}

                    <div className="overflow-hidden rounded-lg border">
                      <Table>
                        <TableHeader className="bg-muted/60">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="h-10 w-10 px-3 text-xs font-semibold text-muted-foreground">#</TableHead>
                            <TableHead className="h-10 px-3 text-xs font-semibold text-muted-foreground">{t('Proposed action', 'الإجراء المقترح')}</TableHead>
                            <TableHead className="h-10 w-36 px-3 text-xs font-semibold text-muted-foreground">{t('Decision', 'القرار')}</TableHead>
                            <TableHead className="h-10 w-28 px-3">
                              <span className="sr-only">{t('Actions', 'الإجراءات')}</span>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {c.proposedActions.map((p) => (
                            <TableRow key={p.n}>
                              <TableCell className="px-3 py-2.5 text-sm text-muted-foreground tabular-nums">{p.n}</TableCell>
                              <TableCell className="px-3 py-2.5 text-sm whitespace-normal">{L(p.text)}</TableCell>
                              <TableCell className="px-3 py-2.5">
                                <StatusBadge tone={LINE_DECISION[p.decision].tone}>{L(LINE_DECISION[p.decision].label)}</StatusBadge>
                              </TableCell>
                              <TableCell className="px-3 py-2.5 text-end">
                                {canAct && p.decision === 'pending' && (
                                  <Button variant="outline" size="sm" className="h-9" onClick={() => setDecidingLine({ caseId: c.id, n: p.n })}>
                                    <Gavel aria-hidden />
                                    {t('Decide', 'قرار')}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {canAct && c.status !== 'closed' && (
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9"
                          onClick={() => {
                            advance.mutate({ caseId: c.id, status: next })
                            toast.success(t(`Moved to ${STEP_LABEL[next].en}`, `نُقلت إلى ${STEP_LABEL[next].ar}`))
                          }}
                        >
                          {t('Advance to next step', 'الانتقال للخطوة التالية')}
                          <ArrowRight aria-hidden className="rtl:rotate-180" />
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

      {decidingLine && (
        <DecisionDialog
          title={t('Decide this proposed action', 'اتخاذ قرار بشأن هذا الإجراء المقترح')}
          approveLabel="confirmed"
          onCancel={() => setDecidingLine(null)}
          onSubmit={(v) => {
            if (v.decision === 'approved') return
            decideLine.mutate({ caseId: decidingLine.caseId, n: decidingLine.n, decision: v.decision })
            setDecidingLine(null)
            toast.success(t('Decision saved', 'تم حفظ القرار'))
          }}
        />
      )}
    </div>
  )
}
