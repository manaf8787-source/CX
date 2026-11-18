import type { AgentPassRate, Bi, SupervisorTest, WeeklySampleItem } from '../types'
import type { AgentJobDescription } from '../data/v38Reference'

/**
 * The weekly sample's effect on the supervisor (decided 18 Nov: a "wrong" lowers that agent's pass rate and
 * becomes a supervisor test).
 *
 * [Proposed] formula (the owner said it lowers the rate, not by how much): the share of the agent's sampled outputs
 * that were wrong comes off its pass rate, relative: `current = round(base x (1 - wrong / sampled))`. One wrong in
 * the 18 classifications lowers Agent 2 from 94 to 89; one wrong in 5 fixes lowers Agent 5 from 88 to 70. A wrong
 * judged right again gives the points and the test back.
 */
export function passRate(base: number | null, sampled: number, wrong: number): number | null {
  if (base === null) return null
  if (sampled <= 0 || wrong <= 0) return base
  return Math.max(0, Math.round(base * (1 - Math.min(wrong, sampled) / sampled)))
}

/** Pass rate per agent that has outputs in the sample. `base` maps agent number to its pass rate before the week's verdicts. */
export function agentPassRates(sample: readonly WeeklySampleItem[], base: Readonly<Record<number, number | null>>): AgentPassRate[] {
  const agents = [...new Set(sample.map((i) => i.agent))].sort((a, b) => a - b)
  return agents.map((agent) => {
    const mine = sample.filter((i) => i.agent === agent)
    const wrong = mine.filter((i) => i.verdict === false).length
    const b = base[agent] ?? null
    return { agent, base: b, current: passRate(b, mine.length, wrong), sampled: mine.length, wrong, tests: wrong }
  })
}

/** The supervisor test a wrong verdict becomes. */
export function supervisorTestFor(item: WeeklySampleItem, at: string = new Date().toISOString()): SupervisorTest {
  const text: Bi = { en: `Catch this: ${item.text.en}`, ar: `التقط هذا: ${item.text.ar}` }
  return { id: `st-${item.id}`, fromSampleId: item.id, agent: item.agent, text, createdAt: at }
}

/**
 * Brings the supervisor tests and the agents' pass rates in step with the sample's verdicts. Mutates `tests` and
 * `jds` in place (the mock store: the agents page reads `AGENT_JDS` directly). Idempotent.
 */
export function syncSampleEffects(sample: readonly WeeklySampleItem[], tests: SupervisorTest[], jds: AgentJobDescription[], at: string = new Date().toISOString()): void {
  const wrongIds = new Set(sample.filter((i) => i.verdict === false).map((i) => i.id))
  for (let i = tests.length - 1; i >= 0; i--) if (!wrongIds.has(tests[i].fromSampleId)) tests.splice(i, 1)
  for (const item of sample) {
    if (item.verdict === false && !tests.some((t) => t.fromSampleId === item.id)) tests.push(supervisorTestFor(item, item.judgedAt ?? at))
  }
  const base: Record<number, number | null> = {}
  for (const jd of jds) base[jd.id] = jd.baseApprovalPct ?? jd.approvalPct
  const rates = new Map(agentPassRates(sample, base).map((r) => [r.agent, r]))
  for (const jd of jds) {
    const r = rates.get(jd.id)
    jd.approvalPct = r ? r.current : (jd.baseApprovalPct ?? jd.approvalPct)
    jd.wrongThisWeek = r?.wrong ?? 0
    jd.supervisorTests = r?.tests ?? 0
  }
}
