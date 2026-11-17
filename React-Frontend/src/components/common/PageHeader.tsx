import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { SampleBanner } from './SampleBanner'

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  actions?: ReactNode
  /** NFR-3 sample-data badge; on by default because every page shows it. */
  sample?: boolean
  className?: string
}

export function PageHeader({ title, description, eyebrow, actions, sample = true, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow && <span className="text-xs font-semibold tracking-wide text-gold-text uppercase">{eyebrow}</span>}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="max-w-[72ch] text-base text-muted-foreground">{description}</p>}
      </div>
      {(sample || actions) && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {sample && <SampleBanner />}
          {actions}
        </div>
      )}
    </header>
  )
}
