import { useState, type ReactNode } from 'react'
import {
  flexRender,
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
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import { EmptyState } from './EmptyState'
import { LoadingState } from './LoadingState'

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** 'end' for numbers (also turns on tabular figures). */
    align?: 'start' | 'end'
    headerClassName?: string
    cellClassName?: string
  }
}

interface DataTableProps<TData> {
  // TValue differs per column, so the array has to accept any of them.
  columns: ColumnDef<TData, any>[]
  data: TData[] | undefined
  isLoading?: boolean
  /** Shows a search box that filters across every column. */
  searchPlaceholder?: string
  /** Extra filter controls rendered beside the search box. */
  toolbar?: ReactNode
  /** Rows per page; 0 turns pagination off. */
  pageSize?: number
  initialSorting?: SortingState
  emptyTitle?: string
  emptyNote?: string
  onRowClick?: (row: TData) => void
  getRowId?: (row: TData) => string
  className?: string
}

/** shadcn DataTable pattern (Table + TanStack Table v8): sorting, global filter, pagination, empty/loading states. */
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
}: DataTableProps<TData>) {
  const { t } = useI18n()
  const [sorting, setSorting] = useState<SortingState>(initialSorting)
  const [globalFilter, setGlobalFilter] = useState('')

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

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-2">
          {searchPlaceholder && (
            <div className="relative w-full sm:w-72">
              <Search aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="h-9 ps-8"
              />
            </div>
          )}
          {toolbar}
        </div>
      )}

      {isLoading ? (
        <LoadingState rows={5} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader className="bg-muted/60">
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id} className="hover:bg-transparent">
                  {hg.headers.map((header) => {
                    const meta = header.column.columnDef.meta
                    return (
                      <TableHead
                        key={header.id}
                        aria-sort={
                          header.column.getIsSorted() === 'asc' ? 'ascending' : header.column.getIsSorted() === 'desc' ? 'descending' : undefined
                        }
                        className={cn('h-10 px-3 text-xs font-semibold text-muted-foreground', meta?.align === 'end' && 'text-end', meta?.headerClassName)}
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
                    className={cn(onRowClick && 'cursor-pointer outline-none focus-visible:bg-accent')}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn('px-3 py-2.5 text-sm', meta?.align === 'end' && 'text-end tabular-nums', meta?.cellClassName)}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns.length} className="p-4">
                    <EmptyState
                      className="border-0 bg-transparent py-6"
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

      {pageSize > 0 && !isLoading && table.getPageCount() > 1 && (
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span className="tabular-nums">
            {t(`${filteredCount} rows`, `${filteredCount} صفاً`)} · {t('Page', 'صفحة')} {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-9"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label={t('Previous page', 'الصفحة السابقة')}
            >
              <ChevronLeft aria-hidden className="rtl:rotate-180" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-9"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label={t('Next page', 'الصفحة التالية')}
            >
              <ChevronRight aria-hidden className="rtl:rotate-180" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Sortable column header: `header: ({ column }) => <SortableHeader column={column}>Label</SortableHeader>`. */
export function SortableHeader<TData, TValue>({ column, children }: { column: Column<TData, TValue>; children: ReactNode }) {
  const sorted = column.getIsSorted()
  const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown
  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      className="-mx-1 inline-flex h-8 items-center gap-1 rounded-md px-1 font-semibold outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {children}
      <Icon aria-hidden className={cn('size-3.5', !sorted && 'opacity-50')} />
    </button>
  )
}
