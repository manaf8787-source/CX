import { vi, beforeAll, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import * as mock from '@/services/mockData'
import { PUBLIC_MENTIONS } from '@/data/v38Reference'
import Feeds from './Feeds'
import CrmMapping from './CrmMapping'
import SurveyQuestions from './SurveyQuestions'
import PublicMentions from './PublicMentions'
import WeeklySample from './WeeklySample'

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

describe('Weekly sample (v40 F31)', () => {
  it('shows fifty outputs, four tiles, and the Thursday due date', async () => {
    renderWithProviders(<WeeklySample />, { role: 'cxmgr' })
    await screen.findByText('0 / 50', {}, T)
    for (const tile of ['Read', 'Wrong (each becomes a test)', 'Accuracy this week', 'Due (every Thursday)']) expect(screen.getByText(tile)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '✓ Right' })).toHaveLength(50)
    expect(screen.queryByText('[Proposed]', { selector: 'span' })).toBeInTheDocument() // the pass-rate formula, not the page
    const header = screen.getByText('Weekly sample').closest('div')!
    expect(within(header).queryByText('[Proposed]')).not.toBeInTheDocument()
    const due = mock.MOCK_WEEKLY_SAMPLE_SIZE
    expect(due).toBe(50)
  })

  it('judges one wrong: the Wrong tile counts it, a supervisor test appears and the agent pass rate drops', async () => {
    renderWithProviders(<WeeklySample />, { role: 'cxteam' })
    await screen.findByText('0 / 50', {}, T)
    const row = screen.getAllByRole('button', { name: '✗ Wrong' })[0].closest('tr')!
    const agentChip = within(row).getByText(/^Agent \d/)
    const agentNo = Number(/Agent (\d+)/.exec(agentChip.textContent!)![1])
    await userEvent.click(within(row).getByRole('button', { name: '✗ Wrong' }))
    await screen.findByText('1 / 50', {}, T)
    expect(screen.getByText('Wrong → new test')).toBeInTheDocument()
    expect(await screen.findByText(/New supervisor tests \(1\)/)).toBeInTheDocument()
    const rates = within(screen.getByText('Pass rate this week').closest('[data-slot="card"]') as HTMLElement)
    const rateRow = rates.getAllByRole('row').find((r) => new RegExp(`Agent ${agentNo}\\b`).test(r.textContent ?? ''))!
    expect(rateRow).toHaveTextContent(/\d+% → \d+%/)
    expect(mock.MOCK_SUPERVISOR_TESTS.some((t) => t.agent === agentNo)).toBe(true)
  })

  it('the Internal Audit and Marketing Lead judges, and sees references, not customer names', async () => {
    renderWithProviders(<WeeklySample />, { role: 'auditmkt' })
    await screen.findByText(/\/ 50$/, {}, T)
    expect(screen.getAllByRole('button', { name: '✓ Right' }).length).toBeGreaterThan(0)
    const table = screen.getAllByRole('table').at(-1)!
    expect((await within(table).findAllByText(/· P-\d{3}$/, {}, T)).length).toBeGreaterThan(0)
    for (const n of new Set(mock.MOCK_PERSONS.map((p) => p.name))) expect(within(table).queryByText(new RegExp(`· ${n}$`))).not.toBeInTheDocument()
    expect(screen.getByText(/No customer names are shown to this role/)).toBeInTheDocument()
  })

  it('the CX team sees the customer name beside an output about a person', async () => {
    renderWithProviders(<WeeklySample />, { role: 'cxteam' })
    await screen.findByText(/\/ 50$/, {}, T)
    const table = screen.getAllByRole('table').at(-1)!
    const n = mock.MOCK_PERSONS[0].name
    expect((await within(table).findAllByText(new RegExp(`· ${n}$`), {}, T)).length).toBeGreaterThan(0)
  })

  it('the Executive reads: no verdict buttons, a view-only note', async () => {
    renderWithProviders(<WeeklySample />, { role: 'exec' })
    await screen.findByText(/\/ 50$/, {}, T)
    expect(screen.queryByRole('button', { name: '✓ Right' })).not.toBeInTheDocument()
    expect(screen.getByText(/You can read the sample/)).toBeInTheDocument()
  })

  it('speaks Arabic', async () => {
    renderWithProviders(<WeeklySample />, { role: 'cxmgr', lang: 'ar' })
    expect(await screen.findByText('العينة الأسبوعية', {}, T)).toBeInTheDocument()
    expect((await screen.findAllByRole('button', { name: '✓ صح' }, T)).length).toBeGreaterThan(0)
  })
})
