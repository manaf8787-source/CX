import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import * as mock from '@/services/mockData'
import CloseTheLoop from './CloseTheLoop'

// Pages load their sample after a short delay and a full run is busy: give a test room.
vi.setConfig({ testTimeout: 20_000 })

beforeAll(() => preferReducedMotion())

const openRows = () => mock.MOCK_DETRACTOR_CALL_ITEMS.filter((i) => i.status !== 'done')
const nameOf = (personId: string) => mock.MOCK_PERSONS.find((p) => p.id === personId)!.name
const ready = () => screen.findByRole('table', {}, { timeout: 8000 })
const tries = () => mock.MOCK_RULES_CONFIG.find((i) => i.id === 'rule_call_tries')!

const original = { tries: 0 }
afterEach(() => {
  if (original.tries) tries().value = original.tries
  original.tries = 0
})

describe('Close the loop: calling rules (v40 F27)', () => {
  it('says when calls may be made, how many attempts, the following working day and the WhatsApp after the last, with the hours note and no [Proposed] badge', async () => {
    renderWithProviders(<CloseTheLoop />, { role: 'cxmgr', route: '/close-the-loop' })
    await ready()
    const rules = screen.getByTestId('calling-rules')
    expect(rules).toHaveTextContent('Calls only between 09:00 and 18:00 UAE time, up to 3 attempts, the next one the following working day.')
    expect(rules).toHaveTextContent('After the last attempt a WhatsApp message goes out and the person is marked "needs a human" for the CX manager.')
    expect(within(rules).getByText(/Legal to confirm the hours/)).toBeInTheDocument()
    expect(within(rules).queryByText('[Proposed]')).not.toBeInTheDocument()
    expect(rules).toHaveTextContent('A campaign hands over to a person after 2 no-answers.')
  })

  it('reads the number of attempts from the configuration', async () => {
    original.tries = tries().value as number
    tries().value = 4
    renderWithProviders(<CloseTheLoop />, { role: 'cxmgr', route: '/close-the-loop' })
    await ready()
    expect(screen.getByTestId('calling-rules')).toHaveTextContent('up to 4 attempts')
  })

  it('shows "attempt n+1 of 3 · next {date}" on a row with an attempt, and "Needs a human" after the last', async () => {
    renderWithProviders(<CloseTheLoop />, { role: 'cxmgr', route: '/close-the-loop' })
    const table = await ready()
    const withAttempt = mock.MOCK_DETRACTOR_CALL_ITEMS.find((i) => i.status === 'no_answer')!
    expect(withAttempt.attempts).toBeGreaterThanOrEqual(1)
    expect(within(table).getAllByText(new RegExp(`attempt ${withAttempt.attempts + 1} of 3 · next`)).length).toBeGreaterThan(0)
    expect(within(table).getAllByText('Needs a human').length).toBeGreaterThan(0)
    // A row that needs a human has no "No answer" button left: it is a human's call now.
    const needsHuman = within(table).getAllByText('Needs a human')[0].closest('tr')!
    expect(within(needsHuman).queryByRole('button', { name: 'No answer' })).not.toBeInTheDocument()
    expect(within(needsHuman).getByRole('button', { name: 'Call' })).toBeInTheDocument()
  })

  it('never lists a DNCR person', async () => {
    renderWithProviders(<CloseTheLoop />, { role: 'cxmgr', route: '/close-the-loop' })
    const table = await ready()
    const dncr = mock.MOCK_PERSONS.filter((p) => p.consent.dncr)
    expect(dncr.length).toBeGreaterThan(0)
    for (const p of dncr) expect(within(table).queryByText(p.name)).not.toBeInTheDocument()
    expect(screen.getByTestId('calling-rules')).toHaveTextContent('DNCR: no calls, no surveys by call.')
  })

  it('"No answer" adds an attempt, sets the next attempt to the following working day and shows it', async () => {
    const target = openRows().find((i) => i.status === 'to_do')!
    expect(target.attempts).toBe(0)
    renderWithProviders(<CloseTheLoop />, { role: 'cxmgr', route: `/close-the-loop?item=${target.id}` })
    await ready()
    const focus = screen.getByRole('region', { name: 'From your inbox' })
    expect(within(focus).getByText(nameOf(target.personId))).toBeInTheDocument()
    await userEvent.click(within(focus).getByRole('button', { name: 'No answer' }))
    await waitFor(() => expect(mock.MOCK_DETRACTOR_CALL_ITEMS.find((i) => i.id === target.id)!.attempts).toBe(1))
    const after = mock.MOCK_DETRACTOR_CALL_ITEMS.find((i) => i.id === target.id)!
    expect(after.status).toBe('no_answer')
    expect(after.nextAttemptOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    // The next attempt is a working day (Monday to Friday), never a weekend.
    const day = new Date(`${after.nextAttemptOn}T00:00:00`).getDay()
    expect([1, 2, 3, 4, 5]).toContain(day)
    expect(await within(focus).findByText(/attempt 2 of 3 · next/)).toBeInTheDocument()
  })

  it('opens a row from the inbox with its actions; the reason is not coded until the call', async () => {
    const target = openRows().find((i) => i.status === 'needs_human')!
    renderWithProviders(<CloseTheLoop />, { role: 'cxmgr', route: `/close-the-loop?item=${target.id}` })
    await ready()
    const focus = screen.getByRole('region', { name: 'From your inbox' })
    expect(within(focus).getByRole('button', { name: 'Call' })).toBeInTheDocument()
    await userEvent.click(within(focus).getByRole('button', { name: 'Close this row' }))
    await waitFor(() => expect(screen.queryByRole('region', { name: 'From your inbox' })).not.toBeInTheDocument())
  })

  it('shows the next-step box on step 5 (Check)', async () => {
    renderWithProviders(<CloseTheLoop />, { role: 'cxmgr', route: '/close-the-loop' })
    await ready()
    const box = screen.getByRole('region', { name: 'Next step' })
    expect(within(box).getByRole('link', { name: /5 Check/ })).toHaveAttribute('aria-current', 'step')
    expect(box).toHaveTextContent('A person calls each unhappy customer, codes the reason')
  })

  it('speaks Arabic', async () => {
    renderWithProviders(<CloseTheLoop />, { role: 'cxmgr', lang: 'ar', route: '/close-the-loop' })
    await screen.findByRole('table', {}, { timeout: 8000 })
    expect(screen.getByTestId('calling-rules')).toHaveTextContent('المكالمات فقط بين 09:00 و18:00 بتوقيت الإمارات، حتى 3 محاولات')
    expect(screen.getByTestId('calling-rules')).toHaveTextContent('القانونية تؤكد الساعات')
  })
})
