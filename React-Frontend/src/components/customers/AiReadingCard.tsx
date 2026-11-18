import { BrainCircuit, PhoneOff } from 'lucide-react'
import { useI18n } from '@/i18n'
import { RUNAWAY_TYPE_LABEL } from '@/utils/runaway'
import type { AiJourneyReading, Interaction } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/StatusBadge'
import { CHANNEL_LABEL } from './channels'

/** Parts and chips on the dark feature card are the skill's `--fx-tint` (white 7%, ink 7% in the dark theme). */
const TINT = 'bg-(--on-dark-tint)'

/**
 * FR-2.4 — exactly four parts, every sentence pointing at a dated event on the timeline via `reading.evidence`.
 *
 * Design: the ONE dark feature card of a person's page (`Card variant="dark"`): the three parts are tint wells, "what to do next" is the one
 * the eye lands on (ink 500 and a dot), the evidence is a row of tint chips. Inside the dark card the normal text classes still work.
 */
export function AiReadingCard({ reading, interactions }: { reading: AiJourneyReading; interactions: Interaction[] }) {
  const { t, L, lang } = useI18n()
  const tone = reading.verdict === 'healthy' ? 'success' : reading.verdict === 'high_effort' ? 'warning' : 'danger'
  const verdictLabel =
    reading.verdict === 'healthy' ? t('Healthy', 'سليم') : reading.verdict === 'high_effort' ? t('High effort', 'جهد مرتفع') : L(RUNAWAY_TYPE_LABEL[reading.verdict])

  return (
    <Card variant="dark">
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="t-card-title inline-flex items-center gap-2.5">
            <span aria-hidden className={`${TINT} inline-grid size-[30px] shrink-0 place-items-center rounded-full`}>
              <BrainCircuit className="size-4" />
            </span>
            {t('AI reading', 'قراءة الذكاء الاصطناعي')}
          </h2>
          <StatusBadge tone={tone} dot className={tone === 'success' ? `bg-none ${TINT} text-foreground shadow-none` : undefined}>
            {verdictLabel}
          </StatusBadge>
        </div>

        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
          <Part label={t('Who / how long / channels', 'من / منذ متى / القنوات')} text={L(reading.whoHowLongChannels)} />
          <Part label={t('What went wrong', 'ما الخطأ الذي حدث')} text={L(reading.whatWentWrong)} />
          <Part label={t('What to do next', 'ما العمل التالي')} text={L(reading.whatToDoNext)} highlight />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">{t('Evidence', 'الأدلة')}</span>
          <ul className="flex flex-wrap gap-1.5">
            {reading.evidence.map((e) => {
              const event = interactions.find((i) => i.id === e.eventId)
              return (
                <li key={e.eventId} className={`pill ${TINT} gap-2 text-foreground`}>
                  <span>{event ? L(CHANNEL_LABEL[event.channel]) : e.eventId}</span>
                  <span className="tabular font-normal text-muted-foreground">{new Date(e.occurredAt).toLocaleDateString(lang)}</span>
                </li>
              )
            })}
            {!reading.evidence.length && <li className="text-sm text-muted-foreground">{t('No evidence recorded.', 'لا توجد أدلة مسجّلة.')}</li>}
          </ul>
        </div>

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <PhoneOff aria-hidden className="mt-px size-3.5 shrink-0" />
          {t(
            'The AI did not listen to calls — agent calls are not recorded. It read the CRM activity log, chats and scores.',
            'لم يستمع الذكاء الاصطناعي إلى المكالمات — مكالمات الوكلاء غير مسجَّلة. اعتمد على سجل نشاط نظام العملاء والدردشات والتقييمات.',
          )}
        </p>
      </CardContent>
    </Card>
  )
}

function Part({ label, text, highlight }: { label: string; text: string; highlight?: boolean }) {
  return (
    <div className={`${TINT} flex flex-col gap-1.5 rounded-xl p-4`}>
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        {highlight && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-foreground" />}
        {label}
      </span>
      <p className={highlight ? 't-ui-strong text-foreground' : 'text-sm text-foreground'}>{text}</p>
    </div>
  )
}
