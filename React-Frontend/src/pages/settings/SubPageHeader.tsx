import type { ReactNode } from 'react'
import { Eye } from 'lucide-react'

/** Heading for one Settings-and-reference sub-page; the layout's PageHeader already carries the sample badge. */
export function SubPageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description && <p className="max-w-[68ch] text-base text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function ViewOnlyNotice({ children }: { children: ReactNode }) {
  return (
    <p role="note" className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-text">
      <Eye aria-hidden className="size-4 shrink-0" />
      {children}
    </p>
  )
}
