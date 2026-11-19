import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath, firstAllowedUnder } from '@/auth/access'
import { SETTINGS_LANDING, legacyRedirect } from '@/data/nav'

/** Sends a role away from a page outside its KB §2 page set, to its own home. */
export function AccessGuard({ children }: { children: ReactNode }) {
  const { role } = useRole()
  const { pathname, search, hash } = useLocation()

  // Old URLs keep working: /surveys and /settings/overview moved (F08, F18). The redirect runs before the role check.
  const moved = legacyRedirect(pathname)
  if (moved) return <Navigate to={`${moved}${search}${hash}`} replace />

  if (pathname === '/settings' || pathname === '/settings/') {
    const first = firstAllowedUnder(role.id, '/settings', SETTINGS_LANDING)
    return <Navigate to={first ?? role.home} replace />
  }
  if (!canAccessPath(role.id, pathname)) return <Navigate to={role.home} replace />
  return <>{children}</>
}
