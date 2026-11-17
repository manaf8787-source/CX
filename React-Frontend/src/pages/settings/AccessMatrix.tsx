import { Fragment } from 'react'
import { useI18n } from '@/i18n'
import type { Access, Bi } from '@/types'
import { cn } from '@/lib/utils'

const ACCESS_LABEL: Record<Access, Bi> = {
  full: { en: 'Full', ar: 'كامل' },
  own: { en: 'Own scope', ar: 'ضمن نطاقه' },
  view: { en: 'View only', ar: 'للعرض فقط' },
  informed: { en: 'Informed only', ar: 'للعلم فقط' },
  approve: { en: 'Approves', ar: 'يعتمد' },
  none: { en: 'No access', ar: 'لا صلاحية' },
}

const ACCESS_SYMBOL: Record<Access, string> = { full: '●', own: '◐', view: '○', informed: '✉', approve: '✔', none: '–' }

const ACCESS_CLASS: Record<Access, string> = {
  full: 'bg-primary/12 text-primary',
  own: 'bg-info/12 text-info-text',
  view: 'bg-muted text-foreground',
  informed: 'bg-warning/14 text-warning-text',
  approve: 'bg-success/14 text-success-text',
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
    <div className="flex flex-wrap items-center gap-2">
      {ORDER.map((a) => (
        <span key={a} className="inline-flex h-7 items-center gap-1.5 rounded-full border bg-card ps-1 pe-2.5 text-xs">
          <span aria-hidden className={cn('flex size-5 items-center justify-center rounded-full text-xs font-semibold', ACCESS_CLASS[a])}>
            {ACCESS_SYMBOL[a]}
          </span>
          {L(ACCESS_LABEL[a])}
        </span>
      ))}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

/** Role × capability grid. Scrolls inside its own box on narrow screens; the capability column stays pinned. */
export function AccessMatrix({ roles, rows, onCycle, caption }: AccessMatrixProps) {
  const { t, L } = useI18n()
  const groups = [...new Set(rows.map((r) => r.group))]

  return (
    <div className="flex flex-col gap-2">
    <p className="text-xs text-muted-foreground lg:hidden">
      {t(`Scroll sideways to see all ${roles.length} roles.`, `مرّر أفقياً لرؤية الأدوار الـ${roles.length} كلها.`)}
    </p>
    <div className="relative max-w-full overflow-x-auto rounded-lg border bg-card" tabIndex={0} role="region" aria-label={caption}>
      <table className="w-full min-w-max border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b bg-muted/60">
            <th scope="col" className="sticky start-0 z-10 min-w-48 bg-muted px-3 py-2 text-start text-xs font-semibold text-muted-foreground sm:min-w-60">
              {t('Capability', 'الصلاحية')}
            </th>
            {roles.map((r) => (
              <th key={r.id} scope="col" title={L(r.name)} className="w-24 px-1.5 py-2 text-center align-bottom text-xs leading-tight font-semibold text-muted-foreground">
                <span className="line-clamp-3 block w-24 whitespace-normal">{L(r.name)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <Fragment key={g}>
              <tr className="border-b bg-muted/30">
                <th colSpan={roles.length + 1} scope="colgroup" className="sticky start-0 px-3 py-1.5 text-start text-xs font-semibold tracking-wide text-gold-text uppercase">
                  {g}
                </th>
              </tr>
              {rows
                .filter((row) => row.group === g)
                .map((row) => (
                  <tr key={row.key} className="border-b transition-colors last:border-b-0 hover:bg-muted/40">
                    <th scope="row" className="sticky start-0 z-10 bg-card px-3 py-1.5 text-start text-sm font-normal">
                      {row.label}
                    </th>
                    {roles.map((r) => {
                      const value = row.values[r.id] ?? 'none'
                      const cell = (
                        <span
                          aria-hidden
                          className={cn('flex size-7 items-center justify-center rounded-full text-sm font-semibold', ACCESS_CLASS[value])}
                        >
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
                              className="mx-auto flex size-10 cursor-pointer items-center justify-center rounded-md outline-none transition-colors duration-150 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            >
                              {cell}
                            </button>
                          ) : (
                            <span className="mx-auto flex size-10 items-center justify-center" title={L(ACCESS_LABEL[value])}>
                              {cell}
                              <span className="sr-only">{a11y}</span>
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  )
}
