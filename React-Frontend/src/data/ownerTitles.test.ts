import { describe, expect, it } from 'vitest'
import { ownerTitle } from './ownerTitles'
import { DEFAULT_OWNER_BY_KIND } from './insightSuggestions'
import { buildMatrix, matrixTitles } from './escalationDefaults'
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
    for (const rows of Object.values(buildMatrix())) for (const r of rows) if (r.kind !== 'vip' && r.cells.receiver) expect(ownerTitle(r.cells.receiver.en)).toEqual(r.cells.receiver)
    for (const b of Object.values(DEFAULT_OWNER_BY_KIND)) expect(ownerTitle(b.en)).toEqual(b)
    for (const route of Object.values(FAULT_ROUTE)) expect(ownerTitle(route.owner.en)).toEqual(route.owner)
  })

  it('knows every title of the 19 Nov matrix in Arabic: receiver, informed and backup, a cell with two or three titles as one string', () => {
    const titles = matrixTitles()
    expect(titles.length).toBeGreaterThan(60)
    for (const t of titles) {
      expect(ownerTitle(t.en), t.en).toEqual(t)
      expect(hasArabic(ownerTitle(t.en).ar), t.en).toBe(true)
    }
    // the new ones, alone and in a cell of several
    expect(ownerTitle('Information Security lead (IT)').ar).toBe('مسؤول أمن المعلومات (تقنية المعلومات)')
    expect(ownerTitle('Information Security lead · CX manager').ar).toBe('مسؤول أمن المعلومات · مدير تجربة العملاء')
    expect(ownerTitle('Head of Investor Relations').ar).toBe('رئيس علاقات المستثمرين')
    // a role keeps its own form, and the matrix reuses it
    expect(ownerTitle('After-Sales team lead').ar).toBe('قائد فريق ما بعد البيع')
  })

  it('never translates a title it does not know (also not a part of a known one, nor the words of the VIP rule)', () => {
    expect(ownerTitle('Information Security lead · Somebody')).toEqual({ en: 'Information Security lead · Somebody', ar: 'Information Security lead · Somebody' })
    expect(ownerTitle('Head of Something')).toEqual({ en: 'Head of Something', ar: 'Head of Something' })
    expect(ownerTitle('Same receiver, clocks halved').ar).toBe('Same receiver, clocks halved')
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
