import { useSyncExternalStore } from 'react'

/**
 * Who is informed for each product (owner's request, 22 Nov): people picked from the user directory (so each has a name, an email
 * and a role the Admin created), not a free title. A product can have several people. The job title beside the name is free text
 * the CX manager can edit. Everyone is treated as an internal user for now: an outside person needs a user first.
 *
 * Prototype: kept in this browser's localStorage. In the real platform it is a table of product, user and title.
 */
export interface Recipient {
  userId: string
  /** What this person is called in the digest, for example "Head of Sales". Editable. */
  title: string
}

const KEY = 'psicx.noticeRecipients'
let data: Record<string, Recipient[]> = read()
const listeners = new Set<() => void>()

function read(): Record<string, Recipient[]> {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Record<string, Recipient[]>
  } catch {
    /* storage unavailable: lasts until reload */
  }
  return {}
}

function write(next: Record<string, Recipient[]>) {
  data = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

const EMPTY: Recipient[] = []

export function recipientsOf(productId: string): Recipient[] {
  return data[productId] ?? EMPTY
}

export function addRecipient(productId: string, userId: string, title = '') {
  if (recipientsOf(productId).some((r) => r.userId === userId)) return
  write({ ...data, [productId]: [...recipientsOf(productId), { userId, title }] })
}

export function removeRecipient(productId: string, userId: string) {
  write({ ...data, [productId]: recipientsOf(productId).filter((r) => r.userId !== userId) })
}

export function setRecipientTitle(productId: string, userId: string, title: string) {
  write({ ...data, [productId]: recipientsOf(productId).map((r) => (r.userId === userId ? { ...r, title } : r)) })
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Live view of every product's recipients. */
export function useRecipients(): Record<string, Recipient[]> {
  return useSyncExternalStore(subscribe, () => data, () => data)
}

