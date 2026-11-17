import { AT_RISK_THRESHOLD, LADDER, WORKING_HOURS, complaintType } from '../data/complaintTypes'
import type { Incident } from '../types'

const DAY_MS = 86_400_000

/** Elapsed working hours between two timestamps, counting only the
 * configured working days and the 09:00–18:00 window on each of them.
 * Mirrors the prototype's `wh()` — walks day by day and sums the overlap
 * between each day's working window and [startMs, endMs]. */
export function workingHoursBetween(startMs: number, endMs: number): number {
  if (endMs <= startMs) return 0
  let total = 0
  let dayStart = new Date(startMs)
  dayStart.setHours(0, 0, 0, 0)

  for (let t = dayStart.getTime(); t < endMs; t += DAY_MS) {
    const day = new Date(t)
    if (!WORKING_HOURS.days.includes(day.getDay())) continue
    const winStart = new Date(t); winStart.setHours(WORKING_HOURS.startHour, 0, 0, 0)
    const winEnd = new Date(t); winEnd.setHours(WORKING_HOURS.endHour, 0, 0, 0)
    const overlapStart = Math.max(startMs, winStart.getTime())
    const overlapEnd = Math.min(endMs, winEnd.getTime())
    if (overlapEnd > overlapStart) total += (overlapEnd - overlapStart) / 3_600_000
  }
  return total
}

/** Inverse of workingHoursBetween: project `hours` working hours forward
 * from `startMs`, landing inside a working window. Used for due-date math. */
export function addWorkingHours(startMs: number, hours: number): number {
  let remaining = hours
  let t = startMs
  let day = new Date(t)
  day.setHours(0, 0, 0, 0)
  let cursor = Math.max(t, day.getTime())

  for (let guard = 0; guard < 3650 && remaining > 1e-9; guard++) {
    const d = new Date(cursor)
    if (!WORKING_HOURS.days.includes(d.getDay())) {
      cursor = new Date(cursor).setHours(24, 0, 0, 0)
      continue
    }
    const winStart = new Date(cursor); winStart.setHours(WORKING_HOURS.startHour, 0, 0, 0)
    const winEnd = new Date(cursor); winEnd.setHours(WORKING_HOURS.endHour, 0, 0, 0)
    const from = Math.max(cursor, winStart.getTime())
    if (from >= winEnd.getTime()) { cursor = new Date(cursor).setHours(24, 0, 0, 0); continue }
    const availableHoursToday = (winEnd.getTime() - from) / 3_600_000
    if (availableHoursToday >= remaining) {
      return from + remaining * 3_600_000
    }
    remaining -= availableHoursToday
    cursor = new Date(cursor).setHours(24, 0, 0, 0)
  }
  return cursor
}

/** Elapsed working hours on an incident's clock since it opened, minus any
 * time paused while waiting on the customer, capped at "now" (or the
 * resolved/pause timestamp). */
export function elapsedWorkingHours(incident: Incident, nowMs: number): number {
  const endMs = incident.status === 'resolved' || incident.status === 'closed'
    ? new Date(incident.resolvedAt ?? nowMs).getTime()
    : nowMs
  const openedMs = new Date(incident.openedAt).getTime()
  const pausedHours = incident.pausedMinutes / 60
  return Math.max(0, workingHoursBetween(openedMs, endMs) - pausedHours)
}

export type ClockState = 'met' | 'breached' | 'paused' | 'at_risk' | 'on_track'

export interface ClockReading {
  state: ClockState
  elapsedHours: number
  targetHours: number
  remainingHours: number
}

function clockFor(incident: Incident, nowMs: number, targetHours: number, stoppedAt?: string): ClockReading {
  if (incident.status === 'waiting') {
    const elapsed = elapsedWorkingHours(incident, nowMs)
    return { state: 'paused', elapsedHours: elapsed, targetHours, remainingHours: targetHours - elapsed }
  }
  const elapsed = stoppedAt
    ? workingHoursBetween(new Date(incident.openedAt).getTime(), new Date(stoppedAt).getTime()) - incident.pausedMinutes / 60
    : elapsedWorkingHours(incident, nowMs)
  const remaining = targetHours - elapsed
  if (stoppedAt) return { state: remaining >= 0 ? 'met' : 'breached', elapsedHours: elapsed, targetHours, remainingHours: remaining }
  if (remaining <= 0) return { state: 'breached', elapsedHours: elapsed, targetHours, remainingHours: remaining }
  if (remaining / targetHours < AT_RISK_THRESHOLD) return { state: 'at_risk', elapsedHours: elapsed, targetHours, remainingHours: remaining }
  return { state: 'on_track', elapsedHours: elapsed, targetHours, remainingHours: remaining }
}

/** The respond clock: time to first reply, stopped by firstResponseAt. */
export function respondState(incident: Incident, nowMs: number): ClockReading {
  const type = complaintType(incident.typeId)
  return clockFor(incident, nowMs, type?.respondHours ?? 9, incident.firstResponseAt)
}

/** The resolve clock: time to fix, stopped when resolved. */
export function resolveState(incident: Incident, nowMs: number): ClockReading {
  const type = complaintType(incident.typeId)
  return clockFor(incident, nowMs, type?.resolveHours ?? 40, incident.resolvedAt)
}

/** Escalation level reached by the resolve clock, or the manually-set
 * level if higher — manual escalation only ratchets forward. */
export function escalationLevel(incident: Incident, nowMs: number): number {
  const resolve = resolveState(incident, nowMs)
  const ratio = resolve.targetHours > 0 ? resolve.elapsedHours / resolve.targetHours : 0
  let level = 0
  LADDER.forEach((step, i) => {
    if (step.pct !== null && ratio * 100 >= step.pct) level = i
    if (step.pct === null && step.afterHours != null) {
      const hoursPastBreach = resolve.elapsedHours - resolve.targetHours
      if (hoursPastBreach >= step.afterHours) level = i
    }
  })
  return Math.max(level, incident.manualEscalationLevel)
}

export function clockStateLabel(state: ClockState): { en: string; ar: string } {
  switch (state) {
    case 'met': return { en: 'Met', ar: 'تم الالتزام' }
    case 'breached': return { en: 'Breached', ar: 'تم الخرق' }
    case 'paused': return { en: 'Paused', ar: 'متوقف مؤقتاً' }
    case 'at_risk': return { en: 'At risk', ar: 'في خطر' }
    case 'on_track': return { en: 'On track', ar: 'على المسار' }
  }
}
