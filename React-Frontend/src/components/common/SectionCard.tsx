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
}

/** A titled content block — use for every panel inside a page (docs/DESIGN_SYSTEM.md §5). */
export function SectionCard({ title, description, actions, children, className, contentClassName, term }: SectionCardProps) {
  const hasHeader = title || description || actions
  return (
    <Card className={cn('min-w-0 gap-4 py-5', className)}>
      {hasHeader && (
        <CardHeader className="px-5">
          {title && (
            <CardTitle className="flex items-center gap-1 text-lg font-semibold">
              {title}
              {term && <TermHelp term={term} />}
            </CardTitle>
          )}
          {description && <CardDescription>{description}</CardDescription>}
          {actions && <CardAction className="flex items-center gap-2">{actions}</CardAction>}
        </CardHeader>
      )}
      <CardContent className={cn('px-5', contentClassName)}>{children}</CardContent>
    </Card>
  )
}
