import { NavLink } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { useRole } from '../../auth/RoleContext'
import { useSettings } from '../../settings/SettingsContext'
import { NAV_GROUPS } from '../../data/nav'
import { PhaseTag } from '../ui/Chip'

export function Sidebar() {
  const { L, t } = useI18n()
  const { role, signOut } = useRole()
  const { isLaunched } = useSettings()
  if (!role) return null

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => {
      if (item.roles !== 'all' && !item.roles.includes(role.id)) return false
      if (item.requireProduct && !isLaunched(item.requireProduct) && item.phase == null) return false
      return true
    }),
  })).filter((g) => g.items.length > 0)

  return (
    <nav className="rail" aria-label={t('Main navigation', 'التنقل الرئيسي')}>
      <div className="brand">
        <div className="logo">CX</div>
        <div>
          <b>PSI CX Portal</b>
          <span>{L(role.name)}</span>
        </div>
      </div>
      {groups.map((g) => (
        <div className="ngroup" key={L(g.label)}>
          <h4>{L(g.label)}</h4>
          {g.items.map((item) => (
            <NavLink key={item.path} to={item.path} className="nav-b">
              <span className="dot" />
              <span style={{ flex: 1 }}>{L(item.label)}</span>
              {item.phase != null && <PhaseTag phase={item.phase} />}
            </NavLink>
          ))}
        </div>
      ))}
      <div className="rail-foot">
        <button className="btn s" onClick={signOut}>{t('Switch role', 'تبديل الدور')}</button>
      </div>
    </nav>
  )
}
