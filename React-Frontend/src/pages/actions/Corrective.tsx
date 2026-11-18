import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, Clock4, Inbox, ListChecks } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useCorrectiveActions, useDecideCorrectiveAction, usePatternsAll } from '@/services/queries'
import { useSendToInvestigation } from '@/services/referenceQueries'
import { useNow } from '@/hooks/useNow'
import { visibleFixes } from '@/utils/inbox'
import { caId } from '@/utils/trace'
import { KpiTile } from '@/components/common/KpiTile'
import { CORRECTIVE_STATUS_LABEL } from '@/lib/status'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { DecisionDialog } from './components/DecisionDialog'
import { FixCard } from './components/FixCard'
import { HandoffsBlock } from './components/HandoffsBlock'

const STATUS_FILTERS = ['all', 'proposed', 'approved', 'in_progress', 'verification', 'effective', 'partial', 'failed'] as const

export default function Corrective() {
  const { t, L } = useI18n()
  const { role } = useRole()
  // `dataUpdatedAt`: the mock registers are edited in place (a decision, a status change), so the array keeps its identity; the stamp is the change signal.
  const { data: actions, isLoading, error, refetch, dataUpdatedAt } = useCorrectiveActions()
  const { data: patterns } = usePatternsAll()
  const decide = useDecideCorrectiveAction()
  const sendToInvestigation = useSendToInvestigation()
  const now = useNow()
  const [params] = useSearchParams()
  const selectedFix = params.get('fix')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('all')
  const [decidingId, setDecidingId] = useState<string | null>(null)

  // KB §15: L&D sees only actions classified as training gap; KB §2: environment management sees only its own environment.
  const scoped = useMemo(
    () => visibleFixes(actions ?? [], patterns ?? [], role.id, role.environment),
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [actions, patterns, role, dataUpdatedAt],
  )
  const visible = scoped.filter((a) => statusFilter === 'all' || a.status === statusFilter)
  const closed = ['effective', 'partial', 'failed']
  const tally = {
    proposed: scoped.filter((a) => a.status === 'proposed').length,
    open: scoped.filter((a) => !closed.includes(a.status)).length,
    late: scoped.filter((a) => !closed.includes(a.status) && a.status !== 'verification' && new Date(a.dueDate).getTime() < now).length,
    effective: scoped.filter((a) => a.status === 'effective').length,
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
        <ul className="flex flex-col gap-6">
          {visible.map((a) => (
            <FixCard
              key={a.id}
              fix={a}
              pattern={patterns?.find((p) => p.id === a.patternId)}
              selected={!!selectedFix && (selectedFix === caId(a.id) || selectedFix === a.id)}
              now={now}
              onDecide={setDecidingId}
            />
          ))}
        </ul>
      )}

      <HandoffsBlock />

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
              const pattern = action ? patterns?.find((p) => p.id === action.patternId) : undefined
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
