import { useRole } from '@/auth/RoleContext'
import { canExportPerformance } from '@/auth/permissions'
import { PerformanceReport } from '@/components/performance/PerformanceReport'

/** The user performance dashboard (22 Nov): every user who receives work, for the Admin and the Super admin; only the Super admin exports. */
export default function UserPerformance() {
  const { role } = useRole()
  return <PerformanceReport scope="all" canExport={canExportPerformance(role.id)} />
}
