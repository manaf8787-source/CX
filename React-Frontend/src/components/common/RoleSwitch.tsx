import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { foldedRoleDefs, mainRoleDefs } from '@/data/roles'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { RoleId } from '@/types'

/**
 * A demo-only role switcher: a real deployment resolves the role from sign-in, it is never a user-facing control
 * (USER_ROLES_AND_PERMISSIONS.md). It follows the sign-in screen (v40 F28): the six main roles first, the other six
 * under "Other roles used in the demo".
 */
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
        <SelectGroup>
          <SelectLabel>{t('Main roles', 'الأدوار الرئيسية')}</SelectLabel>
          {mainRoleDefs().map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {L(r.name)}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>{t('Other roles used in the demo', 'أدوار أخرى تُستخدم في العرض')}</SelectLabel>
          {foldedRoleDefs().map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {L(r.name)}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
