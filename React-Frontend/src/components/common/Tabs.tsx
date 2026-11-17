import { NavLink } from 'react-router-dom'
import { useI18n } from '../../i18n'
import type { NavLeaf } from '../../data/nav'

export function RouteTabs({ items }: { items: NavLeaf[] }) {
  const { L } = useI18n()
  return (
    <div className="tabs" role="tablist">
      {items.map((item) => (
        <NavLink key={item.path} to={item.path} role="tab" end>
          {({ isActive }) => <span aria-selected={isActive}>{L(item.label)}</span>}
        </NavLink>
      ))}
    </div>
  )
}
