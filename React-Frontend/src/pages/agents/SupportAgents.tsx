import { AgentReport } from '@/components/performance/AgentReport'
import { useRole } from '@/auth/RoleContext'
import { customLevel } from '@/data/customRoles'

/** The Support agents report (22 Nov): WhatsApp and in-app chat agents. An environment's CEO sees their own environment only. */
export default function SupportAgents() {
  const { role } = useRole()
  return <AgentReport kind="support" canExport={role.id !== 'custom' || customLevel('/agents/support') === 'edit'} envId={role.id === 'envmgmt' ? role.envId : undefined} />
}

