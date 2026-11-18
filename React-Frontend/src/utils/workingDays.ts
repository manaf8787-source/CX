/**
 * Working-day arithmetic (v40 F20, F27). The prototype counts Friday and Saturday as the
 * weekend in code; the KB says clocks count Monday to Friday. The week is therefore a
 * setting (`workingDays` in Settings -> Rules as configuration), default Monday to Friday,
 * and every function here takes the calendar as an argument.
 *
 * All dates are handled as local calendar days (midnight local time); a 'YYYY-MM-DD' string
 * is read as that local day, never as UTC.
 */

export interface WorkCalendar {
  /** JS weekdays that count as working days: 0 = Sunday ... 6 = Saturday. */
  days: readonly number[]
  /** Dates ('YYYY-MM-DD') that are not working days even on a working weekday. */
  holidays?: readonly string[]
}

/** Monday to Friday (Programme KB: clocks count Monday to Friday, 09:00 to 18:00). */
export const MON_FRI: readonly number[] = [1, 2, 3, 4, 5]

export const DEFAULT_CALENDAR: WorkCalendar = { days: MON_FRI, holidays: [] }

/** Local midnight of a Date, an ISO string, a 'YYYY-MM-DD' string or a timestamp. */
export function startOfDay(value: Date | string | number): Date {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  const d = new Date(value)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 'YYYY-MM-DD' of the local day. */
export function toDayKey(value: Date | string | number): string {
  const d = startOfDay(value)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function weekdays(cal: WorkCalendar): readonly number[] {
  return cal.days.length ? cal.days : MON_FRI
}

export function isWorkingDay(value: Date | string | number, cal: WorkCalendar = DEFAULT_CALENDAR): boolean {
  const d = startOfDay(value)
  return weekdays(cal).includes(d.getDay()) && !(cal.holidays ?? []).includes(toDayKey(d))
}

function plusDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

/** The first working day strictly after `from`. */
export function nextWorkingDay(from: Date | string | number, cal: WorkCalendar = DEFAULT_CALENDAR): Date {
  let d = plusDays(startOfDay(from), 1)
  for (let guard = 0; guard < 400 && !isWorkingDay(d, cal); guard++) d = plusDays(d, 1)
  return d
}

/** `from` plus `n` working days (n may be negative; 0 returns `from`'s day unchanged). */
export function addWorkingDays(from: Date | string | number, n: number, cal: WorkCalendar = DEFAULT_CALENDAR): Date {
  let d = startOfDay(from)
  const step = n < 0 ? -1 : 1
  let left = Math.abs(Math.trunc(n))
  for (let guard = 0; left > 0 && guard < 4000; guard++) {
    d = plusDays(d, step)
    if (isWorkingDay(d, cal)) left -= 1
  }
  return d
}

/**
 * Signed number of working days from `from` (exclusive) to `to` (inclusive):
 * Monday to Wednesday is 2; Wednesday to Monday is -2 (Tuesday and Wednesday are working days after Monday).
 */
export function workingDaysBetween(from: Date | string | number, to: Date | string | number, cal: WorkCalendar = DEFAULT_CALENDAR): number {
  const a = startOfDay(from)
  const b = startOfDay(to)
  if (a.getTime() === b.getTime()) return 0
  const forward = b.getTime() > a.getTime()
  const [lo, hi] = forward ? [a, b] : [b, a]
  let n = 0
  for (let d = plusDays(lo, 1), guard = 0; d.getTime() <= hi.getTime() && guard < 4000; d = plusDays(d, 1), guard++) {
    if (isWorkingDay(d, cal)) n += 1
  }
  return forward ? n : -n
}

/** Working days left until `due`, counted from `today` (negative = that many working days late). */
export function workingDaysLeft(due: Date | string | number, today: Date | string | number, cal: WorkCalendar = DEFAULT_CALENDAR): number {
  return workingDaysBetween(today, due, cal)
}

/** Calendar days from `today` to `due` (negative = late). */
export function calendarDaysLeft(due: Date | string | number, today: Date | string | number): number {
  return Math.round((startOfDay(due).getTime() - startOfDay(today).getTime()) / 86_400_000)
}

/** The next occurrence (today included) of a weekday, as 'YYYY-MM-DD'. Used for "every Thursday". */
export function nextWeekday(from: Date | string | number, weekday: number): string {
  let d = startOfDay(from)
  for (let guard = 0; d.getDay() !== weekday && guard < 8; guard++) d = plusDays(d, 1)
  return toDayKey(d)
}
