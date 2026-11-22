import { useSyncExternalStore } from 'react'

/**
 * Who calls whom on the Close-the-loop list (owner's request, 22 Nov): the CX manager gives each case to a CX team member, the team
 * member makes the call, the manager can ask for another call. Prototype: kept in this browser's localStorage by case id.
 * In the real platform this is a field on the case (assignee, who assigned it and when, a note), written on the server and logged.
 */
export interface CallAssignment {
  /** The CX team member (a user id from the directory). */
  userId: string
  /** ISO time it was assigned. */
  at: string
  /** Who assigned it (the manager's user id, or the team member's own when they took it). */
  byUserId: string
  /** The manager asked for another call: shown to the team member until the next attempt. */
  askedAgain?: boolean
  note?: string
  /** Set when the manager moved the case from someone else (on leave, left the company, or by choice). */
  movedFrom?: string
  movedReason?: 'leave' | 'left' | 'manual'
}

const KEY = 'psicx.callAssignments'
let map: Record<string, CallAssignment> = read()
const listeners = new Set<() => void>()

function read(): Record<string, CallAssignment> {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed as Record<string, CallAssignment>
    }
  } catch {
    /* storage unavailable: assignments last until reload */
  }
  return {}
}

function write(next: Record<string, CallAssignment>) {
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

export function assignCall(itemId: string, userId: string, byUserId: string, opts: { askedAgain?: boolean; note?: string } = {}) {
  write({ ...map, [itemId]: { userId, at: new Date().toISOString(), byUserId, ...opts } })
}

export function unassignCall(itemId: string) {
  const next = { ...map }
  delete next[itemId]
  write(next)
}

/** The "asked to call again" flag clears when the team member makes the next attempt. */
export function clearAskedAgain(itemId: string) {
  const a = map[itemId]
  if (a?.askedAgain) write({ ...map, [itemId]: { ...a, askedAgain: false } })
}

export function useCallAssignments(): Record<string, CallAssignment> {
  return useSyncExternalStore(subscribe, () => map, () => map)
}

/**
 * Moves cases from one person to others, round robin (the manager's "Move to…" on Close the loop). Each moved case remembers
 * who held it before and why, so the history of the case reads "moved from Muhannad: on leave".
 */
export function moveCalls(itemIds: readonly string[], toUserIds: readonly string[], byUserId: string, reason: 'leave' | 'left' | 'manual') {
  if (!itemIds.length || !toUserIds.length) return
  const at = new Date().toISOString()
  const next = { ...map }
  itemIds.forEach((id, i) => {
    const prev = next[id]
    next[id] = { userId: toUserIds[i % toUserIds.length], at, byUserId, movedFrom: prev?.userId, movedReason: reason, askedAgain: prev?.askedAgain }
  })
  write(next)
}
