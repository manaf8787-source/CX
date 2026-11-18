import { useI18n } from '@/i18n'
import { dayChipLabel, dayChipState } from '@/utils/inbox'
import type { DayChipState } from '@/types'
import type { Tone } from '@/lib/status'
import { StatusBadge } from './StatusBadge'

const TONE: Record<DayChipState, Tone> = {
  overdue: 'danger',
  late: 'danger',
  today: 'warning',
  soon: 'warning',
  ok: 'neutral',
  none: 'neutral',
}

interface DayChipProps {
  /** Days left (negative = late); null renders nothing. */
  daysLeft: number | null
  /** 'wd' = working days, 'd' = calendar days. */
  unit: 'wd' | 'd'
  className?: string
}

/**
 * The day counter of an inbox row (v40 F20, S7): "overdue" (more than 30 days late), "{n} working days late",
 * "today", "{n} days left" (warning at one day or less, neutral above). A row without a date shows nothing.
 *
 * @example <DayChip daysLeft={item.daysLeft} unit={item.unit} />
 */
export function DayChip({ daysLeft, unit, className }: DayChipProps) {
  const { L } = useI18n()
  const label = dayChipLabel(daysLeft, unit)
  if (!label) return null
  return (
    <StatusBadge tone={TONE[dayChipState(daysLeft)]} className={className}>
      <bdi>{L(label)}</bdi>
    </StatusBadge>
  )
}
