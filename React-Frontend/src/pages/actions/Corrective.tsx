import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n'
import { useRole } from '../../auth/RoleContext'
import { canActOnCorrectiveAction } from '../../auth/permissions'
import { useCorrectiveActions, useDecideCorrectiveAction, usePatterns } from '../../services/queries'
import { evaluateEffectiveness, EFFECTIVENESS_LABEL } from '../../utils/effectiveness'
import { LifecycleStepper } from './components/LifecycleStepper'
import { HowAiFoundThis } from './components/HowAiFoundThis'
import { DecisionDialog } from './components/DecisionDialog'
import type { CorrectiveAction, CorrectiveActionKind } from '../../types'

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

const STATUS_FILTERS = ['all', 'proposed', 'approved', 'in_progress', 'verification', 'effective', 'partial', 'failed'] as const

export default function Corrective() {
  const { t, L } = useI18n()
  const { role } = useRole()
  const { data: actions } = useCorrectiveActions()
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
    <div className="col">
      <div className="row between">
        <div className="row">
          <span className="text-sm muted">{t('Status', 'الحالة')}</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>{s === 'all' ? t('All', 'الكل') : s}</option>
            ))}
          </select>
        </div>
        <span className="text-sm muted">{visible.length} {t('actions', 'إجراء')}</span>
      </div>

      <div className="col">
        {visible.map((a) => {
          const canAct = canActOnCorrectiveAction(role.id, a.kind)
          const eff = a.monthlySignalSeries && a.startedMonthIndex !== undefined ? evaluateEffectiveness(a.monthlySignalSeries, a.startedMonthIndex) : null
          const pattern = patternFor(a)
          return (
            <div className="card" key={a.id}>
              <div className="row between" style={{ alignItems: 'flex-start' }}>
                <div className="col" style={{ gap: 4 }}>
                  <div className="row">
                    <b>{L(a.title)}</b>
                    <span className="chip accent">{L(KIND_LABEL[a.kind])}</span>
                  </div>
                  {a.kind === 'employee' && (
                    <span className="text-sm" style={{ color: 'var(--warn)' }}>
                      {t('Management note — the direct manager only, never a case, never HR, never a name outside this line.', 'ملاحظة إدارية — للمدير المباشر فقط، دون حالة أو موارد بشرية أو اسم خارج هذا الخط.')}
                    </span>
                  )}
                  <span className="text-sm muted">{t('Owner', 'المالك')}: {a.owner} · {t('Due', 'الاستحقاق')} {new Date(a.dueDate).toLocaleDateString()}</span>
                </div>
                {canAct && a.status === 'proposed' && (
                  <button type="button" className="btn primary sm" onClick={() => setDecidingId(a.id)}>{t('Decide', 'اتخاذ قرار')}</button>
                )}
              </div>

              <div style={{ marginTop: 10 }}>
                <LifecycleStepper status={a.status} />
              </div>

              {a.decision && a.decision !== 'approved' && (
                <div className="text-sm" style={{ marginTop: 8 }}>
                  <span className={`chip ${a.decision === 'rejected' ? 'crit' : 'warn'}`}>{a.decision}</span>{' '}
                  {a.decisionReason && <span className="muted">{L(a.decisionReason)}</span>}
                </div>
              )}

              {eff && (a.status === 'verification' || a.status === 'effective' || a.status === 'partial' || a.status === 'failed') && (
                <div className="text-sm" style={{ marginTop: 8 }}>
                  {t('60-day verification', 'تحقق 60 يوماً')}:{' '}
                  <span className={`chip ${eff.verdict === 'effective' ? 'good' : eff.verdict === 'failed' ? 'crit' : 'warn'}`}>{L(EFFECTIVENESS_LABEL[eff.verdict])}</span>{' '}
                  <span className="muted mono">({Math.round(eff.changePct * 100)}%)</span>
                </div>
              )}

              <div style={{ marginTop: 10 }}>
                <HowAiFoundThis actionId={a.id} pattern={pattern} />
              </div>
            </div>
          )
        })}
        {!visible.length && <div className="empty-state">{t('No corrective actions for this filter.', 'لا توجد إجراءات تصحيحية لهذا الفلتر.')}</div>}
      </div>

      {decidingId && (
        <DecisionDialog
          title={t('Decide this corrective action', 'اتخاذ قرار بشأن هذا الإجراء')}
          approveLabel="approved"
          onCancel={() => setDecidingId(null)}
          onSubmit={(v) => {
            if (v.decision === 'confirmed') return
            decide.mutate({ id: decidingId, decision: v.decision, reason: v.reason })
            setDecidingId(null)
          }}
        />
      )}
    </div>
  )
}
