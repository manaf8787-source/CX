import type { Bi, Person } from '@/types'

/** Why a survey is skipped for a person (the log line of Agent 10, v40 F25). Same words as the Surveys page. */
export type SkipReason = 'dncr' | 'no_consent' | 'cap' | 'duplicate'

export const SKIP_REASON_LABEL: Record<SkipReason, Bi> = {
  dncr: { en: 'DNCR', ar: 'DNCR' },
  no_consent: { en: 'No consent', ar: 'بلا موافقة' },
  cap: { en: 'Inside a cap', ar: 'داخل سقف' },
  duplicate: { en: 'Duplicate', ar: 'مكرر' },
}

export type ConsentChannel = 'whatsapp' | 'email' | 'sms'
export const CONSENT_CHANNELS: ConsentChannel[] = ['whatsapp', 'email', 'sms']
export const CONSENT_CHANNEL_LABEL: Record<ConsentChannel, Bi> = {
  whatsapp: { en: 'WhatsApp', ar: 'واتساب' },
  email: { en: 'Email', ar: 'بريد' },
  sms: { en: 'SMS', ar: 'SMS' },
}

/**
 * What the CRM consent flags mean for this person's surveys (v40 F24, F25). A DNCR person is never called and never surveyed by
 * call; a channel without consent is skipped with the reason "no consent"; with no channel left every survey is skipped.
 * The cap and the duplicate rule are applied at send time (they depend on what was sent), so they are not person flags.
 */
export function surveyReach(person: Pick<Person, 'consent'>): { byCall: boolean; skipped: SkipReason[]; channelsWithoutConsent: ConsentChannel[] } {
  const { consent } = person
  const channelsWithoutConsent = CONSENT_CHANNELS.filter((c) => !consent[c])
  const skipped: SkipReason[] = []
  if (consent.dncr) skipped.push('dncr')
  if (channelsWithoutConsent.length === CONSENT_CHANNELS.length) skipped.push('no_consent')
  return { byCall: !consent.dncr, skipped, channelsWithoutConsent }
}
