import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import * as mock from '@/services/mockData'

const downloadCsv = vi.fn()
vi.mock('@/utils/csv', () => ({ downloadCsv: (...a: unknown[]) => downloadCsv(...a) }))

import { CustomerList } from './CustomerList'

// Pages load their sample after a short delay and a full run is busy: give a test room.
vi.setConfig({ testTimeout: 20_000 })

beforeAll(() => {
  preferReducedMotion()
  // Radix Select in jsdom.
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
})
beforeEach(() => downloadCsv.mockClear())

const loaded = async () => {
  await screen.findByText('30 people', {}, { timeout: 8000 })
}
const firstPerson = mock.MOCK_PERSONS[4] // p-005, DNCR in the sample

describe('Everyone on record (v40 F29)', () => {
  it('lists everyone with the eight columns, a link per person and the count', async () => {
    renderWithProviders(<CustomerList />, { role: 'cxmgr' })
    await loaded()
    for (const h of ['Person', 'Type', 'Environment', 'Source', 'Product', 'Last contact', 'Problems', 'Drifting']) {
      expect(screen.getByRole('columnheader', { name: new RegExp(`^${h}`) })).toBeInTheDocument()
    }
    expect(screen.getByText('Everyone on record')).toBeInTheDocument()
    expect(screen.getByText('Browse instead of search. Filter, then open a person or export the list for a call round or a campaign.')).toBeInTheDocument()
    const link = screen.getAllByRole('link').find((l) => l.getAttribute('href')?.startsWith('/customers/'))!
    expect(link.getAttribute('href')).toMatch(/^\/customers\/p-\d{3}$/)
  })

  it('filters by type and by source, and the count follows', async () => {
    renderWithProviders(<CustomerList />, { role: 'cxmgr' })
    await loaded()
    const buyers = mock.MOCK_PERSONS.filter((p) => p.segment === 'buyer').length
    await userEvent.click(screen.getByRole('combobox', { name: 'Type' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Buyer' }))
    expect(await screen.findByText(`${buyers} people`)).toBeInTheDocument()
    const fromApp = mock.MOCK_PERSONS.filter((p) => p.segment === 'buyer' && p.sourceOfLead === 'website').length
    await userEvent.click(screen.getByRole('combobox', { name: 'Source' }))
    await userEvent.click(await screen.findByRole('option', { name: 'PSI Website' }))
    expect(await screen.findByText(`${fromApp} people`)).toBeInTheDocument()
  })

  it('searches by name for a role that may see names, by reference for the Internal Audit and Marketing Lead', async () => {
    const { unmount } = renderWithProviders(<CustomerList />, { role: 'cxmgr' })
    await loaded()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search this list' }), firstPerson.name)
    await waitFor(() => expect(screen.getAllByRole('link', { name: firstPerson.name }).length).toBeGreaterThan(0))
    unmount()

    renderWithProviders(<CustomerList />, { role: 'auditmkt' })
    await loaded()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search this list' }), firstPerson.name)
    // A name finds nobody: the role sees references only.
    expect(await screen.findByText(/No match for/)).toBeInTheDocument()
    await userEvent.clear(screen.getByRole('searchbox', { name: 'Search this list' }))
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search this list' }), 'p-005')
    expect(await screen.findByRole('link', { name: 'P-005' })).toBeInTheDocument()
  })

  it('shows names to the CX manager and only references (P-005) to the Internal Audit and Marketing Lead', async () => {
    const { unmount } = renderWithProviders(<CustomerList />, { role: 'cxmgr' })
    await loaded()
    expect(screen.getAllByRole('link').some((l) => mock.MOCK_PERSONS.some((p) => p.name === l.textContent))).toBe(true)
    unmount()

    renderWithProviders(<CustomerList />, { role: 'auditmkt' })
    await loaded()
    const personLinks = screen.getAllByRole('link').filter((l) => l.getAttribute('href')?.startsWith('/customers/'))
    expect(personLinks.length).toBeGreaterThan(0)
    for (const l of personLinks) expect(l.textContent).toMatch(/^P-\d{3}$/)
    expect(screen.getByText(/Names and mobiles are not shown to this role/)).toBeInTheDocument()
  })

  it('exports the filtered rows with the mobile for a role that sees names, and without it for the Internal Audit and Marketing Lead', async () => {
    const { unmount } = renderWithProviders(<CustomerList />, { role: 'cxteam' })
    await loaded()
    await userEvent.click(screen.getByRole('button', { name: 'Export list (CSV)' }))
    expect(downloadCsv).toHaveBeenCalledTimes(1)
    const [file, rows] = downloadCsv.mock.calls[0] as [string, Record<string, string>[]]
    expect(file).toMatch(/\.csv$/)
    expect(rows).toHaveLength(30)
    expect(Object.keys(rows[0])).toEqual(['Person', 'Mobile', 'Type', 'Environment', 'Source', 'Last contact'])
    expect(rows[0].Mobile).toMatch(/^\+/)
    unmount()

    downloadCsv.mockClear()
    renderWithProviders(<CustomerList />, { role: 'auditmkt' })
    await loaded()
    await userEvent.click(screen.getByRole('button', { name: 'Export list (CSV)' }))
    const [, audit] = downloadCsv.mock.calls[0] as [string, Record<string, string>[]]
    expect(Object.keys(audit[0])).toEqual(['Person', 'Type', 'Environment', 'Source', 'Last contact'])
    expect(audit.every((r) => /^P-\d{3}$/.test(r.Person))).toBe(true)
  })

  it('a role fixed to one environment sees a chip, not the environment filter', async () => {
    renderWithProviders(<CustomerList />, { role: 'envmgmt' })
    const table = await screen.findByRole('table', {}, { timeout: 8000 })
    expect(screen.queryByRole('combobox', { name: 'Environment' })).not.toBeInTheDocument()
    expect(screen.getByText(/Scoped to your environment:/)).toBeInTheDocument()
    // Only the environment of the role: Dubai (45% of the sample).
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) expect(r).toHaveTextContent('Dubai')
  })

  it('speaks Arabic', async () => {
    renderWithProviders(<CustomerList />, { role: 'cxmgr', lang: 'ar' })
    expect(await screen.findByText('30 شخصاً', {}, { timeout: 8000 })).toBeInTheDocument()
    expect(screen.getByText('كل من في السجل')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تصدير القائمة (CSV)' })).toBeInTheDocument()
  })
})
