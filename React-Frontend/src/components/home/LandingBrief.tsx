import { useRole } from '@/auth/RoleContext'
import type { RoleId } from '@/types'
import { DailyBrief } from './DailyBrief'

/**
 * The Daily brief at the top of the landing page of a role that does not land on Home (v40 F09): L&D (`/settings/ld`),
 * the HR manager (`/settings/hr-team`), the Internal Audit and Marketing Lead (`/overview`) and the HR specialist (the
 * Actions page). It shows only to the roles named in `roles`, so the CX manager who opens the same page sees no second brief
 * (the brief is on their Home). Lines link only to pages the role can open, like the one on Home.
 *
 * It is the light card: the dark feature card of a view belongs to the page's own content (the Home brief is the dark one).
 *
 * @example <LandingBrief roles={['ld']} />
 */
export function LandingBrief({ roles }: { roles: readonly RoleId[] }) {
  const { role } = useRole()
  if (!roles.includes(role.id)) return null
  return <DailyBrief surface="light" />
}
