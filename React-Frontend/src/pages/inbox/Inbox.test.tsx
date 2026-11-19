import { beforeAll, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import Inbox from './Inbox'

beforeAll(() => preferReducedMotion())

const table = () => screen.findByRole('table', {}, { timeout: 8000 })
const bodyRows = (t: HTMLElement) => within(t).getAllByRole('row').slice(1)

describe('My inbox page (v40 F20)', () => {
  it('shows the title, the intro, the columns Due, What, With and the rules footer', async () => {
    renderWithProviders(<Inbox />, { role: 'cxmgr' })
    expect(screen.getByRole('heading', { level: 1, name: 'My inbox' })).toBeInTheDocument()
    expect(screen.getByText(/Everything that is on you, ordered by urgency/)).toBeInTheDocument()
    const t = await table()
    for (const name of ['Due', 'What', 'With']) expect(within(t).getByRole('columnheader', { name })).toBeInTheDocument()
    expect(screen.getByText('Approval window: 5 working days. Verification at 60 days. Changed under Settings → Rules as configuration.')).toBeInTheDocument()
    expect(screen.getByText(/Working days count Monday to Friday\./)).toBeInTheDocument()
  })

  it('lists the rows by urgency with a day chip, the date it falls due, the priority and a link to the record', async () => {
    renderWithProviders(<Inbox />, { role: 'cxmgr' })
    const rows = bodyRows(await table())
    expect(rows.length).toBeGreaterThan(4)
    const priorities = rows.map((r) => Number(r.getAttribute('data-priority')))
    expect(priorities).toEqual([...priorities].sort((a, b) => b - a))
    // A dated row: chip text plus a date; an undated row (an investigation) shows a dash.
    const dated = rows.find((r) => /days? left|today|late|overdue/.test(r.textContent ?? ''))!
    expect(within(dated).getByText(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/)).toBeInTheDocument()
    const inv = rows.find((r) => r.getAttribute('data-kind') === 'inv')!
    expect(within(inv).getByLabelText('No date')).toBeInTheDocument()
    // The urgent badge and the link target.
    expect(screen.getAllByText(/^(Most urgent|Urgent)$/).length).toBeGreaterThan(0)
    const link = within(rows[0]).getByRole('link', { name: /Open/ })
    expect(link.getAttribute('href')).toMatch(/^\/(actions|close-the-loop)/)
  })

  it('counts approvals and calls in working days and fix dates in calendar days', async () => {
    renderWithProviders(<Inbox />, { role: 'cxmgr' })
    const rows = bodyRows(await table())
    const approve = rows.find((r) => r.getAttribute('data-kind') === 'approve')
    const call = rows.find((r) => r.getAttribute('data-kind') === 'call')
    if (approve) expect(approve.textContent).toMatch(/working days? (left|late)|today/)
    if (call) expect(call.textContent).toMatch(/working days? (left|late)|today|overdue/)
    const doRow = rows.find((r) => r.getAttribute('data-kind') === 'do')
    if (doRow) expect(doRow.textContent).not.toMatch(/working days/)
  })

  it('says where the first row sits on the six steps and what happens next', async () => {
    renderWithProviders(<Inbox />, { role: 'cxmgr' })
    await table()
    const box = screen.getByRole('region', { name: 'Next step' })
    expect(within(box).getByText('Next step:')).toBeInTheDocument()
    expect(screen.getByText('For your first row')).toBeInTheDocument()
    expect(within(box).getAllByRole('link').filter((l) => l.getAttribute('aria-current') === 'step')).toHaveLength(1)
  })

  it('gives the Internal Audit and Marketing Lead the weekly sample row, linked to the sample page, and no next-step box', async () => {
    renderWithProviders(<Inbox />, { role: 'auditmkt' })
    const rows = bodyRows(await table())
    // v42.1 (F33): the two campaign audit rows come with it, "Clear or send back" first (urgent) and "Audit after the run" last
    expect(rows).toHaveLength(3)
    const sample = rows.find((r) => /Weekly sample: \d+ outputs to read, 0 read/.test(r.textContent ?? ''))!
    expect(sample).toBeDefined()
    expect(within(sample).getByRole('link', { name: /Open/ })).toHaveAttribute('href', '/settings/weekly-sample')
    expect(screen.queryByRole('region', { name: 'Next step' })).not.toBeInTheDocument()
  })

  it('gives the Internal Audit and Marketing Lead "Clear or send back" (urgent, two working days) and "Audit after the run", both opening the Campaign audit', async () => {
    renderWithProviders(<Inbox />, { role: 'auditmkt' })
    const rows = bodyRows(await table())
    expect(rows.map((r) => r.getAttribute('data-kind'))).toEqual(['caud', 'sample', 'caud2'])
    const [clear, , after] = rows
    expect(clear).toHaveAttribute('data-priority', '2')
    expect(clear.textContent).toMatch(/Clear or send back: 2 campaigns waiting before they run/)
    expect(clear.textContent).toMatch(/Most urgent/)
    expect(clear.textContent).toMatch(/2 working days left/)
    expect(clear.textContent).toMatch(/Marketing manager/)
    expect(within(clear).getByRole('link', { name: /Open/ })).toHaveAttribute('href', '/settings/campaign-audit')
    expect(after).toHaveAttribute('data-priority', '0')
    expect(after.textContent).toMatch(/Audit after the run: 2 finished campaigns/)
    expect(after.textContent).toMatch(/5 working days left/)
    expect(within(after).getByRole('link', { name: /Open/ })).toHaveAttribute('href', '/settings/campaign-audit')
    // both rows are in the table
    expect(document.querySelectorAll('[data-kind="caud"], [data-kind="caud2"]')).toHaveLength(2)
  })

  it('shows the campaign rows in Arabic with their agreement in number', async () => {
    renderWithProviders(<Inbox />, { role: 'auditmkt', lang: 'ar' })
    const rows = bodyRows(await table())
    expect(rows[0].textContent).toMatch(/إجازة أو إعادة: حملتان تنتظران قبل التشغيل/)
    expect(rows[2].textContent).toMatch(/تدقيق بعد التشغيل: حملتان انتهتا/)
  })

  it('shows "Nothing on you today." for a role with nothing on it', async () => {
    renderWithProviders(<Inbox />, { role: 'marketing' })
    expect(await screen.findByText('Nothing on you today.', {}, { timeout: 8000 })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('never lists a customer call or an investigation for a role outside CX', async () => {
    renderWithProviders(<Inbox />, { role: 'teamlead' })
    await screen.findByRole('table', {}, { timeout: 8000 })
    expect(document.querySelectorAll('[data-kind="call"]')).toHaveLength(0)
    expect(document.querySelectorAll('[data-kind="inv"]')).toHaveLength(0)
  })

  it('speaks Arabic', async () => {
    renderWithProviders(<Inbox />, { role: 'cxmgr', lang: 'ar' })
    expect(document.documentElement.dir).toBe('rtl')
    expect(screen.getByRole('heading', { level: 1, name: 'صندوقي' })).toBeInTheDocument()
    const t = await table()
    expect(within(t).getByRole('columnheader', { name: 'المهلة' })).toBeInTheDocument()
    expect(screen.getByText('الخطوة التالية:')).toBeInTheDocument()
    expect(screen.getByText(/نافذة الاعتماد: 5 أيام عمل/)).toBeInTheDocument()
    expect(screen.getByText(/أيام العمل تُحسب من/)).toBeInTheDocument()
  })
})
