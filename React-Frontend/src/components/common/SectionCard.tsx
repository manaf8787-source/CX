import type { ReactNode } from 'react'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { TermHelp } from './TermHelp'

interface SectionCardProps {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  /** Glossary term for a "?" beside the heading (KB §14). */
  term?: string
  /**
   * `dense` for tables and operations pages (padding 20, radius 18, title 17), `comfortable` for overview and settings (28, 22, 22).
   * Omit it to inherit `data-density` from the page (set it once on the page root).
   */
  density?: 'comfortable' | 'dense'
  /** Card -> well -> text: put the content (a chart, a stat, a dot grid) in a well inside the card instead of on the card. */
  well?: boolean
}

/** A titled content block, the skill's card (docs/MEO_DESIGN_SYSTEM.md): use it for a panel inside a page, not for every group of fields. */
export function SectionCard({ title, description, actions, children, className, contentClassName, term, density, well }: SectionCardProps) {
  const hasHeader = title || description || actions
  return (
    <Card density={density} className={cn('min-w-0', !hasHeader && 'gap-0', className)}>
      {hasHeader && (
        <CardHeader>
          {title && (
            <CardTitle className="flex items-center gap-1.5">
              {title}
              {term && <TermHelp term={term} />}
            </CardTitle>
          )}
          {description && <CardDescription>{description}</CardDescription>}
          {actions && <CardAction className="flex items-center gap-2">{actions}</CardAction>}
        </CardHeader>
      )}
      {well ? (
        <div data-slot="card-well" className={cn('well mx-(--card-pad)', contentClassName)}>
          {children}
        </div>
      ) : (
        <CardContent className={contentClassName}>{children}</CardContent>
      )}
    </Card>
  )
}
