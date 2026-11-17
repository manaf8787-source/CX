import { NavLink } from 'react-router-dom'
import { useI18n } from '@/i18n'
import type { NavLeaf } from '@/data/nav'
import { cn } from '@/lib/utils'

/** Route-driven tabs (each tab is a URL). For in-page tabs use shadcn `Tabs`. */
export function RouteTabs({ items, label }: { items: NavLeaf[]; label?: string }) {
  const { L, t } = useI18n()
  return (
    <nav aria-label={label ?? t('Sections', 'الأقسام')} className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="inline-flex h-10 min-w-max items-center gap-1 rounded-lg bg-muted p-1">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end
            className={({ isActive }) =>
              cn(
                'inline-flex h-8 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap outline-none transition-colors duration-150',
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
