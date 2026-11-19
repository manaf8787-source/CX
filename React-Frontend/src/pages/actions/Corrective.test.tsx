import { beforeAll, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useNavigate } from 'react-router-dom'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import * as mock from '@/services/mockData'
import Corrective from './Corrective'

beforeAll(() => {
  preferReducedMotion()
  // Radix Select in jsdom.
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
})

/** The fix card (the `li`) of one fix by its display id. */
const card = async (ca: string) => {
  const el = await waitFor(() => {
    const found = document.querySelector<HTMLElement>(`li[data-fix="${ca}"]`)
    expect(found).not.toBeNull()
    return found!
  })
  return el
}

/** The "Details" toggle of one card, and opens the card when it is folded (the details fold: only the first fix is open by default). */
const toggleOf = (li: HTMLElement) => within(li).getByRole('button', { name: /^(Details|التفاصيل)/ })
const openCard = async (li: HTMLElement) => {
  if (toggleOf(li).getAttribute('aria-expanded') !== 'true') await userEvent.click(toggleOf(li))
  await waitFor(() => expect(toggleOf(li)).toHaveAttribute('aria-expanded', 'true'))
  return li
}

describe('Corrective: the details fold so the page is not extremely long (v40 integration)', () => {
  it('opens the first fix and folds the others; the header and the next-step box always show', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective' })
    const first = await card('CA-201')
    const toggles = await screen.findAllByRole('button', { name: /^Details/ })
    expect(toggles).toHaveLength(mock.MOCK_CORRECTIVE_ACTIONS.length)
    expect(toggles[0]).toHaveAttribute('aria-expanded', 'true')
    for (const t of toggles.slice(1)) expect(t).toHaveAttribute('aria-expanded', 'false')
    expect(await within(first).findByTestId('audit-trail')).toBeInTheDocument()
    const folded = await card('CA-202')
    expect(within(folded).queryByTestId('audit-trail')).not.toBeInTheDocument()
    expect(within(folded).queryByTestId('matrix-line')).not.toBeInTheDocument()
    // still visible while folded: the box, the title row, owner, product and due date, and the Decide button
    expect(within(folded).getAllByRole('region', { name: 'Next step' })[0]).toBeInTheDocument()
    expect(within(folded).getByRole('heading', { level: 2 })).toBeInTheDocument()
    expect(within(folded).getByTestId('fix-due')).toBeInTheDocument()
    expect(within(folded).getByRole('button', { name: 'Decide' })).toBeInTheDocument()
  })

  it('opens and folds from the keyboard (Enter and Space on the toggle)', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective' })
    const li = await card('CA-202')
    const toggle = toggleOf(li)
    toggle.focus()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(toggle).toHaveAttribute('aria-expanded', 'true'))
    expect(await within(li).findByTestId('audit-trail')).toBeInTheDocument()
    await userEvent.keyboard(' ')
    await waitFor(() => expect(toggle).toHaveAttribute('aria-expanded', 'false'))
    expect(within(li).queryByTestId('audit-trail')).not.toBeInTheDocument()
  })

  it('"Expand all" opens every card and becomes "Collapse all"', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective' })
    await card('CA-201')
    await userEvent.click(await screen.findByRole('button', { name: 'Expand all' }))
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^Details/ }).every((b) => b.getAttribute('aria-expanded') === 'true')).toBe(true))
    await userEvent.click(screen.getByRole('button', { name: 'Collapse all' }))
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^Details/ }).every((b) => b.getAttribute('aria-expanded') === 'false')).toBe(true))
  })

  it('the fix a link names (?fix=) is open as well as the first', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective?fix=CA-203' })
    const li = await card('CA-203')
    expect(toggleOf(li)).toHaveAttribute('aria-expanded', 'true')
    expect(toggleOf(await card('CA-201'))).toHaveAttribute('aria-expanded', 'true')
    expect(toggleOf(await card('CA-202'))).toHaveAttribute('aria-expanded', 'false')
  })

  it('the toggle is named in Arabic and keeps the fix id for a screen reader', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective', lang: 'ar' })
    const li = await card('CA-202')
    const toggle = toggleOf(li)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle.textContent).toMatch(/^التفاصيل\s+CA-202/)
  })
})

/** A link to the same page without a query, to see the filter follow the URL. */
function Jump({ to }: { to: string }) {
  const navigate = useNavigate()
  return <button onClick={() => navigate(to)}>jump to {to}</button>
}

describe('Corrective: ?status= opens the register on one status (the guided tour uses it)', () => {
  const filter = () => screen.getByRole('combobox', { name: 'Status' })

  it('?status=proposed lists only the fixes waiting for a yes, and the filter says so', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective?status=proposed' })
    await card('CA-202')
    expect(document.querySelectorAll('li[data-fix]')).toHaveLength(1)
    expect(filter()).toHaveTextContent('Proposed')
    expect(screen.getByText('1 actions')).toBeInTheDocument()
  })

  it('no query, or one it does not know, lists every fix', async () => {
    const { unmount } = renderWithProviders(<Corrective />, { route: '/actions/corrective' })
    await card('CA-201')
    expect(document.querySelectorAll('li[data-fix]')).toHaveLength(mock.MOCK_CORRECTIVE_ACTIONS.length)
    expect(filter()).toHaveTextContent('All')
    unmount()
    renderWithProviders(<Corrective />, { route: '/actions/corrective?status=nonsense' })
    await card('CA-201')
    expect(document.querySelectorAll('li[data-fix]')).toHaveLength(mock.MOCK_CORRECTIVE_ACTIONS.length)
    expect(filter()).toHaveTextContent('All')
  })

  it('follows the query when it changes, and the status the person picks afterwards stays theirs', async () => {
    renderWithProviders(
      <>
        <Corrective />
        <Jump to="/actions/corrective?status=proposed" />
        <Jump to="/actions/corrective" />
      </>,
      { route: '/actions/corrective' },
    )
    await card('CA-201')
    await userEvent.click(screen.getByRole('button', { name: 'jump to /actions/corrective?status=proposed' }))
    await waitFor(() => expect(document.querySelectorAll('li[data-fix]')).toHaveLength(1))
    expect(filter()).toHaveTextContent('Proposed')
    // the query goes away: back to every fix
    await userEvent.click(screen.getByRole('button', { name: 'jump to /actions/corrective' }))
    await waitFor(() => expect(document.querySelectorAll('li[data-fix]')).toHaveLength(mock.MOCK_CORRECTIVE_ACTIONS.length))
    expect(filter()).toHaveTextContent('All')
    // picking a status by hand is not undone by a re-render
    await userEvent.click(filter())
    await userEvent.click(await screen.findByRole('option', { name: 'In progress' }))
    await waitFor(() => expect(document.querySelectorAll('li[data-fix]')).toHaveLength(1))
    expect(filter()).toHaveTextContent('In progress')
  })
})

describe('Corrective: every fix in full (v40 F07, F11, F21, F22, F33)', () => {
  it('shows, per fix: the next-step box above it, the matrix line, the audit trail and the Trace card', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective' })
    const fixes = mock.MOCK_CORRECTIVE_ACTIONS
    await card('CA-201')
    await userEvent.click(await screen.findByRole('button', { name: 'Expand all' }))
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
    const li = await openCard(await card('CA-202'))
    const line = await within(li).findByTestId('matrix-line')
    expect(line).toHaveTextContent('From the matrix (PSI Real Estate)')
    expect(line).toHaveTextContent('receiver Internal Audit and Marketing Lead')
    expect(line).toHaveTextContent('informed Marketing manager')
    expect(line).toHaveTextContent('backup CX manager')
    expect(line).toHaveTextContent('respond 9 h')
    expect(line).toHaveTextContent('resolve 45 h')
    // the cells are decided (set 19 Nov): a quiet tag says so, and there is no [Proposed]
    expect(within(line).getByText('Set 19 Nov · titles adjustable until 28 Nov')).toBeInTheDocument()
    expect(within(line).queryByText('[Proposed]')).not.toBeInTheDocument()
    expect(within(line).getByRole('link', { name: 'Matrix' })).toHaveAttribute('href', '/settings/escalation-matrix?product=re')
    // not VIP-related: no tag, the row as it is
    expect(line).not.toHaveAttribute('data-vip')
    expect(within(li).queryByTestId('fix-vip-tag')).not.toBeInTheDocument()
  })

  it('a VIP-related fix (its pattern includes a person tagged VIP) shows "VIP · clocks halved" and reads the VIP version of its matrix row', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective' })
    const li = await card('CA-201')
    // the tag sits in the header, so it shows with the card folded or open
    expect(await within(li).findByTestId('fix-vip-tag')).toHaveTextContent('VIP · clocks halved')
    const line = await within(li).findByTestId('matrix-line')
    expect(line).toHaveAttribute('data-vip', 'true')
    // Wallet, legal and privacy: Legal | Information Security lead · CX manager · Head of Investor Relations | – | 1 | 9, as the rule changes it
    expect(line).toHaveTextContent('From the matrix (PSI Wallet)')
    expect(line).toHaveTextContent('receiver Legal')
    expect(line).toHaveTextContent('informed Head of the environment · Information Security lead · CX manager · Head of Investor Relations')
    expect(line).toHaveTextContent('backup CX manager')
    expect(line).toHaveTextContent('respond ½ h')
    expect(line).toHaveTextContent('resolve 4.5 h')
    expect(within(line).getByTestId('matrix-vip-note')).toHaveTextContent('VIP rule applied: both clocks halved')
    expect(within(line).queryByText('[Proposed]')).not.toBeInTheDocument()
  })

  it('the employee fix has no resolve clock ("–"), and its respond clock is halved too when it is VIP-related', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective' })
    const li = await openCard(await card('CA-203'))
    expect(await within(li).findByTestId('fix-vip-tag')).toBeInTheDocument()
    const line = await within(li).findByTestId('matrix-line')
    expect(line).toHaveTextContent('From the matrix (PSI Wallet)')
    expect(line).toHaveTextContent('receiver Account manager lead (direct manager)')
    expect(line).toHaveTextContent('informed Head of the environment') // "–" for an employee kind; the VIP rule adds the head at once
    expect(line).toHaveTextContent('respond 2 h') // 4 h halved
    expect(line).toHaveTextContent('resolve –')
  })

  it('says the VIP tag in Arabic', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective', lang: 'ar' })
    const li = await card('CA-201')
    expect(await within(li).findByTestId('fix-vip-tag')).toHaveTextContent('VIP · المهل مُنصَّفة')
    const line = await within(li).findByTestId('matrix-line')
    expect(line).toHaveTextContent('رئيس البيئة · مسؤول أمن المعلومات · مدير تجربة العملاء · رئيس علاقات المستثمرين')
  })

  it('"How the AI found this" carries Arabic chips and the Who does what button', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective', lang: 'ar' })
    const li = await openCard(await card('CA-202'))
    const chips = await within(li).findByTestId('found-agents')
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
    const li = await openCard(await card('CA-203'))
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
    const li = await openCard(await card('CA-202'))
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
