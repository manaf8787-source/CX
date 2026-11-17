import { createContext, useContext } from 'react'
import type { RoleId } from '../types'

/**
 * Sample sign-in only. There is no backend and no password: signing in picks
 * a role so the portal shows what that role sees. The role itself stays in
 * RoleContext (so the demo role switch keeps working); the session holds only
 * the fact of being signed in plus an optional display name.
 */
export interface Session {
  displayName: string | null
  signedInAt: string
}

export interface AuthValue {
  session: Session | null
  signIn: (roleId: RoleId, displayName?: string) => void
  signOut: () => void
}

export const AuthContext = createContext<AuthValue | null>(null)

const STORAGE_KEY = 'psicx.session'

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Session>
    if (typeof parsed.signedInAt !== 'string') return null
    return { displayName: typeof parsed.displayName === 'string' ? parsed.displayName : null, signedInAt: parsed.signedInAt }
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
