import { beforeAll, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router-dom'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import * as mock from '@/services/mockData'
import type { RoleId } from '@/types'
import Corrective from '../Corrective'

/**
 * v40.1: closing the 60-day check from the fix card (docs/V401_VERDICT.md). The seeded sample: CA-201 is partial, CA-203 in progress,
 * CA-204 in its 60-day check. The tests that write to the shared sample store run last, in the order they need.
 */

beforeAll(() => {
  preferReducedMotion()
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
})

const card = async (ca: string) =>
  waitFor(() => {
    const found = document.querySelector<HTMLElement>(`li[data-fix="${ca}"]`)
    expect(found).not.toBeNull()
    return found!
  })

const fixById = (id: string) => mock.MOCK_CORRECTIVE_ACTIONS.find((f) => f.id === id)!

/** A stand-in for the Investigations page: shows where the app went. */
function Where() {
  const loc = useLocation()
  return <div data-testid="where">{loc.pathname + loc.search}</div>
}
const ROUTES = [{ path: '/actions/investigations', element: <Where /> }]

const VERDICT_BUTTONS = /^(Signals dropped: effective|Dropped under half: partial|No drop: back to root cause)$/
const BAR_BUTTONS = /^(Ask for a second step|Investigate first \(5 interviews\)|Accept as is)$/

describe('the verdict buttons on a fix in its 60-day check', () => {
  it('the CX manager sees three buttons, the prototype labels, and the automatic readout stays as the evidence', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective' })
    const li = await card('CA-204')
    const group = within(li).getByRole('group', { name: 'Record the verdict' })
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['Signals dropped: effective', 'Dropped under half: partial', 'No drop: back to root cause'])
    expect(group).toHaveTextContent('You decide; the automatic readout is only the evidence.')
    // the readout of the sample series is still there, next to them
    expect(li).toHaveTextContent('60-day verification')
    expect(within(li).queryByTestId('fix-second-step-bar')).not.toBeInTheDocument()
  })

  it('the CX team sees them too', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective', role: 'cxteam' })
    const li = await card('CA-204')
    expect(within(li).getAllByRole('button', { name: VERDICT_BUTTONS })).toHaveLength(3)
  })

  for (const role of ['envmgmt', 'hrspec', 'teamlead', 'ld'] as RoleId[]) {
    it(`${role} reads the check and sees no verdict button`, async () => {
      renderWithProviders(<Corrective />, { route: '/actions/corrective', role })
      const li = await card('CA-204')
      expect(within(li).queryByRole('button', { name: VERDICT_BUTTONS })).not.toBeInTheDocument()
      expect(within(li).queryByTestId('fix-verdict')).not.toBeInTheDocument()
      expect(li).toHaveTextContent('Agent 6 counts the same signals again')
    })
  }

  it('the labels are in Arabic, and the fix reads "فحص 60 يوماً"', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective', lang: 'ar' })
    const li = await card('CA-204')
    const group = within(li).getByRole('group', { name: 'سجّل الحكم' })
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['انخفضت الإشارات: فعّال', 'انخفضت أقل من النصف: جزئي', 'لم تنخفض: العودة للسبب الجذري'])
    expect(li).toHaveTextContent('فحص 60 يوماً')
  })
})

describe('a partial or failed fix: the bar with decision 3', () => {
  it('CA-201 (partial) shows the prototype sentence and the three buttons; the status reads "Partial: second step needed"', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective' })
    const li = await card('CA-201')
    const bar = within(li).getByTestId('fix-second-step-bar')
    expect(bar).toHaveAttribute('data-outcome', 'partial')
    expect(bar).toHaveTextContent('Partial: the signals dropped by less than half.')
    expect(bar).toHaveTextContent('Decision 3: ask the owner for a second step, or investigate first if the cause is unclear.')
    expect(within(bar).getAllByRole('button').map((b) => b.textContent)).toEqual(['Ask for a second step', 'Investigate first (5 interviews)', 'Accept as is'])
    expect(within(li).getAllByText('Partial: second step needed').length).toBeGreaterThan(0)
    // the next-step box: the owner proposes a second step; the CX manager approves it as a new fix on the same pattern
    expect(li).toHaveTextContent('The owner proposes a second step; the CX manager approves it as a new fix on the same pattern')
    expect(li).toHaveTextContent('within 5 working days')
    // and no verdict buttons any more
    expect(within(li).queryByRole('button', { name: VERDICT_BUTTONS })).not.toBeInTheDocument()
  })

  it('in Arabic', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective', lang: 'ar' })
    const li = await card('CA-201')
    const bar = within(li).getByTestId('fix-second-step-bar')
    expect(bar).toHaveTextContent('جزئي: انخفضت الإشارات أقل من النصف.')
    expect(within(bar).getAllByRole('button').map((b) => b.textContent)).toEqual(['اطلب خطوة ثانية', 'حقّق أولاً (5 مقابلات)', 'اقبله كما هو'])
    expect(li).toHaveTextContent('جزئي: خطوة ثانية مطلوبة')
  })

  for (const role of ['hrspec', 'teamlead'] as RoleId[]) {
    it(`${role} sees the partial fix and none of the three buttons`, async () => {
      renderWithProviders(<Corrective />, { route: '/actions/corrective', role })
      const li = await card('CA-201')
      expect(within(li).queryByTestId('fix-second-step-bar')).not.toBeInTheDocument()
      expect(within(li).queryByRole('button', { name: BAR_BUTTONS })).not.toBeInTheDocument()
      expect(li).toHaveTextContent('Partial: second step needed')
    })
  }
})

// These write to the shared sample store, so they run last and in this order.
describe('recording a verdict and deciding what follows (writes the sample)', () => {
  it('a partial verdict on CA-204 stores the verdict, writes the audit line, toasts, and the bar appears', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective' })
    const li = await card('CA-204')
    const fix = fixById('ca-4')
    const before = fix.auditLog.length
    await userEvent.click(within(li).getByRole('button', { name: 'Dropped under half: partial' }))
    expect(await screen.findByText('Verdict recorded: partial. Decide the second step.')).toBeInTheDocument()
    expect(fix.status).toBe('partial')
    expect(fix.verificationResult).toBe('partial')
    expect(fix.auditLog).toHaveLength(before + 1)
    expect(fix.auditLog.at(-1)).toMatchObject({ byRole: 'cxmgr', what: { en: 'Verdict: partial' } })
    expect(await within(li).findByTestId('fix-second-step-bar')).toBeInTheDocument()
    expect(within(li).queryByRole('group', { name: 'Record the verdict' })).not.toBeInTheDocument()
  })

  it('"Ask for a second step" creates the linked fix, selects it and links both ways; asking again is off', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective' })
    const li = await card('CA-204')
    const parent = fixById('ca-4')
    const count = mock.MOCK_CORRECTIVE_ACTIONS.length
    await userEvent.click(within(li).getByRole('button', { name: 'Ask for a second step' }))
    expect(await screen.findByText(`CA-${200 + count + 1} proposed on the same pattern; the owner has 5 working days.`)).toBeInTheDocument()

    const child = mock.MOCK_CORRECTIVE_ACTIONS.at(-1)!
    expect(child.id).toBe(`ca-${count + 1}`)
    expect(child).toMatchObject({ status: 'proposed', patternId: parent.patternId, parentFixId: 'ca-4', kind: parent.kind, owner: parent.owner })
    // the new fix is the selected one and reads where it came from
    const childCard = await card(`CA-${200 + count + 1}`)
    await waitFor(() => expect(childCard).toHaveAttribute('data-selected', 'true'))
    expect(within(childCard).getByTestId('fix-parent')).toHaveTextContent('Second step after CA-204 (Partial: second step needed)')
    expect(childCard).toHaveTextContent('Proposed by CX manager, after a partial result')
    expect(childCard).toHaveTextContent('Second step on CA-204: ')
    expect(childCard).toHaveTextContent('within 5 working days')
    expect(within(childCard).getByRole('button', { name: 'Decide' })).toBeInTheDocument()
    // ... and the original shows the child as a trace id; the audit line is on both
    expect(within(li).getByTestId('fix-children')).toHaveTextContent(`Second step: CA-${200 + count + 1}`)
    expect(parent.auditLog.at(-1)?.what.en).toBe(`Second step requested: CA-${200 + count + 1}`)
    expect(child.auditLog).toHaveLength(1)
    // a second step is open: a second request would only duplicate it
    const again = within(li).getByRole('button', { name: 'Ask for a second step' })
    expect(again).toHaveAttribute('aria-disabled', 'true')
    expect(li).toHaveTextContent('A second step is already open on this fix.')
    const length = mock.MOCK_CORRECTIVE_ACTIONS.length
    await userEvent.click(again)
    expect(mock.MOCK_CORRECTIVE_ACTIONS).toHaveLength(length)
  })

  it('a failed verdict on CA-203, then "Investigate first" opens an investigation and goes to the Investigations page on it', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective', routes: ROUTES })
    const li = await card('CA-203')
    const fix = fixById('ca-3')
    await userEvent.click(within(li).getByRole('button', { name: 'Done, start the 60-day check' }))
    await waitFor(() => expect(fix.status).toBe('verification'))
    await userEvent.click(await within(li).findByRole('button', { name: 'No drop: back to root cause' }))
    await waitFor(() => expect(fix.status).toBe('failed'))
    expect(fix.verificationResult).toBe('failed')
    const bar = await within(li).findByTestId('fix-second-step-bar')
    expect(bar).toHaveAttribute('data-outcome', 'failed')
    expect(bar).toHaveTextContent('Failed: the signals did not drop, or came back.')

    const invs = mock.MOCK_INVESTIGATIONS.length
    await userEvent.click(within(bar).getByRole('button', { name: 'Investigate first (5 interviews)' }))
    expect(await screen.findByText('Investigation opened under Signals and fixes → Investigations.')).toBeInTheDocument()
    expect(mock.MOCK_INVESTIGATIONS).toHaveLength(invs + 1)
    const inv = mock.MOCK_INVESTIGATIONS.at(-1)!
    expect(inv).toMatchObject({ patternId: fix.patternId, kind: 'customer_interviews', requestedCount: 5, status: 'in_progress' })
    expect(inv.note?.en).toBe('Requested from CA-203 after a failed result.')
    expect(fix.auditLog.at(-1)?.what.en).toBe(`Investigation requested: 5 interviews (INV-${invs + 1})`)
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(`/actions/investigations?inv=INV-${invs + 1}`))
  })

  it('"Accept as is" ends the fix effective and writes the audit line; the bar goes', async () => {
    renderWithProviders(<Corrective />, { route: '/actions/corrective' })
    const li = await card('CA-201')
    const fix = fixById('ca-1')
    await userEvent.click(within(li).getByRole('button', { name: 'Accept as is' }))
    expect(await screen.findByText('Accepted as is; the fix is marked effective.')).toBeInTheDocument()
    expect(fix.status).toBe('effective')
    expect(fix.verificationResult).toBe('effective')
    expect(fix.auditLog.at(-1)).toMatchObject({ byRole: 'cxmgr', what: { en: 'Accepted as is after a partial result' } })
    await waitFor(() => expect(within(li).queryByTestId('fix-second-step-bar')).not.toBeInTheDocument())
    expect(li).toHaveTextContent('Nothing. It worked; it stays in the report as a fix that worked')
  })
})
