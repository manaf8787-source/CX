import { describe, expect, it } from 'vitest'
import type { RoleId } from '@/types'
import { MOCK_PERSONS } from '@/services/mockData'
import { CUSTOMERS_LIST_COPY, SEGMENT_LABEL, SOURCE_LABEL } from '@/data/customersList'
import { personLabel, peopleCsvRows } from './peopleExport'

const people = MOCK_PERSONS.slice(0, 5)

describe('customer names and the export (decided 18 Nov)', () => {
  it('shows the name to a role that may see names and the reference to Internal Audit', () => {
    expect(personLabel(people[0], 'cxmgr')).toBe(people[0].name)
    expect(personLabel(people[0], 'marketing')).toBe(people[0].name)
    expect(personLabel(people[0], 'auditmkt')).toBe('P-001')
  })

  it('exports names and mobiles only to roles that may see names', () => {
    const rows = peopleCsvRows(people, 'cxmgr', 'en', () => '2026-11-10T09:00:00Z')
    expect(Object.keys(rows[0])).toEqual(['Person', 'Mobile', 'Type', 'Environment', 'Source', 'Last contact'])
    expect(rows[0].Person).toBe(people[0].name)
    expect(rows[0].Mobile).toBe(people[0].identity.mobile)
    expect(rows[0]['Last contact']).toBe('2026-11-10')
    expect(rows[0].Type).toBe(SEGMENT_LABEL[people[0].segment].en)
    expect(rows[0].Source).toBe(SOURCE_LABEL[people[0].sourceOfLead].en)

    const audit = peopleCsvRows(people, 'auditmkt', 'en')
    expect(Object.keys(audit[0])).toEqual(['Person', 'Type', 'Environment', 'Source', 'Last contact']) // no mobile column at all
    const text = JSON.stringify(audit)
    for (const p of people) {
      expect(text).not.toContain(p.name)
      expect(text).not.toContain(p.identity.mobile!)
    }
    expect(audit[0].Person).toBe('P-001')
  })

  it('writes the headers in the active language', () => {
    expect(Object.keys(peopleCsvRows(people, 'cxteam', 'ar')[0])).toEqual([CUSTOMERS_LIST_COPY.columns.person.ar, CUSTOMERS_LIST_COPY.columns.mobile.ar, CUSTOMERS_LIST_COPY.columns.type.ar, CUSTOMERS_LIST_COPY.columns.environment.ar, CUSTOMERS_LIST_COPY.columns.source.ar, CUSTOMERS_LIST_COPY.columns.lastContact.ar])
  })

  it('no role without the right gets a mobile', () => {
    for (const role of ['auditmkt', 'ld', 'hrspec', 'hrmgr', 'shopper'] as RoleId[]) expect(Object.keys(peopleCsvRows(people, role, 'en')[0])).not.toContain('Mobile')
  })

  it('has the v40 list copy and the six types and five sources in both languages', () => {
    expect(CUSTOMERS_LIST_COPY.title.en).toBe('Everyone on record')
    expect(CUSTOMERS_LIST_COPY.count(12).en).toBe('12 people')
    expect(Object.values(SEGMENT_LABEL).map((s) => s.en)).toEqual(['Lead', 'Buyer', 'Tenant', 'Owner', 'Investor', 'Member'])
    expect(Object.values(SOURCE_LABEL).map((s) => s.en)).toEqual(['PSI Real Estate app', 'PSI Website', 'WhatsApp', 'PSI Club', 'CRM'])
    for (const l of [...Object.values(SEGMENT_LABEL), ...Object.values(SOURCE_LABEL)].filter((x) => x.en !== 'CRM')) expect(l.ar).toMatch(/[؀-ۿ]/)
  })
})
