import type { ReactNode } from 'react'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SectionCardProps {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}

/** A titled content block — use for every panel inside a page (docs/DESIGN_SYSTEM.md §5). */
export function SectionCard({ title, description, actions, children, className, contentClassName }: SectionCardProps) {
  const hasHeader = title || description || actions
  return (
    <Card className={cn('min-w-0 gap-4 py-5', className)}>
      {hasHeader && (
        <CardHeader className="px-5">
          {title && <CardTitle className="text-lg font-semibold">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
          {actions && <CardAction className="flex items-center gap-2">{actions}</CardAction>}
        </CardHeader>
      )}
      <CardContent className={cn('px-5', contentClassName)}>{children}</CardContent>
    </Card>
  )
}
