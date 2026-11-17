import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { ROLE_DEFS } from '@/data/roles'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { RoleId } from '@/types'

/** A demo-only role switcher — a real deployment resolves the role from
 * sign-in, it is never a user-facing control (USER_ROLES_AND_PERMISSIONS.md). */
export function RoleSwitch({ className }: { className?: string }) {
  const { role, setRole } = useRole()
  const { L, t } = useI18n()
  return (
    <Select value={role.id} onValueChange={(v) => setRole(v as RoleId)}>
      <SelectTrigger
        size="sm"
        className={cn('w-full min-w-0', className)}
        aria-label={t('Viewing as (demo only — a real sign-in sets the role)', 'العرض بصفة (للعرض التجريبي فقط — يحدد تسجيل الدخول الدور فعلياً)')}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-80">
        {ROLE_DEFS.map((r) => (
          <SelectItem key={r.id} value={r.id}>
            {L(r.name)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
