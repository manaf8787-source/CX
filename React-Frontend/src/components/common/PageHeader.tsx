import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { SampleBanner } from './SampleBanner'
import { TermHelp, TermsButton } from './TermHelp'

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  actions?: ReactNode
  /** NFR-3 sample-data badge; on by default because every page shows it. */
  sample?: boolean
  className?: string
  /** Glossary term for a "?" beside the page title (KB §14). */
  term?: string
}

export function PageHeader({ title, description, eyebrow, actions, sample = true, className, term }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow && <span className="text-xs font-semibold tracking-wide text-gold-text uppercase">{eyebrow}</span>}
        <h1 className="flex items-center gap-1 text-2xl font-semibold tracking-tight text-foreground">
          {title}
          {term && <TermHelp term={term} />}
        </h1>
        {description && <p className="max-w-[72ch] text-base text-muted-foreground">{description}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {sample && <SampleBanner />}
        {/* KB §14: a "What the terms mean" button on every page. */}
        <TermsButton />
        {actions}
      </div>
    </header>
  )
}
