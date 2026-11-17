import { Outlet } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { PageHeader } from '@/components/common/PageHeader'
import { RouteTabs } from '@/components/common/Tabs'
import { ACTIONS_TABS } from '@/data/nav'

export default function ActionsLayout() {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('Actions', 'الإجراءات')} description={t('What is being fixed, why, and did it work.', 'ما الذي يتم إصلاحه، ولماذا، وهل نجح؟')} />
      <RouteTabs items={ACTIONS_TABS} label={t('Actions sections', 'أقسام الإجراءات')} />
      <Outlet />
    </div>
  )
}
