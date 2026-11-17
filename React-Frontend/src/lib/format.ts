import type { Lang } from '@/i18n'

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
]

/** "3 days ago" / "in 2 hours" / "منذ 3 أيام", relative to a caller-supplied `now` (use `useNow()` so renders stay pure). */
export function formatRelative(iso: string, now: number, lang: Lang): string {
  const diff = new Date(iso).getTime() - now
  const rtf = new Intl.RelativeTimeFormat(lang === 'ar' ? 'ar' : 'en', { numeric: 'auto' })
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms || unit === 'minute') return rtf.format(Math.round(diff / ms), unit)
  }
  return rtf.format(0, 'minute')
}

/** Short month label in the active language, e.g. "Nov" / "نوفمبر". */
export function formatMonth(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : 'en', { month: 'short' }).format(date)
}
