import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { Tone } from '@/lib/status'

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-success/12 text-success-text border-success/25',
  warning: 'bg-warning/12 text-warning-text border-warning/25',
  danger: 'bg-destructive/12 text-danger-text border-destructive/25',
  info: 'bg-info/10 text-info-text border-info/20',
  neutral: 'bg-muted text-muted-foreground border-border',
}

const DOT_CLASSES: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  info: 'bg-info',
  neutral: 'bg-muted-foreground',
}

interface StatusBadgeProps {
  tone?: Tone
  dot?: boolean
  icon?: ReactNode
  className?: string
  children: ReactNode
}

/** The one status pill for the whole app — map domain statuses through `@/lib/status`. */
export function StatusBadge({ tone = 'neutral', dot = false, icon, className, children }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3.5',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {dot && <span aria-hidden className={cn('size-1.5 rounded-full', DOT_CLASSES[tone])} />}
      {icon}
      {children}
    </span>
  )
}
