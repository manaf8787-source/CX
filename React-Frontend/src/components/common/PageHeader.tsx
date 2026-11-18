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

/**
 * Page header per the skill: Heading 3 title (24, 22 on a tablet, 20 on a phone), a 13px grey description, and on the right the
 * secondary pills first (sample-data state, "What the terms mean") and ONE primary pill last (`actions`: pass the primary action as
 * the last child and keep the others `variant="outline"`). Left-aligned, 24 to 32px rhythm; the stack goes full width on a phone.
 */
export function PageHeader({ title, description, eyebrow, actions, sample = true, className, term }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-3 pt-2 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow && <span className="label-style">{eyebrow}</span>}
        <h1 className="t-page-title flex items-center gap-1.5 text-[20px] tablet:text-[22px] desktop:text-[24px]">
          {title}
          {term && <TermHelp term={term} />}
        </h1>
        {description && <p className="max-w-[72ch] text-sm text-muted-foreground">{description}</p>}
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
