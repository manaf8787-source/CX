import { Outlet } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { SampleBanner } from '../../components/common/SampleBanner'
import { RouteTabs } from '../../components/common/Tabs'
import { ACTIONS_TABS } from '../../data/nav'

export default function ActionsLayout() {
  const { t } = useI18n()
  return (
    <div className="skeleton-page">
      <div className="topbar">
        <div className="page-head">
          <h1>{t('Actions', 'الإجراءات')}</h1>
          <p className="page-lede">{t('What is being fixed, why, and did it work.', 'ما الذي يتم إصلاحه، ولماذا، وهل نجح؟')}</p>
        </div>
        <SampleBanner />
      </div>
      <RouteTabs items={ACTIONS_TABS} />
      <Outlet />
    </div>
  )
}
