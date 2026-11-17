import { useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useRole } from './RoleContext'
import { AuthContext, readSession, useAuth, writeSession, type AuthValue, type Session } from './session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setRole } = useRole()
  const [session, setSession] = useState<Session | null>(readSession)

  const value = useMemo<AuthValue>(
    () => ({
      session,
      signIn: (roleId, displayName) => {
        setRole(roleId)
        const next: Session = { displayName: displayName?.trim() || null, signedInAt: new Date().toISOString() }
        writeSession(next)
        setSession(next)
      },
      signOut: () => {
        writeSession(null)
        setSession(null)
      },
    }),
    [session, setRole],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Sends signed-out visitors to /login and remembers where they were going. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const location = useLocation()
  if (!session) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />
  return <>{children}</>
}
