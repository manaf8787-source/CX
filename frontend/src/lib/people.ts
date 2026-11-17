import { DIR } from '../data/directory'
import { ROLE_DEFS } from '../data/roles'
import type { Bi } from '../types'

/** Resolve a timeline actor key to a display label, whether it's a portal
 * RoleId or a directory routing key (e.g. "dev_liaison"). */
export function actorLabel(key: string): Bi {
  const role = ROLE_DEFS.find((r) => r.id === key)
  if (role) return role.name
  return DIR[key] ?? { en: key, ar: key }
}
