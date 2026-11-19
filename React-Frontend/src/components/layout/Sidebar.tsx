import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { CircleHelp, Gauge, Home, Inbox, ListChecks, PanelLeftClose, PanelLeftOpen, PhoneCall, Settings2, Users, X, type LucideIcon } from 'lucide-react'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSlidingIndicator } from '@/components/ui/use-sliding-indicator'
import { useScrollFade } from '@/components/ui/use-scroll-fade'
import { RoleSwitch } from '@/components/common/RoleSwitch'
import { BrandLogo } from '@/components/common/BrandLogo'
import { useTour } from '@/components/tour/tourContext'
import { useI18n } from '@/i18n'
import { PRIMARY_NAV, SETTINGS_NAV, type NavGroup } from '@/data/nav'
import { TOUR_COPY } from '@/data/tours'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath, canOpenPage } from '@/auth/access'
import { useProducts } from '@/services/queries'
import { prefetchPath } from '@/routes/pages'
import { cn } from '@/lib/utils'
import { prefersReducedMotion } from '@/lib/motion'
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

/**
 * Opening and closing (owner's request, 19 Nov: gradual and smooth). Opening: the expanded layout is laid out at its full width at once and
 * the widening column reveals it, while the words fade in one after the other (`--nav-i`). Closing: the words fade, the column narrows, and
 * only then does the rail layout take over (`CLOSE_MS`), where its own two buttons fade in. See `.nav-fade` and `.rail-fade` in theme.css.
 */
const OPEN_MS = 1100
const CLOSE_MS = 440
const SETTLE_MS = 300
type Phase = 'opening' | 'closing' | 'settling'
/** The place of a row in the opening sequence: brand 0, then each label and item, the bottom card last. */
const step = (i: number) => ({ '--nav-i': i }) as CSSProperties

function matches(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`)
}

/** KB §2: each role sees only its own pages; KB §16: not-launched products stay out of the menu. The data is unchanged (data/nav.ts). */
function useSidebarGroups(): SidebarNavGroup[] {
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

export function SidebarNavItem({
  node,
  pathname,
  tooltip,
  tall,
  onNavigate,
  index = 0,
}: {
  node: SidebarNavNode
  pathname: string
  tooltip: boolean
  tall: boolean
  onNavigate?: () => void
  /** Place in the opening sequence (the words fade in top to bottom). */
  index?: number
}) {
  const active = matches(pathname, node.path)
  const Icon = node.icon ?? Home
  const nested = node.children && node.children.length > 0
  return (
    <SidebarMenuItem className="static">
      <SidebarMenuButton asChild isActive={active} tooltip={tooltip ? node.label : undefined} className={cn(ITEM, tall && 'h-11 text-base')}>
        <NavLink
          to={node.path}
          data-tour={`nav${node.path.replaceAll('/', '-')}`}
          onClick={onNavigate}
          onPointerEnter={() => prefetchPath(node.path)}
          onFocus={() => prefetchPath(node.path)}
        >
          {node.dotVar ? (
            <span aria-hidden className="grid size-4 shrink-0 place-items-center">
              <span className="size-2 rounded-full" style={{ backgroundColor: `var(${node.dotVar})` }} />
            </span>
          ) : (
            <Icon aria-hidden />
          )}
          {/* sr-only in the rail, not hidden: the link keeps its name there (the tooltip carries it visually) */}
          <span style={step(index)} className="nav-fade group-data-[collapsible=icon]:sr-only">
            {node.label}
          </span>
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

/**
 * The brand row: the CX logo (its point going round), large, and the name beside it. The owner's wording, 19 Nov: no "PSI" and no version
 * line here. A link home; in the rail the logo stands alone and the name stays as screen-reader text.
 */
function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <NavLink
      to="/home"
      onClick={onNavigate}
      className="flex min-h-9 min-w-0 items-center gap-2.5 rounded-md px-2 py-1 outline-hidden group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
    >
      <BrandLogo decorative className="h-[26px] group-data-[collapsible=icon]:h-[17px]" />
      <span className="nav-fade t-h4 min-w-0 truncate group-data-[collapsible=icon]:sr-only">CX Portal</span>
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
  /** Replay the guided tour ("How do I use this?"). The phone and tablet sheet close first, then the tour starts. */
  onReplay: () => void
}

/** "How do I use this?" (v41 F28): a pill above the role card; in the collapsed rail an icon with a tooltip. Not shown for a role without a tour. */
function ReplayTour({ rail, onReplay, index }: { rail: boolean; onReplay: () => void; index: number }) {
  const { L } = useI18n()
  const label = L(TOUR_COPY.replay)
  if (rail) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" onClick={onReplay} aria-label={label} className="rail-fade">
            <CircleHelp aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" align="center">
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }
  return (
    <Button variant="outline" size="sm" onClick={onReplay} style={step(index)} className="nav-fade w-full justify-start">
      <CircleHelp aria-hidden />
      {label}
    </Button>
  )
}

/** Brand row, grouped menu with the sliding pill, and the bottom card. Used by the fixed aside and by the sheet, so both look the same. */
function NavBody({ variant, groups, toggle, onClose, onNavigate, onReplay }: NavBodyProps) {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const { available: hasTour } = useTour()
  const { ref, box, ready, animate } = useSlidingIndicator<HTMLDivElement>('[data-sidebar=menu-button][data-active=true]')
  const { ref: fadeRef, fadeProps } = useScrollFade<HTMLDivElement>('y')
  const sheet = variant === 'sheet'
  // one element, two hooks: the sliding pill measures it and the edge fade watches its scroll
  const setScroller = useCallback(
    (el: HTMLDivElement | null) => {
      ref.current = el
      fadeRef.current = el
    },
    [ref, fadeRef],
  )
  // Rows in order, for the opening sequence: a group's label, then its items; the bottom card comes last.
  const starts: number[] = []
  let rows = 1
  for (const group of groups) {
    starts.push(rows)
    rows += group.items.length + 1
  }
  // On a short screen the menu scrolls: the page you are on is never left out of sight. Again when the list grows (the products arrive
  // after the first paint and push the rows below them down). Only the menu scrolls: the page itself stays where it is.
  useEffect(() => {
    const scroller = ref.current
    const active = scroller?.querySelector<HTMLElement>('[data-sidebar=menu-button][data-active=true]')
    if (!scroller || !active) return
    const top = active.offsetTop
    const bottom = top + active.offsetHeight
    if (top < scroller.scrollTop) scroller.scrollTop = Math.max(0, top - 8)
    else if (bottom > scroller.scrollTop + scroller.clientHeight) scroller.scrollTop = bottom - scroller.clientHeight + 8
  }, [pathname, ref, rows])

  const toggleButton = toggle && (
    <Button
      variant="outline"
      size="icon-xs"
      onClick={toggle.onClick}
      aria-label={toggle.label}
      aria-expanded={toggle.opensDrawer ? undefined : toggle.expanded}
      aria-haspopup={toggle.opensDrawer ? 'dialog' : undefined}
      className="nav-fade rail-fade shrink-0 [&_svg]:size-3.5"
    >
      {toggle.rail ? <PanelLeftOpen aria-hidden className="rtl:-scale-x-100" /> : <PanelLeftClose aria-hidden className="rtl:-scale-x-100" />}
    </Button>
  )

  return (
    // Expanded: laid out at the full width whatever the column's width is at that moment, so the widening column reveals finished rows
    // (no words re-flowing or cut to "Ho…" on the way). The rail and the sheet take the width they are given.
    <div className={cn('flex h-full min-h-0 flex-col', !sheet && 'w-[calc(var(--sidebar-w)-20px)] group-data-[collapsible=icon]:w-full')}>
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

      <SidebarContent ref={setScroller} {...fadeProps} data-indicator={ready ? 'on' : 'off'} className="group/nav no-scrollbar scroll-fade-y relative gap-0">
        {ready && box && (
          <span
            aria-hidden
            data-slot="sidebar-indicator"
            // physical left/top on purpose: the box comes from offsetLeft/offsetTop, which are physical in RTL as well
            className={cn('material-dark pointer-events-none absolute top-0 left-0 rounded-md', animate && 'transition-[translate,width,height] duration-400 ease-spring')}
            style={{ width: box.w, height: box.h, translate: `${box.x}px ${box.y}px` }}
          />
        )}
        {groups.map((group, g) => (
          <SidebarGroup key={group.key} className="static p-0">
            {/* a short screen (a laptop at 125%): less air above each label, so the whole menu fits more often */}
            {/* (the rail keeps its own spacing: its hidden labels pull the icons together by a fixed amount) */}
            <SidebarGroupLabel style={step(starts[g])} className="nav-fade [@media(max-height:719px)]:pt-2 group-data-[collapsible=icon]:[@media(max-height:719px)]:pt-3.5">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((node, i) => (
                  <SidebarNavItem key={node.path} node={node} pathname={pathname} tooltip={!sheet} tall={sheet} onNavigate={onNavigate} index={starts[g] + 1 + i} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* The skill's usage card (light material, radius 10, padding 10): here it holds the demo role switch and the sample-data notice. */}
      <SidebarFooter className={cn('gap-2 p-0 pt-3 group-data-[collapsible=icon]:items-center', !hasTour && 'group-data-[collapsible=icon]:hidden')}>
        {hasTour && <ReplayTour rail={!sheet && !!toggle?.rail} onReplay={onReplay} index={rows} />}
        {/* On a short screen the card keeps only the select (its accessible name says what it is), so the menu keeps the room. */}
        <div style={step(rows + 1)} className="nav-fade material-light flex flex-col gap-2 rounded-lg p-2.5 group-data-[collapsible=icon]:hidden">
          <span className="t-ui-strong [@media(max-height:719px)]:hidden">{t('Viewing as (demo)', 'العرض بصفة (تجريبي)')}</span>
          <RoleSwitch />
          <span className="text-sm text-muted-foreground [@media(max-height:719px)]:hidden">{t('Sample data only', 'بيانات تجريبية فقط')}</span>
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
  const { start: startTour } = useTour()
  // `rail` is the state (the column's width, aria-expanded, tooltips). `layoutRail` is which layout is drawn: it follows at once when
  // opening and `CLOSE_MS` later when closing, so the words can fade while the column narrows. No motion: it follows at once both ways.
  const [layoutRail, setLayoutRail] = useState(rail)
  const [phase, setPhase] = useState<Phase | null>(null)
  const [seenRail, setSeenRail] = useState(rail)
  if (seenRail !== rail) {
    // the state changed since the last render: start the move here, so the first frame already shows it
    setSeenRail(rail)
    const still = prefersReducedMotion()
    if (!rail) {
      setLayoutRail(false)
      setPhase(still ? null : 'opening')
    } else if (still) {
      setLayoutRail(true)
      setPhase(null)
    } else {
      setPhase('closing')
    }
  }
  // each phase ends on a timer: opening clears, closing hands over to the rail layout, which then settles
  useEffect(() => {
    if (!phase) return
    const id = window.setTimeout(
      () => {
        if (phase === 'closing') setLayoutRail(true)
        setPhase(phase === 'closing' ? 'settling' : null)
      },
      phase === 'opening' ? OPEN_MS : phase === 'closing' ? CLOSE_MS : SETTLE_MS,
    )
    return () => window.clearTimeout(id)
  }, [phase])
  // "How do I use this?" inside the sheet: close the sheet first, start the tour once it has closed (so the sheet's focus return does not take focus from the tour card).
  const replayAfterSheet = useRef(false)
  const toggleLabel =
    mode === 'tablet' ? t('Open navigation', 'فتح التنقل') : rail ? t('Expand sidebar', 'توسيع الشريط الجانبي') : t('Collapse sidebar', 'طيّ الشريط الجانبي')

  const aside: ReactNode = !phone && (
    <div className={cn('relative bg-sidebar', className)}>
      <nav
        aria-label={t('Main navigation', 'التنقل الرئيسي')}
        data-slot="sidebar"
        data-state={rail ? 'collapsed' : 'expanded'}
        data-collapsible={layoutRail ? 'icon' : ''}
        data-phase={phase ?? undefined}
        // 20px = the frame card's padding, top and bottom, above 1440px
        className="group sticky top-0 flex h-svh flex-col overflow-hidden px-2.5 py-3.5 text-sidebar-foreground min-[1441px]:h-[calc(100svh-20px)]"
      >
        <NavBody
          variant="aside"
          groups={groups}
          toggle={{ label: toggleLabel, expanded: !rail, rail: layoutRail, opensDrawer: mode === 'tablet', onClick: onToggle }}
          onReplay={startTour}
        />
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
          onCloseAutoFocus={(e) => {
            if (!replayAfterSheet.current) return
            replayAfterSheet.current = false
            e.preventDefault()
            startTour()
          }}
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
            <NavBody
              variant="sheet"
              groups={groups}
              onClose={() => onSheetOpenChange(false)}
              onNavigate={() => onSheetOpenChange(false)}
              onReplay={() => {
                replayAfterSheet.current = true
                onSheetOpenChange(false)
              }}
            />
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}
