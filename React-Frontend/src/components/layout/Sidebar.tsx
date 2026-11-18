import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Gauge, Home, Inbox, ListChecks, PanelLeftClose, PanelLeftOpen, PhoneCall, Settings2, Users, X, type LucideIcon } from 'lucide-react'
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useSlidingIndicator } from '@/components/ui/use-sliding-indicator'
import { RoleSwitch } from '@/components/common/RoleSwitch'
import { useI18n } from '@/i18n'
import { PRIMARY_NAV, SETTINGS_NAV, type NavGroup } from '@/data/nav'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath, canOpenPage } from '@/auth/access'
import { useProducts } from '@/services/queries'
import { prefetchPath } from '@/routes/pages'
import { cn } from '@/lib/utils'
import type { ViewportMode } from './useViewportMode'

const ICONS: Record<string, LucideIcon> = {
  '/home': Home,
  '/customers': Users,
  '/inbox': Inbox,
  '/actions': ListChecks,
  '/close-the-loop': PhoneCall,
  '/overview': Gauge,
  '/settings': Settings2,
}

/** One entry of the menu after labels are resolved to the active language. `children` and `count` are supported (the skill's nested items
 *  and counts) but the portal's menu data has neither today, so neither renders. */
export interface SidebarNavNode {
  path: string
  label: string
  icon?: LucideIcon
  /** A product: shows its 6px hue dot instead of an icon (the hue is categorical, dots only). */
  dotVar?: string
  count?: number
  children?: { path: string; label: string }[]
}

export interface SidebarNavGroup {
  key: string
  label: string
  items: SidebarNavNode[]
}

/** The skill's selected item is ONE dark pill that slides between items. While it is placed (`data-indicator=on` on the list) the active
 *  item drops its own material and only keeps the white text; before that (first paint, jsdom) the item paints the material itself. */
const ITEM =
  'relative z-10 group-data-[indicator=on]/nav:data-[active=true]:bg-none! group-data-[indicator=on]/nav:data-[active=true]:shadow-none!'

function matches(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`)
}

/** KB §2: each role sees only its own pages; KB §16: not-launched products stay out of the menu. The data is unchanged (data/nav.ts). */
export function useSidebarGroups(): SidebarNavGroup[] {
  const { L } = useI18n()
  const { role } = useRole()
  const { data: products } = useProducts()
  const productGroup: NavGroup = {
    label: { en: 'Products', ar: 'المنتجات' },
    items: (products ?? []).filter((p) => p.live).map((p) => ({ path: `/products/${p.id}`, label: p.name, dotVar: p.colorVar })),
  }
  return [PRIMARY_NAV[0], productGroup, ...PRIMARY_NAV.slice(1)]
    .map((g) => ({
      key: g.label.en,
      label: L(g.label),
      items: g.items
        .filter((i) =>
          i.path === '/settings' ? SETTINGS_NAV.some((s) => canOpenPage(role.id, s.path) && !s.path.endsWith('/glossary')) : canAccessPath(role.id, i.path),
        )
        .map<SidebarNavNode>((i) => ({ path: i.path, label: L(i.label), icon: ICONS[i.path], dotVar: i.dotVar })),
    }))
    .filter((g) => g.items.length > 0)
}

export function SidebarNavItem({ node, pathname, tooltip, tall, onNavigate }: { node: SidebarNavNode; pathname: string; tooltip: boolean; tall: boolean; onNavigate?: () => void }) {
  const active = matches(pathname, node.path)
  const Icon = node.icon ?? Home
  const nested = node.children && node.children.length > 0
  return (
    <SidebarMenuItem className="static">
      <SidebarMenuButton asChild isActive={active} tooltip={tooltip ? node.label : undefined} className={cn(ITEM, tall && 'h-11 text-base')}>
        <NavLink to={node.path} onClick={onNavigate} onPointerEnter={() => prefetchPath(node.path)} onFocus={() => prefetchPath(node.path)}>
          {node.dotVar ? (
            <span aria-hidden className="grid size-4 shrink-0 place-items-center">
              <span className="size-2 rounded-full" style={{ backgroundColor: `var(${node.dotVar})` }} />
            </span>
          ) : (
            <Icon aria-hidden />
          )}
          <span className="group-data-[collapsible=icon]:hidden">{node.label}</span>
        </NavLink>
      </SidebarMenuButton>
      {node.count !== undefined && <SidebarMenuBadge>{node.count.toLocaleString()}</SidebarMenuBadge>}
      {nested && active && (
        <SidebarMenuSub>
          {node.children!.map((child) => (
            <SidebarMenuSubItem key={child.path}>
              <SidebarMenuSubButton asChild isActive={matches(pathname, child.path)}>
                <NavLink to={child.path} onClick={onNavigate} onPointerEnter={() => prefetchPath(child.path)}>
                  <span>{child.label}</span>
                </NavLink>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  )
}

/** The brand row: our own text mark (a 22px dark tile with "CX") and the name. A link home, named even when the rail hides the words. */
function Brand({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n()
  return (
    <NavLink
      to="/home"
      onClick={onNavigate}
      aria-label="PSI CX Portal"
      className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1 outline-none group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
    >
      <span aria-hidden className="material-dark grid size-[22px] shrink-0 place-items-center rounded-sm text-[9px] leading-none font-medium">
        CX
      </span>
      <span className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
        <span className="t-h4 truncate">PSI CX Portal</span>
        <span className="truncate text-xs text-muted-foreground">{t('v40 · prototype', 'الإصدار 40 · نموذج أولي')}</span>
      </span>
    </NavLink>
  )
}

interface NavBodyProps {
  variant: 'aside' | 'sheet'
  groups: SidebarNavGroup[]
  /** Aside only: the rail toggle (collapse or expand on desktop, open the drawer on a tablet). */
  toggle?: { label: string; expanded?: boolean; onClick: () => void; opensDrawer?: boolean; rail: boolean }
  /** Sheet only: the close button. */
  onClose?: () => void
  onNavigate?: () => void
}

/** Brand row, grouped menu with the sliding pill, and the bottom card. Used by the fixed aside and by the sheet, so both look the same. */
function NavBody({ variant, groups, toggle, onClose, onNavigate }: NavBodyProps) {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const { ref, box, ready, animate } = useSlidingIndicator<HTMLDivElement>('[data-sidebar=menu-button][data-active=true]')
  const sheet = variant === 'sheet'

  const toggleButton = toggle && (
    <Button
      variant="outline"
      size="icon-xs"
      onClick={toggle.onClick}
      aria-label={toggle.label}
      aria-expanded={toggle.opensDrawer ? undefined : toggle.expanded}
      aria-haspopup={toggle.opensDrawer ? 'dialog' : undefined}
      className="shrink-0 [&_svg]:size-3.5"
    >
      {toggle.rail ? <PanelLeftOpen aria-hidden className="rtl:-scale-x-100" /> : <PanelLeftClose aria-hidden className="rtl:-scale-x-100" />}
    </Button>
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SidebarHeader className="gap-2 p-0 pb-2">
        <div className="flex items-center justify-between gap-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2">
          <Brand onNavigate={onNavigate} />
          {sheet && onClose ? (
            <Button variant="outline" size="icon-sm" onClick={onClose} aria-label={t('Close navigation', 'إغلاق التنقل')}>
              <X aria-hidden />
            </Button>
          ) : (
            <span className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">{toggleButton}</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent ref={ref} data-indicator={ready ? 'on' : 'off'} className="group/nav relative gap-0">
        {ready && box && (
          <span
            aria-hidden
            data-slot="sidebar-indicator"
            // physical left/top on purpose: the box comes from offsetLeft/offsetTop, which are physical in RTL as well
            className={cn('material-dark pointer-events-none absolute top-0 left-0 rounded-md', animate && 'transition-[translate,width,height] duration-400 ease-spring')}
            style={{ width: box.w, height: box.h, translate: `${box.x}px ${box.y}px` }}
          />
        )}
        {groups.map((group) => (
          <SidebarGroup key={group.key} className="static p-0">
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((node) => (
                  <SidebarNavItem key={node.path} node={node} pathname={pathname} tooltip={!sheet} tall={sheet} onNavigate={onNavigate} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* The skill's usage card (light material, radius 10, padding 10): here it holds the demo role switch and the sample-data notice. */}
      <SidebarFooter className="gap-0 p-0 pt-3 group-data-[collapsible=icon]:hidden">
        <div className="material-light flex flex-col gap-2 rounded-lg p-2.5">
          <span className="t-ui-strong">{t('Viewing as (demo)', 'العرض بصفة (تجريبي)')}</span>
          <RoleSwitch />
          <span className="text-sm text-muted-foreground">{t('Sample data only', 'بيانات تجريبية فقط')}</span>
        </div>
      </SidebarFooter>
    </div>
  )
}

interface AppSidebarProps {
  mode: ViewportMode
  /** Desktop only: whether the user left the sidebar expanded (false = the 56px rail). */
  expanded: boolean
  /** Desktop: collapse or expand. Tablet: open the drawer. */
  onToggle: () => void
  /** The menu sheet: full screen on a phone, a floating drawer on a tablet. */
  sheetOpen: boolean
  onSheetOpenChange: (open: boolean) => void
  /** Rendered into the shell grid's first cell; its parent must be a grid cell that stretches to the page height. */
  className?: string
}

/**
 * The skill's sidebar (220px, #f6f6f6, no divider: the tone change is the edge). Desktop: expanded, or the 56px rail with tooltips
 * (the choice is remembered by the shell). Tablet: always the rail, and the toggle opens a floating drawer. Phone: no sidebar; the
 * header's menu button opens a full-screen sheet. The sheet is a Radix dialog: Esc closes it, focus is trapped and returned to the button.
 * Returns the grid cell and the sheet; the shell decides the column width.
 */
export function AppSidebar({ mode, expanded, onToggle, sheetOpen, onSheetOpenChange, className }: AppSidebarProps) {
  const { t } = useI18n()
  const groups = useSidebarGroups()
  const rail = mode === 'tablet' || (mode === 'desktop' && !expanded)
  const phone = mode === 'phone'
  const toggleLabel =
    mode === 'tablet' ? t('Open navigation', 'فتح التنقل') : rail ? t('Expand sidebar', 'توسيع الشريط الجانبي') : t('Collapse sidebar', 'طيّ الشريط الجانبي')

  const aside: ReactNode = !phone && (
    <div className={cn('relative bg-sidebar', className)}>
      <nav
        aria-label={t('Main navigation', 'التنقل الرئيسي')}
        data-slot="sidebar"
        data-state={rail ? 'collapsed' : 'expanded'}
        data-collapsible={rail ? 'icon' : ''}
        className="group sticky top-0 flex h-svh flex-col overflow-hidden px-2.5 py-3.5 text-sidebar-foreground min-[1441px]:h-[calc(100svh-64px)]"
      >
        <NavBody variant="aside" groups={groups} toggle={{ label: toggleLabel, expanded: !rail, rail, opensDrawer: mode === 'tablet', onClick: onToggle }} />
      </nav>
    </div>
  )

  return (
    <>
      {aside}
      <Sheet open={sheetOpen && mode !== 'desktop'} onOpenChange={onSheetOpenChange}>
        <SheetContent
          side="left"
          showCloseButton={false}
          aria-describedby={undefined}
          className={cn(
            'gap-0 bg-sidebar p-0',
            phone ? 'inset-0! h-full! w-full! max-w-none! rounded-none!' : 'w-[calc(100%-1.25rem)] sm:max-w-[18rem]',
          )}
        >
          <SheetTitle className="sr-only">{t('Navigation menu', 'قائمة التنقل')}</SheetTitle>
          <nav
            aria-label={t('Main navigation', 'التنقل الرئيسي')}
            data-slot="sidebar"
            data-mobile="true"
            data-state="expanded"
            data-collapsible=""
            className="group h-full min-h-0 overflow-hidden px-3.5 py-3.5 text-sidebar-foreground"
          >
            <NavBody variant="sheet" groups={groups} onClose={() => onSheetOpenChange(false)} onNavigate={() => onSheetOpenChange(false)} />
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}
