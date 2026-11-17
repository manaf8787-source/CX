import { useI18n } from '../../../i18n'
import { useNow } from '../../../hooks/useNow'
import { CLOCK_LABEL, CLOCK_TONE, dueClockState, formatRemaining } from '../../../utils/clock'

export function ClockBadge({ dueIso, totalWindowMs, stoppedAtIso }: { dueIso: string; totalWindowMs: number; stoppedAtIso?: string }) {
  const { L, lang } = useI18n()
  const now = useNow()
  const state = dueClockState(dueIso, now, totalWindowMs, stoppedAtIso)
  return (
    <span className={`chip ${CLOCK_TONE[state]}`} title={formatRemaining(dueIso, now, lang)}>
      {L(CLOCK_LABEL[state])}
    </span>
  )
}
