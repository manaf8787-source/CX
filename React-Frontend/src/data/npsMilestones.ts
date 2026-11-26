import type { Bi, EnvId, NpsMilestone } from '../types'

export type { NpsMilestone }

/**
 * The completed transactions that open a transactional NPS ("Deal completed, lease signed, handover done": Programme KB §38,
 * Modules KB "When we ask"). An NPS answer always belongs to one of them; nothing else feeds the NPS line.
 *
 * 26 Nov (owner): PSI Assets works mostly in rentals, so a signed lease IS a completed transaction. It counts in the NPS
 * exactly like a sale: same 0 to 10 question, same 90-day cap per person, same tile. A lease renewal and a move-in (key
 * handover) are completed milestones too. Assets answers land in the PSI Real Estate line (leases) and the After-Sales line
 * (renewal, move-in), which PSI Real Estate includes; a person sees them when their environment access covers PSI Assets.
 *
 * In the CRM: "Lease contract signed" and the leasing "Closing" activity map to the portal's Deal signed; "Lease Renewal" to
 * Renewal; "Move-in / key handover" to Handover done (data/crmMapping.ts). [Proposed] until the CRM owner confirms the
 * leasing stage names in the PSI Assets environment.
 */
export const NPS_MILESTONES: NpsMilestone[] = ['sale', 'lease', 'renewal', 'handover']

export const NPS_MILESTONE_LABEL: Record<NpsMilestone, Bi> = {
  sale: { en: 'Sales', ar: 'مبيعات' },
  lease: { en: 'Leases', ar: 'إيجارات' },
  renewal: { en: 'Renewals', ar: 'تجديدات' },
  handover: { en: 'Handovers', ar: 'تسليمات' },
}

/** Every milestone above is a completed transaction for the NPS. Kept as a function so the rule is one line to find. */
export function isCompletedTransaction(m: NpsMilestone): boolean {
  return NPS_MILESTONES.includes(m)
}

/** The environment a milestone is native to, for the sample: leases and renewals are PSI Assets' business. */
export const LEASING_ENV: EnvId = 'ast'
