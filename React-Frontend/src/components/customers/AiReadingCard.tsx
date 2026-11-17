import { useI18n } from '../../i18n'
import { RUNAWAY_TYPE_LABEL } from '../../utils/runaway'
import type { AiJourneyReading, Interaction } from '../../types'

const HEALTHY_TONE: Record<'healthy' | 'high_effort', 'good' | 'warn'> = { healthy: 'good', high_effort: 'warn' }

/** FR-2.4 — exactly four parts, every sentence pointing at a dated event on
 * the timeline via `reading.evidence`. */
export function AiReadingCard({ reading, interactions }: { reading: AiJourneyReading; interactions: Interaction[] }) {
  const { t, L, lang } = useI18n()
  const tone = reading.verdict === 'healthy' || reading.verdict === 'high_effort' ? HEALTHY_TONE[reading.verdict] : 'crit'
  const verdictLabel =
    reading.verdict === 'healthy' ? t('Healthy', 'سليم') : reading.verdict === 'high_effort' ? t('High effort', 'جهد مرتفع') : L(RUNAWAY_TYPE_LABEL[reading.verdict])

  return (
    <div className="card" style={{ background: 'var(--surface-2)' }}>
      <div className="card-head">
        <h2>{t('AI reading', 'قراءة الذكاء الاصطناعي')}</h2>
        <span className={`chip ${tone}`}>{verdictLabel}</span>
      </div>
      <div className="col" style={{ gap: 10 }}>
        <Part label={t('Who / how long / channels', 'من / منذ متى / القنوات')} text={L(reading.whoHowLongChannels)} />
        <Part label={t('What went wrong', 'ما الخطأ الذي حدث')} text={L(reading.whatWentWrong)} />
        <Part label={t('What to do next', 'ما العمل التالي')} text={L(reading.whatToDoNext)} />
      </div>
      <p className="text-sm muted" style={{ marginTop: 10 }}>
        {t(
          'The AI did not listen to calls — agent calls are not recorded. It read the CRM activity log, chats and scores.',
          'لم يستمع الذكاء الاصطناعي إلى المكالمات — مكالمات الوكلاء غير مسجَّلة. اعتمد على سجل نشاط نظام العملاء والدردشات والتقييمات.',
        )}
      </p>
      <div style={{ marginTop: 8 }}>
        <div className="text-sm muted" style={{ marginBottom: 4 }}>{t('Evidence', 'الأدلة')}</div>
        <ul className="col text-sm" style={{ margin: 0, paddingInlineStart: 18 }}>
          {reading.evidence.map((e) => {
            const event = interactions.find((i) => i.id === e.eventId)
            return (
              <li key={e.eventId}>
                {event ? event.channel : e.eventId} <span className="muted">— {new Date(e.occurredAt).toLocaleDateString(lang)}</span>
              </li>
            )
          })}
          {!reading.evidence.length && <li className="muted">{t('No evidence recorded.', 'لا توجد أدلة مسجّلة.')}</li>}
        </ul>
      </div>
    </div>
  )
}

function Part({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="text-sm muted" style={{ marginBottom: 2 }}>{label}</div>
      <div>{text}</div>
    </div>
  )
}
