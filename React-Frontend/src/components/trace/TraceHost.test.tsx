import { beforeAll, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router-dom'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import * as mock from '@/services/mockData'
import { TraceHost } from './TraceHost'

beforeAll(() => preferReducedMotion())

const display = (id: string) => `SG-${Number(id.replace(/\D/g, ''))}`
function SearchProbe() {
  return <div data-testid="search">{useLocation().search}</div>
}

describe('TraceHost (v40 F11)', () => {
  it('is free on every page: with no ?sg= it renders nothing and runs no query', () => {
    const { client } = renderWithProviders(<TraceHost />, { route: '/home' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(client.getQueryCache().getAll()).toHaveLength(0)
  })

  it('opens the signal dialog from ?sg= with its display id, and closes with Escape', async () => {
    const complaint = mock.MOCK_SIGNALS.find((s) => s.kind === 'complaint')!
    renderWithProviders(<TraceHost />, { route: `/home?sg=${display(complaint.id)}` })
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent(display(complaint.id))
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('says so for an unknown signal instead of failing', async () => {
    renderWithProviders(<TraceHost />, { route: '/home?sg=SG-99999' })
    expect(await screen.findByText('Signal not found')).toBeInTheDocument()
  })

  it('opens a public mention by its PUB id', async () => {
    const pub = mock.MOCK_SIGNALS.find((s) => s.kind === 'public_mention')!
    renderWithProviders(<TraceHost />, { route: `/home?sg=${pub.id}` })
    expect(await screen.findByRole('dialog')).toHaveTextContent(pub.id)
  })
})

describe('signal detail dialog content (v40 F11, F12)', () => {
  const complaint = mock.MOCK_SIGNALS.find((s) => s.kind === 'complaint' && s.agentRef && s.eventIds.length > 0)!
  const sg = display(complaint.id)

  it('titles it SG-n · category, states who classified and counted it, and carries the Trace card of the signal', async () => {
    renderWithProviders(<TraceHost />, { route: `/home?sg=${sg}` })
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByRole('heading', { level: 2, name: new RegExp(`^${sg} · `) })).toBeInTheDocument()
    expect(dialog).toHaveTextContent(/Classified by Agent 2 as .+\. Counted by Agent 3; it is worked only through the pattern it belongs to, never alone\./)
    const card = await within(dialog).findByTestId('trace-card')
    // the signal's own column is the highlighted one, and it lists this signal
    const columns = within(card).getAllByRole('listitem')
    expect(columns[1]).toHaveAttribute('aria-current', 'true')
    expect(columns[1]).toHaveTextContent(sg)
    expect(within(columns[0]).getAllByRole('button').length).toBeGreaterThan(0)
  })

  it('shows chips for the type, the environment and the product', async () => {
    renderWithProviders(<TraceHost />, { route: `/home?sg=${sg}` })
    const group = await screen.findByRole('group', { name: 'Signal details' })
    expect(group).toHaveTextContent('Complaint')
    expect(group).toHaveTextContent(/Dubai|Abu Dhabi|PSI Assets/)
    expect(group).toHaveTextContent(complaint.occurredAt.slice(0, 10))
  })

  it('names the agent only for a role that may see names', async () => {
    const entry = mock.MOCK_AGENT_DIRECTORY.find((d) => d.agentRef === complaint.agentRef)!
    const { unmount } = renderWithProviders(<TraceHost />, { route: `/home?sg=${sg}`, role: 'cxmgr' })
    const group = await screen.findByRole('group', { name: 'Signal details' })
    await waitFor(() => expect(group).toHaveTextContent(entry.displayName))
    unmount()
    renderWithProviders(<TraceHost />, { route: `/home?sg=${sg}`, role: 'marketing' })
    const other = await screen.findByRole('group', { name: 'Signal details' })
    await new Promise((r) => setTimeout(r, 300))
    expect(other).not.toHaveTextContent(entry.displayName)
  })

  it('a public mention names no person and has no event to open', async () => {
    const pub = mock.MOCK_SIGNALS.find((s) => s.kind === 'public_mention')!
    renderWithProviders(<TraceHost />, { route: `/home?sg=${pub.id}` })
    const dialog = await screen.findByRole('dialog')
    const card = await within(dialog).findByTestId('trace-card')
    const events = within(card).getAllByRole('listitem')[0]
    expect(events).toHaveTextContent('public mention, no person identified')
    expect(within(events).queryByRole('button')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('group', { name: 'Signal details' })).toHaveTextContent('No person identified')
    expect(dialog.querySelector('a[href*="/customers/"]')).toBeNull()
  })

  it('walks on: the pattern id in the Trace card opens the Signals page on that pattern, and the dialog closes', async () => {
    const pattern = mock.MOCK_PATTERNS[0]
    const first = mock.MOCK_SIGNALS.find((s) => pattern.signalIds.includes(s.id) && !s.isPublic)!
    renderWithProviders(
      <>
        <TraceHost />
        <SearchProbe />
      </>,
      { route: `/home?sg=${display(first.id)}` },
    )
    const dialog = await screen.findByRole('dialog')
    const card = await within(dialog).findByTestId('trace-card')
    const ptButton = await within(within(card).getAllByRole('listitem')[2]).findByRole('button', { name: /PT-\d{3}/ })
    await userEvent.click(ptButton)
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('pt='))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('reads in Arabic', async () => {
    renderWithProviders(<TraceHost />, { route: `/home?sg=${sg}`, lang: 'ar' })
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('صنّفه الوكيل 2 كـ')
    expect(await within(dialog).findByRole('heading', { name: 'الأثر' })).toBeInTheDocument()
  })
})
