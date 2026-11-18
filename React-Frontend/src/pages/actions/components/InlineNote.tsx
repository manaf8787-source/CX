import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type NoteTone = 'info' | 'warning' | 'success' | 'neutral'

const DOT: Record<NoteTone, string> = { info: 'dot-info', warning: 'dot-warning', success: 'dot-success', neutral: '' }

interface InlineNoteProps {
  /** Rendered as an `h2` (ink, 13/500) above the text. Leave it out for a one-line note. */
  title?: ReactNode
  /** The colour is only the 6px dot: the words carry the meaning. */
  tone?: NoteTone
  /** Trailing control (a light pill button). */
  action?: ReactNode
  role?: 'note' | 'status'
  className?: string
  children: ReactNode
  'data-testid'?: string
}

/**
 * The skill's "inline notification": a well (radius 14, #f2f2f2, padding 14/16) with a 6px status dot and text, never a coloured banner.
 * Replaces the tinted, outlined asides on the Actions pages, the rules
 * pointer and the "view only" notes. Prose is grey; with no title the sentence itself is ink.
 */
export function InlineNote({ title, tone = 'info', action, role, className, children, 'data-testid': testId }: InlineNoteProps) {
  return (
    <div data-slot="inline-note" role={role} data-testid={testId} className={cn('well flex items-start gap-3 px-4 py-3.5', className)}>
      <span aria-hidden className={cn('dot mt-[7px]', DOT[tone])} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title && <h2 className="t-small-strong">{title}</h2>}
        <p className={cn('max-w-[80ch] text-sm', title ? 'text-muted-foreground' : 'text-foreground')}>{children}</p>
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  )
}
