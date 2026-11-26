import { useSyncExternalStore } from 'react'
import type { Bi } from '../types'

/**
 * What each BrightCall campaign is, and which portal campaign it belongs to (26 Nov, owner). A BrightCall campaign is usually the AI
 * calling channel of a Marketing campaign (linked by the campaign code, e.g. MKT-2026-031) or of a Close the loop interview campaign.
 * Recruitment and test campaigns are kept out of the customer numbers.
 *
 * The defaults below are the sample's; the CX manager links or re-types a campaign in AI call center, Campaign links (kept in this
 * browser in the prototype). PSI is asked to put the campaign code in every new BrightCall campaign so the link is automatic.
 */
export type CampaignKindAi = 'marketing' | 'cx_interview' | 'hr' | 'test'

export const KIND_LABEL: Record<CampaignKindAi, Bi> = {
  marketing: { en: 'Marketing', ar: 'تسويق' },
  cx_interview: { en: 'CX interviews', ar: 'مقابلات تجربة العملاء' },
  hr: { en: 'HR (recruitment)', ar: 'الموارد البشرية (التوظيف)' },
  test: { en: 'Test or internal', ar: 'اختبار أو داخلي' },
}

/** Customer campaigns: the only ones in the customer numbers by default. */
export const CUSTOMER_KINDS: CampaignKindAi[] = ['marketing', 'cx_interview']

export interface CampaignLink {
  kind: CampaignKindAi
  /** The Marketing campaign code (MKT-…) or the Close the loop campaign id (camp-ai-…); null while not linked. */
  linkedTo: string | null
}

const DEFAULTS: Record<string, CampaignLink> = {
  'Saadiyat Grove launch': { kind: 'marketing', linkedTo: 'MKT-2026-031' },
  'Ohana Project': { kind: 'marketing', linkedTo: null },
  'Yas Island open house': { kind: 'marketing', linkedTo: 'MKT-2026-040' },
  'Reem Island New Projects': { kind: 'marketing', linkedTo: null },
  'Hudayriyat General': { kind: 'marketing', linkedTo: null },
  'Hilton Residences JLT': { kind: 'marketing', linkedTo: null },
  'Dubai Hills resale follow-up': { kind: 'marketing', linkedTo: 'MKT-2026-034' },
  'Damac Lagoons Listing': { kind: 'marketing', linkedTo: null },
  'Rental renewals reminder': { kind: 'marketing', linkedTo: 'MKT-2026-037' },
  'Leasing listings': { kind: 'marketing', linkedTo: null },
  'Detractor interviews': { kind: 'cx_interview', linkedTo: 'camp-ai-1' },
  'Recruitment campaign': { kind: 'hr', linkedTo: null },
  'Dashboard Webhook Test': { kind: 'test', linkedTo: null },
}

const KEY = 'psicx.campaignLinks'
type Overrides = Record<string, CampaignLink>
function read(): Overrides {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Overrides
  } catch {
    /* storage unavailable */
  }
  return {}
}
let overrides = read()
let merged = build()
const listeners = new Set<() => void>()
function build(): Record<string, CampaignLink & { edited: boolean }> {
  const out: Record<string, CampaignLink & { edited: boolean }> = {}
  for (const [name, d] of Object.entries(DEFAULTS)) out[name] = overrides[name] ? { ...overrides[name], edited: true } : { ...d, edited: false }
  return out
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** A campaign BrightCall sends that is not in the defaults is a Marketing campaign, not linked yet. */
export function linkOf(all: Record<string, CampaignLink>, campaign: string): CampaignLink {
  return all[campaign] ?? { kind: 'marketing', linkedTo: null }
}

export function useCampaignLinks() {
  return useSyncExternalStore(
    subscribe,
    () => merged,
    () => merged,
  )
}

export function setCampaignLink(campaign: string, link: CampaignLink | null) {
  const next = { ...overrides }
  if (link === null) delete next[campaign]
  else next[campaign] = link
  overrides = next
  merged = build()
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

/** The BrightCall campaigns linked to one portal campaign (by code or id). */
export function bcCampaignsFor(all: Record<string, CampaignLink>, linkedTo: string): string[] {
  return Object.entries(all)
    .filter(([, l]) => l.linkedTo === linkedTo)
    .map(([name]) => name)
}
