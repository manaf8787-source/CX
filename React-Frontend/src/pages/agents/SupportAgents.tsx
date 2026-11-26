import { AgentReport } from '@/components/performance/AgentReport'
import { useRole } from '@/auth/RoleContext'

/** The Excellence team report (22 Nov; called Support agents until 23 Nov): WhatsApp and in-app chat agents. An environment's CEO sees their own environment only. */
export default function SupportAgents() {
  const { role } = useRole()
  return <AgentReport kind="support" envId={role.id === 'envmgmt' ? role.envId : undefined} />
}
