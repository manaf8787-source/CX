import { AgentReport } from '@/components/performance/AgentReport'
import { useRole } from '@/auth/RoleContext'

/** The Sales agents report (22 Nov): CRM lead and activity SLAs, conversion and customer feedback. An environment's CEO sees their own environment only. */
export default function SalesAgents() {
  const { role } = useRole()
  return <AgentReport kind="sales" envId={role.id === 'envmgmt' ? role.envId : undefined} />
}
