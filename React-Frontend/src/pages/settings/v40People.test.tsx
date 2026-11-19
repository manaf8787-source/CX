import { vi, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import * as mock from '@/services/mockData'
import { AGENT_JDS, PUBLIC_MENTIONS } from '@/data/v38Reference'
import { syncSampleEffects } from '@/utils/passRate'
import type { RoleId, WeeklySampleItem } from '@/types'
import Feeds from './Feeds'
import CrmMapping from './CrmMapping'
import SurveyQuestions from './SurveyQuestions'
import PublicMentions from './PublicMentions'
import WeeklySample from './WeeklySample'
import { SampleCardFlow } from './SampleCardFlow'

// Pages load their sample after a short delay and a full run is busy: give a test room.
vi.setConfig({ testTimeout: 20_000 })

beforeAll(() => {
  preferReducedMotion()
  // Radix Select in jsdom.
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
})

const T = { timeout: 8000 }

describe('Data feeds (v40 F13)', () => {
  it('lists the three CRM environments as separate feeds and the shared sources, with the late one flagged', async () => {
    renderWithProviders(<Feeds />, { role: 'cxmgr' })
    const table = await screen.findByRole('table', {}, T)
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(8)
    for (const name of ['CRM · Abu Dhabi', 'CRM · Dubai', 'CRM · PSI Assets (rental)']) expect(within(table).getByText(name)).toBeInTheDocument()
    expect(within(table).getAllByText('shared')).toHaveLength(5)
    for (const h of ['Feed', 'Environment', 'Today', 'Last received', 'Records', 'What it carries']) expect(within(table).getByRole('columnheader', { name: h })).toBeInTheDocument()
    const late = within(table).getByText('CRM · PSI Assets (rental)').closest('tr')!
    expect(within(late).getByText('Late')).toBeInTheDocument()
    expect(within(late).getByText('Yesterday')).toBeInTheDocument()
    expect(within(table).getAllByText('Received')).toHaveLength(7)
    expect(screen.getByText('1 feed late or missing')).toBeInTheDocument()
    expect(screen.getByText(/a number from a late feed is shown with yesterday's date, never silently/)).toBeInTheDocument()
  })

  it('formats the record counts with separators and has no edit control (read-only)', async () => {
    renderWithProviders(<Feeds />, { role: 'auditmkt' })
    const table = await screen.findByRole('table', {}, T)
    expect(within(table).getByText('3,728,460')).toBeInTheDocument()
    expect(within(table).queryByRole('button')).not.toBeInTheDocument()
    expect(within(table).queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('speaks Arabic', async () => {
    renderWithProviders(<Feeds />, { role: 'cxmgr', lang: 'ar' })
    expect(await screen.findByText('تغذيات البيانات', {}, T)).toBeInTheDocument()
    expect((await screen.findAllByText('مشتركة', {}, T)).length).toBe(5)
    expect(screen.getByText('تغذية واحدة متأخرة أو مفقودة')).toBeInTheDocument()
  })
})

describe('CRM mapping (v40 F15)', () => {
  it('has three tabs with counts from the data and a [Proposed] badge on every row until confirmed', async () => {
    renderWithProviders(<CrmMapping />, { role: 'cxteam' })
    const table = await screen.findByRole('table', {}, T)
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      expect.stringMatching(/^Sources \(CRM Media\)\s*13$/),
      expect.stringMatching(/^Stages \(CRM lead stage\)\s*14$/),
      expect.stringMatching(/^Activities \(CRM activity category\)\s*17$/),
    ])
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(13)
    for (const r of rows) expect(within(r).getByText('[Proposed]')).toBeInTheDocument()
    expect(screen.getByText('13 CRM media values shown, 9 portal sources.')).toBeInTheDocument()
  })

  it('the CX team only reads: no select, and a view-only note', async () => {
    renderWithProviders(<CrmMapping />, { role: 'cxteam' })
    const table = await screen.findByRole('table', {}, T)
    expect(within(table).queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByText(/View only/)).toBeInTheDocument()
    expect(within(table).getByText('PSI Mobile App').closest('tr')).toHaveTextContent('PSI Real Estate app')
  })

  it('an unmapped value shows as ignored and queued for review (activities: Automatic)', async () => {
    renderWithProviders(<CrmMapping />, { role: 'cxteam' })
    await screen.findByRole('table', {}, T)
    await userEvent.click(screen.getByRole('tab', { name: /Activities/ }))
    const row = (await screen.findByText('Automatic')).closest('tr')!
    expect(within(row).getByText('Ignored · queued for review')).toBeInTheDocument()
    expect(within(row).getByText('[Proposed]')).toBeInTheDocument()
  })

  it('the CX manager and the Internal Audit and Marketing Lead edit a row, and the value is saved', async () => {
    renderWithProviders(<CrmMapping />, { role: 'auditmkt' })
    const table = await screen.findByRole('table', {}, T)
    const select = within(table).getByRole('combobox', { name: /^Youngsters/ })
    expect(select).toHaveTextContent('Event')
    await userEvent.click(select)
    await userEvent.click(await screen.findByRole('option', { name: 'Branch / walk-in' }))
    await waitFor(() => expect(mock.MOCK_MAPPING.rows.find((r) => r.kind === 'src' && r.crmValue === 'Youngsters')!.portalValue).toBe('branch'))
    // put it back for the other tests
    mock.MOCK_MAPPING.rows.find((r) => r.kind === 'src' && r.crmValue === 'Youngsters')!.portalValue = 'event'
  })

  it('a confirmed row loses its [Proposed] badge; the CX manager confirms one with "Confirm", the CX team has no button', async () => {
    const row = mock.MOCK_MAPPING.rows.find((r) => r.kind === 'src' && r.crmValue === 'Youngsters')!
    expect(row.confirmed).toBeFalsy() // the data default: nothing is confirmed until the owner says so
    const { unmount } = renderWithProviders(<CrmMapping />, { role: 'cxteam' })
    const readOnly = await screen.findByRole('table', {}, T)
    expect(within(readOnly).queryByRole('button', { name: /^Confirm the mapping/ })).not.toBeInTheDocument()
    unmount()

    renderWithProviders(<CrmMapping />, { role: 'cxmgr' })
    const table = await screen.findByRole('table', {}, T)
    const tr = within(table).getByText('Youngsters').closest('tr')!
    expect(within(tr).getByText('[Proposed]')).toBeInTheDocument()
    await userEvent.click(within(tr).getByRole('button', { name: 'Confirm the mapping of Youngsters' }))
    await waitFor(() => expect(within(table).getByText('Youngsters').closest('tr')).not.toHaveTextContent('[Proposed]'))
    expect(within(table).getByText('Youngsters').closest('tr')).toHaveTextContent('Confirmed')
    // The other rows are untouched.
    expect(within(table).getAllByText('[Proposed]')).toHaveLength(12)
    expect(row.confirmed).toBe(true)
    row.confirmed = false // put it back for the other tests
  })

  it('speaks Arabic', async () => {
    renderWithProviders(<CrmMapping />, { role: 'cxteam', lang: 'ar' })
    expect(await screen.findByText('ربط قيم CRM', {}, T)).toBeInTheDocument()
    expect((await screen.findAllByText('[مقترح]', {}, T)).length).toBe(13)
  })
})

describe('Survey questions (v40 F23)', () => {
  it('opens on Real Estate with its four sets, and previews what the customer receives', async () => {
    renderWithProviders(<SurveyQuestions />, { role: 'cxmgr' })
    const sets = await screen.findByRole('list', { name: 'Question sets' }, T)
    expect(within(sets).getAllByRole('listitem')).toHaveLength(4)
    expect(within(sets).getByText('NPS after the signed deal')).toBeInTheDocument()
    expect(screen.getByText('As the customer sees it · WhatsApp or app')).toBeInTheDocument()
    const preview = screen.getByRole('figure', { name: 'Preview of the survey on a phone' })
    expect(within(preview).getByText('Hello, this is PSI. One minute of your time:')).toBeInTheDocument()
    expect(within(preview).getByText(/How likely are you to recommend PSI to a friend or colleague/)).toBeInTheDocument()
    expect(screen.getByText(/Sent by Agent 10 in the customer's language/)).toBeInTheDocument()
  })

  it('previews in Arabic with right-to-left, and shows both languages side by side', async () => {
    renderWithProviders(<SurveyQuestions />, { role: 'cxmgr' })
    await screen.findByRole('list', { name: 'Question sets' }, T)
    await userEvent.click(screen.getByRole('button', { name: 'العربية' }))
    const preview = screen.getByRole('figure', { name: 'Preview of the survey on a phone' })
    expect(preview).toHaveAttribute('dir', 'rtl')
    expect(within(preview).getByText('مرحباً، معك PSI. دقيقة من وقتك:')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'English' })).toBeInTheDocument()
    expect(screen.getAllByText('ما السبب الرئيسي لتقييمك؟').length).toBeGreaterThan(0)
  })

  it('choosing another set changes the preview', async () => {
    renderWithProviders(<SurveyQuestions />, { role: 'cxmgr' })
    const sets = await screen.findByRole('list', { name: 'Question sets' }, T)
    await userEvent.click(within(sets).getByRole('button', { name: /What stopped you\?/ }))
    const preview = screen.getByRole('figure', { name: 'Preview of the survey on a phone' })
    expect(within(preview).getByText(/We noticed you did not continue/)).toBeInTheDocument()
  })

  it('sets of the products that are not launched carry [Proposed] at the set level; Real Estate does not', async () => {
    renderWithProviders(<SurveyQuestions />, { role: 'cxmgr' })
    const re = await screen.findByRole('list', { name: 'Question sets' }, T)
    expect(within(re).queryByText('[Proposed]')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Tour Estate' }))
    const tour = await screen.findByRole('list', { name: 'Question sets' })
    expect(within(tour).getByText('End-of-tour survey')).toBeInTheDocument()
    expect(within(tour).getByText('[Proposed]')).toBeInTheDocument()
  })

  it('a product with no set (PSI Wallet) shows an empty state', async () => {
    renderWithProviders(<SurveyQuestions />, { role: 'cxmgr' })
    await screen.findByRole('list', { name: 'Question sets' }, T)
    await userEvent.click(screen.getByRole('tab', { name: 'PSI Wallet' }))
    expect(await screen.findByText('No question set for this product yet.')).toBeInTheDocument()
  })

  it('After-Sales (live) carries the note that the re-survey rule applies to it too', async () => {
    renderWithProviders(<SurveyQuestions />, { role: 'cxmgr' })
    await screen.findByRole('list', { name: 'Question sets' }, T)
    await userEvent.click(screen.getByRole('tab', { name: 'After-Sales' }))
    expect(await screen.findByText(/The re-survey rule applies to every product/)).toBeInTheDocument()
  })

  it('speaks Arabic', async () => {
    renderWithProviders(<SurveyQuestions />, { role: 'cxmgr', lang: 'ar' })
    expect(await screen.findByText('أسئلة الاستبيانات', {}, T)).toBeInTheDocument()
    expect(await screen.findByText('كما يراه الزبون · واتساب أو التطبيق', {}, T)).toBeInTheDocument()
  })
})

describe('Public mentions (v40 F30)', () => {
  const unreplied = () => PUBLIC_MENTIONS.filter((m) => !m.replied).length

  it('lists the mentions with reply status, the Marketing owner and the 48-hour clock; nobody is linked to a person', async () => {
    renderWithProviders(<PublicMentions />, { role: 'cxmgr' })
    const table = await screen.findByRole('table', {}, T)
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(PUBLIC_MENTIONS.length)
    expect(within(rows[0]).getByText('Marketing · channel owner')).toBeInTheDocument()
    expect(screen.getByText(/Marketing \(the channel owner\) replies within 48 hours/)).toBeInTheDocument()
    expect(screen.getByText(/Nobody here is surveyed or matched to a record/)).toBeInTheDocument()
    expect(within(table).queryAllByRole('link')).toHaveLength(0)
    // The owner column has no [Proposed] badge (decided 18 Nov).
    expect(screen.queryByText('[Proposed]')).not.toBeInTheDocument()
  })

  it('shows what is over the 48-hour clock to the CX team, with the missed-signal line', async () => {
    renderWithProviders(<PublicMentions />, { role: 'cxteam' })
    await screen.findByRole('table', {}, T)
    const overdue = PUBLIC_MENTIONS.filter((m) => !m.replied && Date.now() - Date.parse(m.date) > 48 * 3_600_000).length
    expect(overdue).toBeGreaterThan(0)
    const tile = screen.getByText('Over 48 h, no reply').closest('div')!.parentElement!
    expect(within(tile).getByText(String(overdue))).toBeInTheDocument()
    expect(within(tile).getByText('Reply clock missed: signal raised for the CX team')).toBeInTheDocument()
    expect(screen.getAllByText('No reply, over 48 h').length).toBe(overdue)
  })

  it('"Mark replied" is for the CX roles and Marketing: Internal Audit and Executive read only', async () => {
    const { unmount } = renderWithProviders(<PublicMentions />, { role: 'auditmkt' })
    await screen.findByRole('table', {}, T)
    expect(screen.queryByRole('button', { name: /^Mark replied/ })).not.toBeInTheDocument()
    unmount()
    renderWithProviders(<PublicMentions />, { role: 'marketing' })
    await screen.findByRole('table', {}, T)
    expect(screen.getAllByRole('button', { name: /^Mark replied/ })).toHaveLength(unreplied())
  })

  it('marking a mention replied sets its reply hours (at least 1) and updates the counts', async () => {
    renderWithProviders(<PublicMentions />, { role: 'marketing' })
    await screen.findByRole('table', {}, T)
    const before = unreplied()
    await userEvent.click(screen.getAllByRole('button', { name: /^Mark replied/ })[0])
    await waitFor(() => expect(unreplied()).toBe(before - 1))
    const done = PUBLIC_MENTIONS.find((m) => m.repliedAt)!
    expect(done.replied).toBe(true)
    expect(done.replyHours).toBeGreaterThanOrEqual(1)
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^Mark replied/ })).toHaveLength(before - 1))
  })

  it('filters by reply status', async () => {
    renderWithProviders(<PublicMentions />, { role: 'cxmgr' })
    const table = await screen.findByRole('table', {}, T)
    await userEvent.click(screen.getByRole('button', { name: /^Replied\s*\d+$/ }))
    const rows = within(table).getAllByRole('row').slice(1)
    for (const r of rows) expect(r).toHaveTextContent(/Replied in \d+ h/)
  })

  it('speaks Arabic', async () => {
    renderWithProviders(<PublicMentions />, { role: 'cxmgr', lang: 'ar' })
    expect(await screen.findByText('الإشارات العامة', {}, T)).toBeInTheDocument()
    await screen.findByRole('table', {}, T)
    expect(screen.getAllByText('التسويق · مسؤول القناة').length).toBeGreaterThan(0)
  })
})

// --- Weekly sample: the card flow (v42.2 F34), split by reader (v42.1 F32), and the list behind "See all as a list" -----------------------

/**
 * The sample is a module-level register: every test starts from "nothing read, no supervisor test". A verdict reaches the register after the mock
 * seam's latency (150 to 180 ms), also for a page already unmounted: the previous test's last answers are waited for first.
 */
async function resetSample() {
  await new Promise((resolve) => setTimeout(resolve, 320))
  for (const i of mock.MOCK_WEEKLY_SAMPLE) {
    i.verdict = null
    delete i.judgedAt
  }
  syncSampleEffects(mock.MOCK_WEEKLY_SAMPLE, mock.MOCK_SUPERVISOR_TESTS, AGENT_JDS)
  localStorage.removeItem('psicx.sample.folded')
}

const YES = 'Yes, I would do the same'
const NO = 'No, that is wrong'
const SKIP = 'Not sure, skip for now'
const cardOf = async () => screen.findByTestId('sample-card', {}, T)
const heading = (card: HTMLElement) => within(card).getByRole('heading', { level: 3 })
const answer = async (name: string) => userEvent.click(screen.getByRole('button', { name }))

/** Renders the page for a role, waits for the first card, and (when asked) opens the list behind "See all as a list". */
async function openPage(role: RoleId, opts: { lang?: 'en' | 'ar'; list?: boolean } = {}) {
  const view = renderWithProviders(<WeeklySample />, { role, lang: opts.lang })
  await cardOf()
  if (opts.list) {
    await userEvent.click(screen.getAllByRole('button', { name: opts.lang === 'ar' ? 'عرض الكل كقائمة' : 'See all as a list' })[0])
    await screen.findAllByRole('table', {}, T)
  }
  return view
}

describe('Weekly sample as a card flow (v42.2 F34): one piece of the AI\'s work at a time', () => {
  beforeEach(resetSample)

  it('opens with the "new employee" intro, the reader\'s note, the counter and ONE card: what the AI was given, what it decided, one question, three answers', async () => {
    renderWithProviders(<WeeklySample />, { role: 'cxmgr' })
    const card = await cardOf()
    expect(screen.getByText("Check the AI's work this week")).toBeInTheDocument()
    expect(screen.getByText('One piece at a time. Half a minute each.')).toBeInTheDocument()
    expect(screen.getByText('What this is, in one breath')).toBeInTheDocument()
    expect(screen.getByText(/The AI team is a new employee\. Every week you check a few pieces of its work/)).toBeInTheDocument()
    expect(screen.getByText('Your part of the sample: what the CX team can judge')).toBeInTheDocument()
    expect(screen.getByTestId('sample-counter')).toHaveTextContent('0 / 26 checked this week · due Thursday')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()

    expect(heading(card)).toHaveTextContent('Proposed fix')
    expect(card).toHaveTextContent('CA-201')
    expect(within(card).getByText('What the AI was given')).toBeInTheDocument()
    expect(within(card).getByText('What it decided')).toBeInTheDocument()
    expect(within(card).getByText('The pattern:')).toBeInTheDocument()
    expect(within(card).getAllByText(/“Customer contacted us again about the same issue”/).length).toBe(3) // up to three quoted signals
    expect(within(card).getByText('+11 more signals')).toBeInTheDocument()
    expect(within(card).getByText('Address repeat contact in PSI Assets team')).toBeInTheDocument()
    expect(within(card).getByText(/In similar closed cases this kind of fix was followed by recovery in about 8 of 10/)).toBeInTheDocument()
    expect(within(card).getByRole('heading', { level: 4, name: 'Is this a sensible fix for this pattern, and is it going to the right person?' })).toBeInTheDocument()
    for (const name of [YES, NO, SKIP, 'Open the fix']) expect(within(card).getByRole('button', { name })).toBeInTheDocument()
    // only one card at a time, and only the CX team's kinds
    expect(screen.getAllByTestId('sample-card')).toHaveLength(1)
    expect(screen.queryByText('Routing by the matrix')).not.toBeInTheDocument()
  })

  it('"Yes" counts the card as read and moves to the next; the focus follows to its heading and a live region says "n of N checked"', async () => {
    renderWithProviders(<WeeklySample />, { role: 'cxteam' })
    await cardOf()
    await answer(YES)
    const next = await cardOf()
    expect(next).toHaveTextContent('CA-202')
    expect(screen.getByTestId('sample-counter')).toHaveTextContent('1 / 26 checked this week')
    expect(heading(next)).toHaveFocus()
    expect(screen.getByTestId('sample-live')).toHaveTextContent('1 of 26 checked.')
    await waitFor(() => expect(mock.MOCK_WEEKLY_SAMPLE.find((i) => i.ref === 'CA-201' && i.check === 'fix')?.verdict).toBe(true))
  })

  it('"No" lowers the agent\'s pass rate and adds a supervisor test (the counter says "1 marked wrong"); the list shows both', async () => {
    renderWithProviders(<WeeklySample />, { role: 'cxteam' })
    await cardOf()
    await answer(NO)
    expect(screen.getByTestId('sample-counter')).toHaveTextContent('1 / 26 checked this week · 1 marked wrong · due Thursday')
    await waitFor(() => expect(mock.MOCK_SUPERVISOR_TESTS.some((t) => t.agent === 5 && t.fromSampleId === 'ws-1')).toBe(true))
    expect(AGENT_JDS.find((j) => j.id === 5)!.approvalPct).toBeLessThan(AGENT_JDS.find((j) => j.id === 5)!.baseApprovalPct as number)
    await userEvent.click(screen.getAllByRole('button', { name: 'See all as a list' })[0])
    await screen.findAllByRole('table', {}, T)
    expect(await screen.findByText(/New supervisor tests \(1\)/, {}, T)).toBeInTheDocument()
    const rates = within(screen.getByText('Pass rate this week').closest('[data-slot="card"]') as HTMLElement)
    expect(rates.getAllByRole('row').find((r) => /Agent 5\b/.test(r.textContent ?? ''))).toHaveTextContent(/88% → \d+%/)
  })

  it('"Not sure, skip for now" leaves the card unread, moves on, and brings it back once the others are done', async () => {
    renderWithProviders(<WeeklySample />, { role: 'cxmgr' })
    await cardOf()
    await answer(SKIP)
    const next = await cardOf()
    expect(next).toHaveTextContent('CA-202')
    expect(screen.getByTestId('sample-counter')).toHaveTextContent('0 / 26 checked')
    expect(screen.getByTestId('sample-live')).toHaveTextContent('Skipped for now. 0 of 26 checked.')
    expect(heading(next)).toHaveFocus()
    expect(mock.MOCK_WEEKLY_SAMPLE.find((i) => i.id === 'ws-1')?.verdict).toBeNull()
    for (let i = 0; i < 25; i++) await answer(YES)
    const back = await cardOf()
    expect(back).toHaveTextContent('CA-201') // the skipped one, last
    expect(screen.getByText('These are the ones you skipped.')).toBeInTheDocument()
    expect(screen.getByTestId('sample-counter')).toHaveTextContent('25 / 26 checked')
  })

  it('skipping the only card left keeps it (there is nothing else to show) and does not lose it', async () => {
    renderWithProviders(<WeeklySample />, { role: 'cxmgr' })
    await cardOf()
    for (let i = 0; i < 25; i++) await answer(YES)
    await answer(SKIP)
    expect(await cardOf()).toHaveTextContent('Journey reading') // the last one, kept
    expect(screen.getByTestId('sample-counter')).toHaveTextContent('25 / 26 checked')
  })

  it('ends on an "All done" card that says how many wrongs became tests, and "Nothing wrong found" when there are none', async () => {
    const first = renderWithProviders(<WeeklySample />, { role: 'cxmgr' })
    await cardOf()
    await answer(NO)
    for (let i = 0; i < 25; i++) await answer(YES)
    const done = await screen.findByTestId('sample-done', {}, T)
    expect(within(done).getByRole('heading', { name: 'All done for this week.' })).toHaveFocus()
    expect(within(done).getByText('1 wrong answers became tests for the supervisor.')).toBeInTheDocument()
    expect(screen.getByTestId('sample-counter')).toHaveTextContent('26 / 26 checked this week · 1 marked wrong')
    expect(screen.getByTestId('sample-live')).toHaveTextContent('All done for this week.')
    expect(screen.queryByTestId('sample-card')).not.toBeInTheDocument()
    first.unmount()

    await resetSample()
    renderWithProviders(<WeeklySample />, { role: 'cxmgr' })
    await cardOf()
    for (let i = 0; i < 26; i++) await answer(YES)
    expect(await screen.findByText('Nothing wrong found.', {}, T)).toBeInTheDocument()
  })

  it('"See all as a list" opens the table you know (the reader\'s 26 rows, four tiles, the pass-rate card) and "Back to one at a time" returns to the cards', async () => {
    await openPage('cxmgr', { list: true })
    expect(screen.getByText('Weekly sample')).toBeInTheDocument()
    for (const tile of ['Read', 'Wrong (each becomes a test)', 'Accuracy this week', 'Due (every Thursday)']) expect(screen.getByText(tile)).toBeInTheDocument()
    expect(screen.getByText('0 / 26')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '✓ Right' })).toHaveLength(26)
    expect(screen.getByText('Your part of the sample: what the CX team can judge')).toBeInTheDocument() // the note sits above the table too
    expect(screen.getByText('[Proposed]', { selector: 'span' })).toBeInTheDocument() // the pass-rate formula, not the page
    expect(screen.queryByTestId('sample-card')).not.toBeInTheDocument()
    expect(screen.queryByText('What this is, in one breath')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Back to one at a time' }))
    expect(await cardOf()).toHaveTextContent('Proposed fix')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'See all as a list' })).toHaveFocus() // the control that switched the view is back under the focus
  })

  it('a judged row can be changed in the list (Change), and the card flow starts after the judged ones', async () => {
    await openPage('cxteam', { list: true })
    await userEvent.click(screen.getAllByRole('button', { name: '✗ Wrong' })[0])
    expect(await screen.findByText('Wrong → new test', {}, T)).toBeInTheDocument()
    expect(await screen.findByText('1 / 26', {}, T)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Change' }))
    await waitFor(() => expect(screen.getByText('Right', { selector: '[data-slot="status-badge"]' })).toBeInTheDocument())
    await waitFor(() => expect(mock.MOCK_SUPERVISOR_TESTS).toHaveLength(0))
    await userEvent.click(screen.getByRole('button', { name: 'Back to one at a time' }))
    expect(await cardOf()).toHaveTextContent('CA-202') // CA-201 is judged (right)
  })

  it('shows the customer\'s name and the conversation text on a brief card to the CX team, and "Open the fix" on a fix card', async () => {
    renderWithProviders(<WeeklySample />, { role: 'cxteam' })
    await cardOf()
    for (let i = 0; i < mock.MOCK_CORRECTIVE_ACTIONS.length; i++) await answer(YES)
    const card = await cardOf()
    expect(heading(card)).toHaveTextContent('Interview brief')
    expect(within(card).getByRole('heading', { level: 4, name: 'Does this summary match what happened to the customer?' })).toBeInTheDocument()
    expect(card).toHaveTextContent(mock.MOCK_PERSONS[0].name) // p-001, resolved for a role that may see names
    expect(card).toHaveTextContent('Sample conversation note — visible to CX team and CX manager only.')
    expect(within(card).getByText(/Brief for the caller:/)).toBeInTheDocument()
    expect(within(card).queryByRole('button', { name: /^Open the/ })).not.toBeInTheDocument() // the prototype opens a fix or a signal only
  })
})

describe('Weekly sample as the Internal Audit and Marketing Lead (v42.1 F32): audit rows only, ids and titles only', () => {
  beforeEach(resetSample)

  /** Skips until the card of this kind is on screen (the queue sends a skipped card to the end). */
  async function skipTo(kind: string) {
    for (let i = 0; i < 40; i++) {
      const card = await cardOf()
      if (heading(card).textContent?.startsWith(kind)) return card
      await answer(SKIP)
    }
    throw new Error(`no card of kind ${kind}`)
  }

  it('reads its own 35 rows, with the audit note and the classification question first; no Open buttons anywhere', async () => {
    renderWithProviders(<WeeklySample />, { role: 'auditmkt' })
    const card = await cardOf()
    expect(screen.getByTestId('sample-counter')).toHaveTextContent('0 / 35 checked this week')
    expect(screen.getByText('Your part of the sample: what audit can judge')).toBeInTheDocument()
    expect(screen.getByText(/You are not approving or rejecting fixes; the responsible manager does that from the inbox/)).toBeInTheDocument()
    expect(heading(card)).toHaveTextContent('Classification')
    expect(within(card).getByRole('heading', { level: 4, name: 'Is this really a complaint of this type?' })).toBeInTheDocument()
    expect(within(card).getByText('Type:')).toBeInTheDocument()
    expect(within(card).getByText(/The AI matched the words of the message to the type/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Open/ })).not.toBeInTheDocument()
    for (const kind of ['Proposed fix', 'Interview brief', 'Journey reading']) expect(screen.queryByText(kind)).not.toBeInTheDocument()
  })

  it('the routing card shows the title it went to against the title the matrix says; CA-201, "repeat contact → Legal", carries the kind check', async () => {
    renderWithProviders(<WeeklySample />, { role: 'auditmkt' })
    const card = await skipTo('Routing by the matrix')
    expect(card).toHaveTextContent('CA-201')
    expect(card).toHaveTextContent('Agent 5')
    expect(within(card).getByText('Routed to:')).toBeInTheDocument()
    expect(within(card).getByText('The matrix says:')).toBeInTheDocument()
    expect(within(card).getByText(/PSI Wallet · Legal and privacy · respond ½ h · resolve 4\.5 h · VIP · clocks halved/)).toBeInTheDocument()
    expect(within(card).getByText(/Legal and privacy is for legal, privacy or safety signals; none of this pattern's signals is one \(it is about repeat contact\)/)).toBeInTheDocument()
    expect(within(card).getByRole('heading', { level: 4, name: 'Did the fix go to the title the matrix says?' })).toBeInTheDocument()
    expect(card).toHaveTextContent('How: Compare the two bold titles. If they differ, the routing is wrong.')
  })

  it('a wrong on a routing card lowers Agent 5 (not Agent 2) and becomes a supervisor test', async () => {
    renderWithProviders(<WeeklySample />, { role: 'auditmkt' })
    const card = await skipTo('Routing by the matrix')
    expect(card).toHaveTextContent('CA-201')
    await answer(NO)
    await waitFor(() => expect(mock.MOCK_SUPERVISOR_TESTS.map((t) => [t.fromSampleId, t.agent])).toEqual([['ws-51', 5]]))
    expect(AGENT_JDS.find((j) => j.id === 5)).toMatchObject({ wrongThisWeek: 1, supervisorTests: 1 })
    expect(AGENT_JDS.find((j) => j.id === 2)).toMatchObject({ wrongThisWeek: 0, supervisorTests: 0 })
    expect(screen.getByTestId('sample-counter')).toHaveTextContent('1 marked wrong')
  })

  it('the access card says what the receiver got: no names, no conversation text; the targeting card compares the persona with the campaign', async () => {
    renderWithProviders(<WeeklySample />, { role: 'auditmkt' })
    const access = await skipTo('Access check')
    expect(access).toHaveTextContent('CA-201')
    expect(within(access).getByText('Names in it:')).toBeInTheDocument()
    expect(access).toHaveTextContent('none · conversation text: none')
    expect(access).toHaveTextContent('PT-575 · CA-201')
    expect(within(access).getByRole('heading', { level: 4, name: 'Is there anything here that should not have left the CX team?' })).toBeInTheDocument()
    await answer(YES)
    const targeting = await skipTo('Campaign targeting')
    expect(targeting).toHaveTextContent('Overseas investor')
    expect(targeting).toHaveTextContent('MC-101')
    expect(targeting).toHaveTextContent('Agent 7')
    expect(within(targeting).getByText('Who the campaign targets:')).toBeInTheDocument()
    expect(within(targeting).getByRole('heading', { level: 4, name: 'Are these the right people for this campaign?' })).toBeInTheDocument()
  })

  it('no customer name and no conversation text anywhere on any audit card or in the audit list', async () => {
    const { container } = await openPage('auditmkt')
    const names = [...new Set(mock.MOCK_PERSONS.map((p) => p.name))]
    const seen = new Set<string>()
    for (let i = 0; i < 40 && seen.size < 35; i++) {
      const card = await cardOf()
      seen.add(card.textContent ?? '')
      for (const n of names) expect(card.textContent).not.toContain(n)
      expect(card.textContent).not.toContain('Sample conversation note')
      await answer(SKIP)
    }
    expect(seen.size).toBe(35)
    await userEvent.click(screen.getAllByRole('button', { name: 'See all as a list' })[0])
    await screen.findAllByRole('table', {}, T)
    for (const n of names) expect(container).not.toHaveTextContent(n)
    expect(container).not.toHaveTextContent('Sample conversation note')
  })

  it('the list holds its 35 rows with the audit rows\' own supervisor lines, an id that is not a link, and a note that says why there is no Open', async () => {
    await openPage('auditmkt', { list: true })
    expect(screen.getByText('0 / 35')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '✓ Right' })).toHaveLength(35)
    const table = screen.getAllByRole('table').at(-1)!
    expect(within(table).queryAllByRole('button', { name: /^Open / })).toHaveLength(0)
    expect(within(table).getAllByText('Schema, recompute, access, evidence, bilingual, risk gate: 6 of 6 passed')).toHaveLength(24) // 18 classifications + 6 counts
    expect(within(table).getAllByText(/^Supervisor: schema and recompute only; whether the receiver matches the matrix/)).toHaveLength(4)
    expect(within(table).getAllByText('Access check passed by code; you confirm by eye')).toHaveLength(3)
    expect(within(table).getAllByText(/^Supervisor: counts recomputed/)).toHaveLength(4)
    expect(within(table).getByText('Address repeat contact in PSI Assets team → Legal · kind check: no legal, privacy or safety signal in this pattern')).toBeInTheDocument()
    const id = within(table).getAllByText('CA-201')[0]
    expect(id.closest('[data-slot="trace-id"]')).not.toBeNull() // the id is a plain tag...
    expect(id.closest('button')).toBeNull() // ...not a link
    expect(within(table).queryByRole('button', { name: /CA-201/ })).not.toBeInTheDocument()
    expect(screen.getByText(/The record behind a row opens for the CX manager and the CX team/)).toBeInTheDocument()
    expect(screen.queryByText(/No customer names are shown to this role/)).not.toBeInTheDocument() // no audit row is about a person
    // judging is still theirs
    await userEvent.click(screen.getAllByRole('button', { name: '✓ Right' })[0])
    expect(await screen.findByText('1 / 35', {}, T)).toBeInTheDocument()
  })
})

describe('Weekly sample for a role that only reads (v42.1 F32)', () => {
  beforeEach(resetSample)

  it('the Executive reads the content rows as a list: the CX note, a view-only note, no verdict buttons and no card flow', async () => {
    renderWithProviders(<WeeklySample />, { role: 'exec' })
    expect(await screen.findByText('0 / 26', {}, T)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '✓ Right' })).not.toBeInTheDocument()
    expect(screen.getByText(/You can read the sample/)).toBeInTheDocument()
    expect(screen.getByText('Your part of the sample: what the CX team can judge')).toBeInTheDocument()
    expect(screen.queryByTestId('sample-card')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'See all as a list' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Back to one at a time' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Open / })).not.toBeInTheDocument()
    const table = screen.getAllByRole('table').at(-1)!
    expect(within(table).getAllByText('Not read yet')).toHaveLength(26)
  })
})

describe('Weekly sample list: the evidence for each verdict (v41.1 F29), now over the reader\'s rows', () => {
  beforeEach(resetSample)
  const firstRow = (check: string) => mock.MOCK_WEEKLY_SAMPLE.find((i) => i.check === check)!

  it('has the columns, a "How to judge" well above the table and the supervisor line on every content row', async () => {
    await openPage('cxmgr', { list: true })
    const table = screen.getAllByRole('table').at(-1)!
    for (const h of ['Agent and kind', 'What it saw', 'What it produced', 'Supervisor', 'Verdict']) expect(within(table).getByRole('columnheader', { name: h })).toBeInTheDocument()
    const well = document.querySelector('[data-slot="how-to-judge"]') as HTMLElement
    expect(well).toHaveTextContent('How to judge')
    expect(well).toHaveTextContent(/you are judging the agent/)
    expect(well.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(table).getAllByText('Schema, recompute, access, evidence, bilingual, risk gate: 6 of 6 passed')).toHaveLength(26)
  })

  it('a row reads what the agent saw and what it produced', async () => {
    await openPage('cxmgr', { list: true })
    const table = screen.getAllByRole('table').at(-1)!
    for (const check of ['fix', 'brief', 'journey']) {
      const row = firstRow(check)
      const tr = within(table).getAllByRole('row').find((r) => r.textContent?.includes(row.saw.en))!
      expect(tr, check).toBeDefined()
      expect(tr).toHaveTextContent(row.text.en.split(' → ')[0])
    }
  })

  it('the CX manager and the CX team get an Open button per row, named with the id; the CX team sees the customer name', async () => {
    await openPage('cxteam', { list: true })
    const fix = firstRow('fix')
    expect(screen.getByRole('button', { name: `Open ${fix.ref}` })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Open / })).toHaveLength(26)
    expect(screen.queryByText(/The record behind a row opens for the CX manager/)).not.toBeInTheDocument()
    const table = screen.getAllByRole('table').at(-1)!
    expect((await within(table).findAllByText(new RegExp(`· ${mock.MOCK_PERSONS[0].name}$`), {}, T)).length).toBeGreaterThan(0)
  })

  it('speaks Arabic: the card flow, the columns, the well and the evidence', async () => {
    renderWithProviders(<WeeklySample />, { role: 'cxmgr', lang: 'ar' })
    const card = await cardOf()
    expect(screen.getByText('فحص شغل الذكاء هذا الأسبوع')).toBeInTheDocument()
    expect(within(card).getByText('ما أُعطي للذكاء')).toBeInTheDocument()
    expect(within(card).getByRole('heading', { level: 4, name: 'هل هذا حل معقول لهذا النمط، وهل يذهب للشخص الصحيح؟' })).toBeInTheDocument()
    for (const name of ['نعم، كنت سأفعل الشيء نفسه', 'لا، هذا خطأ', 'لست متأكداً، تخطَّ الآن', 'افتح الحل']) expect(within(card).getByRole('button', { name })).toBeInTheDocument()
    expect(screen.getByTestId('sample-counter')).toHaveTextContent('فُحصت هذا الأسبوع')
    await userEvent.click(screen.getAllByRole('button', { name: 'عرض الكل كقائمة' })[0])
    const table = (await screen.findAllByRole('table', {}, T)).at(-1)!
    expect(screen.getByText('العينة الأسبوعية')).toBeInTheDocument()
    for (const h of ['الوكيل والنوع', 'ماذا رأى', 'ماذا أنتج', 'السوبرفايزر']) expect(within(table).getByRole('columnheader', { name: h })).toBeInTheDocument()
    expect(document.querySelector('[data-slot="how-to-judge"]')).toHaveTextContent('كيف تحكم')
    expect(within(table).getAllByText(firstRow('fix').saw.ar)[0]).toBeInTheDocument()
    expect((await screen.findAllByRole('button', { name: '✓ صح' }, T)).length).toBe(26)
  })
})

describe('the notes above the cards fold, and stay folded (a per-viewer convenience)', () => {
  beforeEach(resetSample)

  it('the title of a note is the button that folds it; the choice is remembered, and the page still works without storage', async () => {
    const first = renderWithProviders(<WeeklySample />, { role: 'cxmgr' })
    await cardOf()
    const toggle = screen.getByRole('button', { name: 'What this is, in one breath' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const text = screen.getByText(/The AI team is a new employee/)
    expect(text).toBeVisible()
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(text).not.toBeVisible()
    expect(screen.getByRole('button', { name: 'Your part of the sample: what the CX team can judge' })).toHaveAttribute('aria-expanded', 'true') // the other note is not affected
    first.unmount()

    renderWithProviders(<WeeklySample />, { role: 'cxmgr' })
    await cardOf()
    expect(screen.getByRole('button', { name: 'What this is, in one breath' })).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(screen.getByRole('button', { name: 'What this is, in one breath' }))
    expect(screen.getByText(/The AI team is a new employee/)).toBeVisible()
  })
})

describe('the card flow\'s "Open" buttons are for the CX team only (v41.1 F29)', () => {
  const signalRow = () => mock.MOCK_WEEKLY_SAMPLE.find((i) => i.check === 'classification')!

  it('a fix card offers "Open the fix", a signal card "Open the signal", a pattern or person card nothing; a role that cannot open gets nothing', async () => {
    const item = (over: Partial<WeeklySampleItem>): WeeklySampleItem => ({ ...mock.MOCK_WEEKLY_SAMPLE[0], verdict: null, ...over })
    const flow = (items: WeeklySampleItem[], canOpen: boolean) =>
      renderWithProviders(<SampleCardFlow items={items} canOpen={canOpen} personName={() => null} canReadText={false} onAnswer={() => {}} onList={() => {}} />, { role: 'cxmgr' })

    const fix = flow([item({})], true)
    expect(await screen.findByRole('button', { name: 'Open the fix' })).toBeInTheDocument()
    fix.unmount()

    const signal = flow([signalRow()], true)
    expect(await screen.findByRole('button', { name: 'Open the signal' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open the fix' })).not.toBeInTheDocument()
    signal.unmount()

    const pattern = flow([item({ check: 'count', open: { traceKind: 'pattern', id: 'PT-575' } })], true)
    await screen.findByTestId('sample-card')
    expect(screen.queryByRole('button', { name: /^Open the/ })).not.toBeInTheDocument()
    pattern.unmount()

    const person = flow([item({ check: 'journey', open: { to: '/customers/p-001' } })], true)
    await screen.findByTestId('sample-card')
    expect(screen.queryByRole('button', { name: /^Open the/ })).not.toBeInTheDocument()
    person.unmount()

    const audit = flow([item({})], false)
    await screen.findByTestId('sample-card')
    expect(screen.queryByRole('button', { name: /^Open the/ })).not.toBeInTheDocument()
    audit.unmount()
  })

  it('a quoted conversation text is dropped for a viewer who may not read it, and shown to one who may', async () => {
    const brief = mock.MOCK_WEEKLY_SAMPLE.find((i) => i.check === 'brief' && i.card.given.some((l) => l.restricted))!
    const flow = (canReadText: boolean) =>
      renderWithProviders(<SampleCardFlow items={[brief]} canOpen={false} personName={(id) => `Name of ${id}`} canReadText={canReadText} onAnswer={() => {}} onList={() => {}} />, { role: 'cxmgr' })
    const cannot = flow(false)
    expect(await screen.findByTestId('sample-card')).not.toHaveTextContent('Sample conversation note')
    expect(screen.getByTestId('sample-card')).toHaveTextContent(`Name of ${brief.personId}`)
    cannot.unmount()
    flow(true)
    expect(await screen.findByTestId('sample-card')).toHaveTextContent('Sample conversation note — visible to CX team and CX manager only.')
  })
})
