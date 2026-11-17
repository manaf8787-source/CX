import { useState } from 'react'
import { useI18n } from '../../i18n'
import { useRole } from '../../auth/RoleContext'
import { canActOnShopperCase, isInformedOnly } from '../../auth/permissions'
import { useAdvanceShopperCase, useDecideShopperCaseAction, useShopperCases } from '../../services/queries'
import { ClockBadge } from './components/ClockBadge'
import { DecisionDialog } from './components/DecisionDialog'
import type { ShopperCase } from '../../types'

const DAY_MS = 86_400_000
const FLOW: ShopperCase['status'][] = ['open', 'triaged', 'owner_decision', 'hr_review', 'closed']

export default function ShopperCases() {
  const { t } = useI18n()
  const { role } = useRole()
  const { data: cases } = useShopperCases()
  const decideLine = useDecideShopperCaseAction()
  const advance = useAdvanceShopperCase()
  const [decidingLine, setDecidingLine] = useState<{ caseId: string; n: number } | null>(null)
  const canAct = canActOnShopperCase(role.id)
  const informedOnly = isInformedOnly(role.id)

  return (
    <div className="col">
      <div className="card tint">
        <p className="text-sm">
          {t('Critical opens same-day: respond within 1 working day, resolve within 5. A visit scoring under 60% is at least medium regardless of individual item results.', 'الحالة الحرجة تُفتح في اليوم نفسه: الرد خلال يوم عمل واحد والحل خلال 5 أيام. أي زيارة تقل درجتها عن 60% تُصنَّف متوسطة على الأقل بغض النظر عن نتائج البنود الفردية.')}
        </p>
      </div>

      <div className="col">
        {cases?.map((c) => (
          <div className="card" key={c.id}>
            <div className="row between" style={{ alignItems: 'flex-start' }}>
              <div className="col" style={{ gap: 4 }}>
                <div className="row">
                  <span className={`chip ${c.severity === 'critical' ? 'crit' : c.severity === 'medium' ? 'warn' : ''}`}>{c.severity}</span>
                  <span className="text-sm">{c.category.replace(/_/g, ' ')}</span>
                  <span className="text-sm muted">{c.environment} · {t('visit score', 'درجة الزيارة')} {c.visitScorePct}%</span>
                </div>
                <div className="row text-sm muted">
                  {t('Respond', 'الرد')} <ClockBadge dueIso={c.respondDueAt} totalWindowMs={1 * DAY_MS} />
                  {t('Resolve', 'الحل')} <ClockBadge dueIso={c.resolveDueAt} totalWindowMs={5 * DAY_MS} />
                </div>
              </div>
              <span className={`chip ${informedOnly ? '' : 'accent'}`}>
                {informedOnly ? t('Informed only', 'للعلم فقط') : `${t('Owner', 'المالك')}: ${c.ownerTitle}`}
              </span>
            </div>

            <div className="row" style={{ marginTop: 10, gap: 4, flexWrap: 'wrap' }}>
              {FLOW.map((step, i) => {
                const atOrPast = FLOW.indexOf(c.status) >= i
                const isConductGate = step === 'hr_review' && !c.isConductIssue
                if (isConductGate) return null
                return <span key={step} className={`chip ${atOrPast ? (step === c.status ? 'accent' : 'good') : ''}`}>{step.replace(/_/g, ' ')}</span>
              })}
            </div>
            {c.isConductIssue && <p className="text-sm muted" style={{ marginTop: 4 }}>{t("Conduct issue — routes through HR, then the agent's direct manager reviews HR's actions.", 'قضية سلوكية — تمر عبر الموارد البشرية، ثم يراجعها المدير المباشر للوكيل.')}</p>}

            <div className="table-wrap" style={{ marginTop: 10 }}>
              <table>
                <thead><tr><th>#</th><th>{t('Proposed action', 'الإجراء المقترح')}</th><th>{t('Decision', 'القرار')}</th><th /></tr></thead>
                <tbody>
                  {c.proposedActions.map((p) => (
                    <tr key={p.n}>
                      <td className="mono">{p.n}</td>
                      <td>{p.text.en}</td>
                      <td><span className={`chip ${p.decision === 'confirmed' ? 'good' : p.decision === 'rejected' ? 'crit' : p.decision === 'modified' ? 'warn' : ''}`}>{p.decision}</span></td>
                      <td>
                        {canAct && p.decision === 'pending' && (
                          <button type="button" className="btn sm" onClick={() => setDecidingLine({ caseId: c.id, n: p.n })}>{t('Decide', 'قرار')}</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {canAct && c.status !== 'closed' && (
              <div className="row" style={{ marginTop: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn sm" onClick={() => advance.mutate({ caseId: c.id, status: FLOW[Math.min(FLOW.length - 1, FLOW.indexOf(c.status) + 1)] })}>
                  {t('Advance to next step', 'الانتقال للخطوة التالية')}
                </button>
              </div>
            )}
          </div>
        ))}
        {!cases?.length && <div className="empty-state">{t('No shopper cases yet.', 'لا توجد حالات تسوق سري بعد.')}</div>}
      </div>

      {decidingLine && (
        <DecisionDialog
          title={t('Decide this proposed action', 'اتخاذ قرار بشأن هذا الإجراء المقترح')}
          approveLabel="confirmed"
          onCancel={() => setDecidingLine(null)}
          onSubmit={(v) => {
            if (v.decision === 'approved') return
            decideLine.mutate({ caseId: decidingLine.caseId, n: decidingLine.n, decision: v.decision, })
            setDecidingLine(null)
          }}
        />
      )}
    </div>
  )
}
