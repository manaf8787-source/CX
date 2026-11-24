import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'

/**
 * Sortable table columns (owner, 24 Nov: "an arrow I click to order them ascending or descending, numbers and percentages, on the
 * performance screens"). Click a column: highest first; click again: lowest first; a third click goes back to the table's own order.
 * Empty values (—) always go last.
 */
export type SortDir = 'asc' | 'desc'
export interface SortState<K extends string> {
  key: K | null
  dir: SortDir
}

export function useSort<T, K extends string>(rows: T[], get: (row: T, key: K) => number | string | null | undefined) {
  const [sort, setSort] = useState<SortState<K>>({ key: null, dir: 'desc' })
  const toggle = (key: K) => setSort((s) => (s.key !== key ? { key, dir: 'desc' } : s.dir === 'desc' ? { key, dir: 'asc' } : { key: null, dir: 'desc' }))
  const sorted = useMemo(() => {
    if (!sort.key) return rows
    const k = sort.key
    const sign = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const x = get(a, k)
      const y = get(b, k)
      if (x == null && y == null) return 0
      if (x == null) return 1
      if (y == null) return -1
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * sign
      return String(x).localeCompare(String(y)) * sign
    })
    // `get` is a plain accessor; re-sorting on its identity would re-sort every render
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort])
  return { sorted, sort, toggle }
}

export function SortHead<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  align = 'end',
  className,
}: {
  label: ReactNode
  sortKey: K
  sort: SortState<K>
  onSort: (key: K) => void
  align?: 'start' | 'end'
  className?: string
}) {
  const active = sort.key === sortKey
  const Icon = !active ? ArrowUpDown : sort.dir === 'desc' ? ArrowDown : ArrowUp
  return (
    <TableHead className={cn(align === 'end' && 'text-end', className)} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1 rounded-md outline-hidden hover:text-foreground focus-visible:ring-2',
          align === 'end' && 'flex-row-reverse',
          active && 'text-foreground',
        )}
      >
        <Icon aria-hidden className={cn('size-3.5 shrink-0', !active && 'opacity-40')} />
        <span>{label}</span>
      </button>
    </TableHead>
  )
}
