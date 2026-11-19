import type { Lang } from '../i18n'

/**
 * How the escalation matrix writes a clock (v42, set 19 Nov). The model is numeric working hours (9 = one working day, 45 = one week);
 * only the display changes:
 *   - a cell the document writes in days ("1 day", "5 days") keeps its hours (9, 45) and shows days (`asDays`);
 *   - "–" is no clock (the employee row's Resolve: a management note, measured by the 60-day check);
 *   - the VIP row is a rule with a factor, shown as "½", never as a number of hours.
 */

/** One working day, 09:00 to 18:00. */
export const HOURS_PER_DAY = 9

const NONE = '–'

/** "1 day" / "5 days" (Arabic: "يوم واحد", "يومان", "5 أيام"). */
export function formatDays(days: number, lang: Lang = 'en'): string {
  if (lang === 'ar') {
    if (days === 1) return 'يوم واحد'
    if (days === 2) return 'يومان'
    return days >= 3 && days <= 10 ? `${days} أيام` : `${days} يوماً`
  }
  return `${days} ${days === 1 ? 'day' : 'days'}`
}

/** A number of hours: whole numbers as they are, one half as "½", other fractions to two places ("4.5", "13.5"). */
export function formatHours(hours: number): string {
  if (hours === 0.5) return '½'
  return String(Number(hours.toFixed(2)))
}

interface ClockOptions {
  /** The cell is written in working days in the document (display only). */
  asDays?: boolean
  lang?: Lang
}

const inDays = (hours: number, opts: ClockOptions) => !!opts.asDays && hours > 0 && Number.isInteger(hours / HOURS_PER_DAY)

/**
 * The text of one clock cell. `null` is "–". With `asDays` and a whole number of working days the cell reads "1 day" or "5 days";
 * any other value reads as hours (an edited cell is hours again).
 */
export function formatClock(hours: number | null, opts: ClockOptions = {}): string {
  if (hours === null) return NONE
  return inDays(hours, opts) ? formatDays(hours / HOURS_PER_DAY, opts.lang) : formatHours(hours)
}

/** A clock with its unit for a sentence ("4 h", "½ h", "1 day", "–"): the line "From the matrix" on a fix. */
export function formatClockWithUnit(hours: number | null, opts: ClockOptions = {}): string {
  if (hours === null || inDays(hours, opts)) return formatClock(hours, opts)
  return `${formatHours(hours)} h`
}

/** The VIP rule's factor as the matrix shows it: 0.5 is "½". */
export function formatFactor(factor: number): string {
  return factor === 0.5 ? '½' : `×${Number(factor.toFixed(2))}`
}
