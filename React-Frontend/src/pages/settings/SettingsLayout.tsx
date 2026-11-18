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
import { useSlidingIndicator } from '@/components/ui/use-sliding-indicator'
import { cn } from '@/lib/utils'

/**
 * The folded legacy menu (APPLICATION_MODULES.md §C) — everything the
 * pre-omnichannel `frontend/` scaffold already builds lands here, almost
 * one-to-one. A secondary nav rather than the primary sidebar, since this is
 * one entry in the v38 IA, not seven.
 *
 * Design (docs/MEO_DESIGN_SYSTEM.md): the secondary nav is the skill's side-nav card (radius 20, padding 8, 40px items) with ONE dark
 * pill that slides to the current page on the spring; the pill is measured in physical coordinates, so it is right in RTL. Until it is
 * measured (first paint, jsdom) the current item paints the dark material itself. Under 1024px the menu is a select.
 */
export default function SettingsLayout() {
  const { t, L } = useI18n()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { role } = useRole()
  const items = SETTINGS_NAV.filter((i) => canOpenPage(role.id, i.path))
  const current = items.find((i) => pathname === i.path || pathname.startsWith(`${i.path}/`))?.path
  const navLabel = t('Settings and reference', 'الإعدادات والمرجع')
  const { ref, box, ready, animate } = useSlidingIndicator<HTMLDivElement>('a[aria-current=page]')

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
          <SelectTrigger aria-label={t('Choose a section', 'اختر قسماً')} className="w-full">
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
        <nav aria-label={navLabel} className="sticky top-20 hidden max-h-[calc(100vh-6.5rem)] overflow-y-auto rounded-panel bg-card p-2 shadow-card lg:block">
          <div ref={ref} data-indicator={ready ? 'on' : 'off'} className="group/settings-nav relative">
            {ready && box && (
              <span
                aria-hidden
                data-slot="settings-nav-indicator"
                // physical left/top on purpose: the box comes from offsetLeft/offsetTop, which are physical in RTL as well
                className={cn('material-dark pointer-events-none absolute top-0 left-0 rounded-xl', animate && 'transition-[translate,width,height] duration-400 ease-spring')}
                style={{ width: box.w, height: box.h, translate: `${box.x}px ${box.y}px` }}
              />
            )}
            <ul className="flex flex-col gap-0.5">
              {items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        'relative z-10 flex min-h-9 items-center rounded-xl px-3.5 py-1.5 text-base outline-hidden transition-colors duration-200 ease-out',
                        isActive
                          ? 'font-medium text-primary-foreground group-data-[indicator=off]/settings-nav:material-dark'
                          : 'text-muted-foreground hover:text-foreground',
                      )
                    }
                  >
                    {L(item.label)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
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
