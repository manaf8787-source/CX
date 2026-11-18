import * as React from "react"
import { cn } from "cn"

/**
 * Data table, Meo-inspired: no outer border, no header fill, no zebra. The header is 13px grey sentence case (41px high); rows are 44px
 * (dense, the default here) or 60px (comfortable) and are divided by ONE 1px #ececec line (`row-divider`, drawn by ::after). Hover turns
 * the row into a soft pill (first and last cell are rounded); a selected row (`data-state="selected"`) is a #f2f2f2 pill. Sorted headers
 * carry `aria-sort` and turn ink. Numeric cells: add `text-end tabular text-foreground font-medium`.
 *
 * `density`: leave it out and the table follows the page (`data-density` on any ancestor: comfortable rows 60, dense rows 44); a table
 * outside every density scope is dense (theme.css). Pass it only to override the page.
 *
 * `containerClassName` styles the scroll container (for example a max height, so a sticky header has something to stick to).
 *
 * The container scrolls sideways on a narrow screen. A scrollable region must be reachable from the keyboard (axe:
 * scrollable-region-focusable), so it becomes a tab stop only while it actually overflows (either way): tables that fit add no tab stops.
 */
function Table({
  className,
  density,
  containerClassName,
  ...props
}: React.ComponentProps<"table"> & { density?: "dense" | "comfortable"; containerClassName?: string }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [scrollable, setScrollable] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === "undefined") return
    const check = () => setScrollable(el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)
    check()
    const observer = new ResizeObserver(check)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    return () => observer.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      data-slot="table-container"
      data-density={density}
      tabIndex={scrollable ? 0 : undefined}
      className={cn("relative w-full overflow-x-auto rounded-lg outline-hidden", containerClassName)}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn(className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("font-medium text-foreground", className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "row-divider h-(--row-h) transition-colors [&:hover>td]:bg-row-hover has-aria-expanded:[&>td]:bg-row-hover data-[state=selected]:[&>td]:bg-row-selected",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-[41px] px-2.5 py-[11px] text-start align-middle text-sm font-normal whitespace-nowrap text-muted-foreground aria-[sort=ascending]:font-medium aria-[sort=ascending]:text-foreground aria-[sort=descending]:font-medium aria-[sort=descending]:text-foreground [&:has([role=checkbox])]:pe-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-2.5 py-[11px] align-middle text-sm whitespace-nowrap text-muted-foreground transition-colors first:rounded-s-lg last:rounded-e-lg [&:has([role=checkbox])]:pe-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableCell,
  TableRow,
  TableCaption,
}
