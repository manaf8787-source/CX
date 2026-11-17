import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Send } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useAiInsights } from '@/services/queries'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { PercentagesExplainer } from './components/PercentagesExplainer'
import { ScoresVsSignalsNotice } from './components/ScoresVsSignalsNotice'

const MINIMUM_SAMPLE = 10

const SERIES_LABEL: Record<string, { en: string; ar: string }> = {
  'Low score': { en: 'Low score', ar: 'تقييم منخفض' },
  'Recovered after action': { en: 'Recovered after action', ar: 'تعافى بعد الإجراء' },
}

export default function AiInsights() {
  const { t, L, lang } = useI18n()
  const navigate = useNavigate()
  const { data: insights, isLoading, error, refetch } = useAiInsights()

  return (
    <div className="flex flex-col gap-4">
      <ScoresVsSignalsNotice register="ai-insights" />
      <PercentagesExplainer />

      {isLoading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !insights?.length ? (
        <EmptyState title={t('No AI Insights yet', 'لا توجد رؤى بعد')} />
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {insights.map((envelope) => {
            const p = envelope.payload
            const small = p.sampleSize < MINIMUM_SAMPLE
            const series = p.chartSeries.map((s, i) => ({ ...s, name: SERIES_LABEL[s.label] ? L(SERIES_LABEL[s.label]) : s.label, i }))
            return (
              <li key={envelope.subjectId} className="min-w-0">
                <Card className="h-full gap-0 py-0">
                  <CardContent className="flex h-full flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <h2 className="text-base font-semibold capitalize">{p.category.replace(/_/g, ' ')}</h2>
                        <span className="text-sm text-muted-foreground">
                          {p.environment} · {L(p.serviceTimeBand)}
                        </span>
                      </div>
                      {small ? (
                        <StatusBadge tone="warning" icon={<AlertTriangle aria-hidden />}>
                          {t('Small sample', 'عينة صغيرة')}
                        </StatusBadge>
                      ) : (
                        <StatusBadge tone="neutral">
                          {t('Sample', 'العينة')} <bdi dir="ltr" className="tabular-nums">{p.sampleSize}</bdi>
                        </StatusBadge>
                      )}
                    </div>
                    <p className="text-sm">{L(p.recoveryFigure)}</p>
                    <div className="h-28" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={lang === 'ar' ? [...series].reverse() : series} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                          <Tooltip
                            cursor={{ fill: 'var(--muted)' }}
                            formatter={(v) => [v, t('Cases', 'حالات')]}
                            contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--popover-foreground)', fontSize: 12 }}
                          />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56}>
                            {(lang === 'ar' ? [...series].reverse() : series).map((entry) => (
                              <Cell key={entry.label} fill={entry.i === 0 ? 'var(--destructive)' : 'var(--success)'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t pt-3">
                      {!p.sendToCaseEligibleCaseId && (
                        <span className="me-auto text-xs text-muted-foreground">
                          {t('Only available when a shopper case in the same category is open.', 'متاح فقط عند وجود حالة تسوق سري بنفس الفئة ومفتوحة.')}
                        </span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9"
                        disabled={!p.sendToCaseEligibleCaseId}
                        onClick={() => p.sendToCaseEligibleCaseId && navigate('/actions/shopper-cases')}
                      >
                        <Send aria-hidden className="rtl:-scale-x-100" />
                        {t('Send to a case', 'إرسال إلى حالة')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
