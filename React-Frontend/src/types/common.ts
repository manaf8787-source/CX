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
