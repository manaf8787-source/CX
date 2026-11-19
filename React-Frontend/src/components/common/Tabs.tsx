import { NavLink } from 'react-router-dom'
import { useI18n } from '@/i18n'
import type { NavLeaf } from '@/data/nav'
import { cn } from '@/lib/utils'
import { useSlidingIndicator } from '@/components/ui/use-sliding-indicator'
import { useScrollFade } from '@/components/ui/use-scroll-fade'

/**
 * Route-driven tabs (each tab is a URL), the skill's page-level tabs: a white pill track with the small card shadow and ONE dark pill
 * that slides to the current tab on the spring (physical coordinates, so it is right in RTL). `aria-current="page"` marks the current
 * one. Before the pill is measured (first paint, jsdom) the current tab paints the dark material itself. For in-page tabs use `ui/tabs`.
 *
 * `end` (default true): a tab is current only on its exact path. Pass `end={false}` when a tab owns its sub-paths, so "Find a person" stays
 * current on `/customers/p-005` (prefix match).
 */
export function RouteTabs({ items, label, end = true, className }: { items: NavLeaf[]; label?: string; end?: boolean; className?: string }) {
  const { L, t } = useI18n()
  const { ref, box, ready, animate } = useSlidingIndicator<HTMLDivElement>('a[aria-current=page]')
  const { ref: fadeRef, fadeProps } = useScrollFade<HTMLElement>()
  return (
    <nav ref={fadeRef} {...fadeProps} aria-label={label ?? t('Sections', 'الأقسام')} className={cn('scroll-fade -mx-2 -mb-2 overflow-x-auto px-2 pt-0.5 pb-3', className)}>
      <div
        ref={ref}
        data-indicator={ready ? 'on' : 'off'}
        className="group/route-tabs relative inline-flex min-h-12 min-w-max items-center gap-0.5 rounded-full bg-card p-1 shadow-card-sm"
      >
        {ready && box && (
          <span
            aria-hidden
            data-slot="route-tabs-indicator"
            // physical left/top on purpose: the box comes from offsetLeft/offsetTop, which are physical in RTL as well
            className={cn('material-dark pointer-events-none absolute top-0 left-0 rounded-full', animate && 'transition-[translate,width,height] duration-400 ease-spring')}
            style={{ width: box.w, height: box.h, translate: `${box.x}px ${box.y}px` }}
          />
        )}
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={end}
            data-tour={`tab${item.path.replaceAll('/', '-')}`}
            className={({ isActive }) =>
              cn(
                'relative z-10 inline-flex min-h-10 items-center rounded-full px-4 pt-1.5 pb-2 text-base font-medium whitespace-nowrap outline-hidden transition-colors duration-200 ease-out',
                isActive ? 'text-primary-foreground group-data-[indicator=off]/route-tabs:material-dark' : 'text-muted-foreground hover:text-foreground',
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
