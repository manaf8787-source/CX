import { Bot, ShieldCheck } from 'lucide-react'
import { useI18n } from '@/i18n'
import { agentChipLabel, supervisorChipLabel } from '@/lib/agents'
import { StatusBadge } from './StatusBadge'

interface AgentChipProps {
  /** Agent number 1 to 10, or 'supervisor' for the CX Supervisor chip. */
  agent: number | 'supervisor'
  /** Supervisor only: how many checks passed (default 6). */
  checks?: number
  /** Just "Agent 5" / "الوكيل 5", without the agent's name: for a narrow column that names the task elsewhere (the weekly sample rows). */
  short?: boolean
  className?: string
}

/**
 * "Agent 9 · Reporting" / "الوكيل 9 · التقارير": one reusable chip with the agent's name in the active
 * language (v40 F33, S17). Used in the daily brief, "How the AI found this" and the weekly sample rows.
 * `agent="supervisor"` renders "CX Supervisor: 6 checks passed" / "سوبرفايزر CX: اجتاز 6 فحوصات".
 * A light tag; the icon carries the only colour (status shade), the text stays ink.
 *
 * @example <AgentChip agent={9} />  <AgentChip agent="supervisor" />
 */
export function AgentChip({ agent, checks, short, className }: AgentChipProps) {
  const { L } = useI18n()
  if (agent === 'supervisor') {
    return (
      <StatusBadge tone="success" icon={<ShieldCheck aria-hidden className="text-success-text" />} className={className}>
        {L(supervisorChipLabel(checks))}
      </StatusBadge>
    )
  }
  return (
    <StatusBadge tone="info" icon={<Bot aria-hidden className="text-info-text" />} className={className}>
      {short ? L({ en: `Agent ${agent}`, ar: `الوكيل ${agent}` }) : L(agentChipLabel(agent))}
    </StatusBadge>
  )
}
