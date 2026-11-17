import { startTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useAuth } from '@/auth/session'
import { useRole } from '@/auth/RoleContext'
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

export function UserMenu() {
  const { t, L } = useI18n()
  const { session, signOut } = useAuth()
  const { role } = useRole()
  const navigate = useNavigate()
  const display = session?.displayName || L(role.name)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9 rounded-full">
          <span className="sr-only">{t(`Account: ${display}`, `الحساب: ${display}`)}</span>
          <Avatar className="size-8" aria-hidden="true">
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">{initials(display)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
          <span className="truncate text-sm font-semibold">{display}</span>
          <span className="truncate text-xs text-muted-foreground">
            {t('Signed in as', 'مسجّل بصفة')} {L(role.name)}
          </span>
          <span className="text-xs text-muted-foreground">{t('Sample sign-in — no real authentication', 'تسجيل دخول نموذجي — بلا مصادقة حقيقية')}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2"
          onSelect={() => {
            // One batch: otherwise the route guard sees "signed out" first and
            // remembers this page as the next person's return target.
            startTransition(() => {
              navigate('/login', { replace: true })
              signOut()
            })
          }}
        >
          <LogOut aria-hidden className="size-4 rtl:-scale-x-100" />
          {t('Sign out', 'تسجيل الخروج')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
