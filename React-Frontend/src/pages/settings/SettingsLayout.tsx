import { Suspense } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { SETTINGS_NAV } from '@/data/nav'
import { useRole } from '@/auth/RoleContext'
import { canOpenPage } from '@/auth/access'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingState } from '@/components/common/LoadingState'
import { RouteTransition } from '@/components/layout/RouteTransition'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

/**
 * The folded legacy menu (APPLICATION_MODULES.md §C) — everything the
 * pre-omnichannel `frontend/` scaffold already builds lands here, almost
 * one-to-one. A secondary nav rather than the primary sidebar, since this is
 * one entry in the v38 IA, not seven.
 */
export default function SettingsLayout() {
  const { t, L } = useI18n()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { role } = useRole()
  const items = SETTINGS_NAV.filter((i) => canOpenPage(role.id, i.path))
  const current = items.find((i) => pathname === i.path || pathname.startsWith(`${i.path}/`))?.path
  const navLabel = t('Settings and reference', 'الإعدادات والمرجع')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t('Reference', 'مرجع')}
        title={navLabel}
        description={t(
          'How the portal works, the registers (weekly sample, public mentions), the data and configuration pages (data feeds, CRM mapping, escalation matrix, survey questions, rules) and the older modules.',
          'كيف تعمل البوابة، والسجلات (العينة الأسبوعية، الإشارات العامة)، وصفحات البيانات والإعدادات (تغذيات البيانات، ربط CRM، مصفوفة التصعيد، أسئلة الاستبيانات، القواعد) والوحدات الأقدم.',
        )}
      />

      <div className="lg:hidden">
        <Select value={current} onValueChange={(v) => navigate(v)}>
          <SelectTrigger aria-label={t('Choose a section', 'اختر قسماً')} className="h-10 w-full bg-card">
            <SelectValue placeholder={t('Choose a section', 'اختر قسماً')} />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.path} value={item.path}>
                {L(item.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[232px_minmax(0,1fr)]">
        <nav aria-label={navLabel} className="sticky top-20 hidden rounded-xl border bg-card p-2 shadow-xs lg:block">
          <ul className="flex flex-col gap-0.5">
            {items.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'relative flex min-h-9 items-center rounded-md px-3 py-1.5 text-sm outline-none transition-colors duration-150',
                      'focus-visible:ring-[3px] focus-visible:ring-ring/50',
                      isActive
                        ? 'bg-accent font-semibold text-accent-foreground before:absolute before:inset-y-1.5 before:start-0 before:w-0.5 before:rounded-full before:bg-gold'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )
                  }
                >
                  {L(item.label)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex min-w-0 flex-col gap-6">
          <Suspense fallback={<LoadingState rows={5} />}>
            <RouteTransition scope="section">
              <Outlet />
            </RouteTransition>
          </Suspense>
        </div>
      </div>
    </div>
  )
}
