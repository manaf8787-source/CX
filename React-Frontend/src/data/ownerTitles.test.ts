import { describe, expect, it } from 'vitest'
import { ownerTitle } from './ownerTitles'
import { DEFAULT_OWNER_BY_KIND } from './insightSuggestions'
import { MATRIX_DEFAULTS } from './escalationDefaults'
import { ROLE_DEFS } from './roles'
import { FAULT_ROUTE } from '@/components/ai/assistantIntents'
import { isTopManagementTitle } from '@/auth/permissions'
import * as mock from '@/services/mockData'

const hasArabic = (s: string) => /[؀-ۿ]/.test(s)

describe('owner titles in both languages (titles, not names)', () => {
  it('every owner in the sample fixes has an Arabic title', () => {
    expect(mock.MOCK_CORRECTIVE_ACTIONS.length).toBeGreaterThan(0)
    for (const f of mock.MOCK_CORRECTIVE_ACTIONS) {
      const b = ownerTitle(f.owner)
      expect(b.en, f.id).toBe(f.owner)
      expect(hasArabic(b.ar), `${f.id}: ${f.owner}`).toBe(true)
    }
  })

  it('knows the roles, the matrix receivers, the default receiver per kind and the assistant plan owners', () => {
    expect(ownerTitle('L&D manager').ar).toBe('مدير التعلم والتطوير')
    expect(ownerTitle('Legal').ar).toBe('القانونية')
    for (const r of ROLE_DEFS) expect(ownerTitle(r.name.en), r.id).toEqual(r.name)
    for (const c of Object.values(MATRIX_DEFAULTS)) if (c.receiver) expect(ownerTitle(c.receiver.en)).toEqual(c.receiver)
    for (const b of Object.values(DEFAULT_OWNER_BY_KIND)) expect(ownerTitle(b.en)).toEqual(b)
    for (const route of Object.values(FAULT_ROUTE)) expect(ownerTitle(route.owner.en)).toEqual(route.owner)
  })

  it('translates the direct manager of an environment and ignores case', () => {
    expect(ownerTitle('Direct manager (Dubai environment manager)')).toEqual({ en: 'Direct manager (Dubai environment manager)', ar: 'المدير المباشر (مدير بيئة دبي)' })
    expect(ownerTitle('Abu Dhabi environment manager').ar).toBe('مدير بيئة أبوظبي')
    expect(ownerTitle('legal').ar).toBe('القانونية')
  })

  it('passes a title typed in a form through unchanged, in both languages', () => {
    expect(ownerTitle('Branch sales coordinator')).toEqual({ en: 'Branch sales coordinator', ar: 'Branch sales coordinator' })
  })

  it('never offers top management as an owner', () => {
    for (const f of mock.MOCK_CORRECTIVE_ACTIONS) expect(isTopManagementTitle(ownerTitle(f.owner).en)).toBe(false)
  })
})
