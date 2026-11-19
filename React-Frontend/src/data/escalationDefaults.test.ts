import { describe, expect, it } from 'vitest'
import { INFOSEC_SEED, MATRIX_CELL_KINDS, MATRIX_COPY, MATRIX_KEY_BY_FIX_KIND, MATRIX_KIND_LABEL, MATRIX_KINDS, MATRIX_SEED, MATRIX_TITLES_AR, VIP_FACTOR, buildMatrix, matrixTitles, title } from './escalationDefaults'
import { formatClock, formatFactor } from '@/utils/matrixFormat'
import type { MatrixCellRow, MatrixRow, MatrixRuleRow, ProductId } from '@/types'

const hasArabic = (s: string) => /[؀-ۿ]/.test(s)

/**
 * A compact copy of docs/ESCALATION-MATRIX-2026-11-19.md: six products x twelve rows = 72 lines, each
 * `product | kind | first receiver | informed | backup | respond | resolve`, the document's own text. The seed must equal it cell for cell
 * (English titles character for character). If the document changes, this copy changes with it, on purpose.
 */
const DOCUMENT = `
re | Employee | Direct manager of the agent | – | Head of the sales team (environment) | 9 | –
re | Service and behaviour | Sales manager (environment) | Head of the environment | CX manager | 4 | 27
re | Training gap | L&D head | Environment champion | CX manager | 9 | 90
re | Process | Sales operations lead | Head of the environment | CX manager | 4 | 45
re | Product and app | Web and app product owner | IT lead | CX manager | 4 | 45
re | Environment | Branch or gallery manager | Head of the environment | CX manager | 4 | 27
re | Legal and privacy | Legal | Information Security lead · CX manager | Head of the environment | 1 | 9
re | Marketing | Internal Audit and Marketing Lead | Marketing manager | CX manager | 9 | 45
re | Shopper case · critical | CX team (triage) | Sales manager (environment) | HR pool (conduct) | 1 day | 5 days
re | Legal or privacy case | Legal | CX manager · Head of the environment | Information Security lead | 1 day | 5 days
re | Data exposure or system access incident | Information Security lead (IT) | Legal · CX manager | IT lead | 1 | 9
re | Any kind, VIP customer involved | Same receiver, clocks halved | Head of the environment at once | CX manager | ½ | ½
af | Employee | After-Sales team lead (direct manager) | – | Head of After-Sales | 9 | –
af | Service and behaviour | After-Sales team lead | Head of After-Sales | CX manager | 4 | 27
af | Training gap | L&D head | After-Sales champion | CX manager | 9 | 90
af | Process | After-Sales operations lead | Head of After-Sales | CX manager | 4 | 45
af | Product and app | App product owner | IT lead | CX manager | 4 | 45
af | Environment | Property or community manager (PSI Assets) | Head of After-Sales | CX manager | 4 | 18
af | Legal and privacy | Legal | Information Security lead · CX manager | Head of After-Sales | 1 | 9
af | Marketing | Internal Audit and Marketing Lead | Marketing manager | CX manager | 9 | 45
af | Shopper case · critical | CX team (triage) | After-Sales team lead | HR pool (conduct) | 1 day | 5 days
af | Legal or privacy case | Legal | CX manager · Head of After-Sales | Information Security lead | 1 day | 5 days
af | Data exposure or system access incident | Information Security lead (IT) | Legal · CX manager | IT lead | 1 | 9
af | Any kind, VIP customer involved | Same receiver, clocks halved | Head of the environment at once | CX manager | ½ | ½
cl | Employee | Direct manager of the agent | – | Club relations manager | 4 | –
cl | Service and behaviour | Club relations manager | Head of PSI Club | CX manager | 2 | 18
cl | Training gap | L&D head | Club champion | CX manager | 9 | 45
cl | Process | Club operations lead | Head of PSI Club | CX manager | 2 | 27
cl | Product and app | Club app product owner | IT lead | CX manager | 2 | 27
cl | Environment | Club relations manager | Head of PSI Club | – | 2 | 18
cl | Legal and privacy | Legal | Information Security lead · CX manager · Head of PSI Club | – | 1 | 9
cl | Marketing | Internal Audit and Marketing Lead | Marketing manager · Head of PSI Club | CX manager | 4 | 27
cl | Shopper case · critical | CX team (triage) | Club relations manager | HR pool (conduct) | 4 | 27
cl | Legal or privacy case | Legal | CX manager · Head of PSI Club | Information Security lead | 4 | 27
cl | Data exposure or system access incident | Information Security lead (IT) | Legal · CX manager | IT lead | 1 | 9
cl | Any kind, VIP customer involved | Same receiver, clocks halved | Head of the environment at once | CX manager | ½ | ½
to | Employee | Tour operations supervisor (direct manager) | – | Tour Estate CX lead | 4 | –
to | Service and behaviour | Tour Estate CX lead | Tour operations manager | CX manager | 2 | 18
to | Training gap | L&D head | Tour Estate champion | Tour Estate CX lead | 9 | 45
to | Process | Tour operations manager | Head of Tour Estate | CX manager | 2 | 27
to | Product and app | Tour app product owner | IT lead | CX manager | 4 | 45
to | Environment | Fleet and guides supervisor | Tour operations manager | Tour Estate CX lead | 1 | 9
to | Legal and privacy | Legal | Information Security lead · CX manager | Head of Tour Estate | 1 | 9
to | Marketing | Internal Audit and Marketing Lead | Marketing manager | CX manager | 9 | 45
to | Shopper case · critical | Tour Estate CX lead (triage) | Tour operations manager | HR pool (conduct) | 4 | 27
to | Legal or privacy case | Legal | CX manager · Head of Tour Estate | Information Security lead | 4 | 27
to | Data exposure or system access incident | Information Security lead (IT) | Legal · CX manager | IT lead | 1 | 9
to | Any kind, VIP customer involved | Same receiver, clocks halved | Head of the environment at once | CX manager | ½ | ½
ev | Employee | Events manager (direct manager) | – | Head of Events | 4 | –
ev | Service and behaviour | Events manager | Head of Events | CX manager | 1 | 9
ev | Training gap | L&D head | Events champion | CX manager | 9 | 45
ev | Process | Events operations lead | Head of Events | CX manager | 2 | 18
ev | Product and app | Registration platform owner | IT lead | CX manager | 2 | 18
ev | Environment | Venue or booth lead | Events manager | – | 1 | 9
ev | Legal and privacy | Legal | Information Security lead · CX manager | Head of Events | 1 | 9
ev | Marketing | Marketing manager | Internal Audit and Marketing Lead | CX manager | 4 | 27
ev | Shopper case · critical | CX team (triage) | Events manager | HR pool (conduct) | 4 | 27
ev | Legal or privacy case | Legal | CX manager · Head of Events | Information Security lead | 4 | 27
ev | Data exposure or system access incident | Information Security lead (IT) | Legal · CX manager | IT lead | 1 | 9
ev | Any kind, VIP customer involved | Same receiver, clocks halved | Head of the environment at once | CX manager | ½ | ½
wl | Employee | Account manager lead (direct manager) | – | Head of Investor Relations | 4 | –
wl | Service and behaviour | Account manager lead | Head of Investor Relations | CX manager | 2 | 18
wl | Training gap | L&D head | Wallet champion | CX manager | 9 | 45
wl | Process | Wallet operations lead | Head of Investor Relations | CX manager | 2 | 27
wl | Product and app | Wallet product owner | Information Security lead · IT lead | CX manager | 2 | 18
wl | Environment | Account manager lead | Head of Investor Relations | – | 4 | 27
wl | Legal and privacy | Legal | Information Security lead · CX manager · Head of Investor Relations | – | 1 | 9
wl | Marketing | Internal Audit and Marketing Lead | Marketing manager | CX manager | 9 | 45
wl | Shopper case · critical | CX team (triage) | Account manager lead | HR pool (conduct) | 4 | 27
wl | Legal or privacy case | Legal | CX manager · Head of Investor Relations | Information Security lead | 1 | 9
wl | Data exposure or system access incident | Information Security lead (IT) | Legal · CX manager | IT lead | 1 | 9
wl | Any kind, VIP customer involved | Same receiver, clocks halved | Head of the environment at once | CX manager | ½ | ½
`

interface DocLine {
  product: ProductId
  kind: string
  receiver: string
  informed: string
  backup: string
  respond: string
  resolve: string
}

const LINES: DocLine[] = DOCUMENT.trim()
  .split('\n')
  .map((l) => {
    const [product, kind, receiver, informed, backup, respond, resolve] = l.split(' | ').map((c) => c.trim())
    return { product: product as ProductId, kind, receiver, informed, backup, respond, resolve }
  })

const kindOfLabel = (label: string) => MATRIX_KINDS.find((k) => MATRIX_KIND_LABEL[k].en === label)
const cellsRow = (rows: MatrixRow[], kind: string) => rows.find((r) => r.kind === kind) as MatrixCellRow
const text = (v: { en: string } | null) => v?.en ?? '–'

describe('the escalation matrix seed equals the document of 19 Nov 2026, cell for cell', () => {
  const matrix = buildMatrix()

  it('the copy of the document has 72 lines: six products, twelve rows each', () => {
    expect(LINES).toHaveLength(72)
    for (const p of ['re', 'af', 'cl', 'to', 'ev', 'wl']) expect(LINES.filter((l) => l.product === p)).toHaveLength(12)
    for (const l of LINES) expect(kindOfLabel(l.kind), l.kind).toBeDefined()
  })

  it('has six products and twelve rows each, in the order of the document: eleven with cells, then the VIP rule', () => {
    expect(Object.keys(matrix).sort()).toEqual(['af', 'cl', 'ev', 're', 'to', 'wl'])
    for (const rows of Object.values(matrix)) {
      expect(rows).toHaveLength(12)
      expect(rows.map((r) => r.kind)).toEqual(MATRIX_KINDS)
      expect(rows.map((r) => r.label.en)).toEqual(LINES.slice(0, 12).map((l) => l.kind))
    }
    expect(MATRIX_CELL_KINDS).toHaveLength(11)
    expect(MATRIX_KINDS.at(-1)).toBe('vip')
  })

  it.each(LINES.filter((l) => kindOfLabel(l.kind) !== 'vip').map((l) => [l.product, l.kind, l] as const))('%s · %s: receiver, informed, backup and both clocks as written', (_p, _k, l) => {
    const row = cellsRow(matrix[l.product], kindOfLabel(l.kind)!)
    expect(row.label.en).toBe(l.kind)
    expect(text(row.cells.receiver)).toBe(l.receiver)
    expect(text(row.cells.informed)).toBe(l.informed)
    expect(text(row.cells.backup)).toBe(l.backup)
    // the clock cells: hours as numbers ("1 day" and "5 days" are 9 and 45 hours shown as days; "–" is none) and shown as the document writes them
    const days = (c: string) => /^(\d+) days?$/.exec(c)
    const hours = (c: string) => (c === '–' ? null : days(c) ? Number(days(c)![1]) * 9 : Number(c))
    expect(row.cells.respondH).toBe(hours(l.respond))
    expect(row.cells.resolveH).toBe(hours(l.resolve))
    expect(formatClock(row.cells.respondH, { asDays: !!row.cells.asDays?.respondH })).toBe(l.respond)
    expect(formatClock(row.cells.resolveH, { asDays: !!row.cells.asDays?.resolveH })).toBe(l.resolve)
    expect(!!row.cells.asDays?.respondH).toBe(!!days(l.respond))
    expect(!!row.cells.asDays?.resolveH).toBe(!!days(l.resolve))
    expect(Object.values(row.edited).some(Boolean)).toBe(false)
  })

  it.each(LINES.filter((l) => kindOfLabel(l.kind) === 'vip').map((l) => [l.product, l] as const))('%s · the VIP row is a rule, not a receiver: same receiver, head informed at once, CX manager backup, "½" in both clocks', (_p, l) => {
    const row = matrix[l.product].find((r) => r.kind === 'vip') as MatrixRuleRow
    expect(row.rule.receiver.en).toBe(l.receiver)
    expect(row.rule.informed.en).toBe(l.informed)
    expect(row.rule.backup.en).toBe(l.backup)
    expect(row.rule.informedTitle.en).toBe('Head of the environment')
    expect(row.rule.factor).toBe(0.5)
    expect(formatFactor(row.rule.factor)).toBe(l.respond)
    expect(formatFactor(row.rule.factor)).toBe(l.resolve)
    expect(l.respond).toBe('½')
    // a rule has no `cells`: nothing to mistake for 0.5 hours
    expect('cells' in row).toBe(false)
  })

  it('the last two rows are the same for every product (data exposure, VIP)', () => {
    const strip = (rows: MatrixRow[], kind: string) => JSON.stringify(rows.find((r) => r.kind === kind))
    for (const kind of ['infosec', 'vip']) for (const p of ['af', 'cl', 'to', 'ev', 'wl'] as const) expect(strip(matrix[p], kind), `${p} ${kind}`).toBe(strip(matrix.re, kind))
    expect(MATRIX_SEED.re.service).toBeDefined()
    expect(INFOSEC_SEED[0]).toBe('Information Security lead (IT)')
  })

  it('the employee row has no resolve clock in any product (a management note, measured by the 60-day check): null, not zero', () => {
    for (const rows of Object.values(matrix)) expect(cellsRow(rows, 'employee').cells.resolveH).toBeNull()
  })

  it('the day cells are exactly the four of Real Estate and After-Sales (shopper critical, legal case), each holding 9 or 45 hours', () => {
    const flagged: string[] = []
    for (const [p, rows] of Object.entries(matrix)) for (const r of rows) if (r.kind !== 'vip' && r.cells.asDays) flagged.push(`${p}.${r.kind}.${Object.keys(r.cells.asDays).join('+')}`)
    expect(flagged.sort()).toEqual(['af.legal_case.respondH+resolveH', 'af.shopper_critical.respondH+resolveH', 're.legal_case.respondH+resolveH', 're.shopper_critical.respondH+resolveH'])
    for (const p of ['re', 'af'] as const) for (const k of ['shopper_critical', 'legal_case']) expect(cellsRow(matrix[p], k).cells).toMatchObject({ respondH: 9, resolveH: 45 })
  })

  it('each product has its own copy: editing one table never touches another', () => {
    const m = buildMatrix()
    cellsRow(m.re, 'service').cells.resolveH = 1
    expect(cellsRow(m.af, 'service').cells.resolveH).toBe(27)
    expect(cellsRow(buildMatrix().re, 'service').cells.resolveH).toBe(27)
  })

  it('is the new set and nothing of the old defaults is left: no isDefault, no confirmation stamp', () => {
    for (const rows of Object.values(matrix)) for (const r of rows) for (const key of ['isDefault', 'confirmed']) expect(key in r, `${r.kind}.${key}`).toBe(false)
  })

  it('a fix kind maps to a row that holds cells', () => {
    for (const row of Object.values(MATRIX_KEY_BY_FIX_KIND)) expect(MATRIX_CELL_KINDS).toContain(row)
    expect(MATRIX_KEY_BY_FIX_KIND.service_behaviour).toBe('service')
    expect(MATRIX_KEY_BY_FIX_KIND.legal_privacy).toBe('legal')
  })
})

describe('the Arabic of the matrix titles (written for this build, for native review; never guessed)', () => {
  const matrix = buildMatrix()

  it('every title of every seeded cell has an Arabic form, and a cell with two or three titles joins them with the same separator', () => {
    for (const t of matrixTitles()) {
      expect(hasArabic(t.ar), t.en).toBe(true)
      expect(t.ar.split(' · ')).toHaveLength(t.en.split(' · ').length)
    }
  })

  it('the same English title has the same Arabic everywhere (all six products)', () => {
    const seen = new Map<string, string>()
    for (const t of matrixTitles()) {
      const en = t.en.split(' · ')
      const ar = t.ar.split(' · ')
      en.forEach((e, i) => {
        expect(seen.get(e) ?? ar[i], e).toBe(ar[i])
        seen.set(e, ar[i])
      })
    }
    // and every entry of the dictionary is used by some cell (no stray titles)
    const used = new Set([...seen.keys(), 'Same receiver, clocks halved', 'Head of the environment at once'])
    for (const en of Object.keys(MATRIX_TITLES_AR)) expect(used.has(en), en).toBe(true)
  })

  it('a title with no Arabic form throws instead of being translated by guessing', () => {
    expect(() => title('Head of Something Else')).toThrow('no Arabic form')
    expect(() => title('Legal · Somebody new')).toThrow('Somebody new')
    expect(title('–')).toBeNull()
    expect(title('Legal · CX manager')).toEqual({ en: 'Legal · CX manager', ar: 'القانونية · مدير تجربة العملاء' })
  })

  it('titles that exist elsewhere keep their Arabic (the roles, the v40 matrix)', () => {
    expect(MATRIX_TITLES_AR['CX manager']).toBe('مدير تجربة العملاء')
    expect(MATRIX_TITLES_AR['Internal Audit and Marketing Lead']).toBe('مسؤول التدقيق الداخلي والتسويق')
    expect(MATRIX_TITLES_AR['After-Sales team lead']).toBe('قائد فريق ما بعد البيع')
    expect(MATRIX_TITLES_AR.Legal).toBe('القانونية')
  })

  it('the two new rows have their labels in Arabic, and the VIP rule row speaks Arabic too', () => {
    expect(MATRIX_KIND_LABEL.infosec.ar).toBe('تسريب بيانات أو حادثة وصول للأنظمة')
    expect(MATRIX_KIND_LABEL.vip.ar).toBe('أي نوع، زبون VIP معني')
    const vip = matrix.re.find((r) => r.kind === 'vip') as MatrixRuleRow
    for (const b of [vip.rule.receiver, vip.rule.informed, vip.rule.informedTitle, vip.rule.backup]) expect(hasArabic(b.ar), b.en).toBe(true)
    expect(VIP_FACTOR).toBe(0.5)
  })

  it('has the copy of the page in both languages: the header, the three rules, the legend, the set note, the VIP tag; and no [Proposed] in any of it', () => {
    const c = MATRIX_COPY
    expect(c.intro.en).toContain('Cells set on 19 November by the CX manager; product owners may adjust a title with the Internal Audit and Marketing Lead before 28 November, the clocks stay.')
    expect(c.rules.items).toHaveLength(3)
    expect(c.rules.title.en).toBe('Three rules behind the cells')
    expect(c.rules.title.ar).toBe('ثلاث قواعد خلف الخلايا')
    expect(c.setNote.en).toBe('Set 19 Nov · titles adjustable until 28 Nov')
    expect(c.vipTag.en).toBe('VIP · clocks halved')
    const everything = [c.title, c.intro, c.principles, c.setNote, c.vipTag, c.vipApplied, c.vipRowNote, c.ruleTag, c.noResolveClock, c.legend, c.rules.title, ...c.rules.items.flatMap((i) => [i.lead, i.body])]
    for (const b of everything) {
      expect(hasArabic(b.ar), b.en.slice(0, 40)).toBe(true)
      expect(`${b.en} ${b.ar}`).not.toMatch(/Proposed|مقترح|proposals until/)
    }
    expect(c.legend.en).toContain('1 h = the same hour')
    expect(c.legend.en).toContain('90 h = two weeks')
  })
})
