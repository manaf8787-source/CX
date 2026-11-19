import { createContext, useContext } from 'react'
import type { PortalUser } from '../data/users'

/**
 * Prototype sign-in (19 Nov): a person signs in with the email the super admin invited; the role comes from the user directory
 * (`data/users.ts`), never from a picker. There is no backend: the password is not stored or checked yet. The role itself stays in
 * RoleContext (every page reads it from there); the session holds who is signed in.
 */
export interface Session {
  userId: string
  email: string
  displayName: string | null
  signedInAt: string
}

export interface AuthValue {
  session: Session | null
  signIn: (user: PortalUser) => void
  signOut: () => void
}

export const AuthContext = createContext<AuthValue | null>(null)

const STORAGE_KEY = 'psicx.session'

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Session>
    // a session from before the user directory (no userId) is dropped: the person signs in again
    if (typeof parsed.signedInAt !== 'string' || typeof parsed.userId !== 'string' || typeof parsed.email !== 'string') return null
    return {
      userId: parsed.userId,
      email: parsed.email,
      displayName: typeof parsed.displayName === 'string' ? parsed.displayName : null,
      signedInAt: parsed.signedInAt,
    }
  } catch {
    return null
  }
}

export function writeSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage unavailable: the session lasts until reload */
  }
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
