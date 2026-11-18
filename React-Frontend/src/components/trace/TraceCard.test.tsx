import { beforeAll, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import * as mock from '@/services/mockData'
import { buildTraceIndex, chainFrom, evId } from '@/utils/trace'
import type { TraceChain } from '@/types'
import { TraceCard, TraceCardView } from './TraceCard'
import { traceNextLine } from './traceNext'

beforeAll(() => preferReducedMotion())

const ev = (n: number, channel: 'call' | 'email' = 'call') => ({ id: `i-${String(n).padStart(4, '0')}`, traceId: `EV-${n}`, channel, occurredAt: `2026-10-${String(10 + n).padStart(2, '0')}T09:00:00Z`, personId: 'p-001' })
const sg = (n: number) => ({ id: `sig-${String(n).padStart(4, '0')}`, traceId: `SG-${n}`, occurredAt: `2026-10-${String(10 + n).padStart(2, '0')}T09:00:00Z`, kind: 'complaint' as const })

const full: TraceChain = {
  from: { kind: 'signal', id: 'sig-0001' },
  events: [ev(1), ev(2, 'email')],
  signals: [sg(1), sg(2), sg(3)],
  pattern: { id: 'same_issue:slow_response', traceId: 'PT-123', signalCount: 7 },
  fix: { id: 'ca-1', traceId: 'CA-201', status: 'verification' },
  check: { traceId: 'VR-201', fixId: 'ca-1', dueAt: '2026-12-31T00:00:00Z', status: 'verification' },
  report: { traceId: 'RP-2026-11', label: { en: 'November pack', ar: 'حزمة نوفمبر' } },
  publicMention: false,
}

const columns = () => within(screen.getByRole('list')).getAllByRole('listitem')

describe('TraceCardView (v40 F11)', () => {
  it('shows six columns with the ids, the pattern size, the fix status, the check date and the report label', async () => {
    renderWithProviders(<TraceCardView chain={full} />)
    expect(screen.getByRole('heading', { name: 'Trace' })).toBeInTheDocument()
    expect(columns()).toHaveLength(6)
    const [events, signals, pattern, fix, check, report] = columns()
    expect(events).toHaveTextContent('1 Event')
    expect(events).toHaveTextContent('EV-1')
    expect(events).toHaveTextContent('EV-2')
    expect(events).toHaveTextContent('10-11')
    expect(signals).toHaveTextContent('SG-3')
    expect(pattern).toHaveTextContent('PT-123')
    expect(pattern).toHaveTextContent('7 signals')
    expect(fix).toHaveTextContent('CA-201')
    expect(fix).toHaveTextContent('60-day check')
    expect(check).toHaveTextContent('VR-201')
    expect(check).toHaveTextContent('2026-12-31')
    expect(report).toHaveTextContent('RP-2026-11')
    expect(report).toHaveTextContent('November pack')
    // the card ends the chain: nothing happens next
    expect(screen.queryByText('What happens next:')).not.toBeInTheDocument()
  })

  it('highlights the column of the record you are on', () => {
    renderWithProviders(<TraceCardView chain={full} />)
    const current = columns().filter((c) => c.getAttribute('aria-current') === 'true')
    expect(current).toHaveLength(1)
    expect(current[0]).toHaveTextContent('2 Signal')
  })

  it.each([
    ['event', 0],
    ['pattern', 2],
    ['fix', 3],
    ['check', 4],
    ['report', 5],
  ] as const)('highlights the column of a chain started from a %s', (kind, index) => {
    renderWithProviders(<TraceCardView chain={{ ...full, from: { kind, id: 'x' } }} />)
    expect(columns()[index]).toHaveAttribute('aria-current', 'true')
  })

  it('caps a cell at four ids and counts the rest', async () => {
    // real events, so each one has a page to open (an unknown id renders as a plain tag)
    const real = mock.MOCK_INTERACTIONS.slice(0, 6).map((i) => ({ id: i.id, traceId: evId(i.id), channel: i.channel, occurredAt: i.occurredAt, personId: i.personKey }))
    const many: TraceChain = { ...full, events: real, signals: [1, 2, 3, 4, 5].map(sg) }
    renderWithProviders(<TraceCardView chain={many} />)
    const [events, signals] = columns()
    await waitFor(() => expect(within(events).getAllByRole('button')).toHaveLength(4))
    expect(events).toHaveTextContent('+2')
    expect(within(signals).getAllByRole('button')).toHaveLength(4)
    expect(signals).toHaveTextContent('+1')
  })

  it('says what is missing: not a signal, under the line, none yet, not yet', () => {
    const eventOnly: TraceChain = { from: { kind: 'event', id: 'i-0001' }, events: [ev(1)], signals: [], publicMention: false }
    renderWithProviders(<TraceCardView chain={eventOnly} />)
    const [, signals, pattern, fix, check, report] = columns()
    expect(signals).toHaveTextContent('not a signal')
    expect(pattern).toHaveTextContent('under the line')
    expect(fix).toHaveTextContent('none yet')
    expect(check).toHaveTextContent('not yet')
    expect(report).toHaveTextContent('not yet')
    expect(screen.getByText('Signal: only if this event hurt the customer')).toBeInTheDocument()
  })

  it('a public mention says no person was identified and has no event to open', () => {
    const pub: TraceChain = { from: { kind: 'signal', id: 'PUB-351' }, events: [], signals: [{ ...sg(1), id: 'PUB-351', traceId: 'PUB-351', kind: 'public_mention' }], publicMention: true }
    renderWithProviders(<TraceCardView chain={pub} />)
    const [events] = columns()
    expect(events).toHaveTextContent('public mention, no person identified')
    expect(within(events).queryByRole('button')).not.toBeInTheDocument()
    expect(columns()[1]).toHaveTextContent('PUB-351')
  })

  it('reads in Arabic, with the Arabic empty states and next line', () => {
    const eventOnly: TraceChain = { from: { kind: 'event', id: 'i-0001' }, events: [ev(1)], signals: [], publicMention: false }
    renderWithProviders(<TraceCardView chain={eventOnly} />, { lang: 'ar' })
    expect(screen.getByRole('heading', { name: 'الأثر' })).toBeInTheDocument()
    expect(columns()[0]).toHaveTextContent('1 حدث')
    expect(columns()[1]).toHaveTextContent('ليست إشارة')
    expect(screen.getByText('الإشارة: فقط إذا أذى هذا الحدث الزبون')).toBeInTheDocument()
  })
})

describe('traceNextLine (S4)', () => {
  it('picks the sentence by how far the chain goes', () => {
    expect(traceNextLine(full)).toBeNull()
    expect(traceNextLine({ ...full, report: undefined })?.en).toMatch(/^Report:/)
    expect(traceNextLine({ ...full, report: undefined, check: undefined })?.en).toMatch(/^Check:/)
    expect(traceNextLine({ ...full, report: undefined, check: undefined, fix: undefined })?.en).toMatch(/^Fix:/)
    expect(traceNextLine({ ...full, report: undefined, check: undefined, fix: undefined, pattern: undefined })?.en).toMatch(/^Pattern:/)
    expect(traceNextLine({ ...full, report: undefined, check: undefined, fix: undefined, pattern: undefined, signals: [] })?.en).toMatch(/^Signal:/)
  })
})

describe('TraceCard on the sample (walkable both ways)', () => {
  const fixId = 'ca-1'
  const index = () => buildTraceIndex({ interactions: mock.MOCK_INTERACTIONS, signals: mock.MOCK_SIGNALS, patterns: mock.MOCK_PATTERNS, fixes: mock.MOCK_CORRECTIVE_ACTIONS })

  it('from a fix: its pattern, signals and events are listed, and the fix and check sit in their columns', async () => {
    renderWithProviders(<TraceCard kind="fix" id={fixId} />)
    const card = await screen.findByTestId('trace-card')
    const [events, signals, pattern, fix, check] = within(card).getAllByRole('listitem')
    expect(events.querySelectorAll('button').length).toBeGreaterThan(0)
    expect(signals.querySelectorAll('button').length).toBeGreaterThan(0)
    expect(pattern).toHaveTextContent(/PT-\d{3}/)
    expect(fix).toHaveTextContent('CA-201')
    expect(check).toHaveTextContent('VR-201')
    expect(fix).toHaveAttribute('aria-current', 'true')
  })

  it('from an event of that chain: the same fix is reachable (forward), highlighted on the Event column', async () => {
    const chain = chainFrom('fix', fixId, index())!
    expect(chain.events.length).toBeGreaterThan(0)
    renderWithProviders(<TraceCard kind="event" id={chain.events[0].id} />)
    const card = await screen.findByTestId('trace-card')
    const cols = within(card).getAllByRole('listitem')
    expect(cols[0]).toHaveAttribute('aria-current', 'true')
    expect(cols[3]).toHaveTextContent('CA-201')
  })

  it('renders nothing for an unknown record', async () => {
    renderWithProviders(<TraceCard kind="fix" id="ca-9999" />)
    // the loading skeleton clears, then nothing is left
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    expect(screen.queryByTestId('trace-card')).not.toBeInTheDocument()
  })
})
