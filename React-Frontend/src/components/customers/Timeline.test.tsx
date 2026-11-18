import { beforeAll, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router-dom'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import * as mock from '@/services/mockData'
import type { Interaction, RoleId } from '@/types'
import { Timeline } from './Timeline'

beforeAll(() => preferReducedMotion())

function SearchProbe() {
  return <div data-testid="search">{useLocation().search}</div>
}

const base: Omit<Interaction, 'id' | 'channel' | 'text'> = {
  personKey: 'p1',
  sourceRef: 'r',
  direction: 'inbound',
  occurredAt: '2026-11-10T09:00:00Z',
  product: 're',
  environment: 'Dubai',
  envId: 'dub',
  language: 'en',
  problemFlags: [],
}
const interactions: Interaction[] = [
  { ...base, id: 'w', channel: 'whatsapp', text: 'SECRET-CHAT-TEXT' },
  { ...base, id: 'c', channel: 'call', occurredAt: '2026-11-11T09:00:00Z', text: 'SECRET-CALL-TRANSCRIPT' },
]

const renderAs = (role: RoleId) => renderWithProviders(<Timeline interactions={interactions} />, { role })

describe('Timeline role gating (NFR-2, FR-2.9)', () => {
  it.each<RoleId>(['cxmgr', 'cxteam'])('%s sees conversation text', (role) => {
    renderAs(role)
    expect(screen.getByText('SECRET-CHAT-TEXT')).toBeInTheDocument()
  })

  it.each<RoleId>(['exec', 'envmgmt', 'teamlead', 'marketing', 'hrmgr', 'auditmkt'])('%s never sees conversation text', (role) => {
    renderAs(role)
    expect(screen.queryByText('SECRET-CHAT-TEXT')).not.toBeInTheDocument()
  })

  it('never shows a call transcript, even to the CX manager', () => {
    renderAs('cxmgr')
    expect(screen.queryByText('SECRET-CALL-TRANSCRIPT')).not.toBeInTheDocument()
  })
})

describe('Timeline trace ids (v40 F12)', () => {
  // A person's real events from the sample: at least one of them produced a signal.
  const signal = mock.MOCK_SIGNALS.find((s) => !s.isPublic && s.personId && s.eventIds.length > 0)!
  const personEvents = mock.MOCK_INTERACTIONS.filter((i) => i.personKey === signal.personId)
  const eventId = signal.eventIds[0]
  const evDisplay = `EV-${Number(eventId.replace(/\D/g, ''))}`
  const sgDisplay = `SG-${Number(signal.id.replace(/\D/g, ''))}`

  it('gives every row a grey EV tag, and the event that produced a signal an SG button', async () => {
    renderWithProviders(<Timeline interactions={personEvents} />, { route: `/customers/${signal.personId}` })
    const row = await waitFor(() => {
      const el = document.querySelector<HTMLElement>(`li[data-ev="${evDisplay}"]`)
      expect(el).not.toBeNull()
      return el!
    })
    // every row has its EV tag (plain, not a button)
    for (const i of personEvents) {
      const li = document.querySelector<HTMLElement>(`li[data-ev="EV-${Number(i.id.replace(/\D/g, ''))}"]`)
      expect(li, i.id).not.toBeNull()
      expect(within(li!).queryByRole('button', { name: /^Open EV-/ })).not.toBeInTheDocument()
    }
    // the signal button appears once the signals have loaded, and is a real button
    const sg = await within(row).findByRole('button', { name: `Open ${sgDisplay}` })
    expect(sg).toBeInTheDocument()
  })

  it('opens the signal dialog from the SG button: the URL gains ?sg=', async () => {
    renderWithProviders(
      <>
        <Timeline interactions={personEvents} />
        <SearchProbe />
      </>,
      { route: `/customers/${signal.personId}` },
    )
    await userEvent.click(await screen.findByRole('button', { name: `Open ${sgDisplay}` }))
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(`sg=${sgDisplay}`))
  })

  it('highlights and scrolls to the row named by ?ev=', async () => {
    renderWithProviders(<Timeline interactions={personEvents} />, { route: `/customers/${signal.personId}?ev=${evDisplay}` })
    await waitFor(() => expect(document.querySelector(`li[data-ev="${evDisplay}"]`)).toHaveAttribute('data-highlighted', 'true'))
    expect(document.querySelectorAll('li[data-highlighted="true"]')).toHaveLength(1)
  })

  it('each row is an anchor (id EV-n), and the target row takes focus and is announced politely', async () => {
    renderWithProviders(<Timeline interactions={personEvents} />, { route: `/customers/${signal.personId}?ev=${evDisplay}` })
    const row = await waitFor(() => {
      const el = document.getElementById(evDisplay)
      expect(el).not.toBeNull()
      return el as HTMLElement
    })
    expect(row.tagName).toBe('LI')
    await waitFor(() => expect(row).toHaveFocus())
    expect(row).toHaveAttribute('tabindex', '-1')
    const live = screen.getByTestId('timeline-live')
    expect(live).toHaveAttribute('aria-live', 'polite')
    expect(live).toHaveTextContent(`Event ${evDisplay} is highlighted in the timeline.`)
    // Other rows are anchors but not tab stops.
    const other = personEvents.map((i) => document.getElementById(`EV-${Number(i.id.replace(/\D/g, ''))}`)).find((el) => el && el !== row)
    if (other) expect(other).not.toHaveAttribute('tabindex')
  })

  it('announces nothing without ?ev=', async () => {
    renderWithProviders(<Timeline interactions={personEvents} />, { route: `/customers/${signal.personId}` })
    await screen.findAllByRole('listitem')
    expect(screen.getByTestId('timeline-live')).toBeEmptyDOMElement()
  })

  it('highlights nothing when ?ev= names an event of another person', async () => {
    renderWithProviders(<Timeline interactions={personEvents} />, { route: `/customers/${signal.personId}?ev=EV-99999` })
    await screen.findAllByRole('listitem')
    expect(document.querySelectorAll('li[data-highlighted="true"]')).toHaveLength(0)
  })
})
