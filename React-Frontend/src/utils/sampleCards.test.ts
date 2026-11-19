import { describe, expect, it } from 'vitest'
import type { CorrectiveAction, Interaction, Pattern, Persona, Signal } from '@/types'
import { buildMatrix } from '@/data/escalationDefaults'
import {
  AGENT_OF_CHECK,
  READER_OF_CHECK,
  accessCard,
  accessText,
  briefCard,
  countCard,
  fixCard,
  flagLabel,
  journeyCard,
  kindCheckFor,
  matrixFor,
  patternGiven,
  recoveredOutOfTen,
  routingCard,
  routingSaw,
  signalCard,
  signalLine,
  targetingCard,
  targetingSaw,
  targetingText,
  type CardContext,
} from './sampleCards'

const bi = (en: string, ar = `${en}-ar`) => ({ en, ar })

const signal = (n: number, over: Partial<Signal> = {}): Signal =>
  ({
    id: `sig-${n}`,
    kind: 'complaint',
    product: 're',
    environment: 'Dubai',
    envId: 'dub',
    category: 'slow_response',
    occurredAt: `2026-11-${String(n).padStart(2, '0')}T09:00:00Z`,
    isPublic: false,
    eventIds: [`i-${n}`],
    ...over,
  }) as Signal

const pattern = (ids: number[], over: Partial<Pattern> = {}): Pattern =>
  ({
    id: 'same_issue:slow_response',
    key: 'same_issue:slow_response',
    traceId: 'PT-101',
    signalIds: ids.map((n) => `sig-${n}`),
    team: 'Dubai team',
    category: 'slow_response',
    windowDays: 30,
    sampleSize: 14,
    aiSuggestion: bi('x'),
    recoveryFigure: { en: 'Tried in 14 similar closed cases, recovered in 10, 10 of 14 is 71%.', ar: 'جُرّب في 14.' },
    thresholdKind: 'same_issue',
    thresholdTarget: 5,
    currentValue: ids.length,
    hasMinimumSample: true,
    ...over,
  }) as Pattern

const event = (n: number, over: Partial<Interaction> = {}): Interaction =>
  ({ id: `i-${n}`, personKey: 'p-001', channel: 'whatsapp', occurredAt: `2026-11-${String(n).padStart(2, '0')}T09:00:00Z`, problemFlags: [], ...over }) as Interaction

const fix = (over: Partial<CorrectiveAction> = {}): CorrectiveAction =>
  ({ id: 'ca-9', kind: 'service_behaviour', title: bi('Cover the busy band'), owner: 'Sales manager of the environment', product: 're', patternId: 'same_issue:slow_response', ...over }) as CorrectiveAction

const ctxOf = (signals: Signal[], events: Interaction[] = []): CardContext => ({
  signalById: new Map(signals.map((s) => [s.id, s])),
  eventsOfSignal: (s) => events.filter((e) => s.eventIds.includes(e.id)),
})

const sigs = [1, 2, 3, 4, 5, 6].map((n) => signal(n))
const ctx = ctxOf(sigs, [event(1, { channel: 'call' }), event(2), event(3, { channel: 'email' })])

describe('who reads a row and whose rate it counts toward (v42.1 F32)', () => {
  it('content rows go to the CX team, the rest to Internal Audit (the prototype\'s wsReader)', () => {
    expect(READER_OF_CHECK).toEqual({ fix: 'cx', brief: 'cx', journey: 'cx', classification: 'audit', count: 'audit', routing: 'audit', access: 'audit', targeting: 'audit' })
  })
  it('a routing or access row is Agent 5\'s, a targeting row Agent 7\'s', () => {
    expect(AGENT_OF_CHECK).toEqual({ fix: 5, routing: 5, access: 5, classification: 2, count: 3, brief: 8, journey: 7, targeting: 7 })
  })
})

describe('small helpers', () => {
  it('reads "recovered in about N of 10" from the figure\'s own sentence, and nothing when it holds no figure', () => {
    expect(recoveredOutOfTen({ en: 'Tried in 14 similar closed cases, recovered in 10, 10 of 14 is 71%.', ar: '' })).toBe(7)
    expect(recoveredOutOfTen({ en: 'Tried in 31, recovered in 24.', ar: '' })).toBe(8)
    expect(recoveredOutOfTen({ en: 'No figure', ar: '' })).toBeNull()
    expect(recoveredOutOfTen(undefined)).toBeNull()
  })

  it('a problem flag in words: the journey rule\'s label, the detractor outcome, or the flag spelled out', () => {
    expect(flagLabel('hand_off')).toEqual({ en: 'Hand-off', ar: 'تسليم بين فرق' })
    expect(flagLabel('detractor').en).toBe('Detractor')
    expect(flagLabel('some_new_flag').en).toBe('some new flag')
  })

  it('a quoted signal: source and date above, the per-category sample sentence in the quote (never conversation text)', () => {
    const line = signalLine(signal(7, { category: 'promise_not_kept' }), [{ channel: 'call' }])
    expect(line.meta?.en).toBe('Call · 2026-11-07')
    expect(line.quote?.en).toBe('A promised callback did not happen')
    expect(line.conversation).toBeUndefined()
    expect(signalLine(signal(7), []).meta?.en).toBe('Public mention · 2026-11-07')
  })
})

describe('what the AI was given: the pattern and up to three quoted signals, newest first', () => {
  it('the pattern text, three signals with their dates, and "+N more signals"', () => {
    const lines = patternGiven(pattern([1, 2, 3, 4, 5, 6]), ctx)
    expect(lines[0]).toMatchObject({ strong: true })
    expect(lines[0].label?.en).toBe('The pattern')
    expect(lines[0].value?.en).toBe('Same issue: Slow response · 6 signals in 30 days')
    const quoted = lines.filter((l) => l.quote)
    expect(quoted).toHaveLength(3)
    expect(quoted.map((l) => l.meta?.en?.slice(-10))).toEqual(['2026-11-06', '2026-11-05', '2026-11-04'])
    expect(lines.at(-1)?.value?.en).toBe('+3 more signals')
  })

  it('no "more" line for three signals or fewer; a signal id that does not resolve is skipped; a same-agent pattern names no agent', () => {
    expect(patternGiven(pattern([1, 2, 3]), ctx).some((l) => /more signals/.test(l.value?.en ?? ''))).toBe(false)
    expect(patternGiven(pattern([1, 99]), ctx).filter((l) => l.quote)).toHaveLength(1)
    const agent = patternGiven(pattern([1, 2, 3], { thresholdKind: 'same_agent', agentRef: 'agent-7' }), ctx)
    expect(JSON.stringify(agent)).not.toContain('agent-7')
    expect(agent[0].value?.en.startsWith('Same agent')).toBe(true)
  })
})

describe('the card of a classification, a count and a fix', () => {
  it('a classification (Agent 2): the quote with source and date; the type and the severity from the rules; the prototype\'s "how"', () => {
    const c = signalCard(signal(3, { kind: 'legal_privacy_safety' }), [event(3, { channel: 'email' })], 'classification')
    expect(c.given).toHaveLength(1)
    expect(c.given[0].meta?.en).toBe('Email · 2026-11-03')
    expect(c.decided.map((l) => [l.label?.en, l.value?.en])).toEqual([
      ['Type', 'Slow response'],
      ['Severity', 'critical'],
    ])
    expect(c.how.en).toMatch(/^The AI matched the words of the message to the type; the severity comes from the rules/)
  })

  it('a single signal counted (Agent 3) adds "Counted as a signal (not worked one by one)"', () => {
    const c = signalCard(signal(3), [event(3)], 'count')
    expect(c.decided.at(-1)?.value?.en).toBe('Counted as a signal (not worked one by one)')
  })

  it('a pattern counted: the pattern and its signals on the left, the type, the size and "counted" on the right', () => {
    const c = countCard(pattern([1, 2, 3, 4]), ctx)
    expect(c.given[0].label?.en).toBe('The pattern')
    expect(c.decided.map((l) => l.value?.en)).toEqual(['Slow response', '4 signals in 30 days', 'Counted as a signal (not worked one by one)'])
  })

  it('a fix (Agent 5): the fix, its kind and the title it goes to; "recovery in about 7 of 10" from the pattern\'s own figure', () => {
    const c = fixCard(fix(), pattern([1, 2, 3, 4]), ctx, bi('fallback'))
    expect(c.decided[0]).toMatchObject({ strong: true, value: { en: 'Cover the busy band' } })
    expect(c.decided[1].value?.en).toBe('Service and behaviour · to: Sales manager of the environment')
    expect(c.how.en).toBe('In similar closed cases this kind of fix was followed by recovery in about 7 of 10. It is a suggestion; the manager decides.')
    expect(c.how.ar).toContain('نحو 7 من 10')
    expect(c.given[0].label?.en).toBe('The pattern')
  })

  it('a fix with no pattern shows where it came from, and has no recovery figure to quote', () => {
    const c = fixCard(fix({ patternId: undefined }), undefined, ctx, bi('No pattern: proposed from the form', 'بلا نمط'))
    expect(c.given).toEqual([{ value: bi('No pattern: proposed from the form', 'بلا نمط') }])
    expect(c.how.en).toBe('No recovery figure for this kind of fix yet. It is a suggestion; the manager decides.')
    const fromInsight = fixCard(fix({ patternId: undefined, fromInsight: { subjectId: 's', suggestionId: 'x', recovery: bi('Tried in 20, recovered in 14.') } }), undefined, ctx, bi('AI Insights suggestion'))
    expect(fromInsight.how.en).toContain('about 7 of 10')
  })
})

describe('the card of a routing row: the two titles to compare, the matrix line, the kind check (v42.1 F32)', () => {
  const matrix = buildMatrix()
  const legalFix = fix({ kind: 'legal_privacy', owner: 'Legal', product: 'wl', title: bi('Address repeat contact in PSI Assets team') })

  it('"Routed to" and "The matrix says" are both strong, with the product, the kind and the clocks under them', () => {
    const m = matrixFor(fix(), matrix)!
    const c = routingCard(fix(), pattern([1, 2, 3]), ctx, m, false, bi('fallback'))
    expect(c.decided[0]).toMatchObject({ label: { en: 'Routed to' }, value: { en: 'Sales manager of the environment' }, strong: true })
    expect(c.decided[1]).toMatchObject({ label: { en: 'The matrix says' }, value: { en: 'Sales manager (environment)' }, strong: true })
    expect(c.decided[2].value?.en).toBe('PSI Real Estate · Service and behaviour · respond 4 h · resolve 27 h')
    expect(c.how.en).toBe('Compare the two bold titles. If they differ, the routing is wrong.')
    expect(c.decided.some((l) => l.attention)).toBe(false)
  })

  it('a VIP-related fix shows the halved clocks and says so; the receiver does not change; the Arabic numbers are isolated left to right', () => {
    const m = matrixFor(legalFix, matrix)!
    const saw = routingSaw(legalFix, m, true)
    expect(saw.en).toBe('Kind: Legal and privacy · product PSI Wallet · matrix says: Legal (respond ½ h · resolve 4.5 h · VIP · clocks halved)')
    expect(saw.ar).toContain('⁦½ h⁩')
    expect(saw.ar).toContain('⁦4.5 h⁩')
    expect(routingSaw(legalFix, m, false).en).toContain('(respond 1 h · resolve 9 h)')
  })

  it('an employee fix has no resolve clock: it reads "–"', () => {
    const emp = fix({ kind: 'employee', owner: 'Direct manager of the agent' })
    expect(routingSaw(emp, matrixFor(emp, matrix), false).en).toContain('resolve –')
  })

  it('[Proposed] kind check: a Legal and privacy fix needs a legal, privacy or safety signal; without one the row flags the kind', () => {
    const c = routingCard(legalFix, pattern([1, 2, 3], { category: 'repeat_contact' }), ctx, matrixFor(legalFix, matrix), false, bi('fallback'))
    const flagged = c.decided.find((l) => l.attention)!
    expect(flagged.label?.en).toBe('Check the kind too')
    expect(flagged.value?.en).toBe("Legal and privacy is for legal, privacy or safety signals; none of this pattern's signals is one (it is about repeat contact).")
    expect(flagged.value?.ar).toMatch(/[؀-ۿ]/)
    // a legal signal in the pattern: the kind fits
    const withLegal = ctxOf([...sigs, signal(7, { kind: 'legal_privacy_safety' })])
    expect(kindCheckFor(legalFix, pattern([1, 7]), withLegal)).toBeNull()
    // no pattern, or another kind: nothing to check
    expect(kindCheckFor(legalFix, undefined, ctx)).toBeNull()
    expect(kindCheckFor(fix(), pattern([1, 2]), ctx)).toBeNull()
  })

  it('the matrix is read at build time from the table it is given: no row, no matrix line', () => {
    expect(matrixFor(fix(), { re: [], af: [], cl: [], to: [], ev: [], wl: [] })).toBeUndefined()
    const c = routingCard(fix(), pattern([1]), ctx, undefined, false, bi('fallback'))
    expect(c.decided).toHaveLength(1)
  })
})

describe('the card of an access row: what the receiver got (v42.1 F32)', () => {
  it('the fix, the names in it (none), the conversation text (none) and the ids sent', () => {
    const c = accessCard(fix(), pattern([1, 2]), ctx, ['PT-101', 'CA-209'], bi('fallback'))
    expect(c.decided.map((l) => [l.label?.en, l.value?.en])).toEqual([
      ['What the receiver got', 'Cover the busy band'],
      ['Names in it', 'none · conversation text: none'],
      ['Trace as sent', 'PT-101 · CA-209'],
    ])
    expect(c.how.en).toBe('Only the CX team may see names and conversation text. A receiver gets the fix and the ids.')
  })

  it('an employee fix names the agent\'s id inside the direct-manager line only, and the list line says the same', () => {
    const emp = fix({ kind: 'employee', owner: 'Direct manager of the agent' })
    const c = accessCard(emp, pattern([1]), ctx, ['CA-209'], bi('fallback'))
    expect(c.decided[1].value?.en).toBe('agent id, inside the direct-manager line only · conversation text: none')
    expect(accessText(emp).en).toBe('Cover the busy band → Direct manager of the agent · agent id only inside the direct-manager line, no conversation text, no customer name')
    expect(accessText(fix()).en).toBe('Cover the busy band → Sales manager of the environment · no conversation text, no customer name')
  })
})

describe('the card of a targeting row: persona and size against the campaign\'s who and channel (v42.1 F32)', () => {
  const persona = {
    id: 'overseas_investor',
    name: bi('Overseas investor'),
    who: bi('Lives abroad, business owner.'),
    mainPain: bi('Silence'),
    channelsUsed: ['wallet', 'whatsapp'],
    segmentSize: 6,
    runawayCount: 3,
    recommendation: { targetWho: bi('Owners abroad'), channelAndWhen: bi('WhatsApp, evenings'), campaignType: bi('Portfolio update'), whatNotToDo: bi('No discounts') },
    approvedByCxManager: true,
  } as Persona

  it('the persona, its size and its definition on the left; the campaign, who and channel on the right', () => {
    const c = targetingCard(persona)
    expect(c.given.map((l) => l.value?.en)).toEqual(['Overseas investor', '6 people on record', 'Lives abroad, business owner.'])
    expect(c.decided.map((l) => [l.label?.en, l.value?.en])).toEqual([
      ['Campaign', 'Portfolio update'],
      ['Who the campaign targets', 'Owners abroad'],
      ['Channel', 'WhatsApp, evenings'],
    ])
    expect(c.how.en).toBe('The campaign should point at the people the persona describes, on the channels they actually use.')
  })

  it('the list lines read persona, size and channels, then who and channel', () => {
    expect(targetingSaw(persona).en).toBe('Persona: Overseas investor · 6 people on record · channels they use: PSI Wallet, WhatsApp')
    expect(targetingText(persona).en).toBe('Who: Owners abroad · channel: WhatsApp, evenings')
  })
})

describe('the cards of a brief and a reading: the customer by reference, the last events, conversation text only where the event carries one', () => {
  const events = [
    event(1, { channel: 'call', text: 'never shown for a call' }),
    event(2, { text: 'Where is my document?', problemFlags: ['slow_reply'] }),
    event(3, { channel: 'email' }),
    event(4, { problemFlags: ['hand_off', 'promise_not_kept'] }),
  ]

  it('a brief: the person and the first score, the LAST three events oldest first, the conversation text on the events that carry one, the reason and "critical"', () => {
    const c = briefCard({ personId: 'p-001', instrument: 'csat', firstScore: 2, severity: 'critical' }, events, bi('Slow or no reply', 'رد بطيء'))
    expect(c.given[0]).toEqual({ personId: 'p-001', value: { en: 'CSAT 2', ar: 'CSAT 2' } })
    const lines = c.given.slice(1)
    expect(lines.map((l) => l.meta?.en)).toEqual(['2026-11-02 · WhatsApp', '2026-11-03 · Email', '2026-11-04 · WhatsApp'])
    expect(lines[0]).toMatchObject({ conversation: 'Where is my document?', value: { en: 'Slow reply' } })
    expect(lines[1]).toMatchObject({ value: { en: 'No problem flagged' } })
    expect(lines[1].conversation).toBeUndefined()
    expect(lines[2].value?.en).toBe('Hand-off · Promise not kept')
    expect(c.decided[0].value?.en).toBe('reason suggested: Slow or no reply · critical')
    expect(c.how.en).toBe('The brief is written from the timeline only. The caller reads it before dialling.')
  })

  it('a call never carries a text, even when the record holds one', () => {
    const c = briefCard({ personId: 'p-001', firstScore: 4, severity: 'medium' }, [events[0]], bi('Other'))
    expect(c.given[1].conversation).toBeUndefined()
    expect(JSON.stringify(c)).not.toContain('never shown for a call')
    expect(c.given[0].value?.en).toBe('NPS 4')
    expect(c.decided[0].value?.en).toBe('reason suggested: Other')
  })

  it('a reading: the person and the events, the three most recent problems, the reading; a quiet timeline says so', () => {
    const many = [1, 2, 3, 4, 5].map((n) => event(n, { problemFlags: ['slow_reply'] }))
    const c = journeyCard('p-001', many, bi('Silent lead'))
    expect(c.given[0]).toEqual({ personId: 'p-001', value: { en: '5 events', ar: '5 حدثاً' } })
    expect(c.given.slice(1).map((l) => l.value?.en)).toEqual(['Slow reply · 2026-11-05', 'Slow reply · 2026-11-04', 'Slow reply · 2026-11-03'])
    expect(c.decided).toEqual([{ value: bi('Silent lead'), strong: true }])
    expect(c.how.en).toBe("The reading comes from the problems found on the timeline, not from the agent's opinion.")
    expect(journeyCard('p-001', [event(1)], bi('Healthy')).given[1].value?.en).toBe('No problem found on the timeline')
  })
})
