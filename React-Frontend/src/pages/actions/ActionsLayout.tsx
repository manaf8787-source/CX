import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingState } from '@/components/common/LoadingState'
import { NextBox } from '@/components/common/NextBox'
import { RouteTransition } from '@/components/layout/RouteTransition'
import { RouteTabs } from '@/components/common/Tabs'
import { ACTIONS_TABS } from '@/data/nav'
import { actionsNext, type ActionsTabKind } from '@/data/steps'

/** v40 F07: above the tabs, "where you are, what happens next": Signals = step sg, Investigations = step pt, every other tab = step ca. */
function tabKind(pathname: string): ActionsTabKind {
  if (pathname.startsWith('/actions/signals')) return 'signals'
  if (pathname.startsWith('/actions/investigations')) return 'investigations'
  return 'other'
}

export default function ActionsLayout() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  return (
    <div className="flex flex-col gap-6">
      <PageHeader term="Corrective action" title={t('Actions', 'الإجراءات')} description={t('What is being fixed, why, and did it work.', 'ما الذي يتم إصلاحه، ولماذا، وهل نجح؟')} />
      <NextBox next={actionsNext(tabKind(pathname))} />
      <RouteTabs items={ACTIONS_TABS} label={t('Actions sections', 'أقسام الإجراءات')} />
      <Suspense fallback={<LoadingState rows={5} />}>
        <RouteTransition scope="section">
          <Outlet />
        </RouteTransition>
      </Suspense>
    </div>
  )
}
