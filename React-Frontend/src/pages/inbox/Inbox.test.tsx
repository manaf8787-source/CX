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
    expect(rows).toHaveLength(1)
    expect(rows[0].textContent).toMatch(/Weekly sample: 50 outputs to read, 0 read/)
    expect(within(rows[0]).getByRole('link', { name: /Open/ })).toHaveAttribute('href', '/settings/weekly-sample')
    expect(screen.queryByRole('region', { name: 'Next step' })).not.toBeInTheDocument()
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
