import { useSyncExternalStore } from 'react'
import { listUsers, type PortalUser } from './users'

/**
 * Who is away (owner's request, 22 Nov): the CX manager marks a CX team member as on leave for a period. While they are away
 * nobody can give them new cases, and the cases already with them are flagged on Close the loop so the manager can move them.
 * Prototype: kept in this browser's localStorage by user id. In the real platform this is a field on the person (from, to,
 * who set it), written on the server and logged, ideally fed from the HR leave calendar.
 */
export interface AwayPeriod {
  /** First day away (YYYY-MM-DD). */
  from: string
  /** Last day away (YYYY-MM-DD); absent = until the manager marks them back. */
  to?: string
  /** Who recorded it (a user id). */
  byUserId?: string
}

const KEY = 'psicx.away'
let map: Record<string, AwayPeriod> = read()
const listeners = new Set<() => void>()

function read(): Record<string, AwayPeriod> {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed as Record<string, AwayPeriod>
    }
  } catch {
    /* storage unavailable: availability lasts until reload */
  }
  return {}
}

function write(next: Record<string, AwayPeriod>) {
  map = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const todayKey = () => new Date().toISOString().slice(0, 10)

export function setAway(userId: string, period: AwayPeriod) {
  write({ ...map, [userId]: period })
}

export function clearAway(userId: string) {
  const next = { ...map }
  delete next[userId]
  write(next)
}

export function useAway(): Record<string, AwayPeriod> {
  return useSyncExternalStore(subscribe, () => map, () => map)
}

/** Away today: the period has started and has not ended. */
export function isAwayOn(period: AwayPeriod | undefined, day = todayKey()): boolean {
  return !!period && period.from <= day && (!period.to || period.to >= day)
}

/** Why someone cannot take cases right now: on leave, or no longer with the company (deactivated). */
export type Unavailable = 'leave' | 'left'

export function unavailableReason(user: Pick<PortalUser, 'id' | 'status'> | undefined, away: Record<string, AwayPeriod>, day = todayKey()): Unavailable | null {
  if (!user) return null
  if (user.status === 'disabled') return 'left'
  return isAwayOn(away[user.id], day) ? 'leave' : null
}

/** The people who can be given a case today: active CX team members who are not away. */
export function availableCxTeam(away: Record<string, AwayPeriod>, day = todayKey()): PortalUser[] {
  return listUsers().filter((u) => u.roleId === 'cxteam' && u.status === 'active' && !isAwayOn(away[u.id], day))
}
