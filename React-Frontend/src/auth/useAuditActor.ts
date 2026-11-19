import { useCallback } from 'react'
import { useAuth } from './session'
import { useRole } from './RoleContext'
import { audit, type AuditKind, type Actor } from '../data/auditLog'
import type { Bi } from '../types'

/** The signed-in person as the audit log's actor, and a `log` bound to them. Does nothing when nobody is signed in. */
export function useAuditActor() {
  const { session } = useAuth()
  const { role } = useRole()
  const actor: Actor | null = session ? { userId: session.userId, email: session.email, roleId: role.id } : null
  const log = useCallback(
    (kind: AuditKind, detail: Bi, path?: string) => {
      if (actor) audit(actor, kind, detail, path)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the actor is rebuilt from these three
    [session?.userId, session?.email, role.id],
  )
  return { actor, log }
}
