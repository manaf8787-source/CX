import { useMemo, useState } from 'react'
import { CalendarClock, CheckCircle2, Clock4, FileSearch, Gavel, Inbox, ListChecks, Route, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canActOnCorrectiveAction } from '@/auth/permissions'
import { useCorrectiveActions, useDecideCorrectiveAction, usePatterns } from '@/services/queries'
import { useSendToInvestigation } from '@/services/referenceQueries'
import { ACTION_KIND } from '@/lib/actionKinds'
import { useNow } from '@/hooks/useNow'
import { KpiTile } from '@/components/common/KpiTile'
import { evaluateEffectiveness, EFFECTIVENESS_LABEL } from '@/utils/effectiveness'
import { CORRECTIVE_STATUS_LABEL } from '@/lib/status'
import type { CorrectiveAction } from '@/types'
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
  const sendToInvestigation = useSendToInvestigation()
  const now = useNow()
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('all')
  const [decidingId, setDecidingId] = useState<string | null>(null)

  // KB §15: L&D sees only actions classified as training gap; KB §2: environment
  // management sees only its own environment.
  const scoped = useMemo(() => {
    let list = actions ?? []
    if (role.id === 'ld') list = list.filter((a) => a.kind === 'training_gap')
    if (role.id === 'envmgmt' && role.environment) {
      const env = role.environment
      list = list.filter((a) => patterns?.find((p) => p.id === a.patternId)?.team.startsWith(env))
    }
    return list
  }, [actions, patterns, role])
  const visible = useMemo(() => scoped.filter((a) => statusFilter === 'all' || a.status === statusFilter), [scoped, statusFilter])
  const closed = ['effective', 'partial', 'failed']
  const tally = {
    proposed: scoped.filter((a) => a.status === 'proposed').length,
    open: scoped.filter((a) => !closed.includes(a.status)).length,
    late: scoped.filter((a) => !closed.includes(a.status) && a.status !== 'verification' && new Date(a.dueDate).getTime() < now).length,
    effective: scoped.filter((a) => a.status === 'effective').length,
  }

  function patternFor(a: CorrectiveAction) {
    return patterns?.find((p) => p.id === a.patternId)
  }

  return (
    <div className="flex flex-col gap-4">
      <section aria-label={t('The register', 'السجل')} className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile label={t('Proposed', 'مقترحة')} value={tally.proposed} sub={t('Waiting for a person’s yes', 'بانتظار موافقة شخص')} icon={<Inbox />} accent="var(--info)" loading={isLoading} onClick={() => setStatusFilter('proposed')} />
        <KpiTile label={t('Open', 'مفتوحة')} value={tally.open} sub={t('Not yet verified', 'لم يُتحقق منها بعد')} icon={<ListChecks />} accent="var(--warning)" loading={isLoading} onClick={() => setStatusFilter('all')} />
        <KpiTile label={t('Late', 'متأخرة')} value={tally.late} sub={t('Past the due date', 'تجاوزت تاريخ الاستحقاق')} icon={<Clock4 />} accent="var(--destructive)" loading={isLoading} />
        <KpiTile term="60-day check" label={t('Effective', 'فعّالة')} value={tally.effective} sub={t('Signals halved, held 90 days', 'انخفضت الإشارات للنصف وثبتت 90 يوماً')} icon={<CheckCircle2 />} accent="var(--success)" loading={isLoading} onClick={() => setStatusFilter('effective')} />
      </section>
      {role.id === 'ld' && (
        <p className="text-sm text-muted-foreground">{t('Showing the actions classified as training gap — the ones L&D receives.', 'عرض الإجراءات المصنفة كفجوة تدريبية — التي يستلمها التعلم والتطوير.')}</p>
      )}
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
                          <StatusBadge tone="info">{L(ACTION_KIND[a.kind].label)}</StatusBadge>
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
                      {canAct && a.status === 'proposed' && !a.sentToInvestigation && (
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

                    {a.sentToInvestigation && (
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <StatusBadge tone="info" icon={<FileSearch aria-hidden />}>
                          {t('Sent to investigation first', 'أُحيل إلى التحقيق أولاً')}
                        </StatusBadge>
                        <span className="text-muted-foreground">{t('Five customer interviews requested; see Investigations.', 'طُلبت خمس مقابلات مع العملاء؛ انظر التحقيقات.')}</span>
                      </div>
                    )}
                    <div className="grid gap-x-4 gap-y-2 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                          <Route aria-hidden className="size-3.5" />
                          {t('Kind and path', 'النوع والمسار')}
                        </span>
                        <span>{L(ACTION_KIND[a.kind].path)}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-muted-foreground">{t('Who receives it', 'من يستلمه')}</span>
                        <span>{a.owner}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-muted-foreground">{t('What comes back', 'ما الذي يعود')}</span>
                        <span>{L(ACTION_KIND[a.kind].comesBack)}</span>
                      </div>
                    </div>
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
          allowInvestigate
          onCancel={() => setDecidingId(null)}
          onSubmit={(v) => {
            if (v.decision === 'confirmed') return
            if (v.decision === 'investigate') {
              const action = actions?.find((x) => x.id === decidingId)
              const pattern = action ? patternFor(action) : undefined
              sendToInvestigation.mutate({ actionId: decidingId, patternId: pattern?.id, environment: pattern?.team, reason: v.reason })
              setDecidingId(null)
              toast.success(t('Sent to investigation — five interviews requested', 'أُحيل إلى التحقيق — طُلبت خمس مقابلات'))
              return
            }
            decide.mutate({ id: decidingId, decision: v.decision, reason: v.reason })
            setDecidingId(null)
            toast.success(t('Decision saved', 'تم حفظ القرار'))
          }}
        />
      )}
    </div>
  )
}
