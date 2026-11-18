import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

export interface StackedRow {
  id: string
  /** Line 1: the name or the sentence (ink 500, wraps). */
  title: ReactNode
  /** Line 2: the key fields as small tags and text (wraps). */
  meta?: ReactNode
  /** The row's own actions (the main button). */
  end?: ReactNode
  /** The rest of the fields, behind the row's "Details" toggle: a label (grey) and a value each. */
  detail?: { key: string; label: ReactNode; value: ReactNode }[]
  /** The whole row is a button (a table row that navigates). */
  onClick?: () => void
  /** Extra attributes for the `li` (`data-kind`, `data-priority`). */
  attrs?: Record<string, string | number | undefined>
}

/**
 * The phone composition of a table (<= 809px): one list item per row, two lines of the key fields, the actions, and the remaining
 * columns behind a "Details" toggle. Same data and same controls as the table, not a second copy of the page: it replaces the table
 * on a phone (see `DataTable phone` and `Inbox`), so a wide table never scrolls sideways there.
 */
export function StackedRows({ rows, label, className }: { rows: StackedRow[]; label: string; className?: string }) {
  const { t } = useI18n()
  return (
    <ul aria-label={label} data-slot="stacked-rows" className={cn('flex flex-col', className)}>
      {rows.map((row) => (
        <li
          key={row.id}
          {...row.attrs}
          onClick={row.onClick}
          onKeyDown={row.onClick ? (e) => e.key === 'Enter' && row.onClick?.() : undefined}
          tabIndex={row.onClick ? 0 : undefined}
          className={cn('row-divider flex flex-col gap-2 py-3.5 first:pt-1 last:pb-1', row.onClick && 'cursor-pointer outline-hidden')}
        >
          <div className="min-w-0 text-sm font-medium text-foreground">{row.title}</div>
          {row.meta && <div className="flex flex-wrap items-start gap-x-3 gap-y-2 text-sm text-muted-foreground">{row.meta}</div>}
          {row.detail && row.detail.length > 0 ? (
            <Collapsible className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">{row.end}</div>
                <CollapsibleTrigger
                  onClick={(e) => e.stopPropagation()}
                  className="group/details -me-2 inline-flex h-8 cursor-pointer items-center gap-1 rounded-full px-2.5 text-sm font-medium text-muted-foreground outline-hidden transition-colors duration-200 hover:text-foreground"
                >
                  {t('Details', 'التفاصيل')}
                  <ChevronDown aria-hidden className="size-3.5 transition-transform duration-400 ease-spring group-data-[state=open]/details:rotate-180" />
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <dl className="well grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-3 p-3.5 text-sm">
                  {row.detail.map((d) => (
                    <div key={d.key} className="col-span-2 grid grid-cols-subgrid items-start">
                      <dt className="t-body-s">{d.label}</dt>
                      <dd className="min-w-0 text-foreground">{d.value}</dd>
                    </div>
                  ))}
                </dl>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            row.end && <div className="flex flex-wrap items-center gap-1.5">{row.end}</div>
          )}
        </li>
      ))}
    </ul>
  )
}
