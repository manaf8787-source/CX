import { beforeAll, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ColumnDef } from '@tanstack/react-table'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import { KpiTile } from './KpiTile'
import { DataTable, SortableHeader } from './DataTable'

beforeAll(() => preferReducedMotion())

describe('KpiTile', () => {
  it('shows the label and the final value (instantly under reduced motion)', () => {
    renderWithProviders(<KpiTile label="Open actions" value={42} sub="this month" />)
    expect(screen.getByText('Open actions')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('this month')).toBeInTheDocument()
  })
  it('keeps the suffix of a formatted value', () => {
    renderWithProviders(<KpiTile label="Recovered" value="71%" />)
    expect(screen.getByText('71%')).toBeInTheDocument()
  })
  it('is a link when given `to`', () => {
    renderWithProviders(<KpiTile label="Signals" value={3} to="/actions/signals" />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/actions/signals')
  })
  it('is a button when given `onClick`', async () => {
    const onClick = vi.fn()
    renderWithProviders(<KpiTile label="Cases" value={1} onClick={onClick} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })
  it('shows a skeleton instead of the value while loading', () => {
    renderWithProviders(<KpiTile label="Loading tile" value={99} loading />)
    expect(screen.queryByText('99')).not.toBeInTheDocument()
  })
})

interface Row {
  name: string
  score: number
}
const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: 'name', header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader> },
  { accessorKey: 'score', header: ({ column }) => <SortableHeader column={column}>Score</SortableHeader> },
]
const rows: Row[] = [
  { name: 'Charlie', score: 2 },
  { name: 'Alpha', score: 9 },
  { name: 'Bravo', score: 5 },
]
const bodyNames = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[0].textContent)

describe('DataTable', () => {
  it('sorts ascending then descending when a header is clicked', async () => {
    renderWithProviders(<DataTable columns={columns} data={rows} pageSize={0} />)
    expect(bodyNames()).toEqual(['Charlie', 'Alpha', 'Bravo'])
    await userEvent.click(screen.getByRole('button', { name: 'Name' }))
    expect(bodyNames()).toEqual(['Alpha', 'Bravo', 'Charlie'])
    expect(screen.getAllByRole('columnheader')[0]).toHaveAttribute('aria-sort', 'ascending')
    await userEvent.click(screen.getByRole('button', { name: 'Name' }))
    expect(bodyNames()).toEqual(['Charlie', 'Bravo', 'Alpha'])
  })
  it('filters across columns from the search box', async () => {
    renderWithProviders(<DataTable columns={columns} data={rows} searchPlaceholder="Search people" pageSize={0} />)
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search people' }), 'bra')
    expect(bodyNames()).toEqual(['Bravo'])
  })
  it('shows the empty state for no data, and a search-specific one for no matches', async () => {
    const { unmount } = renderWithProviders(<DataTable columns={columns} data={[]} emptyTitle="Nothing here" pageSize={0} />)
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
    unmount()
    renderWithProviders(<DataTable columns={columns} data={rows} searchPlaceholder="Search" emptyTitle="Nothing here" pageSize={0} />)
    await userEvent.type(screen.getByRole('searchbox'), 'zzz')
    expect(screen.getByText('No rows match your search')).toBeInTheDocument()
  })
  it('paginates', async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ name: `P${String(i).padStart(2, '0')}`, score: i }))
    renderWithProviders(<DataTable columns={columns} data={many} pageSize={5} />)
    expect(bodyNames()).toHaveLength(5)
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(bodyNames()[0]).toBe('P05')
  })
  it('calls onRowClick with the row', async () => {
    const onRowClick = vi.fn()
    renderWithProviders(<DataTable columns={columns} data={rows} pageSize={0} onRowClick={onRowClick} />)
    await userEvent.click(screen.getByText('Alpha'))
    expect(onRowClick).toHaveBeenCalledWith(rows[1])
  })
})
