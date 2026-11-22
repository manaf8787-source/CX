import { AgentReport } from '@/components/performance/AgentReport'
import { useRole } from '@/auth/RoleContext'
import { customLevel } from '@/data/customRoles'

/** The Sales agents report (22 Nov): CRM lead and activity SLAs, conversion and customer feedback. An environment's CEO sees their own environment only. */
export default function SalesAgents() {
  const { role } = useRole()
  return <AgentReport kind="sales" canExport={role.id !== 'custom' || customLevel('/agents/sales') === 'edit'} envId={role.id === 'envmgmt' ? role.envId : undefined} />
}

