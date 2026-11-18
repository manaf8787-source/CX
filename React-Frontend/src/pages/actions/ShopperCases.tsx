import { useState } from 'react'
import { ArrowRight, Gavel, UserRound } from 'lucide-react'
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
import { ClockBadge } from './components/ClockBadge'
import { DecisionDialog } from './components/DecisionDialog'
import { InlineNote } from './components/InlineNote'
import { StepPills } from './components/StepPills'
import { TermHelp } from '@/components/common/TermHelp'

/** Mystery shopper checklist categories, in both languages. */
const SHOPPER_CATEGORY_LABEL: Record<string, { en: string; ar: string }> = {
  greeting: { en: 'Greeting', ar: 'الاستقبال والترحيب' },
  needs_discovery: { en: 'Needs discovery', ar: 'اكتشاف الاحتياجات' },
  pricing_disclosure: { en: 'Pricing disclosure', ar: 'الإفصاح عن الأسعار' },
  handover_process: { en: 'Handover process', ar: 'عملية التسليم' },
  follow_up_commitment: { en: 'Follow-up commitment', ar: 'الالتزام بالمتابعة' },
}

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
    <div data-density="dense" className="flex flex-col gap-4">
      <InlineNote>
        {t('Critical opens same-day: respond within 1 working day, resolve within 5. A visit scoring under 60% is at least medium regardless of individual item results.', 'الحالة الحرجة تُفتح في اليوم نفسه: الرد خلال يوم عمل واحد والحل خلال 5 أيام. أي زيارة تقل درجتها عن 60% تُصنَّف متوسطة على الأقل بغض النظر عن نتائج البنود الفردية.')}
      </InlineNote>

      {isLoading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !cases?.length ? (
        <EmptyState title={t('No shopper cases yet.', 'لا توجد حالات تسوق سري بعد.')} />
      ) : (
        <ul className="flex flex-col gap-(--grid-gap)">
          {cases.map((c) => {
            const flow = FLOW.filter((step) => step !== 'hr_review' || c.isConductIssue)
            const currentIndex = flow.indexOf(c.status)
            const next = FLOW[Math.min(FLOW.length - 1, FLOW.indexOf(c.status) + 1)]
            return (
              <li key={c.id}>
                <Card>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge tone={SEVERITY_TONE[c.severity]} dot>
                            {L(SEVERITY_LABEL[c.severity])}
                          </StatusBadge>
                          <h2 className="t-h4">{SHOPPER_CATEGORY_LABEL[c.category] ? L(SHOPPER_CATEGORY_LABEL[c.category]) : c.category.replace(/_/g, ' ')}</h2>
                          <ProductTag productId={c.product} lang={lang} />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {c.environment} · {t('visit score', 'درجة الزيارة')} <TermHelp term="Mystery Shopper Score" className="inline-flex size-5 align-middle" />{' '}
                          <bdi dir="ltr" className="font-medium text-foreground tabular">
                            {c.visitScorePct}%
                          </bdi>
                        </span>
                      </div>
                      <StatusBadge tone={informedOnly ? 'neutral' : 'info'} icon={<UserRound aria-hidden />} className="self-start">
                        {informedOnly ? t('Informed only', 'للعلم فقط') : `${t('Owner', 'المالك')}: ${c.ownerTitle}`}
                      </StatusBadge>
                    </div>

                    <div className="well flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-flex items-center text-muted-foreground">{t('Respond', 'الرد')}<TermHelp term="Respond clock" className="size-5" /></span>
                        <ClockBadge dueIso={c.respondDueAt} totalWindowMs={1 * DAY_MS} stoppedAtIso={c.respondedAt} />
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="text-muted-foreground">{t('Resolve', 'الحل')}</span>
                        <ClockBadge dueIso={c.resolveDueAt} totalWindowMs={5 * DAY_MS} stoppedAtIso={c.closedAt} />
                      </span>
                    </div>

                    <StepPills
                      label={t('Case flow', 'مسار الحالة')}
                      steps={flow.map((step, i) => ({ key: step, label: L(STEP_LABEL[step]), state: i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'todo' }))}
                    />
                    {c.isConductIssue && (
                      <p className="text-sm text-muted-foreground">
                        {t("Conduct issue — routes through HR, then the agent's direct manager reviews HR's actions.", 'قضية سلوكية — تمر عبر الموارد البشرية، ثم يراجعها المدير المباشر للوكيل.')}
                      </p>
                    )}

                    <div className="-mx-2.5">
                      <Table>
                        <TableHeader>
                          <TableRow className="row-divider-none">
                            <TableHead className="w-10">#</TableHead>
                            <TableHead>{t('Proposed action', 'الإجراء المقترح')}</TableHead>
                            <TableHead className="w-36">{t('Decision', 'القرار')}</TableHead>
                            <TableHead className="w-28">
                              <span className="sr-only">{t('Actions', 'الإجراءات')}</span>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {c.proposedActions.map((p) => (
                            <TableRow key={p.n}>
                              <TableCell className="tabular">{p.n}</TableCell>
                              <TableCell className="whitespace-normal text-foreground">{L(p.text)}</TableCell>
                              <TableCell>
                                <StatusBadge tone={LINE_DECISION[p.decision].tone}>{L(LINE_DECISION[p.decision].label)}</StatusBadge>
                              </TableCell>
                              <TableCell className="text-end">
                                {canAct && p.decision === 'pending' && (
                                  <Button variant="outline" size="xs" onClick={() => setDecidingLine({ caseId: c.id, n: p.n })}>
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
            if (v.decision === 'approved' || v.decision === 'investigate') return
            decideLine.mutate({ caseId: decidingLine.caseId, n: decidingLine.n, decision: v.decision })
            setDecidingLine(null)
            toast.success(t('Decision saved', 'تم حفظ القرار'))
          }}
        />
      )}
    </div>
  )
}
