import { beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ColumnDef } from '@tanstack/react-table'
import { Inbox } from 'lucide-react'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import { ACTIONS_TABS } from '@/data/nav'
import { DataTable, SortableHeader } from './DataTable'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { KpiTile } from './KpiTile'
import { LoadingState } from './LoadingState'
import { PageHeader } from './PageHeader'
import { SectionCard } from './SectionCard'
import { StatusBadge } from './StatusBadge'
import { StepStrip } from './StepStrip'
import { RouteTabs } from './Tabs'
import { TermHelp } from './TermHelp'
import { ThemeSwitch } from './ThemeSwitch'
import { LangSwitch } from './LangSwitch'
import { ChartLegend, ChartTooltip, RankedBars } from './charts'
import { CHART_MAX_CATEGORIES, chartColor } from './chartTheme'

beforeAll(() => preferReducedMotion())

describe('StatusBadge', () => {
  it('quiet tones carry a status dot, attention tones are tinted and carry none unless asked', () => {
    renderWithProviders(
      <>
        <StatusBadge tone="success">Effective</StatusBadge>
        <StatusBadge tone="danger">Failed</StatusBadge>
        <StatusBadge tone="warning" dot>
          Late
        </StatusBadge>
        <StatusBadge tone="neutral">Draft</StatusBadge>
      </>,
    )
    const badge = (text: string) => screen.getByText(text).closest('[data-slot=status-badge]') as HTMLElement
    expect(badge('Effective').querySelector('.dot')).not.toBeNull()
    expect(badge('Failed').querySelector('.dot')).toBeNull()
    expect(badge('Late').querySelector('.dot')).not.toBeNull()
    expect(badge('Draft').querySelector('.dot')).toBeNull()
    expect(badge('Failed')).toHaveAttribute('data-tone', 'danger')
  })

  it('an icon replaces the dot, and the dot is hidden from assistive technology', () => {
    renderWithProviders(
      <StatusBadge tone="info" icon={<Inbox data-testid="icon" />}>
        New
      </StatusBadge>,
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByText('New').closest('[data-slot=status-badge]')!.querySelector('.dot')).toBeNull()
  })
})

describe('PageHeader', () => {
  it('has one h1, a description, the sample-data state, the terms button and the actions last', () => {
    renderWithProviders(<PageHeader title="Signals" description="What hurt a customer" actions={<button>Add signal</button>} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Signals' })).toBeInTheDocument()
    expect(screen.getByText('What hurt a customer')).toBeInTheDocument()
    expect(screen.getByText('Sample data — nothing is sent')).toBeInTheDocument()
    const buttons = screen.getAllByRole('button').map((b) => b.textContent)
    expect(buttons.at(-1)).toBe('Add signal')
    expect(buttons).toContain('What the terms mean')
  })

  it('can leave out the sample-data state', () => {
    renderWithProviders(<PageHeader title="Login" sample={false} />)
    expect(screen.queryByText('Sample data — nothing is sent')).not.toBeInTheDocument()
  })
})

describe('KpiTile (skill card)', () => {
  it('shows a unit, a delta tag and a well with children', () => {
    renderWithProviders(
      <KpiTile label="Recovered" value={71} unit="%" delta="+4.2%">
        <span>Chart here</span>
      </KpiTile>,
    )
    expect(screen.getByText('71')).toBeInTheDocument()
    expect(screen.getByText('%')).toBeInTheDocument()
    expect(screen.getByText('+4.2%')).toBeInTheDocument()
    expect(screen.getByText('Chart here').closest('.well')).not.toBeNull()
  })

  it('an accent is a status dot before the label, not a tint', () => {
    renderWithProviders(<KpiTile label="Late" value={3} accent="var(--destructive)" />)
    const label = screen.getByText('Late')
    expect(label.querySelector('.dot')).not.toBeNull()
    renderWithProviders(<KpiTile label="Plain" value={3} />)
    expect(screen.getByText('Plain').querySelector('.dot')).toBeNull()
  })

  it('keeps the "?" beside the tile, not inside a link', () => {
    renderWithProviders(<KpiTile term="NPS" label="NPS" value={29} to="/overview" />)
    const link = screen.getByRole('link')
    expect(within(link).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /What NPS means/ })).toBeInTheDocument()
  })
})

describe('SectionCard', () => {
  it('passes density down and can put its content in a well', () => {
    const { container } = renderWithProviders(
      <SectionCard title="Volume" density="dense" well>
        <span>Inside</span>
      </SectionCard>,
    )
    expect(container.querySelector('[data-slot=card]')).toHaveAttribute('data-density', 'dense')
    expect(screen.getByText('Inside').closest('.well')).not.toBeNull()
    expect(screen.getByText('Volume')).toBeInTheDocument()
  })
})

describe('StepStrip (stepper)', () => {
  it('draws a check for every completed step and none for the current one', () => {
    const { container } = renderWithProviders(<StepStrip current="ca" />)
    // 1 Listen, 2 Signal, 3 Pattern are done: three check circles, all decorative
    expect(container.querySelectorAll('svg.lucide-check')).toHaveLength(3)
    expect(screen.getByRole('link', { name: /4 Fix/ })).toHaveAttribute('aria-current', 'step')
  })
})

describe('RouteTabs', () => {
  it('marks the current tab with aria-current and lists every tab as a link', () => {
    renderWithProviders(<RouteTabs items={ACTIONS_TABS} label="Actions sections" />, { route: '/actions/signals' })
    const nav = screen.getByRole('navigation', { name: 'Actions sections' })
    const links = within(nav).getAllByRole('link')
    expect(links).toHaveLength(ACTIONS_TABS.length)
    expect(within(nav).getByRole('link', { name: 'Signals & patterns' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'AI Insights' })).not.toHaveAttribute('aria-current')
  })
})

interface Row {
  name: string
  score: number
}
const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: 'name', header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader> },
  { accessorKey: 'score', header: ({ column }) => <SortableHeader column={column}>Score</SortableHeader>, meta: { align: 'end' } },
]
const many: Row[] = Array.from({ length: 23 }, (_, i) => ({ name: `P${String(i).padStart(2, '0')}`, score: i }))

describe('DataTable (skill table)', () => {
  it('pages with numbered buttons: the current page is aria-current, the range is printed, prev and next follow', async () => {
    renderWithProviders(<DataTable columns={columns} data={many} pageSize={10} />)
    const pager = screen.getByRole('navigation', { name: 'Pagination' })
    expect(within(pager).getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('1–10 of 23')).toBeInTheDocument()
    expect(within(pager).getByRole('button', { name: 'Previous page' })).toBeDisabled()
    await userEvent.click(within(pager).getByRole('button', { name: 'Page 3' }))
    expect(screen.getByText('21–23 of 23')).toBeInTheDocument()
    expect(within(pager).getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page')
    expect(within(pager).getByRole('button', { name: 'Next page' })).toBeDisabled()
    expect(screen.getByText('P20')).toBeInTheDocument()
  })

  it('has no pager when everything fits on one page', () => {
    renderWithProviders(<DataTable columns={columns} data={many.slice(0, 5)} pageSize={10} />)
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
  })

  it('announces the sorted column with aria-sort and clears it on the others', async () => {
    renderWithProviders(<DataTable columns={columns} data={many} pageSize={0} />)
    const [name, score] = screen.getAllByRole('columnheader')
    await userEvent.click(within(name).getByRole('button', { name: 'Name' }))
    expect(name).toHaveAttribute('aria-sort', 'ascending')
    expect(score).not.toHaveAttribute('aria-sort')
    await userEvent.click(within(name).getByRole('button', { name: 'Name' }))
    expect(name).toHaveAttribute('aria-sort', 'descending')
    // a numeric column sorts largest first, then flips; clicking another column moves the announcement
    await userEvent.click(within(score).getByRole('button', { name: 'Score' }))
    expect(score).toHaveAttribute('aria-sort', 'descending')
    expect(name).not.toHaveAttribute('aria-sort')
  })

  it('opens a row with Enter when rows are clickable', async () => {
    const onRowClick = vi.fn()
    renderWithProviders(<DataTable columns={columns} data={many.slice(0, 3)} pageSize={0} onRowClick={onRowClick} />)
    const row = screen.getByText('P01').closest('tr') as HTMLElement
    row.focus()
    await userEvent.keyboard('{Enter}')
    expect(onRowClick).toHaveBeenCalledWith(many[1])
  })

  it('shows the empty state inside the table, and a skeleton while loading', () => {
    const { unmount } = renderWithProviders(<DataTable columns={columns} data={[]} emptyTitle="Nothing here" emptyNote="Add a person" />)
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
    expect(screen.getByText('Add a person')).toBeInTheDocument()
    unmount()
    renderWithProviders(<DataTable columns={columns} data={undefined} isLoading />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
  })
})

describe('EmptyState, ErrorState, LoadingState', () => {
  it('EmptyState: title, note and one action; the dot-grid motif is hidden from assistive technology', () => {
    const { container } = render(<EmptyState title="No signals" note="Nothing crossed the line" action={<button>Add one</button>} />)
    expect(screen.getByText('No signals')).toBeInTheDocument()
    expect(screen.getByText('Nothing crossed the line')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add one' })).toBeInTheDocument()
    expect(container.querySelector('[aria-hidden=true] .size-2\\.5')).not.toBeNull()
  })

  it('ErrorState: an alert with the message and one Try again', async () => {
    const onRetry = vi.fn()
    renderWithProviders(<ErrorState error={new Error('Feed timed out')} onRetry={onRetry} />)
    const alert = screen.getByRole('alert')
    expect(within(alert).getByText('This section could not load')).toBeInTheDocument()
    expect(within(alert).getByText('Feed timed out')).toBeInTheDocument()
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('ErrorState without a retry has no button', () => {
    renderWithProviders(<ErrorState title="Could not save" />)
    expect(within(screen.getByRole('alert')).queryByRole('button')).not.toBeInTheDocument()
  })

  it('LoadingState: a polite status that says Loading, and one block per row', () => {
    const { container } = renderWithProviders(<LoadingState rows={4} />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    expect(container.querySelectorAll('[data-slot=skeleton]').length).toBeGreaterThanOrEqual(4)
  })
})

describe('TermHelp', () => {
  it('opens the definition in a popover from a named button', async () => {
    renderWithProviders(<TermHelp term="NPS" />)
    const button = screen.getByRole('button', { name: /What NPS means/ })
    await userEvent.click(button)
    expect(await screen.findByText(/how likely are you to recommend PSI/)).toBeInTheDocument()
  })

  it('renders nothing for a term that is not in the glossary', () => {
    const { container } = renderWithProviders(<TermHelp term="Nonexistent term" />)
    expect(container.querySelector('button')).toBeNull()
  })
})

describe('ThemeSwitch and LangSwitch', () => {
  it('ThemeSwitch: choosing Dark puts the dark class on the page', async () => {
    renderWithProviders(<ThemeSwitch />)
    await userEvent.click(screen.getByRole('button', { name: 'Theme' }))
    await userEvent.click(await screen.findByRole('menuitemradio', { name: 'Dark' }))
    expect(document.documentElement).toHaveClass('dark')
    await userEvent.click(screen.getByRole('button', { name: 'Theme' }))
    await userEvent.click(await screen.findByRole('menuitemradio', { name: 'Light' }))
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('LangSwitch: names the language you switch TO and switches', async () => {
    renderWithProviders(<LangSwitch />)
    const button = screen.getByRole('button', { name: /Switch to Arabic/ })
    await userEvent.click(button)
    expect(document.documentElement.lang).toBe('ar')
    expect(screen.getByRole('button', { name: /English/ })).toBeInTheDocument()
  })
})

describe('chart helpers', () => {
  it('never hands out a fifth categorical colour: past four it returns the "rest" grey', () => {
    expect(CHART_MAX_CATEGORIES).toBe(4)
    expect([0, 1, 2, 3].map(chartColor)).toEqual(['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'])
    expect(chartColor(4)).toBe('var(--chart-5)')
  })

  it('ChartTooltip prints the label and a row per series with formatted values; inactive renders nothing', () => {
    const { container, rerender } = render(<ChartTooltip active label="Mon" payload={[{ name: 'Signals', value: 1234, color: 'var(--chart-1)' }, { name: 'Hidden', value: 1, hide: true }]} />)
    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByText('Signals')).toBeInTheDocument()
    expect(screen.getByText('1,234')).toBeInTheDocument()
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
    rerender(<ChartTooltip active={false} label="Mon" payload={[{ name: 'Signals', value: 1 }]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('ChartLegend reads explicit items or Recharts payload', () => {
    const { rerender } = render(<ChartLegend items={[{ label: 'Dubai', color: 'var(--chart-1)' }, { label: 'Abu Dhabi', color: 'var(--chart-2)' }]} />)
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Dubai', 'Abu Dhabi'])
    rerender(<ChartLegend payload={[{ value: 'Signals', color: 'var(--chart-3)' }]} />)
    expect(screen.getByText('Signals')).toBeInTheDocument()
  })

  it('RankedBars is a named list that prints every value; the first row is the hero', () => {
    render(
      <RankedBars
        label="Signals by source"
        items={[
          { label: 'WhatsApp', value: 40 },
          { label: 'Email', value: 20, display: '20 mails' },
          { label: 'Walk-in', value: 10 },
        ]}
      />,
    )
    const list = screen.getByRole('list', { name: 'Signals by source' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    expect(within(list).getByText('40')).toBeInTheDocument()
    expect(within(list).getByText('20 mails')).toBeInTheDocument()
    const fills = list.querySelectorAll<HTMLElement>('[aria-hidden=true] > span')
    expect(fills[0].style.width).toBe('100%')
    expect(fills[1].style.width).toBe('50%')
    expect(fills[0].className).toContain('material-dark')
    expect(fills[1].className).not.toContain('material-dark')
  })
})
