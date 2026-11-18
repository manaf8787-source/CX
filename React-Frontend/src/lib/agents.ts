import type { Bi } from '../types'
import { AGENT_REGISTRY } from '../data/agentRegistry'

/**
 * Agent chip labels (v40 F33, S17): "Agent 9 · Reporting" / "الوكيل 9 · التقارير", the name in the active
 * language. The supervisor chip reads "CX Supervisor: 6 checks passed" / "سوبرفايزر CX: اجتاز 6 فحوصات".
 */
export function agentChipLabel(agent: number): Bi {
  const profile = AGENT_REGISTRY.find((a) => a.id === agent)
  const name: Bi = profile?.name ?? { en: '', ar: '' }
  return {
    en: name.en ? `Agent ${agent} · ${name.en}` : `Agent ${agent}`,
    ar: name.ar ? `الوكيل ${agent} · ${name.ar}` : `الوكيل ${agent}`,
  }
}

/** The six checks the supervisor runs on every worker output. */
export const SUPERVISOR_CHECKS = 6

export function supervisorChipLabel(checks: number = SUPERVISOR_CHECKS): Bi {
  return { en: `CX Supervisor: ${checks} checks passed`, ar: `سوبرفايزر CX: اجتاز ${checks} فحوصات` }
}

/** "Who does what" button next to the supervisor chip; it opens the Intelligent CX team page. */
export const WHO_DOES_WHAT: Bi = { en: 'Who does what', ar: 'من يفعل ماذا' }
