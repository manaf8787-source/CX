import { beforeAll, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import * as mock from '@/services/mockData'
import Corrective from './Corrective'

beforeAll(() => preferReducedMotion())

/** The fix card (the `li`) of one fix by its display id. */
const card = async (ca: string) => {
  const el = await waitFor(() => {
    const found = document.querySelector<HTMLElement>(`li[data-fix="${ca}"]`)
    expect(found).not.toBeNull()
    return found!
  })
  return el
}

describe('Corrective: every fix in full (v40 F07, F11, F21, F22, F33)', () => {
  it('shows, per fix: the next-step box above it, the matrix line, the audit trail and the Trace card', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective' })
    const fixes = mock.MOCK_CORRECTIVE_ACTIONS
    await card('CA-201')
    expect(document.querySelectorAll('li[data-fix]')).toHaveLength(fixes.length)
    for (const f of fixes) {
      const li = await card(`CA-${200 + Number(f.id.replace(/\D/g, ''))}`)
      // the box sits above the card
      const nextBox = within(li).getAllByRole('region', { name: 'Next step' })[0]
      const first = li.firstElementChild!
      expect(first).toContainElement(nextBox)
      expect(await within(li).findByTestId('matrix-line')).toHaveTextContent('From the matrix')
      expect(within(li).getByTestId('audit-trail')).toBeInTheDocument()
      expect(await within(li).findByTestId('trace-card')).toBeInTheDocument()
      expect(within(li).getByTestId('found-agents')).toHaveTextContent('CX Supervisor: 6 checks passed')
    }
  })

  it('a proposed fix reads the approval sentence with its window and previews the due date from the matrix', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective' })
    const li = await card('CA-202')
    expect(li).toHaveTextContent('The responsible manager approves, changes, rejects, or asks for an investigation')
    expect(li).toHaveTextContent('within 5 working days')
    // marketing kind: matrix Resolve 45 working hours
    await waitFor(() => expect(li).toHaveTextContent(/if approved today: matrix Resolve 45 h, in working hours/))
    expect(within(li).getByRole('button', { name: 'Decide' })).toBeInTheDocument()
    expect(li).toHaveTextContent('Approval window')
  })

  it('a fix in progress reads "the owner does the fix", by its due date, and offers "Done, start the 60-day check"', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective' })
    const li = await card('CA-203')
    expect(li).toHaveTextContent('The owner does the fix and marks it done')
    expect(li).toHaveTextContent(/by the due date, /)
    expect(within(li).getByRole('button', { name: 'Done, start the 60-day check' })).toBeInTheDocument()
  })

  it('a fix at its 60-day check names Agent 6 and the step Check', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective' })
    const li = await card('CA-204')
    expect(li).toHaveTextContent('Agent 6 counts the same signals again and marks it effective, partial or failed')
    expect(li).toHaveTextContent(/at 60 days, /)
    const strip = within(li).getAllByRole('navigation', { name: 'The six steps' })[0]
    expect(within(strip).getByText('5 Check').closest('[aria-current="step"]')).not.toBeNull()
  })

  it('the matrix line names the receiver, the clocks and the product, and the Matrix button opens that product', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective' })
    const li = await card('CA-202')
    const line = await within(li).findByTestId('matrix-line')
    expect(line).toHaveTextContent('From the matrix (PSI Real Estate)')
    expect(line).toHaveTextContent('receiver Internal Audit and Marketing Lead')
    expect(line).toHaveTextContent('resolve 45 h')
    expect(within(line).getByText('[Proposed]')).toBeInTheDocument()
    expect(within(line).getByRole('link', { name: 'Matrix' })).toHaveAttribute('href', '/settings/escalation-matrix?product=re')
  })

  it('"How the AI found this" carries Arabic chips and the Who does what button', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective', lang: 'ar' })
    const li = await card('CA-202')
    const chips = within(li).getByTestId('found-agents')
    expect(chips).toHaveTextContent('الوكيل 3')
    expect(chips).toHaveTextContent('الوكيل 5')
    expect(chips).toHaveTextContent('سوبرفايزر CX: اجتاز 6 فحوصات')
    expect(within(chips).getByRole('link', { name: 'من يفعل ماذا' })).toHaveAttribute('href', '/intelligent-cx-team')
    expect(li).toHaveTextContent('الخطوة التالية')
  })

  it('?fix=CA-203 marks that fix as the selected one', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective?fix=CA-203' })
    const li = await card('CA-203')
    expect(li).toHaveAttribute('data-selected', 'true')
    expect(document.querySelectorAll('li[data-selected="true"]')).toHaveLength(1)
  })

  it('folds the hand-offs under the fixes tab, collapsed, with the title and subtitle', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective' })
    const block = await screen.findByTestId('handoffs-block')
    const trigger = within(block).getByRole('button', { name: /One-customer corrections handed to other systems/ })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveTextContent('(hand-offs: recorded and checked, no clock)')
    expect(screen.queryByRole('heading', { name: 'Hand-off rules by signal type' })).not.toBeInTheDocument()
    await userEvent.click(trigger)
    expect(await screen.findByRole('heading', { name: 'Hand-off rules by signal type' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Lead asked not to be called' })).toBeInTheDocument()
  })

  it('L&D sees only the training-gap fix and cannot act on it', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective', role: 'ld' })
    await card('CA-204')
    expect(document.querySelectorAll('li[data-fix]')).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /Decide|Start|Done, start/ })).not.toBeInTheDocument()
  })

  it('the HR specialist reads the fixes but gets no action button', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective', role: 'hrspec' })
    await card('CA-202')
    expect(screen.queryByRole('button', { name: /Decide|Start|Done, start/ })).not.toBeInTheDocument()
  })
})

// These write to the shared sample store, so they run last.
describe('Corrective: decisions and status changes write the audit trail (v40 F21)', () => {
  it('"Done, start the 60-day check" writes an audit line, schedules the check 60 days out and moves the box to the check step', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective' })
    const li = await card('CA-203')
    const fix = mock.MOCK_CORRECTIVE_ACTIONS.find((f) => f.id === 'ca-3')!
    const before = fix.auditLog.length
    await userEvent.click(within(li).getByRole('button', { name: 'Done, start the 60-day check' }))
    await waitFor(() => expect(fix.status).toBe('verification'))
    expect(fix.auditLog).toHaveLength(before + 1)
    expect(fix.auditLog.at(-1)).toMatchObject({ byRole: 'cxmgr', what: { en: 'Marked done; the 60-day check is scheduled' } })
    const days = (Date.parse(fix.verificationDueAt) - Date.now()) / 86_400_000
    expect(days).toBeGreaterThan(59)
    expect(days).toBeLessThan(61)
    // the card shows the new line (newest first) and the new next step
    await waitFor(() => expect(within(li).getByTestId('audit-trail')).toHaveTextContent('Marked done; the 60-day check is scheduled'))
    await waitFor(() => expect(li).toHaveTextContent('Agent 6 counts the same signals again'))
  })

  it('approving a proposed fix writes the decision, sets the due date from the matrix and starts "the owner does the fix"', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective' })
    const li = await card('CA-202')
    const fix = mock.MOCK_CORRECTIVE_ACTIONS.find((f) => f.id === 'ca-2')!
    const before = fix.auditLog.length
    await userEvent.click(within(li).getByRole('button', { name: 'Decide' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save decision' }))
    await waitFor(() => expect(fix.status).toBe('approved'))
    expect(fix.dueSource).toBe('matrix')
    expect(fix.auditLog).toHaveLength(before + 1)
    expect(fix.auditLog.at(-1)).toMatchObject({ byRole: 'cxmgr', what: { en: 'Approved' } })
    await waitFor(() => expect(li).toHaveTextContent('The owner does the fix and marks it done'))
    expect(li).toHaveTextContent('from the matrix Resolve (h), in working hours from approval')
    expect(within(li).getByTestId('audit-trail')).toHaveTextContent('Approved')
  })
})
