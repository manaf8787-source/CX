import { beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ColumnDef } from '@tanstack/react-table'
import { Phone } from 'lucide-react'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { SettingsSection } from '@/pages/settings/SubPageHeader'
import { DataTable } from './DataTable'
import { InlineNote } from './InlineNote'
import { KpiTile } from './KpiTile'
import { StackedRows } from './StackedRows'
import { StatusBadge } from './StatusBadge'
import { RouteTabs } from './Tabs'
import { TraceId } from './TraceId'
import { RankedBars } from './charts'

beforeAll(() => preferReducedMotion())

describe('InlineNote (the one shared note)', () => {
  it('is a well with a status dot; a title makes it an h2, the sentence is ink without one', () => {
    renderWithProviders(
      <>
        <InlineNote tone="warning" title="Group NPS: none">
          Each product has its own line.
        </InlineNote>
        <InlineNote>Plain sentence.</InlineNote>
      </>,
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Group NPS: none' })).toBeInTheDocument()
    const notes = document.querySelectorAll('[data-slot=inline-note]')
    expect(notes).toHaveLength(2)
    expect(notes[0].querySelector('.dot-warning')).not.toBeNull()
    expect(notes[1].querySelector('.dot-info')).not.toBeNull()
    expect(screen.getByText('Plain sentence.')).toHaveClass('text-foreground')
    expect(screen.getByText('Each product has its own line.')).toHaveClass('text-muted-foreground')
  })

  it('passes role, test id and the action through, and can be an aside', () => {
    renderWithProviders(
      <InlineNote as="aside" role="note" data-testid="note" tone="neutral" action={<button>Open</button>}>
        Text
      </InlineNote>,
    )
    const note = screen.getByTestId('note')
    expect(note.tagName).toBe('ASIDE')
    expect(note).toHaveAttribute('role', 'note')
    expect(within(note).getByRole('button', { name: 'Open' })).toBeInTheDocument()
  })
})

describe('KpiTile variants', () => {
  it('card is the default, well has no card, dark is the feature surface', () => {
    renderWithProviders(
      <>
        <KpiTile label="Card" value={1} />
        <KpiTile label="Well" value={2} variant="well" to="/actions/signals" />
        <KpiTile label="Dark" value={3} variant="dark" />
      </>,
    )
    const root = (label: string) => screen.getByText(label).closest('.group') as HTMLElement
    expect(root('Card')).toHaveClass('surface-card')
    expect(root('Well')).toHaveClass('well')
    expect(root('Well')).not.toHaveClass('surface-card')
    expect(screen.getByRole('link', { name: /Well/ })).toHaveClass('well')
    expect(root('Dark')).toHaveClass('surface-dark')
  })
})

describe('RankedBars layouts', () => {
  it('stacked puts the label and the printed value on one row above the track', () => {
    renderWithProviders(<RankedBars layout="stacked" label="Reasons" items={[{ label: 'Slow or missing follow-up after the first visit', value: 7, display: '7' }]} />)
    const row = within(screen.getByRole('list', { name: 'Reasons' })).getAllByRole('listitem')[0]
    expect(row).toHaveClass('flex-col')
    expect(within(row).getByText('Slow or missing follow-up after the first visit')).toHaveClass('break-words')
    expect(within(row).getByText('7')).toBeInTheDocument()
  })

  it('inline wraps a long label when asked and takes a label width', () => {
    renderWithProviders(<RankedBars wrap labelWidth="minmax(5rem,10rem)" label="Counts" items={[{ label: 'A long agent name', value: 2 }]} />)
    const row = within(screen.getByRole('list', { name: 'Counts' })).getAllByRole('listitem')[0]
    expect(row.style.gridTemplateColumns).toContain('minmax(5rem, 10rem)')
    expect(within(row).getByText('A long agent name')).not.toHaveClass('truncate')
  })
})

describe('StatusBadge dot and icon', () => {
  it('an explicit dot plus an icon draws both: dot, icon, label', () => {
    renderWithProviders(
      <StatusBadge tone="info" dot icon={<Phone data-testid="icon" />}>
        Facebook
      </StatusBadge>,
    )
    const badge = screen.getByText('Facebook').closest('[data-slot=status-badge]') as HTMLElement
    expect(badge.querySelector('.dot-info')).not.toBeNull()
    expect(within(badge).getByTestId('icon')).toBeInTheDocument()
  })
})

describe('Segmented variant="pressed"', () => {
  it('is a group of toggle buttons: aria-pressed, no radios, a click selects', async () => {
    const onChange = vi.fn()
    renderWithProviders(
      <Segmented
        variant="pressed"
        label="Filter by status"
        value="all"
        onValueChange={onChange}
        options={[
          { value: 'all', label: 'All', count: 4 },
          { value: 'late', label: 'Late', count: 1 },
        ]}
      />,
    )
    const group = screen.getByRole('group', { name: 'Filter by status' })
    expect(screen.queryByRole('radiogroup')).toBeNull()
    expect(within(group).getByRole('button', { name: /All/ })).toHaveAttribute('aria-pressed', 'true')
    expect(within(group).getByRole('button', { name: /Late/ })).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(within(group).getByRole('button', { name: /Late/ }))
    expect(onChange).toHaveBeenCalledWith('late')
  })

  it('the sliding pill watches aria-pressed (a pressed filter moves its pill)', () => {
    const observe = vi.spyOn(MutationObserver.prototype, 'observe')
    renderWithProviders(<Segmented variant="pressed" label="F" value="a" onValueChange={() => {}} options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} />)
    const filters = observe.mock.calls.map((c) => c[1]?.attributeFilter).filter(Boolean)
    expect(filters.some((f) => f?.includes('aria-pressed'))).toBe(true)
    observe.mockRestore()
  })
})

describe('Button roll', () => {
  it('rolls a plain text label by default and not with roll={false}', () => {
    render(
      <>
        <Button>Save</Button>
        <Button roll={false}>Cancel</Button>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('btn-rollable')
    expect(screen.getByRole('button', { name: 'Cancel' })).not.toHaveClass('btn-rollable')
  })
})

describe('TraceId surface', () => {
  it('the well surface is a white hairline tag, the default a grey one', () => {
    renderWithProviders(
      <>
        <TraceId kind="signal" id="sig-0007" plain />
        <TraceId kind="signal" id="sig-0008" plain surface="well" />
      </>,
    )
    const tags = document.querySelectorAll('[data-slot=trace-id]')
    expect(tags[0]).toHaveClass('bg-well')
    expect(tags[1]).toHaveClass('bg-card')
    expect(tags[1]).toHaveClass('shadow-hairline')
  })
})

describe('RouteTabs end', () => {
  it('end={false} keeps a tab current on its sub-paths', () => {
    renderWithProviders(
      <RouteTabs end={false} items={[{ path: '/customers', label: { en: 'Find a person', ar: 'ابحث عن شخص' } }, { path: '/runaway', label: { en: 'Who is leaving', ar: 'من يبتعد' } }]} />,
      { route: '/customers/p-005' },
    )
    expect(screen.getByRole('link', { name: 'Find a person' })).toHaveAttribute('aria-current', 'page')
  })

  it('the default is the exact path', () => {
    renderWithProviders(<RouteTabs items={[{ path: '/customers', label: { en: 'Find a person', ar: 'ابحث عن شخص' } }]} />, { route: '/customers/p-005' })
    expect(screen.getByRole('link', { name: 'Find a person' })).not.toHaveAttribute('aria-current')
  })
})

describe('SettingsSection actions slot', () => {
  it('puts the action beside the heading when stacked and under the description when split', () => {
    renderWithProviders(
      <>
        <SettingsSection title="Principles" description="Six of them" actions={<button>Open</button>}>
          body
        </SettingsSection>
        <SettingsSection title="Notices" layout="stacked" actions={<button>Edit</button>}>
          body
        </SettingsSection>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' }).closest('div')?.previousElementSibling?.tagName).toBe('H3')
  })
})

describe('DataTable pinned column and density', () => {
  interface Row {
    id: string
    name: string
  }
  const columns: ColumnDef<Row>[] = [
    { id: 'name', accessorKey: 'name', header: 'Name' },
    { id: 'act', header: 'Actions', meta: { sticky: 'end' }, cell: () => <button>Call</button> },
  ]

  it('meta.sticky pins the header and the cells of that column to the end edge', () => {
    renderWithProviders(<DataTable columns={columns} data={[{ id: '1', name: 'Rana' }]} getRowId={(r) => r.id} pageSize={0} />)
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toHaveClass('sticky', 'end-0')
    expect(screen.getByRole('button', { name: 'Call' }).closest('td')).toHaveClass('sticky', 'end-0')
    expect(screen.getByRole('columnheader', { name: 'Name' })).not.toHaveClass('sticky')
  })

  it('has no density attribute of its own, so it follows the page', () => {
    renderWithProviders(
      <div data-density="comfortable">
        <DataTable columns={columns} data={[{ id: '1', name: 'Rana' }]} getRowId={(r) => r.id} pageSize={0} />
      </div>,
    )
    expect(document.querySelector('[data-slot=table-container]')).not.toHaveAttribute('data-density')
  })

  it('takes its own density when asked', () => {
    renderWithProviders(<DataTable density="comfortable" columns={columns} data={[{ id: '1', name: 'Rana' }]} getRowId={(r) => r.id} pageSize={0} />)
    expect(document.querySelector('[data-slot=table-container]')).toHaveAttribute('data-density', 'comfortable')
  })
})

describe('StackedRows (the phone composition)', () => {
  it('shows the title, the key fields and the action, and the rest behind Details', async () => {
    renderWithProviders(
      <StackedRows
        label="Detractors"
        rows={[
          {
            id: 'r1',
            title: 'Omar Nasser',
            meta: <span>Critical</span>,
            end: <button>Call</button>,
            detail: [{ key: 'reason', label: 'Reason', value: 'Slow follow-up' }],
          },
        ]}
      />,
    )
    const list = screen.getByRole('list', { name: 'Detractors' })
    expect(within(list).getByText('Omar Nasser')).toBeInTheDocument()
    expect(within(list).getByText('Critical')).toBeInTheDocument()
    expect(within(list).getByRole('button', { name: 'Call' })).toBeInTheDocument()
    const toggle = within(list).getByRole('button', { name: 'Details' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(within(list).queryByText('Slow follow-up')).toBeNull()
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(within(list).getByText('Reason')).toBeInTheDocument()
    expect(within(list).getByText('Slow follow-up')).toBeInTheDocument()
  })

  it('a row with an onClick is one keyboard target and Enter runs it', async () => {
    const onClick = vi.fn()
    renderWithProviders(<StackedRows label="Rows" rows={[{ id: 'r1', title: 'Campaign', onClick }]} />)
    const item = screen.getByRole('listitem')
    item.focus()
    await userEvent.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
