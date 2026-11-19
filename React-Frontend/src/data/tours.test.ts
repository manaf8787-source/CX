import { describe, expect, it } from 'vitest'
import { canOpenPage } from '@/auth/access'
import { ROLE_DEFS } from './roles'
import { CUSTOMERS_TABS, PRIMARY_NAV } from './nav'
import { TOUR_COPY, hasTour, tourStepsFor, tours } from './tours'
import type { RoleId } from '@/types'

const ARABIC = /[؀-ۿ]/

/** The files that carry `data-tour="..."` (the inventory is checked against the source, so a renamed attribute breaks a test, not a tour). */
const sources = import.meta.glob(['../**/*.tsx', '!../**/*.test.tsx'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const allSource = Object.values(sources).join('\n')

describe('tour data', () => {
  it('every step has an English and an Arabic title and text', () => {
    for (const [role, steps] of Object.entries(tours)) {
      for (const [i, s] of (steps ?? []).entries()) {
        const where = `${role} step ${i + 1}`
        expect(s.title.en.trim(), where).not.toBe('')
        expect(s.text.en.trim(), where).not.toBe('')
        expect(ARABIC.test(s.title.ar), `${where} title`).toBe(true)
        expect(ARABIC.test(s.text.ar), `${where} text`).toBe(true)
      }
    }
  })

  it('the visible words are the prototype’s own', () => {
    expect(TOUR_COPY.replay).toEqual({ en: 'How do I use this?', ar: 'كيف أستخدمه؟' })
    expect(TOUR_COPY.skip.ar).toBe('تخطَّ')
    expect(TOUR_COPY.doIt).toEqual({ en: 'Do it and continue', ar: 'نفّذ وتابع' })
    expect(TOUR_COPY.finished.en).toBe('Tour finished. Replay it any time from the bottom of the menu.')
    expect(tours.cxmgr?.map((s) => s.title.en)).toEqual([
      'One line, six steps',
      'Your daily brief',
      'How customers feel',
      'Start your day here',
      'One row, one thing to do',
      'Where you are, what happens next',
      'Open a fix',
      'Your decision',
      'The trace',
      'Close the loop',
      'Find anyone',
      'All the numbers',
      'That is the whole portal',
    ])
  })

  it('has no tour for the mystery shopper and one for every other role', () => {
    expect(tours.shopper).toBeUndefined()
    expect(tourStepsFor('shopper')).toEqual([])
    expect(hasTour('shopper')).toBe(false)
    for (const r of ROLE_DEFS.filter((d) => d.id !== 'shopper')) expect(hasTour(r.id), r.id).toBe(true)
  })

  it('gives each role its number of steps once the pages it cannot open are dropped', () => {
    const counts: Partial<Record<RoleId, number>> = {
      cxmgr: 13,
      cxteam: 13,
      // the prototype code builds 11 for these (home 3, work 2, fix 4, find anyone, end); the KB and the delta say 10
      envmgmt: 11,
      teamlead: 11,
      aslead: 11,
      // the prototype has 7: its "All the numbers" step needs the Overview, which Marketing cannot open here
      marketing: 6,
      ld: 3,
      // brief, data feeds, weekly sample, campaign audit (v42.1 F33), closing card
      auditmkt: 5,
      exec: 4,
      // no Home for the HR roles: only the closing card is left
      hrspec: 1,
      hrmgr: 1,
      shopper: 0,
    }
    for (const [role, n] of Object.entries(counts)) expect(tourStepsFor(role as RoleId), role).toHaveLength(n)
    // the prototype's own lengths, before the page check
    expect(tours.marketing).toHaveLength(7)
    expect(tours.cxmgr).toHaveLength(13)
    expect(tours.envmgmt).toHaveLength(11)
  })

  it('never sends a role to a page it cannot open', () => {
    for (const r of ROLE_DEFS) {
      for (const s of tourStepsFor(r.id)) if (s.route !== null) expect(canOpenPage(r.id, s.route), `${r.id} ${s.route}`).toBe(true)
    }
  })

  it('the Internal Audit and Marketing Lead’s tour has the Campaign audit step right after the weekly sample, from the prototype (v42.1 F33)', () => {
    const steps = tourStepsFor('auditmkt')
    expect(steps.map((s) => s.title.en)).toEqual(['Your daily brief', 'Data feeds', 'Your part of the weekly sample', 'Campaign audit', 'That is the whole portal'])
    const step = steps[3]
    expect(step).toMatchObject({ route: '/settings/campaign-audit', target: '[data-tour="campaign-audit"]' })
    expect(step.title).toEqual({ en: 'Campaign audit', ar: 'تدقيق الحملات' })
    expect(step.text.en).toBe('Every campaign before it runs and after: the right people, projects and developers, channel and message, and the money. Five checks, then clear it or send it back.')
    expect(step.text.ar).toBe('كل حملة قبل تشغيلها وبعده: الأشخاص والمشاريع والمطورون والقناة والرسالة والمال. خمسة فحوصات، ثم إجازة أو إعادة.')
    // no other role's tour changed: only the audit lead is sent to the page (the CX manager's is the 13 steps it was)
    for (const [role, list] of Object.entries(tours)) {
      expect((list ?? []).some((s) => s.route === '/settings/campaign-audit'), role).toBe(role === 'auditmkt')
    }
    expect(tourStepsFor('cxmgr')).toHaveLength(13)
  })

  it('drops the Overview step for Marketing and keeps the closing card last and alone for the HR roles', () => {
    expect(tourStepsFor('marketing').some((s) => s.title.en === 'All the numbers')).toBe(false)
    expect(tourStepsFor('cxmgr').some((s) => s.title.en === 'All the numbers')).toBe(true)
    for (const role of ['hrspec', 'hrmgr'] as const) {
      const steps = tourStepsFor(role)
      expect(steps).toHaveLength(1)
      expect(steps[0].route).toBeNull()
    }
    for (const r of ROLE_DEFS) {
      const steps = tourStepsFor(r.id)
      if (!steps.length) continue
      expect(steps.at(-1)!.route, `${r.id} ends on the closing card`).toBeNull()
      expect(steps.slice(0, -1).every((s) => s.route !== null)).toBe(true)
    }
  })

  it('only a step that has a target can ask to click it, and a query starts with "?"', () => {
    for (const steps of Object.values(tours)) {
      for (const s of steps ?? []) {
        if (s.click) expect(s.target, s.title.en).toBeTruthy()
        if (s.search) expect(s.search.startsWith('?')).toBe(true)
        if (s.search) expect(s.route).not.toBeNull()
      }
    }
  })

  it('"Open a fix" asks the register for the fixes waiting for a yes, and the steps after it keep that view', () => {
    const steps = tourStepsFor('cxmgr')
    const open = steps.findIndex((s) => s.title.en === 'Open a fix')
    expect(steps[open].search).toBe('?status=proposed')
    expect(steps[open].click).toBe(true)
    expect(steps[open + 1].search).toBe('?status=proposed')
    expect(steps[open - 1].search).toBeUndefined()
  })
})

describe('the data-tour inventory', () => {
  /** Every distinct `data-tour` name the steps point at. */
  const names = new Set<string>()
  for (const steps of Object.values(tours)) {
    for (const s of steps ?? []) {
      if (!s.target) continue
      const m = s.target.match(/^\[data-tour="([a-z0-9-]+)"\]$/)
      if (m) names.add(m[1])
      else throw new Error(`target is not a data-tour selector: ${s.target}`)
    }
  }

  it('names every element the tour lights up', () => {
    expect([...names].sort()).toEqual(
      [
        'brief',
        'campaign-audit',
        'customers-search',
        'feeds',
        'fix-card',
        'fix-decide',
        'fix-open',
        'indicator-card',
        'inbox-row',
        'loop-call',
        'nav-inbox',
        'nextbox',
        'overview-card',
        'sample',
        'steps',
        'tab-personas',
        'trace',
      ].sort(),
    )
  })

  it('finds each one in the markup of the page it belongs to', () => {
    // two are made from the route (`nav` + path, `tab` + path): check the route exists instead
    const generated: Record<string, boolean> = {
      'nav-inbox': PRIMARY_NAV.some((g) => g.items.some((i) => i.path === '/inbox')),
      'tab-personas': CUSTOMERS_TABS.some((t) => t.path === '/personas'),
    }
    expect(allSource).toContain("data-tour={`nav${node.path.replaceAll('/', '-')}`}")
    expect(allSource).toContain("data-tour={`tab${item.path.replaceAll('/', '-')}`}")
    for (const name of names) {
      if (name in generated) expect(generated[name], name).toBe(true)
      else expect(allSource.includes(`data-tour="${name}"`) || allSource.includes(`'data-tour': '${name}'`), name).toBe(true)
    }
  })
})
