import type { RoleId } from '@/types'

/**
 * Which roles have finished (or skipped) their tour, remembered in this browser: `{ "done": { "cxmgr": true } }`. The sample sign-in has no
 * user id, so "per user" is per browser profile; the role is the key. Every access is guarded: the portal works without storage (a role
 * then only keeps its state until the page is reloaded). The e2e helpers write the same key to mark every tour done (docs/V41_TOUR.md).
 */
export const TOUR_STORAGE_KEY = 'psicx.tour'

export type TourDone = Partial<Record<RoleId, boolean>>

export function readTourDone(): TourDone {
  try {
    const raw = localStorage.getItem(TOUR_STORAGE_KEY)
    if (!raw) return {}
    const done = (JSON.parse(raw) as { done?: unknown } | null)?.done
    if (!done || typeof done !== 'object') return {}
    return Object.fromEntries(Object.entries(done).filter(([, v]) => v === true)) as TourDone
  } catch {
    return {}
  }
}

export function writeTourDone(done: TourDone): void {
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify({ done }))
  } catch {
    /* private window, blocked storage: the tour simply is not remembered after a reload */
  }
}
