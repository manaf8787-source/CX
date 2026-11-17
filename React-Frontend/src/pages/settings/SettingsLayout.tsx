import { NavLink, Outlet } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { SampleBanner } from '../../components/common/SampleBanner'
import { SETTINGS_NAV } from '../../data/nav'

/**
 * The folded legacy menu (APPLICATION_MODULES.md §C) — everything the
 * pre-omnichannel `frontend/` scaffold already builds lands here, almost
 * one-to-one. A secondary nav rather than the primary sidebar, since this is
 * one entry in the v38 IA, not seven.
 */
export default function SettingsLayout() {
  const { t, L } = useI18n()
  return (
    <div className="skeleton-page">
      <div className="topbar">
        <div className="page-head">
          <h1>{t('Settings and reference', 'الإعدادات والمرجع')}</h1>
          <p className="page-lede">{t('Everything older: Overview, Mystery shopper, Standards, Voice of Customer, L&D, Teams, Settings.', 'كل ما هو أقدم: نظرة عامة، التسوق السري، المعايير، صوت العميل، التعلم والتطوير، الفرق، الإعدادات.')}</p>
        </div>
        <SampleBanner />
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(200px, 240px) minmax(0, 1fr)', alignItems: 'start' }}>
        <nav className="card" aria-label={t('Settings and reference', 'الإعدادات والمرجع')} style={{ padding: 8 }}>
          <div className="col" style={{ gap: 1 }}>
            {SETTINGS_NAV.map((item) => (
              <NavLink key={item.path} to={item.path} className="subnav-btn">
                {L(item.label)}
              </NavLink>
            ))}
          </div>
        </nav>
        <Outlet />
      </div>
    </div>
  )
}
