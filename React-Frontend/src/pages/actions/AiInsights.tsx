import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { useAiInsights } from '../../services/queries'
import { PercentagesExplainer } from './components/PercentagesExplainer'
import { ScoresVsSignalsNotice } from './components/ScoresVsSignalsNotice'
import { EmptyState } from '../../components/common/EmptyState'

const MINIMUM_SAMPLE = 10

export default function AiInsights() {
  const { t, L } = useI18n()
  const navigate = useNavigate()
  const { data: insights } = useAiInsights()

  return (
    <div className="col">
      <ScoresVsSignalsNotice register="ai-insights" />
      <PercentagesExplainer />

      <div className="grid grid-2">
        {insights?.map((envelope) => {
          const p = envelope.payload
          const small = p.sampleSize < MINIMUM_SAMPLE
          return (
            <div className="card" key={envelope.subjectId}>
              <div className="row between" style={{ alignItems: 'flex-start' }}>
                <div className="col" style={{ gap: 4 }}>
                  <b>{p.category.replace(/_/g, ' ')}</b>
                  <span className="text-sm muted">{p.environment} · {L(p.serviceTimeBand)}</span>
                </div>
                {small && <span className="chip warn">{t('Small sample', 'عينة صغيرة')}</span>}
              </div>
              <p className="text-sm" style={{ marginTop: 8 }}>{L(p.recoveryFigure)}</p>
              <div style={{ height: 90 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={p.chartSeries}>
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {p.chartSeries.map((entry, i) => (
                        <Cell key={entry.label} fill={i === 0 ? 'var(--crit)' : 'var(--good)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="row" style={{ marginTop: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn sm"
                  disabled={!p.sendToCaseEligibleCaseId}
                  title={!p.sendToCaseEligibleCaseId ? t('Only available when a shopper case in the same category is open', 'متاح فقط عند وجود حالة تسوق سري بنفس الفئة ومفتوحة') : undefined}
                  onClick={() => p.sendToCaseEligibleCaseId && navigate('/actions/shopper-cases')}
                >
                  {t('Send to a case', 'إرسال إلى حالة')}
                </button>
              </div>
            </div>
          )
        })}
      </div>
      {!insights?.length && <EmptyState title={t('No AI Insights yet', 'لا توجد رؤى بعد')} />}
    </div>
  )
}
