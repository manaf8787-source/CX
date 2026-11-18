import { NavLink } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canOpenPage } from '@/auth/access'
import { CUSTOMERS_TABS } from '@/data/nav'
import { cn } from '@/lib/utils'

/**
 * The three tabs at the top of Customers (v40 F17): Find a person, Who is leaving, Personas and campaigns.
 * Each tab is its own URL (the old `/runaway` and `/personas` still work); a tab shows only when the role can open the
 * page, and "Find a person" is always there. It stays visible when a person is open, so "Find a person" is also the
 * current tab on `/customers/p-001` (no `end` on the link).
 *
 * @example <CustomersTabs />  // directly under the page header of Customers, Runaway and Personas
 */
export function CustomersTabs({ className }: { className?: string }) {
  const { t, L } = useI18n()
  const { role } = useRole()
  const items = CUSTOMERS_TABS.filter((tab) => tab.path === '/customers' || canOpenPage(role.id, tab.path))

  return (
    <nav aria-label={t('Customers sections', 'أقسام العملاء')} className={cn('-mx-1 overflow-x-auto px-1 pb-1', className)}>
      <div className="inline-flex h-10 min-w-max items-center gap-1 rounded-lg bg-muted p-1">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'inline-flex h-8 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap outline-none transition-[color,background-color,box-shadow] duration-200 ease-out',
                'focus-visible:ring-[3px] focus-visible:ring-ring/50',
                isActive ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
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
