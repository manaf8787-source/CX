export type ClockState = 'on_track' | 'at_risk' | 'breached' | 'met'

const AT_RISK_FRACTION = 0.2

/** A plain calendar-time due-date clock (respond/resolve/public-reply/
 * verification due dates) — simpler than the old scaffold's working-hours
 * engine (`frontend/src/lib/sla.ts`), which needs a complaint-type config
 * this rebuild's Signal/Pattern/CorrectiveAction model doesn't carry.
 * Deviation, noted in the build report: good enough for "is this late"
 * coloring; a real working-hours clock is a later refinement once Settings
 * → Rules as configuration defines working hours per NFR-4. */
export function dueClockState(dueIso: string, nowMs: number, totalWindowMs: number, stoppedAtIso?: string): ClockState {
  const dueMs = new Date(dueIso).getTime()
  if (stoppedAtIso) {
    const stoppedMs = new Date(stoppedAtIso).getTime()
    return stoppedMs <= dueMs ? 'met' : 'breached'
  }
  const remainingMs = dueMs - nowMs
  if (remainingMs <= 0) return 'breached'
  if (totalWindowMs > 0 && remainingMs / totalWindowMs < AT_RISK_FRACTION) return 'at_risk'
  return 'on_track'
}

export function formatRemaining(dueIso: string, nowMs: number, lang: 'en' | 'ar'): string {
  const diffMs = new Date(dueIso).getTime() - nowMs
  const hours = Math.round(Math.abs(diffMs) / 3_600_000)
  const days = Math.round(Math.abs(diffMs) / 86_400_000)
  const unit = days >= 2 ? `${days} ${lang === 'en' ? 'd' : 'يوم'}` : `${hours} ${lang === 'en' ? 'h' : 'س'}`
  return diffMs <= 0 ? (lang === 'en' ? `${unit} overdue` : `متأخر ${unit}`) : (lang === 'en' ? `${unit} left` : `متبقٍ ${unit}`)
}

export const CLOCK_TONE: Record<ClockState, 'good' | 'warn' | 'crit'> = {
  met: 'good',
  on_track: 'good',
  at_risk: 'warn',
  breached: 'crit',
}

export const CLOCK_LABEL: Record<ClockState, { en: string; ar: string }> = {
  met: { en: 'Met', ar: 'تم الالتزام' },
  on_track: { en: 'On track', ar: 'على المسار' },
  at_risk: { en: 'At risk', ar: 'في خطر' },
  breached: { en: 'Breached', ar: 'تم الخرق' },
}
