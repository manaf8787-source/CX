import { beforeAll, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router-dom'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import * as mock from '@/services/mockData'
import Signals from './Signals'

beforeAll(() => preferReducedMotion())

function SearchProbe() {
  return <div data-testid="search">{useLocation().search}</div>
}

const patternCards = () => Array.from(document.querySelectorAll<HTMLElement>('li[data-pattern]'))

describe('Signals page (v40 F11, F12, F16, F19, F32)', () => {
  it('lists the signals as rows: the date, and under it an SG button that opens the signal dialog (?sg=)', async () => {
    renderWithProviders(
      <>
        <Signals />
        <SearchProbe />
      </>,
      { route: '/actions/signals' },
    )
    const table = (await screen.findByRole('columnheader', { name: 'Date' }, { timeout: 5000 })).closest('table')!
    const row = within(table).getAllByRole('row')[1]
    const sg = within(row).getByRole('button', { name: /^Open (SG|PUB)-\d+$/ })
    await userEvent.click(sg)
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(/sg=(SG|PUB)-\d+/))
    // the first column holds the date and the id button
    expect(within(row).getAllByRole('cell')[0]).toContainElement(sg)
  })

  it('puts a grey PT tag before every pattern heading, not a button (you are already on the patterns)', async () => {
    renderWithProviders(<Signals />, { route: '/actions/signals' })
    await waitFor(() => expect(patternCards().length).toBe(4))
    for (const li of patternCards()) {
      const heading = within(li).getByRole('heading', { level: 3 })
      expect(heading.textContent).toMatch(/^PT-\d{3}/)
      expect(within(heading).queryByRole('button')).not.toBeInTheDocument()
    }
  })

  it('shows the fix a pattern already has with its CA id, as a link to that fix', async () => {
    renderWithProviders(<Signals />, { route: '/actions/signals' })
    await waitFor(() => expect(patternCards().length).toBe(4))
    const link = await screen.findAllByRole('link', { name: /Address slow response in Dubai team/ })
    expect(link[0]).toHaveAttribute('href', expect.stringMatching(/^\/actions\/corrective\?fix=CA-2\d\d$/))
  })

  it('opens the list on the pattern named by ?pt= when it sits past the first four, and selects it', async () => {
    const hidden = mock.MOCK_PATTERNS.find((p) => !p.hasMinimumSample)!
    renderWithProviders(<Signals />, { route: `/actions/signals?pt=${encodeURIComponent(hidden.id)}#patterns` })
    await waitFor(() => expect(patternCards().length).toBeGreaterThan(4), { timeout: 5000 })
    const selected = patternCards().filter((li) => li.dataset.selected === 'true')
    expect(selected).toHaveLength(1)
    expect(selected[0].dataset.pattern).toBe(hidden.traceId)
    expect(screen.getByRole('button', { name: 'Show fewer patterns' })).toBeInTheDocument()
  })

  it('the hand-offs are no longer here: they sit under the fixes tab', async () => {
    renderWithProviders(<Signals />, { route: '/actions/signals' })
    await screen.findByRole('columnheader', { name: 'Date' }, { timeout: 5000 })
    expect(screen.queryByText('Hand-off rules by signal type')).not.toBeInTheDocument()
    expect(screen.queryByText('One-customer corrections handed to other systems')).not.toBeInTheDocument()
  })

  it('lists the public mentions by their PUB id, with no link to any person', async () => {
    renderWithProviders(<Signals />, { route: '/actions/signals' })
    const heading = await screen.findByText('Public mentions', { selector: '[data-slot="card-title"]' }, { timeout: 5000 })
    const section = heading.closest('[data-slot="card"]') as HTMLElement
    const pubs = await within(section).findAllByRole('button', { name: /^Open PUB-3\d\d$/ })
    expect(pubs.length).toBeGreaterThan(0)
    expect(section.querySelector('a[href*="/customers"]')).toBeNull()
  })

  it('ends with the Rules pointer and the What if card (a Rules section)', async () => {
    renderWithProviders(<Signals />, { route: '/actions/signals' })
    expect(await screen.findByText('One place for every threshold.', {}, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/settings/rules')
    expect(await screen.findByText('What if')).toBeInTheDocument()
    expect(document.getElementById('rules')).not.toBeNull()
    expect(document.getElementById('patterns')).not.toBeNull()
  })

  it('reads in Arabic', async () => {
    renderWithProviders(<Signals />, { route: '/actions/signals', lang: 'ar' })
    expect(await screen.findByText('مكان واحد لكل عتبة.', {}, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByText('ماذا لو')).toBeInTheDocument()
  })
})
