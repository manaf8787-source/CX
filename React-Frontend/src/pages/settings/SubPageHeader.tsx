import type { ReactNode } from 'react'
import { Eye } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { TermHelp } from '@/components/common/TermHelp'
import { cn } from '@/lib/utils'

/**
 * Chrome shared by the Settings-and-reference sub-pages (docs/MEO_DESIGN_SYSTEM.md, skill sections 3 to 6): the sub-page heading, the
 * view-only notice (an inline notification well), the two-column settings section and the count tiles of the registers.
 * (The inline note is `components/common/InlineNote`, the pressed filter is `ui/Segmented variant="pressed"`.) The pieces keep the roles and aria attributes the tests read.
 */

/** Heading for one Settings-and-reference sub-page; the layout's PageHeader already carries the sample badge. */
export function SubPageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h2 className="text-2xl font-medium text-foreground">{title}</h2>
        {description && <p className="max-w-[68ch] text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/**
 * A table that sits directly in a card: the content padding is the card padding minus the 10px cell padding, so the first cell's text
 * lines up with the card title and the hover pill of a row reaches 10px (dense) or 18px (comfortable) from the card edge.
 */
export const IN_CARD = 'px-[calc(var(--card-pad)-10px)]'

/**
 * Permission-based UI (skill section 6): a role that may only read sees this note, an inline notification well (no coloured banner)
 * with a neutral eye icon. Fields it cannot change are shown as plain text by the page itself.
 */
export function ViewOnlyNotice({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p role="note" className={cn('flex items-center gap-2.5 rounded-well bg-well px-4 py-3.5 text-sm text-foreground', className)}>
      <Eye aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      {children}
    </p>
  )
}

/**
 * The skill's two-column settings section: on the left (260px) a Heading 4 and a Body S description, on the right a card with the
 * fields; sections sit 48px apart (the page puts `gap-12` between them). The columns switch on the width of the page, not the window
 * (the settings menu takes a third of it): put `@container` on the page root. `layout="stacked"` keeps the heading above a wide card.
 */
export function SettingsSection({
  title,
  description,
  term,
  actions,
  layout = 'split',
  table,
  children,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  /** Glossary term for a "?" beside the heading. */
  term?: string
  /** A control that belongs to the section as a whole (an "Open" pill): beside the heading when stacked, under the description when split. */
  actions?: ReactNode
  layout?: 'split' | 'stacked'
  /** The card holds a table: the content takes `IN_CARD` padding instead of the card padding. */
  table?: boolean
  /** The card: the fields, rows or a table. */
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('grid grid-cols-1 gap-4', layout === 'split' && '@3xl:grid-cols-[minmax(0,16.25rem)_minmax(0,1fr)] @3xl:gap-10', className)}>
      <div className={cn('flex min-w-0 flex-col gap-1.5', layout === 'split' && '@3xl:sticky @3xl:top-24 @3xl:self-start')}>
        <div className={cn('flex flex-wrap items-center justify-between gap-x-3 gap-y-2', layout === 'split' && '@3xl:block')}>
          <h3 className="t-h4 flex items-center gap-1.5">
            <span>{title}</span>
            {term && <TermHelp term={term} />}
          </h3>
          {actions && layout === 'stacked' && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {description && <p className="max-w-[68ch] text-sm text-muted-foreground">{description}</p>}
        {actions && layout === 'split' && <div className="mt-1.5 flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <Card className="min-w-0">
        <div className={cn('flex flex-col gap-4', table ? IN_CARD : 'px-(--card-pad)')}>{children}</div>
      </Card>
    </section>
  )
}

/**
 * A count that filters (the status tiles of the registers): a well; pressed = the dark material. `aria-pressed` carries the state, a
 * second press clears the filter. Put the status tag in `head`, the number in `count` and a grey sentence in `note`.
 */
export function CountTile({ pressed, onPress, head, count, note }: { pressed: boolean; onPress: () => void; head: ReactNode; count: ReactNode; note?: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onPress}
      className="group/tile flex min-w-0 cursor-pointer flex-col items-start gap-2 rounded-well bg-well p-4 text-start outline-hidden transition-colors duration-200 ease-out hover:bg-well-hover aria-pressed:material-dark"
    >
      {head}
      <span className="text-4xl font-medium tabular">{count}</span>
      {note && <span className="text-sm text-muted-foreground group-aria-pressed/tile:text-(--on-dark-muted)">{note}</span>}
    </button>
  )
}
