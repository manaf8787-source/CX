import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { SampleBanner } from '../../components/common/SampleBanner'
import { Chip } from '../../components/common/Chip'
import { useCorrectiveActions, useLdRequests, useStandards } from '../../services/queries'

/** Net-new — no dedicated L&D page or role existed in the pre-omnichannel
 * scaffold (APPLICATION_MODULES.md §C: "HR pages don't cover L&D"). Reads
 * the training-gap kind of corrective action and the standards L&D owns,
 * rather than inventing a third data model for the same facts. */
export default function Ld() {
  const { t, L } = useI18n()
  const { data: actions } = useCorrectiveActions()
  const { data: standards } = useStandards()
  const { data: requests } = useLdRequests()

  const trainingGapActions = (actions ?? []).filter((a) => a.kind === 'training_gap')
  const ownedStandards = (standards ?? []).filter((s) => s.writer.en.toLowerCase().includes('l&d') || s.owner.toLowerCase().includes('l&d'))

  return (
    <div className="col">
      <div className="row between">
        <p className="text-sm muted">{t('Training-gap actions, L&D requests, and the standards L&D owns and writes.', 'إجراءات فجوة التدريب، طلبات التعلم والتطوير، والمعايير التي يملكها ويكتبها قسم التعلم والتطوير.')}</p>
        <SampleBanner />
      </div>

      <div className="card">
        <div className="card-head"><h2>{t('Training-gap corrective actions', 'الإجراءات التصحيحية لفجوة التدريب')}</h2></div>
        <div className="col" style={{ gap: 6 }}>
          {trainingGapActions.map((a) => (
            <div className="row between" key={a.id}>
              <span className="text-sm">{L(a.title)}</span>
              <Chip tone={a.status === 'effective' ? 'good' : a.status === 'failed' ? 'crit' : 'accent'}>{a.status}</Chip>
            </div>
          ))}
          {!trainingGapActions.length && <div className="empty-state">{t('No training-gap actions open right now.', 'لا توجد إجراءات فجوة تدريب مفتوحة حالياً.')}</div>}
        </div>
        <Link to="/actions/corrective" className="btn sm" style={{ marginTop: 8, alignSelf: 'flex-start' }}>{t('Open Actions → Corrective actions', 'فتح الإجراءات ← الإجراءات التصحيحية')}</Link>
      </div>

      <div className="card">
        <div className="card-head"><h2>{t('L&D requests', 'طلبات التعلم والتطوير')}</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('Request', 'الطلب')}</th><th>{t('Requested by', 'الطلب من')}</th><th>{t('Status', 'الحالة')}</th></tr></thead>
            <tbody>
              {(requests ?? []).map((r) => (
                <tr key={r.id}>
                  <td className="text-sm">{L(r.title)}</td>
                  <td className="text-sm muted">{r.requestedBy}{r.environment ? ` · ${r.environment}` : ''}</td>
                  <td><Chip tone={r.status === 'delivered' ? 'good' : r.status === 'scheduled' ? 'accent' : undefined}>{r.status}</Chip></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>{t('Standards L&D owns', 'المعايير التي يملكها قسم التعلم والتطوير')}</h2></div>
        <div className="col" style={{ gap: 6 }}>
          {ownedStandards.map((s) => (
            <div className="row between" key={s.id}>
              <span className="text-sm mono muted">{s.code}</span>
              <span className="text-sm" style={{ flex: 1, marginInlineStart: 8 }}>{L(s.title)}</span>
              <Chip>{s.status}</Chip>
            </div>
          ))}
          {!ownedStandards.length && <div className="empty-state">{t('No L&D-owned standards matched yet.', 'لا توجد معايير مملوكة للتعلم والتطوير بعد.')}</div>}
        </div>
        <Link to="/settings/standards" className="btn sm" style={{ marginTop: 8, alignSelf: 'flex-start' }}>{t('Open the full standards register', 'فتح سجل المعايير الكامل')}</Link>
        <p className="text-sm muted" style={{ marginTop: 6 }}>
          {t('CX approves a standard for scoring; L&D writes it (FR: "writes the standards it owns").', 'يعتمد مدير تجربة العملاء المعيار للتقييم؛ يكتبه قسم التعلم والتطوير.')}
        </p>
      </div>
    </div>
  )
}
