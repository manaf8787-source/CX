import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, ChevronsDownUp, ChevronsUpDown, Clock4, Inbox, ListChecks } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useCorrectiveActions, useDecideCorrectiveAction, usePatternsAll } from '@/services/queries'
import { useSendToInvestigation } from '@/services/referenceQueries'
import { useNow } from '@/hooks/useNow'
import { visibleFixes } from '@/utils/inbox'
import { caId } from '@/utils/trace'
import { Button } from '@/components/ui/button'
import { KpiTile } from '@/components/common/KpiTile'
import { CORRECTIVE_STATUS_LABEL } from '@/lib/status'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { DecisionDialog } from './components/DecisionDialog'
import { FixCard } from './components/FixCard'
import { HandoffsBlock } from './components/HandoffsBlock'
import { InlineNote } from './components/InlineNote'

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

  // The cards fold their details so the page is not extremely long: the first card is open, and the one a link named (`?fix=`).
  // Until the person touches a toggle the open set is derived (first visible card plus the selected one); after that it is theirs.
  const isSelected = (a: { id: string }) => !!selectedFix && (selectedFix === caId(a.id) || selectedFix === a.id)
  const [openIds, setOpenIds] = useState<ReadonlySet<string> | null>(null)
  const derivedOpen = useMemo(() => new Set(visible.filter((a, i) => i === 0 || isSelected(a)).map((a) => a.id)), [visible, selectedFix]) // oxlint-disable-line react-hooks/exhaustive-deps
  const openNow = openIds ?? derivedOpen
  const setOpen = (id: string, open: boolean) =>
    setOpenIds((prev) => {
      const next = new Set(prev ?? derivedOpen)
      if (open) next.add(id)
      else next.delete(id)
      return next
    })
  // A link that names a fix after the person has already folded things opens that fix.
  useEffect(() => {
    const target = scoped.find(isSelected)
    if (target) setOpenIds((prev) => (prev && !prev.has(target.id) ? new Set(prev).add(target.id) : prev))
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFix])
  const closed = ['effective', 'partial', 'failed']
  const tally = {
    proposed: scoped.filter((a) => a.status === 'proposed').length,
    open: scoped.filter((a) => !closed.includes(a.status)).length,
    late: scoped.filter((a) => !closed.includes(a.status) && a.status !== 'verification' && new Date(a.dueDate).getTime() < now).length,
    effective: scoped.filter((a) => a.status === 'effective').length,
  }

  return (
    <div data-density="dense" className="flex flex-col gap-4">
      <section aria-label={t('The register', 'السجل')} className="grid grid-cols-2 gap-(--grid-gap) md:grid-cols-4">
        <KpiTile label={t('Proposed', 'مقترحة')} value={tally.proposed} sub={t('Waiting for a person’s yes', 'بانتظار موافقة شخص')} icon={<Inbox />} loading={isLoading} onClick={() => setStatusFilter('proposed')} />
        <KpiTile label={t('Open', 'مفتوحة')} value={tally.open} sub={t('Not yet verified', 'لم يُتحقق منها بعد')} icon={<ListChecks />} loading={isLoading} onClick={() => setStatusFilter('all')} />
        <KpiTile label={t('Late', 'متأخرة')} value={tally.late} sub={t('Past the due date', 'تجاوزت تاريخ الاستحقاق')} icon={<Clock4 />} accent={tally.late ? 'var(--destructive)' : undefined} loading={isLoading} />
        <KpiTile term="60-day check" label={t('Effective', 'فعّالة')} value={tally.effective} sub={t('Signals halved, held 90 days', 'انخفضت الإشارات للنصف وثبتت 90 يوماً')} icon={<CheckCircle2 />} loading={isLoading} onClick={() => setStatusFilter('effective')} />
      </section>
      {role.id === 'ld' && (
        <InlineNote tone="neutral">{t('Showing the actions classified as training gap — the ones L&D receives.', 'عرض الإجراءات المصنفة كفجوة تدريبية — التي يستلمها التعلم والتطوير.')}</InlineNote>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label htmlFor="corrective-status" className="t-body-s">
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
        <div className="flex items-center gap-2">
          <span className="t-body-s tabular">
            {visible.length} {t('actions', 'إجراء')}
          </span>
          {visible.length > 1 && (
            <Button variant="outline" size="sm" onClick={() => setOpenIds(openNow.size >= visible.length ? new Set() : new Set(visible.map((a) => a.id)))}>
              {openNow.size >= visible.length ? <ChevronsDownUp aria-hidden /> : <ChevronsUpDown aria-hidden />}
              {openNow.size >= visible.length ? t('Collapse all', 'طيّ الكل') : t('Expand all', 'فتح الكل')}
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState title={t('No corrective actions for this filter.', 'لا توجد إجراءات تصحيحية لهذا الفلتر.')} />
      ) : (
        <ul className="flex flex-col gap-4">
          {visible.map((a) => (
            <FixCard
              key={a.id}
              fix={a}
              pattern={patterns?.find((p) => p.id === a.patternId)}
              selected={isSelected(a)}
              now={now}
              onDecide={setDecidingId}
              open={openNow.has(a.id)}
              onOpenChange={(o) => setOpen(a.id, o)}
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
