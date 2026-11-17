import { NavLink } from 'react-router-dom'
import { BrainCircuit, ClipboardList, Home, ListChecks, PhoneCall, Settings2, Target, Users, UserX } from 'lucide-react'
import { useI18n } from '../../i18n'
import { PRIMARY_NAV } from '../../data/nav'

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

export function Sidebar() {
  const { L, t } = useI18n()
  return (
    <nav className="sidebar" aria-label={t('Primary', 'التنقل الرئيسي')}>
      <div className="brand-block">
        <div className="brand-mark">CX</div>
        <div>
          <b>PSI CX Portal</b>
          <span>{t('v38 · prototype', 'الإصدار 38 · نموذج أولي')}</span>
        </div>
      </div>
      {PRIMARY_NAV.map((group) => (
        <div className="nav-group" key={L(group.label)}>
          <h4>{L(group.label)}</h4>
          {group.items.map((item) => {
            const Icon = ICONS[item.path] ?? Home
            return (
              <NavLink key={item.path} to={item.path} className="nav-btn">
                <Icon size={15} className="nav-dot-icon" aria-hidden />
                <span>{L(item.label)}</span>
              </NavLink>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
