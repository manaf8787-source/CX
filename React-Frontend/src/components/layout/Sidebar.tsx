import { NavLink, useLocation } from 'react-router-dom'
import { BrainCircuit, Building2, ClipboardList, Home, ListChecks, PhoneCall, Settings2, Target, Users, UserX } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { RoleSwitch } from '@/components/common/RoleSwitch'
import { useI18n } from '@/i18n'
import { PRIMARY_NAV, SETTINGS_NAV, type NavGroup } from '@/data/nav'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath, canOpenPage } from '@/auth/access'
import { useProducts } from '@/services/queries'
import { prefetchPath } from '@/routes/pages'

const ICONS: Record<string, typeof Home> = {
  '/home': Home,
  '/customers': Users,
  '/runaway': UserX,
  '/actions': ListChecks,
  '/close-the-loop': PhoneCall,
  '/personas': Target,
  '/surveys': ClipboardList,
  '/intelligent-cx-team': BrainCircuit,
  '/settings': Settings2,
}

const ACTIVE_BAR =
  'relative data-[active=true]:before:absolute data-[active=true]:before:inset-y-1.5 data-[active=true]:before:start-0 ' +
  'data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-full data-[active=true]:before:bg-sidebar-primary'

export function AppSidebar() {
  const { L, t } = useI18n()
  const { pathname } = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()
  const { role } = useRole()
  const { data: products } = useProducts()
  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`)

  // KB §2: each role sees only its own pages; KB §16: not-launched products stay out of the menu.
  const productGroup: NavGroup = {
    label: { en: 'Products', ar: 'المنتجات' },
    items: (products ?? []).filter((p) => p.live).map((p) => ({ path: `/products/${p.id}`, label: p.name, dotVar: p.colorVar })),
  }
  const groups = [...PRIMARY_NAV.slice(0, 2), productGroup, ...PRIMARY_NAV.slice(2)]
    .map((g) => ({
      ...g,
      items: g.items.filter((i) =>
        i.path === '/settings' ? SETTINGS_NAV.some((s) => canOpenPage(role.id, s.path) && !s.path.endsWith('/glossary')) : canAccessPath(role.id, i.path),
      ),
    }))
    .filter((g) => g.items.length > 0)

  return (
    // The RTL build of this component maps side="left" to the logical start edge.
    <Sidebar side="left" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent active:bg-transparent">
              <NavLink to="/home">
                <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
                  CX
                </span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-base font-semibold text-sidebar-foreground">PSI CX Portal</span>
                  <span className="truncate text-xs text-sidebar-muted-foreground">{t('v38 · prototype', 'الإصدار 38 · نموذج أولي')}</span>
                </span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label.en}>
            <SidebarGroupLabel className="text-xs font-semibold tracking-wide text-sidebar-muted-foreground uppercase">
              {L(group.label)}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = ICONS[item.path] ?? (item.path.startsWith('/products/') ? Building2 : Home)
                  const active = isActive(item.path)
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={L(item.label)}
                        className={`h-9 text-sm text-sidebar-foreground/90 data-[active=true]:text-sidebar-accent-foreground ${ACTIVE_BAR}`}
                      >
                        <NavLink
                          to={item.path}
                          onClick={() => isMobile && setOpenMobile(false)}
                          onPointerEnter={() => prefetchPath(item.path)}
                          onFocus={() => prefetchPath(item.path)}
                        >
                          <Icon aria-hidden />
                          <span>{L(item.label)}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="gap-1.5 border-t border-sidebar-border group-data-[collapsible=icon]:hidden">
        <span className="px-1 text-xs font-medium text-sidebar-muted-foreground">{t('Viewing as (demo)', 'العرض بصفة (تجريبي)')}</span>
        <RoleSwitch className="border-sidebar-border bg-sidebar-accent text-sidebar-foreground [&_svg:not([class*='text-'])]:text-sidebar-muted-foreground" />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
