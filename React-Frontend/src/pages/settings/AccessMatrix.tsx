import { Fragment } from 'react'
import { useI18n } from '@/i18n'
import type { Access, Bi } from '@/types'
import { cn } from '@/lib/utils'
import { TableHead, TableRow } from '@/components/ui/table'

const ACCESS_LABEL: Record<Access, Bi> = {
  full: { en: 'Full', ar: 'كامل' },
  own: { en: 'Own scope', ar: 'ضمن نطاقه' },
  view: { en: 'View only', ar: 'للعرض فقط' },
  informed: { en: 'Informed only', ar: 'للعلم فقط' },
  approve: { en: 'Approves', ar: 'يعتمد' },
  none: { en: 'No access', ar: 'لا صلاحية' },
}

const ACCESS_SYMBOL: Record<Access, string> = { full: '●', own: '◐', view: '○', informed: '✉', approve: '✔', none: '–' }

/**
 * The six levels are told apart by their symbol and a name (also read by assistive technology), not by hue: the two strongest levels
 * (full, approves) are the dark material, the other grants are the light material, "no access" is a plain grey dash.
 */
const ACCESS_CLASS: Record<Access, string> = {
  full: 'material-dark',
  approve: 'material-dark',
  own: 'material-light',
  view: 'material-light',
  informed: 'material-light',
  none: 'text-muted-foreground',
}

const ORDER: Access[] = ['full', 'own', 'view', 'informed', 'approve', 'none']

export interface MatrixRow {
  key: string
  group: string
  label: string
  values: Record<string, Access>
}

interface AccessMatrixProps {
  roles: { id: string; name: Bi }[]
  rows: MatrixRow[]
  /** When set, cells become buttons that call this on click. */
  onCycle?: (row: MatrixRow, roleId: string, current: Access) => void
  caption: string
}

export function AccessLegend({ hint }: { hint?: string }) {
  const { L } = useI18n()
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {ORDER.map((a) => (
        <span key={a} className="inline-flex items-center gap-2 text-sm text-foreground">
          <span aria-hidden className={cn('inline-grid size-5 place-items-center rounded-full text-xs', ACCESS_CLASS[a])}>
            {ACCESS_SYMBOL[a]}
          </span>
          {L(ACCESS_LABEL[a])}
        </span>
      ))}
      {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
    </div>
  )
}

/** Hover pill for a row whose first cell is a sticky `th`: the sticky cells need an opaque fill, so they take the hover tone too. */
const ROW = '[&:hover>th]:bg-row-hover [&>th]:bg-card [&>th]:transition-colors'

/** Role × capability grid. Scrolls inside its own box on narrow screens; the capability column stays pinned. */
export function AccessMatrix({ roles, rows, onCycle, caption }: AccessMatrixProps) {
  const { t, L } = useI18n()
  const groups = [...new Set(rows.map((r) => r.group))]

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground lg:hidden">
        {t(`Scroll sideways to see all ${roles.length} roles.`, `مرّر أفقياً لرؤية الأدوار الـ${roles.length} كلها.`)}
      </p>
      <div className="relative -mx-2.5 max-w-full overflow-x-auto rounded-well outline-none" tabIndex={0} role="region" aria-label={caption}>
        <table className="w-full min-w-max border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <TableHead scope="col" className="sticky start-0 z-10 min-w-48 bg-card text-start sm:min-w-60">
                {t('Capability', 'الصلاحية')}
              </TableHead>
              {roles.map((r) => (
                <TableHead key={r.id} scope="col" title={L(r.name)} className="h-auto w-24 px-1.5 text-center align-bottom leading-tight">
                  <span className="line-clamp-3 block w-24 whitespace-normal">{L(r.name)}</span>
                </TableHead>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g}>
                <tr>
                  <th colSpan={roles.length + 1} scope="colgroup" className="label-style sticky start-0 px-2.5 pt-5 pb-2 text-start">
                    {g}
                  </th>
                </tr>
                {rows
                  .filter((row) => row.group === g)
                  .map((row) => (
                    <TableRow key={row.key} className={cn('h-12', ROW)}>
                      <th scope="row" className="sticky start-0 z-10 rounded-s-lg px-2.5 py-1.5 text-start text-sm font-normal text-foreground">
                        {row.label}
                      </th>
                      {roles.map((r) => {
                        const value = row.values[r.id] ?? 'none'
                        const cell = (
                          <span aria-hidden className={cn('grid size-7 place-items-center rounded-full text-sm', ACCESS_CLASS[value])}>
                            {ACCESS_SYMBOL[value]}
                          </span>
                        )
                        const a11y = `${L(r.name)} — ${row.label}: ${L(ACCESS_LABEL[value])}`
                        return (
                          <td key={r.id} className="px-1 py-1 text-center">
                            {onCycle ? (
                              <button
                                type="button"
                                onClick={() => onCycle(row, r.id, value)}
                                aria-label={a11y}
                                title={L(ACCESS_LABEL[value])}
                                className="mx-auto grid size-10 cursor-pointer place-items-center rounded-full outline-none transition-colors duration-200 hover:bg-well"
                              >
                                {cell}
                              </button>
                            ) : (
                              <span className="mx-auto grid size-10 place-items-center" title={L(ACCESS_LABEL[value])}>
                                {cell}
                                <span className="sr-only">{a11y}</span>
                              </span>
                            )}
                          </td>
                        )
                      })}
                    </TableRow>
                  ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
