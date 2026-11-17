import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  note?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, note, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-6 py-10 text-center',
        className,
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-5" aria-hidden>
        {icon ?? <Inbox />}
      </div>
      <p className="text-base font-medium text-foreground">{title}</p>
      {note && <p className="max-w-prose text-sm text-muted-foreground">{note}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
