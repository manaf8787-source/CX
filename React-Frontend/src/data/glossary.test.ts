import { describe, expect, it } from 'vitest'
import { GLOSSARY_TERMS } from './glossary'

const find = (key: string) => {
  const k = key.toLowerCase()
  return GLOSSARY_TERMS.find((g) => g.term.en.toLowerCase() === k) ?? GLOSSARY_TERMS.find((g) => g.term.en.toLowerCase().startsWith(k))
}

describe('glossary (v40 F04)', () => {
  it('has an entry for each of the three Home tile "?" (NPS, CSAT, CES), found the way TermHelp finds them', () => {
    for (const key of ['NPS', 'CSAT', 'CES']) expect(find(key), key).toBeDefined()
  })

  it('CES is 1 to 5, the share who answered 4 or 5, asked after a procedural or digital step (the 1-to-7 wording is gone)', () => {
    const ces = find('CES')!
    expect(ces.term.en).toBe('CES (Customer Effort Score)')
    expect(ces.definition.en).toContain('1 to 5')
    expect(ces.definition.en).toContain('4 or 5')
    expect(ces.definition.en).toContain('procedural or digital')
    expect(ces.definition.en).toContain('120 answers')
    expect(ces.definition.en).not.toMatch(/1 to 7/)
    expect(ces.definition.ar).toContain('من 1 إلى 5')
    expect(ces.definition.ar).not.toMatch(/من 1 إلى 7/)
    expect(GLOSSARY_TERMS.filter((g) => g.term.en.toLowerCase().startsWith('ces'))).toHaveLength(1)
  })

  it('keeps the 60-day wording of the check and of recovered (not 30)', () => {
    expect(find('60-day check')!.definition.en).toMatch(/Sixty days/)
    expect(find('Recovered')!.definition.en).toMatch(/60 days/)
    for (const g of GLOSSARY_TERMS) expect(g.definition.en, g.term.en).not.toMatch(/30-day check/i)
  })
})
