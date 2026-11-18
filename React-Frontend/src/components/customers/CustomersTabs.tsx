import { NavLink } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canOpenPage } from '@/auth/access'
import { CUSTOMERS_TABS } from '@/data/nav'
import { useSlidingIndicator } from '@/components/ui/use-sliding-indicator'
import { cn } from '@/lib/utils'

/**
 * The three tabs at the top of Customers (v40 F17): Find a person, Who is leaving, Personas and campaigns.
 * Each tab is its own URL (the old `/runaway` and `/personas` still work); a tab shows only when the role can open the
 * page, and "Find a person" is always there. It stays visible when a person is open, so "Find a person" is also the
 * current tab on `/customers/p-001` (no `end` on the link).
 *
 * Design: the page-level tabs of the skill, the same look as `RouteTabs` (white pill track, ONE dark pill that slides on the spring,
 * `aria-current="page"`). `RouteTabs` itself cannot be used because it matches the exact path (`end`); this one matches the prefix.
 *
 * @example <CustomersTabs />  // directly under the page header of Customers, Runaway and Personas
 */
export function CustomersTabs({ className }: { className?: string }) {
  const { t, L } = useI18n()
  const { role } = useRole()
  const items = CUSTOMERS_TABS.filter((tab) => tab.path === '/customers' || canOpenPage(role.id, tab.path))
  const { ref, box, ready, animate } = useSlidingIndicator<HTMLDivElement>('a[aria-current=page]')

  return (
    <nav aria-label={t('Customers sections', 'أقسام العملاء')} className={cn('-mx-2 -mb-2 overflow-x-auto px-2 pt-0.5 pb-3', className)}>
      <div
        ref={ref}
        data-indicator={ready ? 'on' : 'off'}
        className="group/customers-tabs relative inline-flex min-h-12 min-w-max items-center gap-0.5 rounded-full bg-card p-1 shadow-card-sm"
      >
        {ready && box && (
          <span
            aria-hidden
            data-slot="customers-tabs-indicator"
            // physical left/top on purpose: the box comes from offsetLeft/offsetTop, which are physical in RTL as well
            className={cn('material-dark pointer-events-none absolute top-0 left-0 rounded-full', animate && 'transition-[translate,width,height] duration-400 ease-spring')}
            style={{ width: box.w, height: box.h, translate: `${box.x}px ${box.y}px` }}
          />
        )}
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'relative z-10 inline-flex min-h-10 items-center rounded-full px-4 pt-1.5 pb-2 text-base font-medium whitespace-nowrap outline-none transition-colors duration-200 ease-out',
                isActive ? 'text-primary-foreground group-data-[indicator=off]/customers-tabs:material-dark' : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            {L(item.label)}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
