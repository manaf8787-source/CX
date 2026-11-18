import { useState, type ReactNode } from 'react'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type RowData,
  type SortingState,
} from '@tanstack/react-table'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useViewportMode } from '@/components/layout/useViewportMode'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import { EmptyState } from './EmptyState'
import { LoadingState } from './LoadingState'
import { StackedRows, type StackedRow } from './StackedRows'

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** 'end' for numbers: right-aligned (mirrored in RTL), tabular figures, ink 500 (the skill's numeric column). */
    align?: 'start' | 'end'
    headerClassName?: string
    cellClassName?: string
    /**
     * Pins the column to the end (or start) edge of the table while the rest scrolls sideways: the row's action stays in reach on a wide
     * table (Close the loop has 11 columns). The cells get an opaque fill that follows the row's hover and selected tone.
     */
    sticky?: 'start' | 'end'
    /** Plain-text name of the column for the phone view's "Details" list, when the header is a component (a sort button). */
    label?: string
  }
}

interface DataTableProps<TData> {
  // TValue differs per column, so the array has to accept any of them.
  columns: ColumnDef<TData, any>[]
  data: TData[] | undefined
  isLoading?: boolean
  /** Shows a search box that filters across every column. */
  searchPlaceholder?: string
  /** Extra filter controls rendered beside the search box (a `Segmented` filter, light pill buttons for columns or export). */
  toolbar?: ReactNode
  /** Rows per page; 0 turns pagination off. */
  pageSize?: number
  initialSorting?: SortingState
  emptyTitle?: string
  emptyNote?: string
  onRowClick?: (row: TData) => void
  getRowId?: (row: TData) => string
  className?: string
  /**
   * Keeps the header in view while a long table scrolls (the table then scrolls inside a box of at most 70vh; use it for an unpaginated
   * list with many rows). The header is white and gains a 1px line once the rows scroll beneath it.
   */
  stickyHeader?: boolean
  /** Overrides the page's density for this table (default: follows `data-density` of the page). */
  density?: 'dense' | 'comfortable'
  /**
   * The phone composition (<= 809px): instead of a table that scrolls sideways, each row is two lines of the key fields plus its actions,
   * and the rest behind a "Details" toggle. Name the columns by id: `title` (line 1), `meta` (line 2), `end` (the row's actions) and
   * `detail` (behind the toggle). The cells are the table's own, so behaviour and text are the same. Without it the table scrolls.
   */
  phone?: { title: string; meta?: string[]; end?: string[]; detail?: string[] }
}

/**
 * The skill's table over TanStack Table v8: no outer border and no header fill, a 13px grey sentence-case header, one divider per row,
 * soft pill rows on hover, numeric columns right-aligned and tabular, sort buttons with a 12px chevron and `aria-sort` on the `th`, a
 * pager of 32px round buttons with a dark current page, the empty and loading states. The table scrolls sideways on a narrow screen.
 * Density: follows the page (`data-density`: rows 44 dense, 60 comfortable). A column with `meta.sticky` is pinned to the edge. Put it in a `SectionCard` (or on the page); never wrap it in a border.
 */

// flexRender treats a function as a component type. Pages rebuild their columns on each
// render, so every cell remounted on any state change (dropping focus, e.g. when a
// dialog opened from a row closed). Renderers here are plain functions: call them.
function renderSlot<P>(slot: unknown, props: P): ReactNode {
  return typeof slot === 'function' ? (slot as (p: P) => ReactNode)(props) : (slot as ReactNode)
}

/** 1 … 4 5 6 … 12: the first and last page, the current one and its neighbours, gaps as an ellipsis. */
function pageWindow(current: number, count: number): (number | 'gap-start' | 'gap-end')[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i)
  const out: (number | 'gap-start' | 'gap-end')[] = [0]
  if (current > 2) out.push('gap-start')
  for (let i = Math.max(1, current - 1); i <= Math.min(count - 2, current + 1); i++) out.push(i)
  if (current < count - 3) out.push('gap-end')
  out.push(count - 1)
  return out
}

/** 32px round pager buttons: prev and next are the light material, the current page the dark material, other pages are plain until hovered. */
const PAGER_BASE =
  'inline-grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-sm font-medium tabular outline-hidden transition-[opacity,background-color] duration-200 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-3'
const PAGER_ARROW = PAGER_BASE + ' material-light hover:opacity-80'

/** A pinned column: sticky to its edge with an opaque fill (the row hover and selected tones are applied to `td` by the row, with higher specificity). */
const PINNED = { start: 'sticky start-0 z-[1] bg-card', end: 'sticky end-0 z-[1] bg-card' } as const
/** The header cell of a pinned column sits above the pinned body cells; with `stickyHeader` the header already has z-10 and top-0. */
const PINNED_HEAD = { start: 'sticky start-0 bg-card', end: 'sticky end-0 bg-card' } as const

export function DataTable<TData>({
  columns,
  data,
  isLoading,
  searchPlaceholder,
  toolbar,
  pageSize = 10,
  initialSorting = [],
  emptyTitle,
  emptyNote,
  onRowClick,
  getRowId,
  className,
  stickyHeader,
  density,
  phone,
}: DataTableProps<TData>) {
  const { t } = useI18n()
  const stacked = useViewportMode() === 'phone' && phone !== undefined
  const [sorting, setSorting] = useState<SortingState>(initialSorting)
  const [globalFilter, setGlobalFilter] = useState('')
  const [scrolled, setScrolled] = useState(false)

  // oxlint-disable-next-line react/incompatible-library -- table functions are not passed to memoized children here
  const table = useReactTable({
    data: data ?? [],
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(pageSize > 0 ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    initialState: pageSize > 0 ? { pagination: { pageSize, pageIndex: 0 } } : undefined,
    getRowId,
  })

  const rows = table.getRowModel().rows
  const filteredCount = table.getFilteredRowModel().rows.length
  const showToolbar = searchPlaceholder || toolbar
  const pageIndex = table.getState().pagination.pageIndex
  const pageCount = table.getPageCount()
  const rangeFrom = filteredCount === 0 ? 0 : pageIndex * pageSize + 1
  const rangeTo = Math.min(filteredCount, (pageIndex + 1) * pageSize)

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-2">
          {searchPlaceholder && (
            <div className="relative w-full sm:w-72">
              <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="h-9 ps-9"
              />
            </div>
          )}
          {toolbar}
        </div>
      )}

      {isLoading ? (
        <LoadingState rows={5} />
      ) : stacked && rows.length ? (
        <StackedRows
          label={searchPlaceholder ?? t('Rows', 'الصفوف')}
          rows={rows.map((row): StackedRow => {
            const cells = new Map(row.getVisibleCells().map((c) => [c.column.id, c]))
            const cell = (id: string) => {
              const c = cells.get(id)
              return c ? renderSlot(c.column.columnDef.cell, c.getContext()) : null
            }
            const label = (id: string): ReactNode => {
              const column = cells.get(id)?.column
              const header = column?.columnDef.header
              return column?.columnDef.meta?.label ?? (typeof header === 'string' ? header : id)
            }
            return {
              id: row.id,
              title: cell(phone.title),
              meta: phone.meta?.map((id) => <span key={id}>{cell(id)}</span>),
              end: phone.end?.map((id) => <span key={id}>{cell(id)}</span>),
              detail: phone.detail?.map((id) => ({ key: id, label: label(id), value: cell(id) })),
              onClick: onRowClick ? () => onRowClick(row.original) : undefined,
            }
          })}
        />
      ) : (
        <div
          data-scrolled={scrolled || undefined}
          // scroll events do not bubble: capture the one from the table's scroll box to know when rows pass under the sticky header
          onScrollCapture={stickyHeader ? (e) => setScrolled((e.target as HTMLElement).scrollTop > 0) : undefined}
          className="group/data-table px-1"
        >
          <Table density={density} containerClassName={stickyHeader ? 'max-h-[min(70vh,640px)] overflow-y-auto' : undefined}>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id} className="row-divider-none h-auto">
                  {hg.headers.map((header) => {
                    const meta = header.column.columnDef.meta
                    return (
                      <TableHead
                        key={header.id}
                        aria-sort={
                          header.column.getIsSorted() === 'asc' ? 'ascending' : header.column.getIsSorted() === 'desc' ? 'descending' : undefined
                        }
                        className={cn(
                          meta?.align === 'end' && 'text-end',
                          meta?.sticky && PINNED_HEAD[meta.sticky],
                          meta?.sticky && !stickyHeader && 'z-[2]',
                          stickyHeader && 'sticky top-0 z-10 bg-card transition-shadow duration-200 group-data-[scrolled]/data-table:shadow-[0_1px_0_var(--line)]',
                          meta?.headerClassName,
                        )}
                      >
                        {header.isPlaceholder ? null : renderSlot(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === 'Enter') onRowClick(row.original)
                          }
                        : undefined
                    }
                    tabIndex={onRowClick ? 0 : undefined}
                    className={cn(onRowClick && 'cursor-pointer outline-hidden focus-visible:[&>td]:bg-row-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring')}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta
                      return (
                        <TableCell key={cell.id} className={cn(meta?.align === 'end' && 'text-end font-medium tabular text-foreground', meta?.sticky && PINNED[meta.sticky], meta?.cellClassName)}>
                          {renderSlot(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow className="row-divider-none [&:hover>td]:bg-transparent!">
                  <TableCell colSpan={columns.length} className="p-2 whitespace-normal">
                    <EmptyState
                      className="py-4"
                      title={globalFilter ? t('No rows match your search', 'لا توجد صفوف مطابقة لبحثك') : (emptyTitle ?? t('Nothing here yet', 'لا شيء هنا بعد'))}
                      note={globalFilter ? undefined : emptyNote}
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {pageSize > 0 && !isLoading && pageCount > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1 text-sm text-muted-foreground">
          <span className="tabular">
            {t(`${rangeFrom}–${rangeTo} of ${filteredCount}`, `${rangeFrom}–${rangeTo} من ${filteredCount}`)}
          </span>
          <nav aria-label={t('Pagination', 'ترقيم الصفحات')} className="flex items-center gap-1">
            <button type="button" className={PAGER_ARROW} onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label={t('Previous page', 'الصفحة السابقة')}>
              <ChevronLeft aria-hidden className="rtl:rotate-180" />
            </button>
            <span className="hidden items-center gap-1 sm:flex">
              {pageWindow(pageIndex, pageCount).map((p) =>
                typeof p === 'string' ? (
                  <span key={p} aria-hidden className="grid size-8 place-items-center">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => table.setPageIndex(p)}
                    aria-label={t(`Page ${p + 1}`, `صفحة ${p + 1}`)}
                    aria-current={p === pageIndex ? 'page' : undefined}
                    className={cn(PAGER_BASE, p === pageIndex ? 'material-dark' : 'hover:bg-(--hover-tint)')}
                  >
                    {p + 1}
                  </button>
                ),
              )}
            </span>
            <button type="button" className={PAGER_ARROW} onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label={t('Next page', 'الصفحة التالية')}>
              <ChevronRight aria-hidden className="rtl:rotate-180" />
            </button>
          </nav>
        </div>
      )}
    </div>
  )
}

/**
 * Sortable column header: `header: ({ column }) => <SortableHeader column={column}>Label</SortableHeader>`. A 12px chevron shows on hover,
 * on focus and while the column is sorted; the `th` carries `aria-sort` (DataTable sets it) and turns ink.
 */
export function SortableHeader<TData, TValue>({ column, children }: { column: Column<TData, TValue>; children: ReactNode }) {
  const sorted = column.getIsSorted()
  const Icon = sorted === 'asc' ? ChevronUp : sorted === 'desc' ? ChevronDown : ChevronsUpDown
  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      className="group/sort -mx-1.5 inline-flex h-8 cursor-pointer items-center gap-1 rounded-md px-1.5 outline-hidden hover:text-foreground"
    >
      {children}
      <Icon aria-hidden className={cn('size-3 transition-opacity duration-200', sorted ? 'opacity-100' : 'opacity-0 group-hover/sort:opacity-100 group-focus-visible/sort:opacity-100')} />
    </button>
  )
}
