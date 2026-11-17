import { useI18n } from '../../i18n'
import { useRole } from '../../auth/RoleContext'
import { ROLE_DEFS } from '../../data/roles'
import type { RoleId } from '../../types'

/** A demo-only role switcher — a real deployment resolves the role from
 * sign-in, it is never a user-facing control (USER_ROLES_AND_PERMISSIONS.md). */
export function RoleSwitch() {
  const { role, setRole } = useRole()
  const { L } = useI18n()
  return (
    <select
      value={role.id}
      onChange={(e) => setRole(e.target.value as RoleId)}
      style={{ width: 'auto', fontSize: 12 }}
      title="Demo only — a real sign-in resolves the role"
    >
      {ROLE_DEFS.map((r) => (
        <option key={r.id} value={r.id}>
          {L(r.name)}
        </option>
      ))}
    </select>
  )
}
