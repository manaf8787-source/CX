import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath, firstAllowedUnder } from '@/auth/access'
import { SETTINGS_LANDING, legacyRedirect } from '@/data/nav'
import { customLevel } from '@/data/customRoles'
import { useI18n } from '@/i18n'

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
  // a custom role with "View only" on this screen: the page opens with every button and field switched off (a disabled fieldset does it for all of them)
  if (role.id === 'custom' && customLevel(pathname) === 'view') return <ViewOnlyScope>{children}</ViewOnlyScope>
  return <>{children}</>
}

function ViewOnlyScope({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  return (
    <>
      <p role="status" className="well px-4 py-2.5 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{t('View only.', 'للعرض فقط.')}</span>{' '}
        {t('Your role can read this screen but not change anything on it.', 'دورك يستطيع قراءة هذه الشاشة دون تغيير أي شيء فيها.')}
      </p>
      <fieldset disabled className="contents">
        {children}
      </fieldset>
    </>
  )
}
