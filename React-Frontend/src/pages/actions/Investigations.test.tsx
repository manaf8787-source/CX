import { beforeAll, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import * as mock from '@/services/mockData'
import Investigations from './Investigations'
import Signals from './Signals'

beforeAll(() => preferReducedMotion())

const card = async (inv: string) =>
  waitFor(() => {
    const el = document.querySelector<HTMLElement>(`li[data-inv="${inv}"]`)
    expect(el).not.toBeNull()
    return el!
  })

describe('Investigations (v40 F26)', () => {
  it('names each investigation by its id and offers "Record the result" only on a running one', async () => {
    renderWithProviders(<Investigations />, { route: '/actions/investigations' })
    const running = await card('INV-1')
    expect(within(running).getByRole('button', { name: 'Record the result' })).toBeInTheDocument()
    const returned = await card('INV-2')
    expect(within(returned).queryByRole('button', { name: 'Record the result' })).not.toBeInTheDocument()
    expect(within(returned).getByTestId('inv-result')).toHaveTextContent('Evidence returned: root cause confirmed')
    // returned: the pattern it is now evidence on
    expect(returned).toHaveTextContent('Evidence on pattern')
    expect(returned.textContent).toMatch(/PT-\d{3}/)
  })

  it('?inv=INV-3 selects that investigation', async () => {
    renderWithProviders(<Investigations />, { route: '/actions/investigations?inv=INV-3' })
    expect(await card('INV-3')).toHaveAttribute('data-selected', 'true')
    expect(await card('INV-1')).not.toHaveAttribute('data-selected')
  })

  it('reads in Arabic', async () => {
    renderWithProviders(<Investigations />, { route: '/actions/investigations', lang: 'ar' })
    const running = await card('INV-1')
    expect(within(running).getByRole('button', { name: 'سجّل النتيجة' })).toBeInTheDocument()
  })
})

// These write to the shared sample store, so they run last.
describe('Investigations: recording the result', () => {
  it('on a pattern with no fix: the result is recorded as evidence, a fix is proposed for approval, the toast says so', async () => {
    renderWithProviders(<Investigations />, { route: '/actions/investigations' })
    const running = await card('INV-1')
    const fixesBefore = mock.MOCK_CORRECTIVE_ACTIONS.length
    await userEvent.click(within(running).getByRole('button', { name: 'Record the result' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'What came back' }), 'Interviews confirm the cause: the wrong plan was quoted.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Result recorded as evidence; a fix was proposed for approval.')).toBeInTheDocument()
    const inv = mock.MOCK_INVESTIGATIONS.find((i) => i.id === 'inv-1')!
    expect(inv.status).toBe('returned')
    expect(inv.doneCount).toBe(inv.requestedCount)
    expect(inv.result?.en).toBe('Interviews confirm the cause: the wrong plan was quoted.')
    expect(mock.MOCK_CORRECTIVE_ACTIONS).toHaveLength(fixesBefore + 1)
    const fix = mock.MOCK_CORRECTIVE_ACTIONS.find((f) => f.id === inv.proposedFixId)!
    expect(fix).toMatchObject({ status: 'proposed', source: { investigationId: 'inv-1' } })
    expect(fix.auditLog).toHaveLength(1)
    expect(fix.auditLog[0].byRole).toBe('system')
    // the card now shows the result, the evidence and the fix it proposed (a link to the fix)
    await waitFor(() => expect(within(running).getByTestId('inv-proposed-fix')).toHaveTextContent(/CA-2\d\d/))
    expect(within(running).queryByRole('button', { name: 'Record the result' })).not.toBeInTheDocument()
  })

  it('on a pattern that already has a fix: only "evidence" is said and no second fix is proposed', async () => {
    const hasFix = mock.MOCK_CORRECTIVE_ACTIONS.find((f) => f.patternId)!
    mock.MOCK_INVESTIGATIONS.push({ id: 'inv-99', patternId: hasFix.patternId, kind: 'customer_interviews', requestedCount: 5, environment: 'Dubai team', status: 'in_progress' })
    renderWithProviders(<Investigations />, { route: '/actions/investigations' })
    const running = await card('INV-99')
    const fixesBefore = mock.MOCK_CORRECTIVE_ACTIONS.length
    await userEvent.click(within(running).getByRole('button', { name: 'Record the result' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'What came back' }), 'Shopper check done: the wrong plan was quoted again.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Result recorded as evidence.')).toBeInTheDocument()
    expect(mock.MOCK_CORRECTIVE_ACTIONS).toHaveLength(fixesBefore)
    expect(mock.MOCK_INVESTIGATIONS.find((i) => i.id === 'inv-99')!.proposedFixId).toBeUndefined()
  })

  it('the recorded result shows as the green evidence line on the pattern card of the Signals page', async () => {
    const inv = mock.MOCK_INVESTIGATIONS.find((i) => i.id === 'inv-1')!
    // the thin pattern sits past the first four cards: ask for it with ?pt= so the list opens on it
    renderWithProviders(<Signals />, { route: `/actions/signals?pt=${encodeURIComponent(inv.patternId!)}` })
    await waitFor(
      () => {
        const lines = screen.getAllByTestId('pattern-evidence').map((e) => e.textContent ?? '')
        expect(lines.some((t) => t.includes('Interviews confirm the cause: the wrong plan was quoted.'))).toBe(true)
      },
      { timeout: 5000 },
    )
    const line = screen.getAllByTestId('pattern-evidence').find((e) => e.textContent?.includes('Interviews confirm the cause'))!
    expect(line).toHaveTextContent(/^Evidence from investigation · INV-1: /)
    // that card is the selected one
    expect(line.closest('li')).toHaveAttribute('data-selected', 'true')
  })
})
