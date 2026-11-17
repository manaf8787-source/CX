import { useMemo, useState } from 'react'
import { CalendarClock, Gavel, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canActOnCorrectiveAction } from '@/auth/permissions'
import { useCorrectiveActions, useDecideCorrectiveAction, usePatterns } from '@/services/queries'
import { evaluateEffectiveness, EFFECTIVENESS_LABEL } from '@/utils/effectiveness'
import { CORRECTIVE_STATUS_LABEL } from '@/lib/status'
import type { CorrectiveAction, CorrectiveActionKind } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { LifecycleStepper } from './components/LifecycleStepper'
import { HowAiFoundThis } from './components/HowAiFoundThis'
import { DecisionDialog } from './components/DecisionDialog'

const KIND_LABEL: Record<CorrectiveActionKind, { en: string; ar: string }> = {
  employee: { en: 'Employee (management note)', ar: 'موظف (ملاحظة إدارية)' },
  service_behaviour: { en: 'Service & behaviour', ar: 'الخدمة والسلوك' },
  training_gap: { en: 'Training gap', ar: 'فجوة تدريبية' },
  product_app: { en: 'Product & app', ar: 'المنتج والتطبيق' },
  process: { en: 'Process', ar: 'العملية' },
  environment: { en: 'Environment', ar: 'البيئة' },
  legal_privacy: { en: 'Legal & privacy', ar: 'قانوني وخصوصية' },
  marketing: { en: 'Marketing', ar: 'تسويق' },
}

const DECISION_LABEL = {
  modified: { en: 'Modified', ar: 'معدّل' },
  rejected: { en: 'Rejected', ar: 'مرفوض' },
} as const

const STATUS_FILTERS = ['all', 'proposed', 'approved', 'in_progress', 'verification', 'effective', 'partial', 'failed'] as const

export default function Corrective() {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { data: actions, isLoading, error, refetch } = useCorrectiveActions()
  const { data: patterns } = usePatterns()
  const decide = useDecideCorrectiveAction()
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('all')
  const [decidingId, setDecidingId] = useState<string | null>(null)

  const visible = useMemo(
    () => (actions ?? []).filter((a) => statusFilter === 'all' || a.status === statusFilter),
    [actions, statusFilter],
  )

  function patternFor(a: CorrectiveAction) {
    return patterns?.find((p) => p.id === a.patternId)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label htmlFor="corrective-status" className="text-sm text-muted-foreground">
            {t('Status', 'الحالة')}
          </label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger id="corrective-status" className="h-9 w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === 'all' ? t('All', 'الكل') : L(CORRECTIVE_STATUS_LABEL[s])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm text-muted-foreground tabular-nums">
          {visible.length} {t('actions', 'إجراء')}
        </span>
      </div>

      {isLoading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState title={t('No corrective actions for this filter.', 'لا توجد إجراءات تصحيحية لهذا الفلتر.')} />
      ) : (
        <ul className="flex flex-col gap-4">
          {visible.map((a) => {
            const canAct = canActOnCorrectiveAction(role.id, a.kind)
            const eff = a.monthlySignalSeries && a.startedMonthIndex !== undefined ? evaluateEffectiveness(a.monthlySignalSeries, a.startedMonthIndex) : null
            const showEff = eff && (a.status === 'verification' || a.status === 'effective' || a.status === 'partial' || a.status === 'failed')
            const pattern = patternFor(a)
            return (
              <li key={a.id}>
                <Card className="gap-0 py-0">
                  <CardContent className="flex flex-col gap-4 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold">{L(a.title)}</h2>
                          <StatusBadge tone="info">{L(KIND_LABEL[a.kind])}</StatusBadge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <UserRound aria-hidden className="size-4" />
                            {t('Owner', 'المالك')}: <span className="text-foreground">{a.owner}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarClock aria-hidden className="size-4" />
                            {t('Due', 'الاستحقاق')} <span className="text-foreground tabular-nums">{new Date(a.dueDate).toLocaleDateString(lang)}</span>
                          </span>
                        </div>
                        {a.kind === 'employee' && (
                          <p className="text-sm text-warning-text">
                            {t('Management note — the direct manager only, never a case, never HR, never a name outside this line.', 'ملاحظة إدارية — للمدير المباشر فقط، دون حالة أو موارد بشرية أو اسم خارج هذا الخط.')}
                          </p>
                        )}
                      </div>
                      {canAct && a.status === 'proposed' && (
                        <Button size="sm" className="h-9 shrink-0 self-start" onClick={() => setDecidingId(a.id)}>
                          <Gavel aria-hidden />
                          {t('Decide', 'اتخاذ قرار')}
                        </Button>
                      )}
                    </div>

                    <LifecycleStepper status={a.status} />

                    {(a.decision === 'modified' || a.decision === 'rejected') && (
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <StatusBadge tone={a.decision === 'rejected' ? 'danger' : 'warning'}>{L(DECISION_LABEL[a.decision])}</StatusBadge>
                        {a.decisionReason && <span className="text-muted-foreground">{L(a.decisionReason)}</span>}
                      </div>
                    )}

                    {showEff && (
                      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                        <span className="text-muted-foreground">{t('60-day verification', 'تحقق 60 يوماً')}</span>
                        <StatusBadge tone={eff.verdict === 'effective' ? 'success' : eff.verdict === 'failed' ? 'danger' : eff.verdict === 'too_early' ? 'neutral' : 'warning'}>
                          {L(EFFECTIVENESS_LABEL[eff.verdict])}
                        </StatusBadge>
                        <bdi dir="ltr" className="text-muted-foreground tabular-nums">
                          ({Math.round(eff.changePct * 100)}%)
                        </bdi>
                      </div>
                    )}

                    <HowAiFoundThis actionId={a.id} pattern={pattern} />
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {decidingId && (
        <DecisionDialog
          title={t('Decide this corrective action', 'اتخاذ قرار بشأن هذا الإجراء')}
          approveLabel="approved"
          onCancel={() => setDecidingId(null)}
          onSubmit={(v) => {
            if (v.decision === 'confirmed') return
            decide.mutate({ id: decidingId, decision: v.decision, reason: v.reason })
            setDecidingId(null)
            toast.success(t('Decision saved', 'تم حفظ القرار'))
          }}
        />
      )}
    </div>
  )
}
