import type { AiCallDailyExtra, AiCallDailyRow, AiCampaignTotals, BrightcallOutcome, CallGroup, DropBucket, MappedResult } from '../data/brightcall'

export interface AiCallFilter {
  /** 'all' or one environment. */
  env: string
  /** 'all' or one campaign. */
  campaign: string
  /** First day included, YYYY-MM-DD. */
  from: string
}

export interface AiCallSummary {
  targeted: number
  attempted: number
  calls: number
  contacts: number
  byGroup: Record<CallGroup, number>
  byResult: Map<MappedResult, { calls: number; contacts: number }>
  byOutcome: Map<string, { calls: number; contacts: number; cost: number }>
  leads: number
  complaints: number
  cost: number
  drops: Record<DropBucket, number>
  sentiment: { positive: number; neutral: number; negative: number }
  campaigns: {
    campaign: string
    envId: string
    targeted: number
    attempted: number
    calls: number
    answered: number
    dropped20: number
    leads: number
    cost: number
  }[]
}

/**
 * Totals over the daily rows (the same sums the backend endpoint returns). Calls blocked before dialling (DNCR, not in the CRM) and
 * test or unknown outcomes are left out of the call count, as BrightCall's own split does.
 */
export function summarizeAiCalls(
  rows: readonly AiCallDailyRow[],
  extras: readonly AiCallDailyExtra[],
  campaigns: readonly AiCampaignTotals[],
  mapping: readonly BrightcallOutcome[],
  f: AiCallFilter,
): AiCallSummary {
  const map = new Map(mapping.map((m) => [m.code, m]))
  const keep = (r: { date: string; envId: string; campaign: string }) =>
    r.date >= f.from && (f.env === 'all' || r.envId === f.env) && (f.campaign === 'all' || r.campaign === f.campaign)
  const s: AiCallSummary = {
    targeted: 0,
    attempted: 0,
    calls: 0,
    contacts: 0,
    byGroup: { answered: 0, no_answer: 0, dropped: 0, not_called: 0, excluded: 0 },
    byResult: new Map(),
    byOutcome: new Map(),
    leads: 0,
    complaints: 0,
    cost: 0,
    drops: { within_20s: 0, after_1min: 0, positive_then_dropped: 0 },
    sentiment: { positive: 0, neutral: 0, negative: 0 },
    campaigns: [],
  }
  const perCampaign = new Map<string, AiCallSummary['campaigns'][number]>()
  for (const c of campaigns) {
    if ((f.env !== 'all' && c.envId !== f.env) || (f.campaign !== 'all' && c.campaign !== f.campaign)) continue
    s.targeted += c.targeted
    s.attempted += c.attempted
    perCampaign.set(c.campaign, {
      campaign: c.campaign,
      envId: c.envId,
      targeted: c.targeted,
      attempted: c.attempted,
      calls: 0,
      answered: 0,
      dropped20: 0,
      leads: 0,
      cost: 0,
    })
  }
  for (const r of rows) {
    if (!keep(r)) continue
    // a code BrightCall adds later and nobody mapped yet counts as answered, other result, until the CX manager maps it
    const m = map.get(r.outcome) ?? { code: r.outcome, group: 'answered' as CallGroup, result: 'other' as MappedResult }
    s.byGroup[m.group] += r.calls
    const o = s.byOutcome.get(r.outcome) ?? { calls: 0, contacts: 0, cost: 0 }
    o.calls += r.calls
    o.contacts += r.contacts
    o.cost += r.cost
    s.byOutcome.set(r.outcome, o)
    s.cost += r.cost
    if (m.group === 'not_called' || m.group === 'excluded') continue
    s.calls += r.calls
    s.contacts += r.contacts
    const br = s.byResult.get(m.result) ?? { calls: 0, contacts: 0 }
    br.calls += r.calls
    br.contacts += r.contacts
    s.byResult.set(m.result, br)
    if (m.lead) s.leads += r.calls
    if (m.complaint) s.complaints += r.contacts
    const pc = perCampaign.get(r.campaign)
    if (pc) {
      pc.calls += r.calls
      pc.cost += r.cost
      if (m.group === 'answered') pc.answered += r.calls
      if (m.lead) pc.leads += r.calls
    }
  }
  for (const x of extras) {
    if (!keep(x)) continue
    s.drops.within_20s += x.drops.within_20s
    s.drops.after_1min += x.drops.after_1min
    s.drops.positive_then_dropped += x.drops.positive_then_dropped
    s.sentiment.positive += x.sentiment.positive
    s.sentiment.neutral += x.sentiment.neutral
    s.sentiment.negative += x.sentiment.negative
    const pc = perCampaign.get(x.campaign)
    if (pc) pc.dropped20 += x.drops.within_20s
  }
  s.campaigns = [...perCampaign.values()].filter((c) => c.calls > 0).sort((a, z) => z.calls - a.calls)
  return s
}
