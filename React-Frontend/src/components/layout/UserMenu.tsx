import { startTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useAuth } from '@/auth/session'
import { useRole } from '@/auth/RoleContext'
import { envName } from '@/data/environments'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function initials(text: string): string {
  const parts = text.trim().split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '').slice(0, 2)
  return letters.toUpperCase()
}

/**
 * The skill's profile menu: a 30px round avatar with a 2px ring in a 36px button, and a popover with a header row (name 14/500, the
 * 13px lines under it), a separator and 36px rows with 16px icons ("Sign out").
 */
export function UserMenu() {
  const { t, L } = useI18n()
  const { session, signOut } = useAuth()
  const { role } = useRole()
  const navigate = useNavigate()
  const display = session?.displayName || L(role.name)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <span className="sr-only">{t(`Account: ${display}`, `الحساب: ${display}`)}</span>
          <Avatar className="size-[30px] shadow-(--ring-avatar)" aria-hidden="true">
            <AvatarFallback className="bg-line text-xs font-medium text-foreground">{initials(display)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
          <span className="t-ui-strong truncate">{display}</span>
          <span className="truncate text-sm text-muted-foreground">
            {t('Signed in as', 'مسجّل بصفة')} {L(role.name)}
          </span>
          {/* A role fixed to one environment (environment management) works inside it: say which (the bar shows the same name). */}
          {role.envId && (
            <span className="truncate text-sm text-muted-foreground">
              {t('Environment', 'البيئة')}: {L(envName(role.envId))}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{t('Sample sign-in — no real authentication', 'تسجيل دخول نموذجي — بلا مصادقة حقيقية')}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            // One batch: otherwise the route guard sees "signed out" first and
            // remembers this page as the next person's return target.
            startTransition(() => {
              navigate('/login', { replace: true })
              signOut()
            })
          }}
        >
          <LogOut aria-hidden className="rtl:-scale-x-100" />
          {t('Sign out', 'تسجيل الخروج')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
