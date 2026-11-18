import { useI18n } from '@/i18n'
import { useNow } from '@/hooks/useNow'
import { CLOCK_LABEL, CLOCK_TONE, dueClockState, formatRemaining } from '@/utils/clock'
import { LEVEL_TONE } from '@/lib/status'
import { StatusBadge } from '@/components/common/StatusBadge'

/** State and time left are both visible — never hover-only. A status tag (dot, or tinted when it needs action) and the time as grey tabular text. */
export function ClockBadge({ dueIso, totalWindowMs, stoppedAtIso }: { dueIso: string; totalWindowMs: number; stoppedAtIso?: string }) {
  const { L, lang } = useI18n()
  const now = useNow()
  const state = dueClockState(dueIso, now, totalWindowMs, stoppedAtIso)
  return (
    <span className="inline-flex items-center gap-2">
      <StatusBadge tone={LEVEL_TONE[CLOCK_TONE[state]]} dot>
        {L(CLOCK_LABEL[state])}
      </StatusBadge>
      {!stoppedAtIso && state !== 'met' && <span className="t-body-s tabular">{formatRemaining(dueIso, now, lang)}</span>}
    </span>
  )
}
