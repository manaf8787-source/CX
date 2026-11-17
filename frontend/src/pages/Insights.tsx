import { useState } from 'react'
import { useI18n } from '../i18n'
import { useRole } from '../auth/RoleContext'
import { PageHeader } from '../components/layout/PageHeader'
import { Chip, ProductTag } from '../components/ui/Chip'
import { SUGGESTED_ACTIONS } from '../data/insights'

export default function Insights() {
  const { L, t } = useI18n()
  const { role } = useRole()
  const [sent, setSent] = useState<Set<string>>(new Set())
  const canApprove = role?.id === 'cxmgr'

  return (
    <div className="main" style={{ gap: 12 }}>
      <PageHeader title={t('AI Insights', 'رؤى الذكاء الاصطناعي')} lede={t('Reads past incidents and surveys and suggests what to do, with the evidence. Nothing becomes a case until the CX manager approves.', 'تقرأ الحوادث والاستبيانات السابقة وتقترح إجراءً مع الأدلة. لا يصبح أي شيء حالة حتى يعتمده مدير تجربة العملاء.')} />
      <div className="list">
        {SUGGESTED_ACTIONS.map((s) => (
          <div className="card" key={s.id}>
            <div className="card-h">
              <div className="row">
                <ProductTag productId={s.product} />
                <h2 style={{ fontSize: 14 }}>{L(s.category)}</h2>
                {s.environment && <span className="ent">{s.environment}</span>}
              </div>
              <Chip kind="acc">{s.successRate}% {t('success in similar cases', 'نجاح في حالات مشابهة')}</Chip>
            </div>
            <p className="sm muted">{L(s.evidence)}</p>
            <div className="row between" style={{ marginTop: 8 }}>
              <div>
                <span className="sm">{t('Suggested action', 'الإجراء المقترح')}: </span>
                <b className="sm">{L(s.suggestedAction)}</b>
                <span className="sm muted"> · {s.similarCases} {t('similar cases', 'حالات مشابهة')}</span>
              </div>
              {sent.has(s.id) ? (
                <Chip kind="good">{t('Sent to a case', 'أُرسلت كحالة')}</Chip>
              ) : canApprove ? (
                <button className="btn s primary" onClick={() => setSent((set) => new Set(set).add(s.id))}>{t('Approve and send to a case', 'اعتماد وإرسال كحالة')}</button>
              ) : (
                <span className="sm muted">{t('Only the CX manager can approve', 'فقط مدير تجربة العملاء يمكنه الاعتماد')}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
