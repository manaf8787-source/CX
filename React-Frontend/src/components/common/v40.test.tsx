import { beforeAll, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import * as mock from '@/services/mockData'
import { StepStrip } from './StepStrip'
import { NextBox } from './NextBox'
import { TraceId } from './TraceId'
import { AgentChip } from './AgentChip'
import { DayChip } from './DayChip'
import { ProposedBadge } from './ProposedBadge'
import { fixNext } from '@/data/steps'

beforeAll(() => preferReducedMotion())

describe('StepStrip (v40 F02)', () => {
  it('shows the six steps with names and titles, as links for a role that may open them', () => {
    renderWithProviders(<StepStrip />, { role: 'cxmgr' })
    const nav = screen.getByRole('navigation', { name: 'The six steps' })
    const links = within(nav).getAllByRole('link')
    expect(links).toHaveLength(6)
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/customers', '/actions/signals', '/actions/signals#patterns', '/actions/corrective', '/close-the-loop', '/overview'])
    expect(within(nav).getByText('1 Listen')).toBeInTheDocument()
    expect(within(nav).getByText('Every contact from every source lands on one person')).toBeInTheDocument()
    expect(links[0]).toHaveAttribute('title', 'Every contact from every source lands on one person')
  })

  it('marks the current step and every step before it as done, and none on Home', () => {
    const { unmount } = renderWithProviders(<StepStrip current="ca" />)
    expect(screen.getByRole('link', { name: /4 Fix/ })).toHaveAttribute('aria-current', 'step')
    expect(screen.getAllByRole('link').filter((l) => l.getAttribute('aria-current') === 'step')).toHaveLength(1)
    unmount()
    renderWithProviders(<StepStrip />)
    expect(screen.queryAllByRole('link').filter((l) => l.getAttribute('aria-current'))).toHaveLength(0)
  })

  it('the small variant shows names only', () => {
    renderWithProviders(<StepStrip size="small" current="sg" />)
    expect(screen.getByText('2 Signal')).toBeInTheDocument()
    expect(screen.queryByText('Every contact from every source lands on one person')).not.toBeInTheDocument()
  })

  it('never links to a page the role cannot open: plain text instead', () => {
    renderWithProviders(<StepStrip current="ev" />, { role: 'marketing' })
    // Marketing has Customers but not Actions, Close the loop or the Overview.
    expect(screen.getAllByRole('link').map((l) => l.getAttribute('href'))).toEqual(['/customers'])
    expect(screen.getByText('4 Fix')).toBeInTheDocument()
    expect(screen.getByText('6 Report')).toBeInTheDocument()
  })

  it('speaks Arabic', () => {
    renderWithProviders(<StepStrip />, { lang: 'ar' })
    expect(screen.getByRole('navigation', { name: 'الخطوات الست' })).toBeInTheDocument()
    expect(screen.getByText('1 نسمع')).toBeInTheDocument()
    expect(screen.getByText('كل تواصل من أي مصدر يصل إلى شخص واحد')).toBeInTheDocument()
  })
})

describe('NextBox (v40 F07)', () => {
  it('shows the small strip, "Next step:", the sentence and the due phrase', () => {
    renderWithProviders(<NextBox next={fixNext('proposed')} />)
    const box = screen.getByRole('region', { name: 'Next step' })
    expect(within(box).getByText('Next step:')).toBeInTheDocument()
    expect(within(box).getByText('The responsible manager approves, changes, rejects, or asks for an investigation')).toBeInTheDocument()
    expect(within(box).getByText('· within 5 working days')).toBeInTheDocument()
    expect(within(box).getByRole('link', { name: /4 Fix/ })).toHaveAttribute('aria-current', 'step')
  })

  it('shows who and an action when given', async () => {
    const onClick = vi.fn()
    renderWithProviders(<NextBox next={fixNext('effective')} who="Team manager" action={<button onClick={onClick}>Monthly pack</button>} />)
    expect(screen.getByText('· Team manager')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Monthly pack' }))
    expect(onClick).toHaveBeenCalledOnce()
    expect(screen.queryByText(/· at 60 days/)).not.toBeInTheDocument()
  })

  it('speaks Arabic', () => {
    renderWithProviders(<NextBox next={fixNext('verification')} />, { lang: 'ar' })
    expect(screen.getByText('الخطوة التالية:')).toBeInTheDocument()
    expect(screen.getByText('· عند 60 يوماً')).toBeInTheDocument()
  })
})

describe('TraceId (v40 F10, F12)', () => {
  const signal = mock.MOCK_SIGNALS.find((s) => s.kind === 'complaint')!
  const fix = mock.MOCK_CORRECTIVE_ACTIONS[0]

  it('shows the display id from an internal id, as a button that opens a signal', async () => {
    renderWithProviders(<TraceId kind="signal" id={signal.id} />)
    const button = await screen.findByRole('button', { name: /^Open SG-\d+$/ })
    expect(button).toHaveTextContent(/^SG-\d+$/)
    await userEvent.click(button)
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/'))
  })

  it('shows event, fix, check and pattern ids in their schemes', () => {
    renderWithProviders(
      <>
        <TraceId kind="event" id="i-0012" plain />
        <TraceId kind="fix" id={fix.id} plain />
        <TraceId kind="check" id={fix.id} plain />
        <TraceId kind="pattern" id="PT-204" plain />
        <TraceId kind="report" id="RP-2026-11" plain />
      </>,
    )
    for (const text of ['EV-12', 'CA-201', 'VR-201', 'PT-204', 'RP-2026-11']) expect(screen.getByText(text)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('a public mention keeps its PUB id', () => {
    renderWithProviders(<TraceId kind="signal" id="PUB-351" plain />)
    expect(screen.getByText('PUB-351')).toBeInTheDocument()
  })

  it('is plain text when the role may not open the record (no dead links)', async () => {
    renderWithProviders(<TraceId kind="fix" id={fix.id} />, { role: 'hrmgr' })
    await waitFor(() => expect(screen.getByText('CA-201')).toBeInTheDocument())
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('calls onOpen instead of navigating, and keeps extra text inside the button', async () => {
    const onOpen = vi.fn()
    renderWithProviders(
      <TraceId kind="event" id="i-0003" onOpen={onOpen}>
        <span>· call</span>
      </TraceId>,
    )
    await userEvent.click(screen.getByRole('button'))
    expect(onOpen).toHaveBeenCalledOnce()
    expect(screen.getByRole('button')).toHaveTextContent('EV-3· call')
  })
})

describe('AgentChip (v40 F33)', () => {
  it('"Agent 9 · Reporting" in English and "الوكيل 9 · التقارير" in Arabic', () => {
    const { unmount } = renderWithProviders(<AgentChip agent={9} />)
    expect(screen.getByText('Agent 9 · Reporting')).toBeInTheDocument()
    unmount()
    renderWithProviders(<AgentChip agent={9} />, { lang: 'ar' })
    expect(screen.getByText('الوكيل 9 · التقارير')).toBeInTheDocument()
  })

  it('the supervisor chip says how many checks passed', () => {
    const { unmount } = renderWithProviders(<AgentChip agent="supervisor" />)
    expect(screen.getByText('CX Supervisor: 6 checks passed')).toBeInTheDocument()
    unmount()
    renderWithProviders(<AgentChip agent="supervisor" checks={5} />, { lang: 'ar' })
    expect(screen.getByText('سوبرفايزر CX: اجتاز 5 فحوصات')).toBeInTheDocument()
  })
})

describe('DayChip (v40 F20, S7)', () => {
  it.each([
    [-40, 'wd', 'overdue'],
    [-3, 'wd', '3 working days late'],
    [-3, 'd', '3 days late'],
    [0, 'd', 'today'],
    [1, 'wd', '1 working days left'],
    [9, 'd', '9 days left'],
  ] as const)('%s %s reads "%s"', (daysLeft, unit, text) => {
    renderWithProviders(<DayChip daysLeft={daysLeft} unit={unit} />)
    expect(screen.getByText(text)).toBeInTheDocument()
  })

  it('shows nothing without a date, and speaks Arabic', () => {
    const { container, unmount } = renderWithProviders(<DayChip daysLeft={null} unit="d" />)
    expect(container.querySelectorAll('[class*="rounded-full"]')).toHaveLength(0)
    unmount()
    renderWithProviders(<DayChip daysLeft={4} unit="wd" />, { lang: 'ar' })
    expect(screen.getByText('متبقٍ 4 يوم عمل')).toBeInTheDocument()
  })
})

describe('ProposedBadge', () => {
  it('shows [Proposed] / [مقترح] with an explanation, and takes custom text', () => {
    const { unmount } = renderWithProviders(<ProposedBadge />)
    expect(screen.getByText('[Proposed]')).toBeInTheDocument()
    expect(screen.getByTitle('Suggested by the build, not confirmed by the owner.')).toBeInTheDocument()
    unmount()
    const again = renderWithProviders(<ProposedBadge>Defaults are proposals</ProposedBadge>)
    expect(screen.getByText('Defaults are proposals')).toBeInTheDocument()
    again.unmount()
    renderWithProviders(<ProposedBadge />, { lang: 'ar' })
    expect(screen.getByText('[مقترح]')).toBeInTheDocument()
  })
})
