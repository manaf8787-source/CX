/** Every user-facing string in the data layer carries both languages, authored
 * once and switched instantly — never a translation-key lookup. Ported from
 * `frontend/src/types.ts`'s `Bi` pattern (see docs/analysis/UI_UX_SPECIFICATION.md §2). */
export interface Bi {
  en: string
  ar: string
}

export type ProductId = 're' | 'af' | 'cl' | 'to' | 'ev' | 'wl'

export interface Product {
  id: ProductId
  colorVar: string // CSS custom property, e.g. --p-re
  name: Bi
  blurb: Bi
  live: boolean
}

export type ChannelId =
  | 'website'
  | 'app'
  | 'whatsapp'
  | 'call'
  | 'ivr'
  | 'branch'
  | 'email'
  | 'survey'
  | 'shopper'
  | 'club'
  | 'wallet'
  | 'events'
  | 'tours'
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'google'

export type Severity = 'critical' | 'medium' | 'low'
export type StatusLevel = 'good' | 'warn' | 'crit' | 'neutral'

// --- v40: environments, people segments, consent -----------------------------

/** The three CRM environments (v40): separate databases, same business.
 * dub = Dubai, auh = Abu Dhabi, ast = PSI Assets (rental). */
export type EnvId = 'dub' | 'auh' | 'ast' | 'ai'

/** What the "Environment" switch holds: one environment or all of them. */
export type EnvScope = EnvId | 'all'

export interface Environment {
  id: EnvId
  name: Bi
  /** The short English label stored in the legacy `environment: string` fields
   * of Person/Interaction/Signal/etc. ('Dubai', 'Abu Dhabi', 'PSI Assets'). */
  short: string
}

/** v40 customers list types (F29). [Proposed]: the KB does not define Buyer/Tenant/Owner/Investor/Member. */
export type PersonSegment = 'lead' | 'buyer' | 'tenant' | 'owner' | 'investor' | 'member'

/** Original source of a lead (F29 filter). 'crm' = created inside the CRM. */
export type LeadSource = 'app' | 'website' | 'whatsapp' | 'club' | 'crm'

/** Consent as held by the CRM (F24). `dncr` = on the do-not-call register:
 * no calls and no surveys by call. */
export interface ConsentFlags {
  dncr: boolean
  whatsapp: boolean
  sms: boolean
  email: boolean
}

