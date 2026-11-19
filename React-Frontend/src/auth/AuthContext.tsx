import { useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useRole } from './RoleContext'
import { findUserById } from '../data/users'
import { audit } from '../data/auditLog'
import { AuthContext, readSession, useAuth, writeSession, type AuthValue, type Session } from './session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const { role, setRole } = useRole()
  const [session, setSession] = useState<Session | null>(() => {
    const saved = readSession()
    // the person must still exist in the directory and be active (a disabled account is signed out on the next load)
    const user = saved ? findUserById(saved.userId) : undefined
    if (!saved || !user || user.status !== 'active') {
      writeSession(null)
      return null
    }
    return saved
  })

  const value = useMemo<AuthValue>(
    () => ({
      session,
      signIn: (user) => {
        setRole(user.roleId)
        const next: Session = { userId: user.id, email: user.email, displayName: user.name || null, signedInAt: new Date().toISOString() }
        writeSession(next)
        setSession(next)
        audit({ userId: user.id, email: user.email, roleId: user.roleId }, 'sign_in', { en: 'Signed in', ar: 'تسجيل الدخول' }, '/login')
      },
      signOut: () => {
        if (session) audit({ userId: session.userId, email: session.email, roleId: role.id }, 'sign_out', { en: 'Signed out', ar: 'تسجيل الخروج' })
        writeSession(null)
        setSession(null)
      },
    }),
    [session, setRole, role.id],
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
