import { BrainCircuit, PhoneOff } from 'lucide-react'
import { useI18n } from '@/i18n'
import { RUNAWAY_TYPE_LABEL } from '@/utils/runaway'
import type { AiJourneyReading, Interaction } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/StatusBadge'
import { CHANNEL_LABEL } from './channels'

/** FR-2.4 — exactly four parts, every sentence pointing at a dated event on
 * the timeline via `reading.evidence`. */
export function AiReadingCard({ reading, interactions }: { reading: AiJourneyReading; interactions: Interaction[] }) {
  const { t, L, lang } = useI18n()
  const tone = reading.verdict === 'healthy' ? 'success' : reading.verdict === 'high_effort' ? 'warning' : 'danger'
  const verdictLabel =
    reading.verdict === 'healthy' ? t('Healthy', 'سليم') : reading.verdict === 'high_effort' ? t('High effort', 'جهد مرتفع') : L(RUNAWAY_TYPE_LABEL[reading.verdict])

  return (
    <Card className="gap-0 border-primary/20 py-0">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
            <span aria-hidden className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BrainCircuit className="size-4" />
            </span>
            {t('AI reading', 'قراءة الذكاء الاصطناعي')}
          </h2>
          <StatusBadge tone={tone} dot>
            {verdictLabel}
          </StatusBadge>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Part label={t('Who / how long / channels', 'من / منذ متى / القنوات')} text={L(reading.whoHowLongChannels)} />
          <Part label={t('What went wrong', 'ما الخطأ الذي حدث')} text={L(reading.whatWentWrong)} />
          <Part label={t('What to do next', 'ما العمل التالي')} text={L(reading.whatToDoNext)} highlight />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground">{t('Evidence', 'الأدلة')}</span>
          <ul className="flex flex-wrap gap-1.5">
            {reading.evidence.map((e) => {
              const event = interactions.find((i) => i.id === e.eventId)
              return (
                <li key={e.eventId} className="inline-flex h-7 items-center gap-1.5 rounded-full border bg-card px-2.5 text-xs">
                  <span className="font-medium">{event ? L(CHANNEL_LABEL[event.channel]) : e.eventId}</span>
                  <span className="text-muted-foreground tabular-nums">{new Date(e.occurredAt).toLocaleDateString(lang)}</span>
                </li>
              )
            })}
            {!reading.evidence.length && <li className="text-sm text-muted-foreground">{t('No evidence recorded.', 'لا توجد أدلة مسجّلة.')}</li>}
          </ul>
        </div>

        <p className="flex items-start gap-1.5 border-t pt-3 text-xs text-muted-foreground">
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
    <div className={highlight ? 'flex flex-col gap-1 rounded-lg border border-primary/20 bg-primary/5 p-3' : 'flex flex-col gap-1 rounded-lg bg-muted/50 p-3'}>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <p className="text-sm">{text}</p>
    </div>
  )
}
