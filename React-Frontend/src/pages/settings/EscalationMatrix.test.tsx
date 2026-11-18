import { beforeAll, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import * as mock from '@/services/mockData'
import type { RoleId } from '@/types'
import EscalationMatrix from './EscalationMatrix'

beforeAll(() => preferReducedMotion())

const KINDS = ['Employee', 'Service and behaviour', 'Training gap', 'Process', 'Product and app', 'Environment', 'Legal and privacy', 'Marketing', 'Shopper case · critical', 'Legal or privacy case']
const COLUMNS = ['Kind', 'First receiver', 'Informed', 'Backup', 'Respond (h)', 'Resolve (h)']

const open = async (route = '/settings/escalation-matrix', role: RoleId = 'cxmgr', lang: 'en' | 'ar' = 'en') => {
  renderWithProviders(<EscalationMatrix />, { route, role, lang })
  await screen.findByRole('table')
}
const tableRows = () => screen.getAllByRole('row').slice(1)

describe('Escalation matrix page (v40 F22, decided 18 Nov)', () => {
  it('has one table per product: a selector of six products, Real Estate first and pressed', async () => {
    await open()
    const group = screen.getByRole('group', { name: 'Product' })
    const buttons = within(group).getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual(['PSI Real Estate', 'After-Sales', 'PSI Club', 'Tour Estate', 'PSI Events', 'PSI Wallet'])
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
    expect(buttons.slice(1).every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true)
  })

  it('shows ten rows (eight kinds and two case types) and six columns', async () => {
    await open()
    for (const c of COLUMNS) expect(screen.getByRole('columnheader', { name: c })).toBeInTheDocument()
    expect(tableRows()).toHaveLength(10)
    KINDS.forEach((k, i) => expect(within(tableRows()[i]).getAllByRole('cell')[0]).toHaveTextContent(k))
  })

  it('badges every cell still at its default [Proposed], and no header or page badge', async () => {
    await open()
    expect(within(screen.getByRole('table')).getAllByText('[Proposed]')).toHaveLength(50)
    // the layout is decided: nothing outside the table is badged
    const outside = screen.queryAllByText('[Proposed]').filter((el) => !screen.getByRole('table').contains(el))
    expect(outside).toHaveLength(0)
  })

  it('the CX manager gets an input in every cell, labelled by row and column', async () => {
    await open()
    expect(screen.getByRole('textbox', { name: 'Process · First receiver' })).toHaveValue('Process owner (matrix)')
    expect(screen.getByRole('spinbutton', { name: 'Service and behaviour · Resolve (h)' })).toHaveValue(45)
    expect(screen.getByRole('spinbutton', { name: 'Employee · Respond (h)' })).toHaveValue(null)
    expect(screen.getAllByRole('textbox').length + screen.getAllByRole('spinbutton').length).toBe(50)
  })

  it('other roles read the same table with no inputs and a view-only note', async () => {
    await open('/settings/escalation-matrix', 'cxteam')
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0)
    expect(screen.getByRole('note')).toHaveTextContent('View only')
    expect(within(tableRows()[3]).getByText('Process owner (matrix)')).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getAllByText('[Proposed]').length).toBeGreaterThan(0)
  })

  it('the Internal Audit and Marketing Lead can edit too', async () => {
    await open('/settings/escalation-matrix', 'auditmkt')
    expect(screen.getByRole('textbox', { name: 'Process · First receiver' })).toBeEnabled()
  })

  it('?product=af opens After-Sales', async () => {
    await open('/settings/escalation-matrix?product=af')
    expect(screen.getByRole('button', { name: 'After-Sales' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'PSI Real Estate' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('an unknown product falls back to Real Estate', async () => {
    await open('/settings/escalation-matrix?product=zz')
    expect(screen.getByRole('button', { name: 'PSI Real Estate' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('switching product shows that product’s own table', async () => {
    await open()
    await userEvent.click(screen.getByRole('button', { name: 'PSI Wallet' }))
    expect(screen.getByRole('button', { name: 'PSI Wallet' })).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Process · First receiver' })).toBeInTheDocument())
  })

  it('reads in Arabic', async () => {
    await open('/settings/escalation-matrix', 'cxmgr', 'ar')
    expect(screen.getByRole('columnheader', { name: 'المستلم الأول' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'الحل (ساعة)' })).toBeInTheDocument()
    expect(screen.getAllByText('[مقترح]').length).toBe(50)
    expect(screen.getByRole('textbox', { name: 'عملية · المستلم الأول' })).toHaveValue('مالك العملية (حسب المصفوفة)')
  })
})

// These edit the shared sample store, so they run last.
describe('Escalation matrix: editing a cell', () => {
  it('saves a title on blur, drops that cell’s [Proposed] and leaves the other products alone', async () => {
    await open()
    const input = screen.getByRole('textbox', { name: 'Process · First receiver' })
    await userEvent.clear(input)
    await userEvent.type(input, 'Head of Process Excellence')
    await userEvent.tab()
    await waitFor(() => expect(mock.MOCK_MATRIX.re.find((r) => r.kind === 'process')!.isDefault.receiver).toBe(false))
    expect(mock.MOCK_MATRIX.re.find((r) => r.kind === 'process')!.cells.receiver?.en).toBe('Head of Process Excellence')
    // the other language keeps its default (typed in English)
    expect(mock.MOCK_MATRIX.re.find((r) => r.kind === 'process')!.cells.receiver?.ar).toBe('مالك العملية (حسب المصفوفة)')
    await waitFor(() => expect(within(screen.getByRole('table')).getAllByText('[Proposed]')).toHaveLength(49))
    expect(screen.getByRole('textbox', { name: 'Process · First receiver' })).toHaveValue('Head of Process Excellence')
    // another product's cell is untouched, still a default
    expect(mock.MOCK_MATRIX.af.find((r) => r.kind === 'process')!.isDefault.receiver).toBe(true)
  })

  it('saves a clock as a number of working hours, and an empty clock means none', async () => {
    await open()
    const resolve = screen.getByRole('spinbutton', { name: 'Service and behaviour · Resolve (h)' })
    await userEvent.clear(resolve)
    await userEvent.type(resolve, '27')
    await userEvent.tab()
    await waitFor(() => expect(mock.MOCK_MATRIX.re.find((r) => r.kind === 'service')!.cells.resolveH).toBe(27))
    expect(mock.MOCK_MATRIX.re.find((r) => r.kind === 'service')!.isDefault.resolveH).toBe(false)
    const respond = screen.getByRole('spinbutton', { name: 'Service and behaviour · Respond (h)' })
    await userEvent.clear(respond)
    await userEvent.tab()
    await waitFor(() => expect(mock.MOCK_MATRIX.re.find((r) => r.kind === 'service')!.cells.respondH).toBeNull())
  })

  it('does nothing when the value is not changed', async () => {
    await open()
    const before = within(screen.getByRole('table')).getAllByText('[Proposed]').length
    const input = screen.getByRole('textbox', { name: 'Training gap · Backup' })
    await userEvent.click(input)
    await userEvent.tab()
    expect(within(screen.getByRole('table')).getAllByText('[Proposed]')).toHaveLength(before)
    expect(mock.MOCK_MATRIX.re.find((r) => r.kind === 'training')!.isDefault.backup).toBe(true)
  })

  it('a fix of that kind reads the new Resolve (h): the due date of an approval follows the matrix', async () => {
    // service (27 working hours, edited above) is the row of the "service_behaviour" kind
    const { resolveHoursFor } = await import('@/services/fixClockStore')
    expect(resolveHoursFor({ product: 're', kind: 'service_behaviour' })).toBe(27)
  })
})

describe('Escalation matrix: confirm a default as it stands', () => {
  const rowOf = (product: 'to' | 'ev', kind: string) => mock.MOCK_MATRIX[product].find((r) => r.kind === kind)!

  it('the CX manager gets a "Confirm default" button on every cell still at its default; confirming clears that cell’s [Proposed] and records who and when', async () => {
    await open('/settings/escalation-matrix?product=to')
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('button', { name: /^Confirm default:/ })).toHaveLength(50)
    await userEvent.click(within(table).getByRole('button', { name: 'Confirm default: Legal and privacy · First receiver' }))
    await waitFor(() => expect(rowOf('to', 'legal').isDefault.receiver).toBe(false))
    expect(rowOf('to', 'legal').confirmed?.receiver).toMatchObject({ byRole: 'cxmgr' })
    expect(Date.parse(rowOf('to', 'legal').confirmed!.receiver!.at)).toBeLessThanOrEqual(Date.now())
    // the value is unchanged, the badge and the button of that cell are gone, a "Confirmed" mark is there
    expect(rowOf('to', 'legal').cells.receiver?.en).toBe('Legal')
    await waitFor(() => expect(within(table).getAllByText('[Proposed]')).toHaveLength(49))
    expect(within(table).queryByRole('button', { name: 'Confirm default: Legal and privacy · First receiver' })).not.toBeInTheDocument()
    expect(within(table).getByTestId('matrix-confirmed')).toHaveTextContent('Confirmed')
    expect(within(table).getByTestId('matrix-confirmed')).toHaveTextContent('by CX manager')
    // another product is untouched
    expect(mock.MOCK_MATRIX.ev.find((r) => r.kind === 'legal')!.isDefault.receiver).toBe(true)
  })

  it('the CX team reads and sees no "Confirm default" button', async () => {
    await open('/settings/escalation-matrix?product=ev', 'cxteam')
    expect(screen.queryAllByRole('button', { name: /^Confirm default:/ })).toHaveLength(0)
    expect(screen.getAllByText('[Proposed]').length).toBe(50)
  })

  it('the Internal Audit and Marketing Lead may confirm', async () => {
    await open('/settings/escalation-matrix?product=ev', 'auditmkt')
    await userEvent.click(screen.getByRole('button', { name: 'Confirm default: Marketing · Informed' }))
    await waitFor(() => expect(rowOf('ev', 'marketing').isDefault.informed).toBe(false))
    expect(rowOf('ev', 'marketing').confirmed?.informed).toMatchObject({ byRole: 'auditmkt' })
  })

  it('editing a confirmed cell takes the confirmation back (a new value is a new proposal to the owner’s own edit, not a stale stamp)', async () => {
    await open('/settings/escalation-matrix?product=ev', 'auditmkt')
    const input = screen.getByRole('textbox', { name: 'Marketing · Informed' })
    await userEvent.clear(input)
    await userEvent.type(input, 'Head of Marketing Operations')
    await userEvent.tab()
    await waitFor(() => expect(rowOf('ev', 'marketing').cells.informed?.en).toBe('Head of Marketing Operations'))
    expect(rowOf('ev', 'marketing').confirmed?.informed).toBeUndefined()
  })

  it('reads in Arabic', async () => {
    await open('/settings/escalation-matrix?product=to', 'cxmgr', 'ar')
    expect(screen.getAllByRole('button', { name: /^تأكيد القيمة الافتراضية:/ }).length).toBe(49)
  })

  it('a cell that is no longer a default cannot be confirmed again', async () => {
    const { useConfirmMatrixCell } = await import('@/services/queriesV40')
    const { renderHookWithProviders } = await import('@/test/render')
    const { act } = await import('@testing-library/react')
    const { result } = renderHookWithProviders(() => useConfirmMatrixCell(), { role: 'cxmgr' })
    await expect(act(() => result.current.mutateAsync({ product: 'to', kind: 'legal', field: 'receiver' }))).rejects.toThrow('still at its default')
  })
})
