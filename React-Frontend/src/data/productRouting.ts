import { useSyncExternalStore } from 'react'
import { PRODUCT_ROUTING, type ProductRouting } from './v38Reference'
import type { Bi } from '../types'

/**
 * Who handles a case, per product (owner's request, 23 Nov): the four roles on every case (case owner, assigned to, corrective action
 * owner, informed only) and how cases are assigned. It was a read-only tab of "Teams and structure"; it is now the second tab of
 * "Who handles what" (the escalation matrix page) and is edited by the same people who edit the matrix.
 *
 * Prototype: the edits sit over the decided defaults (data/v38Reference.ts, PRODUCT_ROUTING) in this browser's localStorage; an edit
 * changes the wording in the language it was typed in. In the real platform this is a table the case router reads.
 */
export type RoutingField = 'mode' | 'caseOwner' | 'assignedTo' | 'actionOwner' | 'informed'
export const ROUTING_FIELDS: RoutingField[] = ['mode', 'caseOwner', 'assignedTo', 'actionOwner', 'informed']

type Overrides = Record<string, Partial<Record<RoutingField, Bi>>>
const KEY = 'psicx.productRouting'

function read(): Overrides {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Overrides
  } catch {
    /* storage unavailable */
  }
  return {}
}

let overrides = read()
let merged = build()
const listeners = new Set<() => void>()

function build(): (ProductRouting & { edited: RoutingField[] })[] {
  return PRODUCT_ROUTING.map((r) => {
    const o = overrides[r.key] ?? {}
    return { ...r, ...o, edited: Object.keys(o) as RoutingField[] }
  })
}

function write(next: Overrides) {
  overrides = next
  merged = build()
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useRouting() {
  return useSyncExternalStore(
    subscribe,
    () => merged,
    () => merged,
  )
}

export function setRoutingText(key: string, field: RoutingField, value: Bi) {
  write({ ...overrides, [key]: { ...overrides[key], [field]: value } })
}

export function resetRouting(key: string, field: RoutingField) {
  const rest = { ...overrides[key] }
  delete rest[field]
  write({ ...overrides, [key]: rest })
}

