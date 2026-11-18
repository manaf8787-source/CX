import { describe, expect, it } from 'vitest'
import * as mock from '@/services/mockData'
import { DNCR_PEOPLE_IN_SAMPLE } from '@/data/v38Reference'
import { surveyReach } from './consent'

const consent = (over: Partial<{ dncr: boolean; whatsapp: boolean; sms: boolean; email: boolean }> = {}) => ({ consent: { dncr: false, whatsapp: true, sms: true, email: true, ...over } })

describe('consent and the surveys that skip (v40 F24, F25)', () => {
  it('a DNCR person is never surveyed by call, and the skip reason is DNCR', () => {
    const r = surveyReach(consent({ dncr: true }))
    expect(r.byCall).toBe(false)
    expect(r.skipped).toEqual(['dncr'])
  })

  it('a person with consent is reached by call and has no person-level skip reason', () => {
    const r = surveyReach(consent())
    expect(r.byCall).toBe(true)
    expect(r.skipped).toEqual([])
    expect(r.channelsWithoutConsent).toEqual([])
  })

  it('a channel without consent is listed, and with no channel left the reason is "no consent"', () => {
    expect(surveyReach(consent({ whatsapp: false })).channelsWithoutConsent).toEqual(['whatsapp'])
    expect(surveyReach(consent({ whatsapp: false, email: false, sms: false })).skipped).toEqual(['no_consent'])
  })

  it('the sample has as many DNCR people as the Surveys page counts', () => {
    expect(mock.MOCK_PERSONS.filter((p) => surveyReach(p).skipped.includes('dncr'))).toHaveLength(DNCR_PEOPLE_IN_SAMPLE)
  })
})
