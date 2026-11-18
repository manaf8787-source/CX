import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canOpenPage } from '@/auth/access'
import { CUSTOMERS_TABS } from '@/data/nav'
import { RouteTabs } from '@/components/common/Tabs'

/**
 * The three tabs at the top of Customers (v40 F17): Find a person, Who is leaving, Personas and campaigns.
 * Each tab is its own URL (the old `/runaway` and `/personas` still work); a tab shows only when the role can open the
 * page, and "Find a person" is always there. It stays visible when a person is open, so "Find a person" is also the
 * current tab on `/customers/p-001` (prefix match: `RouteTabs end={false}`).
 *
 * Design: the page-level tabs of the skill (white pill track, ONE dark pill that slides on the spring, `aria-current="page"`).
 *
 * @example <CustomersTabs />  // directly under the page header of Customers, Runaway and Personas
 */
export function CustomersTabs({ className }: { className?: string }) {
  const { t } = useI18n()
  const { role } = useRole()
  const items = CUSTOMERS_TABS.filter((tab) => tab.path === '/customers' || canOpenPage(role.id, tab.path))
  return <RouteTabs items={items} end={false} label={t('Customers sections', 'أقسام العملاء')} className={className} />
}
