import type { ReactNode } from 'react'
import { Eye } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useSlidingIndicator } from '@/components/ui/use-sliding-indicator'
import { TermHelp } from '@/components/common/TermHelp'
import { cn } from '@/lib/utils'

/**
 * Chrome shared by the Settings-and-reference sub-pages (docs/MEO_DESIGN_SYSTEM.md, skill sections 3 to 6): the sub-page heading, the
 * view-only notice (an inline notification well), the two-column settings section, an inline note with a status dot, the pressed-filter
 * pill track and the count tiles of the registers. The pieces keep the roles and aria attributes the tests read.
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

const NOTE_DOT = { warning: 'dot-warning', error: 'dot-error', info: 'dot-info', success: 'dot-success', neutral: '' } as const

/** The skill's inline notification: a well with a 6px status dot, an optional ink title, the text in grey and an optional action. */
export function InlineNote({
  tone = 'neutral',
  title,
  children,
  action,
  className,
}: {
  tone?: keyof typeof NOTE_DOT
  title?: ReactNode
  children: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start gap-3 rounded-well bg-well px-4 py-3.5', className)}>
      <span aria-hidden className={cn('dot mt-[6px]', NOTE_DOT[tone])} />
      <div className="flex min-w-0 flex-col gap-1">
        {title && <span className="t-small-strong">{title}</span>}
        <p className="text-sm text-muted-foreground">{children}</p>
        {action}
      </div>
    </div>
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
  layout = 'split',
  table,
  children,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  /** Glossary term for a "?" beside the heading. */
  term?: string
  layout?: 'split' | 'stacked'
  /** The card holds a table: the content takes `IN_CARD` padding instead of the card padding. */
  table?: boolean
  /** The card: the fields, rows or a table. */
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('grid grid-cols-1 gap-4', layout === 'split' && '@3xl:grid-cols-[minmax(0,16.25rem)_minmax(0,1fr)] @3xl:gap-10', className)}>
      <div className={cn('flex flex-col gap-1.5', layout === 'split' && '@3xl:sticky @3xl:top-24 @3xl:self-start')}>
        <h3 className="t-h4 flex items-center gap-1.5">
          <span>{title}</span>
          {term && <TermHelp term={term} />}
        </h3>
        {description && <p className="max-w-[68ch] text-sm text-muted-foreground">{description}</p>}
      </div>
      <Card className="min-w-0">
        <div className={cn('flex flex-col gap-4', table ? IN_CARD : 'px-(--card-pad)')}>{children}</div>
      </Card>
    </section>
  )
}

export interface PressOption<T extends string> {
  id: T
  label: ReactNode
  count?: number
}

/**
 * A filter built from toggle buttons (`role="group"`, `aria-pressed`) as the skill's segmented control: a well track and ONE dark pill
 * that slides to the pressed button on the spring. It is not `ui/Segmented` (a radiogroup) because the pages and their tests address
 * these as buttons. Scrolls sideways on a phone; the track pads 4px so the focus ring is not clipped.
 */
export function PressFilter<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: PressOption<T>[]
  value: T
  onChange: (id: T) => void
  /** Accessible name of the group. */
  label: string
  className?: string
}) {
  const { ref, box, ready, animate } = useSlidingIndicator<HTMLDivElement>('button[aria-pressed=true]')
  return (
    <div className={cn('-m-1 max-w-full overflow-x-auto p-1', className)}>
      <div
        ref={ref}
        role="group"
        aria-label={label}
        data-indicator={ready ? 'on' : 'off'}
        className="group/press relative inline-flex min-h-[35px] w-fit items-center gap-0.5 rounded-full bg-well p-[3px] shadow-inset-well"
      >
        {ready && box && (
          <span
            aria-hidden
            data-slot="press-indicator"
            // physical left/top on purpose: the box comes from offsetLeft/offsetTop, which are physical in RTL as well
            className={cn('material-dark pointer-events-none absolute top-0 left-0 rounded-full', animate && 'transition-[translate,width,height] duration-400 ease-spring')}
            style={{ width: box.w, height: box.h, translate: `${box.x}px ${box.y}px` }}
          />
        )}
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={value === o.id}
            // useSlidingIndicator re-measures on data-active (not on aria-pressed), so the pill follows the pressed button
            data-active={value === o.id ? 'true' : undefined}
            onClick={() => onChange(o.id)}
            className="relative z-10 inline-flex min-h-[29px] items-center justify-center gap-1.5 rounded-full px-[13px] pt-[5px] pb-[7px] text-sm leading-[17px] font-medium whitespace-nowrap text-muted-foreground outline-none transition-colors duration-200 ease-out hover:text-foreground aria-pressed:text-primary-foreground aria-pressed:hover:text-primary-foreground group-data-[indicator=off]/press:aria-pressed:material-dark"
          >
            {o.label}
            {o.count !== undefined && <span className="tabular font-normal">{o.count}</span>}
          </button>
        ))}
      </div>
    </div>
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
      className="group/tile flex min-w-0 cursor-pointer flex-col items-start gap-2 rounded-well bg-well p-4 text-start outline-none transition-colors duration-200 ease-out hover:bg-well-hover aria-pressed:material-dark"
    >
      {head}
      <span className="text-4xl font-medium tabular">{count}</span>
      {note && <span className="text-sm text-muted-foreground group-aria-pressed/tile:text-(--on-dark-muted)">{note}</span>}
    </button>
  )
}
