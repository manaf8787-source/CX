import { Navigate, Outlet } from 'react-router-dom'
import { useRole } from '../../auth/RoleContext'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function Shell() {
  const { role } = useRole()
  if (!role) return <Navigate to="/" replace />

  return (
    <div className="shell">
      <Sidebar />
      <div className="main">
        <Topbar />
        <Outlet />
      </div>
    </div>
  )
}
