import { useSyncExternalStore } from 'react'
import type { Bi, RoleId } from '../types'

/**
 * The audit log (owner's request, 19 Nov): for every user, which pages they opened and what they did, with the date, day and time.
 * Read on the super admin's "Audit log" page. Prototype: kept in this browser's localStorage, newest first, capped at `CAP` entries.
 * In the real platform every entry goes to the server, and nothing in it can be edited or deleted.
 */
export type AuditKind =
  | 'sign_in'
  | 'sign_out'
  | 'invite_accepted'
  | 'page_opened'
  | 'user_invited'
  | 'user_reinvited'
  | 'user_role_changed'
  | 'user_deactivated'
  | 'user_reactivated'
  | 'invite_withdrawn'
  | 'users_reset'
  | 'export_granted'
  | 'export_revoked'
  | 'data_exported'
  | 'action'

export interface AuditEntry {
  id: string
  /** ISO timestamp. */
  at: string
  userId: string
  email: string
  roleId: RoleId
  kind: AuditKind
  /** What exactly: a page title, the invited email, the decision taken. Bilingual so the page reads in either language. */
  detail: Bi
  /** The URL path where it happened. */
  path: string
}

export const AUDIT_KIND_LABEL: Record<AuditKind, Bi> = {
  sign_in: { en: 'Signed in', ar: 'سجّل الدخول' },
  sign_out: { en: 'Signed out', ar: 'سجّل الخروج' },
  invite_accepted: { en: 'Accepted invitation', ar: 'قبل الدعوة' },
  page_opened: { en: 'Opened a page', ar: 'فتح صفحة' },
  user_invited: { en: 'Invited a user', ar: 'دعا مستخدماً' },
  user_reinvited: { en: 'Re-invited a user', ar: 'أعاد دعوة مستخدم' },
  user_role_changed: { en: 'Changed a role', ar: 'غيّر دوراً' },
  user_deactivated: { en: 'Deactivated a user', ar: 'أوقف مستخدماً' },
  user_reactivated: { en: 'Reactivated a user', ar: 'أعاد تفعيل مستخدم' },
  invite_withdrawn: { en: 'Withdrew an invitation', ar: 'سحب دعوة' },
  users_reset: { en: 'Reset the sample users', ar: 'أعاد المستخدمين النموذجيين' },
  export_granted: { en: 'Gave export permission', ar: 'منح صلاحية التصدير' },
  export_revoked: { en: 'Removed export permission', ar: 'سحب صلاحية التصدير' },
  data_exported: { en: 'Exported data', ar: 'صدّر بيانات' },
  action: { en: 'Took an action', ar: 'نفّذ إجراءً' },
}

const STORAGE_KEY = 'psicx.audit'
const CAP = 3000

let entries: AuditEntry[] = read()
const listeners = new Set<() => void>()

function read(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AuditEntry[]
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    /* storage unavailable: the log lasts until reload */
  }
  return []
}

function write(next: AuditEntry[]) {
  entries = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export interface Actor {
  userId: string
  email: string
  roleId: RoleId
}

/** Appends one entry (newest first). Called by the sign-in, the page-view hook and the admin page. */
export function audit(actor: Actor, kind: AuditKind, detail: Bi, path: string = typeof window !== 'undefined' ? window.location.pathname : '') {
  // the same person, event and page within two seconds is one event (React's development double effect, a re-render, a double click)
  const last = entries[0]
  if (
    last &&
    last.userId === actor.userId &&
    last.kind === kind &&
    last.path === path &&
    last.detail.en === detail.en &&
    Date.now() - new Date(last.at).getTime() < 2000
  )
    return
  const entry: AuditEntry = {
    id: `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    userId: actor.userId,
    email: actor.email,
    roleId: actor.roleId,
    kind,
    detail,
    path,
  }
  write([entry, ...entries].slice(0, CAP))
}

export function listAudit(): AuditEntry[] {
  return entries
}

/** The super admin's "Clear log" (prototype only: a real log is never cleared). */
export function clearAudit() {
  write([])
}

export function useAuditLog(): AuditEntry[] {
  return useSyncExternalStore(subscribe, listAudit, listAudit)
}
