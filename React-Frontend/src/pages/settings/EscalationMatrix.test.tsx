import { beforeAll, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import * as mock from '@/services/mockData'
import type { MatrixCellRow, ProductId, RoleId } from '@/types'
import EscalationMatrix from './EscalationMatrix'

beforeAll(() => preferReducedMotion())

const KINDS = [
  'Employee',
  'Service and behaviour',
  'Training gap',
  'Process',
  'Product and app',
  'Environment',
  'Legal and privacy',
  'Marketing',
  'Shopper case · critical',
  'Legal or privacy case',
  'Data exposure or system access incident',
  'Any kind, VIP customer involved',
]
const COLUMNS = ['Kind', 'First receiver', 'Informed', 'Backup', 'Respond (h)', 'Resolve (h)']

const open = async (route = '/settings/escalation-matrix', role: RoleId = 'cxmgr', lang: 'en' | 'ar' = 'en') => {
  renderWithProviders(<EscalationMatrix />, { route, role, lang })
  await screen.findByRole('table')
}
const tableRows = () => screen.getAllByRole('row').slice(1)
const rowOf = (product: ProductId, kind: string) => mock.MOCK_MATRIX[product].find((r) => r.kind === kind) as MatrixCellRow

describe('Escalation matrix page (v40 F22; the cells of 19 Nov, v42 F30)', () => {
  it('has one table per product: a selector of six products, Real Estate first and pressed', async () => {
    await open()
    const group = screen.getByRole('group', { name: 'Product' })
    const buttons = within(group).getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual(['PSI Real Estate', 'After-Sales', 'PSI Club', 'Tour Estate', 'PSI Events', 'PSI Wallet'])
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
    expect(buttons.slice(1).every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true)
  })

  it('shows twelve rows (eight kinds, two case types, data exposure, VIP) and six columns', async () => {
    await open()
    for (const c of COLUMNS) expect(screen.getByRole('columnheader', { name: c })).toBeInTheDocument()
    expect(tableRows()).toHaveLength(12)
    KINDS.forEach((k, i) => expect(within(tableRows()[i]).getAllByRole('cell')[0]).toHaveTextContent(k))
  })

  it('has the new header text: cells set on 19 November, titles adjustable before 28 November, the clocks stay', async () => {
    await open()
    expect(screen.getByRole('heading', { name: 'Escalation matrix' })).toBeInTheDocument()
    expect(
      screen.getByText(/One table per product\. Cells set on 19 November by the CX manager; product owners may adjust a title with the Internal Audit and Marketing Lead before 28 November, the clocks stay\./),
    ).toBeInTheDocument()
    expect(screen.queryByText(/fill the cells with the Internal Audit and Marketing Lead by 28 November/)).not.toBeInTheDocument()
  })

  it('puts the card "Three rules behind the cells" ABOVE the product tabs, with the three rules and the clock legend', async () => {
    await open()
    const title = screen.getByText('Three rules behind the cells')
    const tabs = screen.getByRole('group', { name: 'Product' })
    expect(title.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const rules = within(screen.getByTestId('matrix-rules')).getAllByRole('listitem')
    expect(rules).toHaveLength(3)
    expect(rules[0]).toHaveTextContent('Every customer is treated as a VIP; a delay is a failure.')
    expect(rules[0]).toHaveTextContent('both clocks are halved, the head of the environment is informed at once, and the CX manager is the backup')
    expect(rules[1]).toHaveTextContent('Information security sits beside Legal on anything that touches data.')
    expect(rules[1]).toHaveTextContent('a data-exposure incident is its own row')
    expect(rules[2]).toHaveTextContent('The receiver is the one who can fix it; the customer hears from one person.')
    expect(rules[2]).toHaveTextContent('a fix that does not recover the customer is a failed fix whatever the clock said')
    const legend = screen.getByTestId('matrix-legend')
    expect(legend).toHaveTextContent('1 h = the same hour; 4 h = the same half day; 9 h = one working day; 18 h = two; 27 h = three; 45 h = one week; 90 h = two weeks.')
    expect(legend).toHaveTextContent('"–" on the employee row: a management note has no resolve clock; the 60-day check measures it.')
    // the rules card is not in the table, and the tabs sit between the card and the table
    expect(title.compareDocumentPosition(screen.getByRole('table')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('says "Set 19 Nov · titles adjustable until 28 Nov" and has no [Proposed] and no "Confirm default" anywhere', async () => {
    await open()
    expect(screen.getByTestId('matrix-set-note')).toHaveTextContent('Set 19 Nov · titles adjustable until 28 Nov')
    expect(screen.queryAllByText('[Proposed]')).toHaveLength(0)
    expect(screen.queryByText(/proposals until/)).not.toBeInTheDocument()
    expect(screen.queryAllByRole('button', { name: /Confirm default/ })).toHaveLength(0)
    expect(screen.queryAllByText('Edited')).toHaveLength(0) // nothing is edited on a fresh sample
  })

  it('the CX manager gets an input in every cell of the eleven rows, labelled by row and column; the VIP rule row has none', async () => {
    await open()
    expect(screen.getByRole('textbox', { name: 'Process · First receiver' })).toHaveValue('Sales operations lead')
    expect(screen.getByRole('spinbutton', { name: 'Service and behaviour · Resolve (h)' })).toHaveValue(27)
    expect(screen.getByRole('spinbutton', { name: 'Employee · Respond (h)' })).toHaveValue(9)
    expect(screen.getByRole('spinbutton', { name: 'Employee · Resolve (h)' })).toHaveValue(null) // no resolve clock: a management note
    expect(screen.getByRole('textbox', { name: 'Data exposure or system access incident · First receiver' })).toHaveValue('Information Security lead (IT)')
    expect(screen.getAllByRole('textbox').length + screen.getAllByRole('spinbutton').length).toBe(55) // 11 rows x 5 cells
    expect(within(tableRows()[11]).queryAllByRole('textbox')).toHaveLength(0)
    expect(within(tableRows()[11]).queryAllByRole('spinbutton')).toHaveLength(0)
  })

  it('the VIP row is a rule: "½" in both clock cells (not 0.5 hours), the rule text in the others, and a note that it is fixed', async () => {
    await open()
    const vip = tableRows()[11]
    expect(within(vip).getAllByTestId('matrix-vip-factor').map((e) => e.textContent)).toEqual(['½', '½'])
    expect(vip).toHaveTextContent('Same receiver, clocks halved')
    expect(vip).toHaveTextContent('Head of the environment at once')
    expect(vip).toHaveTextContent('CX manager')
    expect(within(vip).getByTestId('matrix-rule-tag')).toHaveTextContent('Rule')
    expect(screen.getByTestId('matrix-vip-row-note')).toHaveTextContent('The last row is a rule, not a receiver: the clocks are halved for a VIP, so it is fixed.')
  })

  it('writes the four shopper and legal-case clocks in days, while the cell holds hours: "1 day" and "5 days"; the editor sees hours and the days beside them', async () => {
    await open()
    // the CX manager: the inputs hold the hours (9, 45) and the days are written beside them
    expect(screen.getByRole('spinbutton', { name: 'Shopper case · critical · Respond (h)' })).toHaveValue(9)
    expect(screen.getByRole('spinbutton', { name: 'Shopper case · critical · Resolve (h)' })).toHaveValue(45)
    expect(screen.getAllByTestId('matrix-days').map((e) => e.textContent)).toEqual(['1 day', '5 days', '1 day', '5 days'])
  })

  it('other roles read the same table with no inputs, a view-only note, and the cells as the document writes them', async () => {
    await open('/settings/escalation-matrix', 'cxteam')
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0)
    expect(screen.getByRole('note')).toHaveTextContent('View only')
    expect(within(tableRows()[3]).getByText('Sales operations lead')).toBeInTheDocument()
    const cells = (i: number) => within(tableRows()[i]).getAllByRole('cell').map((c) => c.textContent)
    expect(cells(0).slice(1)).toEqual(['Direct manager of the agent', '–', 'Head of the sales team (environment)', '9', '–'])
    expect(cells(8).slice(1)).toEqual(['CX team (triage)', 'Sales manager (environment)', 'HR pool (conduct)', '1 day', '5 days'])
    expect(cells(9).slice(1)).toEqual(['Legal', 'CX manager · Head of the environment', 'Information Security lead', '1 day', '5 days'])
    expect(cells(10).slice(1)).toEqual(['Information Security lead (IT)', 'Legal · CX manager', 'IT lead', '1', '9'])
    expect(screen.queryAllByText('[Proposed]')).toHaveLength(0)
  })

  it('the Internal Audit and Marketing Lead can edit too; Marketing reads only', async () => {
    await open('/settings/escalation-matrix', 'auditmkt')
    expect(screen.getByRole('textbox', { name: 'Process · First receiver' })).toBeEnabled()
  })

  it('Marketing (the manager role) has no inputs', async () => {
    await open('/settings/escalation-matrix', 'marketing')
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
    expect(screen.getByRole('note')).toHaveTextContent('View only')
  })

  it('?product=af opens After-Sales', async () => {
    await open('/settings/escalation-matrix?product=af')
    expect(screen.getByRole('button', { name: 'After-Sales' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'PSI Real Estate' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('textbox', { name: 'Environment · First receiver' })).toHaveValue('Property or community manager (PSI Assets)')
    expect(tableRows()).toHaveLength(12)
  })

  it('an unknown product falls back to Real Estate', async () => {
    await open('/settings/escalation-matrix?product=zz')
    expect(screen.getByRole('button', { name: 'PSI Real Estate' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('switching product shows that product’s own table: twelve rows each, the cells differ', async () => {
    await open()
    await userEvent.click(screen.getByRole('button', { name: 'PSI Wallet' }))
    expect(screen.getByRole('button', { name: 'PSI Wallet' })).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Process · First receiver' })).toHaveValue('Wallet operations lead'))
    expect(tableRows()).toHaveLength(12)
    expect(screen.getByRole('textbox', { name: 'Product and app · Informed' })).toHaveValue('Information Security lead · IT lead')
    expect(screen.getByRole('spinbutton', { name: 'Process · Respond (h)' })).toHaveValue(2)
  })

  it('reads in Arabic: the columns, the rules card, the Arabic titles and no [مقترح]', async () => {
    await open('/settings/escalation-matrix', 'cxmgr', 'ar')
    expect(screen.getByRole('columnheader', { name: 'المستلم الأول' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'الحل (ساعة)' })).toBeInTheDocument()
    expect(screen.getByText('ثلاث قواعد خلف الخلايا')).toBeInTheDocument()
    expect(within(screen.getByTestId('matrix-rules')).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByTestId('matrix-legend')).toHaveTextContent('المهل بساعات العمل (الاثنين إلى الجمعة، 09:00 إلى 18:00)')
    expect(screen.getByTestId('matrix-set-note')).toHaveTextContent('حُدّدت في 19 نوفمبر · المسمّيات قابلة للتعديل حتى 28 نوفمبر')
    expect(screen.queryAllByText('[مقترح]')).toHaveLength(0)
    expect(screen.getByRole('textbox', { name: 'عملية · المستلم الأول' })).toHaveValue('قائد عمليات المبيعات')
    expect(within(tableRows()[11]).getAllByTestId('matrix-vip-factor').map((e) => e.textContent)).toEqual(['½', '½'])
    expect(within(tableRows()[11]).getAllByRole('cell')[0]).toHaveTextContent('أي نوع، زبون VIP معني')
  })

  it('reads the day cells in Arabic for a role that only reads', async () => {
    await open('/settings/escalation-matrix', 'cxteam', 'ar')
    const cells = within(tableRows()[8]).getAllByRole('cell').map((c) => c.textContent)
    expect(cells.slice(-2)).toEqual(['يوم واحد', '5 أيام'])
  })
})

// These edit the shared sample store, so they run last.
describe('Escalation matrix: editing a cell', () => {
  it('saves a title on blur, marks that cell "Edited" and leaves the other products alone', async () => {
    await open()
    const input = screen.getByRole('textbox', { name: 'Process · First receiver' })
    await userEvent.clear(input)
    await userEvent.type(input, 'Head of Process Excellence')
    await userEvent.tab()
    await waitFor(() => expect(rowOf('re', 'process').edited.receiver).toBe(true))
    expect(rowOf('re', 'process').cells.receiver?.en).toBe('Head of Process Excellence')
    // the other language keeps its seeded form (typed in English)
    expect(rowOf('re', 'process').cells.receiver?.ar).toBe('قائد عمليات المبيعات')
    await waitFor(() => expect(screen.getAllByTestId('matrix-edited')).toHaveLength(1))
    expect(screen.getByTestId('matrix-edited')).toHaveTextContent('Edited')
    expect(screen.getByRole('textbox', { name: 'Process · First receiver' })).toHaveValue('Head of Process Excellence')
    // another product's cell is untouched
    expect(rowOf('af', 'process').edited.receiver).toBe(false)
    expect(rowOf('af', 'process').cells.receiver?.en).toBe('After-Sales operations lead')
    expect(screen.queryAllByText('[Proposed]')).toHaveLength(0)
  })

  it('an edited cell keeps its own marker when the person comes back to the tab', async () => {
    await open()
    expect(screen.getAllByTestId('matrix-edited')).toHaveLength(1)
    await userEvent.click(screen.getByRole('button', { name: 'After-Sales' }))
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Process · First receiver' })).toHaveValue('After-Sales operations lead'))
    expect(screen.queryAllByTestId('matrix-edited')).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: 'PSI Real Estate' }))
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Process · First receiver' })).toHaveValue('Head of Process Excellence'))
    expect(screen.getAllByTestId('matrix-edited')).toHaveLength(1)
  })

  it('saves a clock as a number of working hours, and an empty clock means none', async () => {
    await open()
    const resolve = screen.getByRole('spinbutton', { name: 'Service and behaviour · Resolve (h)' })
    await userEvent.clear(resolve)
    await userEvent.type(resolve, '18')
    await userEvent.tab()
    await waitFor(() => expect(rowOf('re', 'service').cells.resolveH).toBe(18))
    expect(rowOf('re', 'service').edited.resolveH).toBe(true)
    const respond = screen.getByRole('spinbutton', { name: 'Service and behaviour · Respond (h)' })
    await userEvent.clear(respond)
    await userEvent.tab()
    await waitFor(() => expect(rowOf('re', 'service').cells.respondH).toBeNull())
  })

  it('a clock written in days is edited as hours: the days beside the field go and the cell reads in hours', async () => {
    await open()
    expect(screen.getAllByTestId('matrix-days')).toHaveLength(4)
    const resolve = screen.getByRole('spinbutton', { name: 'Shopper case · critical · Resolve (h)' })
    await userEvent.clear(resolve)
    await userEvent.type(resolve, '27')
    await userEvent.tab()
    await waitFor(() => expect(rowOf('re', 'shopper_critical').cells.resolveH).toBe(27))
    expect(rowOf('re', 'shopper_critical').cells.asDays).toEqual({ respondH: true })
    await waitFor(() => expect(screen.getAllByTestId('matrix-days')).toHaveLength(3))
    // the same row for a role that reads: respond still in days, resolve in hours
    expect(rowOf('af', 'shopper_critical').cells.asDays).toEqual({ respondH: true, resolveH: true })
  })

  it('does nothing when the value is not changed', async () => {
    await open()
    const before = screen.getAllByTestId('matrix-edited').length
    const input = screen.getByRole('textbox', { name: 'Training gap · Backup' })
    await userEvent.click(input)
    await userEvent.tab()
    expect(screen.queryAllByTestId('matrix-edited')).toHaveLength(before)
    expect(rowOf('re', 'training').edited.backup).toBe(false)
  })

  it('an Internal Audit and Marketing Lead edit is saved the same way', async () => {
    await open('/settings/escalation-matrix?product=ev', 'auditmkt')
    const input = screen.getByRole('textbox', { name: 'Marketing · Informed' })
    await userEvent.clear(input)
    await userEvent.type(input, 'Head of Marketing Operations')
    await userEvent.tab()
    await waitFor(() => expect(rowOf('ev', 'marketing').cells.informed?.en).toBe('Head of Marketing Operations'))
    expect(rowOf('ev', 'marketing').edited.informed).toBe(true)
  })

  it('a fix of that kind reads the new Resolve (h): the due date of an approval follows the matrix', async () => {
    // service (18 working hours, edited above) is the row of the "service_behaviour" kind
    const { resolveHoursFor } = await import('@/services/fixClockStore')
    expect(resolveHoursFor({ product: 're', kind: 'service_behaviour' })).toBe(18)
    // the VIP rule halves it for a fix whose pattern has a VIP
    expect(resolveHoursFor({ product: 're', kind: 'service_behaviour', patternId: mock.MOCK_CORRECTIVE_ACTIONS[0].patternId })).toBe(9)
  })

  it('reads in Arabic after an edit: the marker is "مُعدَّل"', async () => {
    await open('/settings/escalation-matrix', 'cxmgr', 'ar')
    await waitFor(() => expect(screen.getAllByTestId('matrix-edited').length).toBeGreaterThan(0))
    expect(screen.getAllByTestId('matrix-edited')[0]).toHaveTextContent('مُعدَّل')
  })
})
