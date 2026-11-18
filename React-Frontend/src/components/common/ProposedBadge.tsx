import type { ReactNode } from 'react'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import { StatusBadge } from './StatusBadge'

interface ProposedBadgeProps {
  /** Replaces the default "[Proposed]" text (keep the brackets convention). */
  children?: ReactNode
  /** Tooltip. Default: "Suggested by the build, not confirmed by the owner." */
  title?: string
  className?: string
}

/**
 * The `[Proposed]` marker (CLAUDE.md convention): anything suggested but not confirmed by the owner
 * (escalation matrix defaults, calling hours, CRM mapping rows, question wording, ...). docs/V40_DELTA.md section E
 * lists what to badge. Never present a proposed value as decided.
 *
 * @example <ProposedBadge />   <ProposedBadge title={t('Hours are placeholders until Legal confirms', '...')} />
 */
export function ProposedBadge({ children, title, className }: ProposedBadgeProps) {
  const { t } = useI18n()
  return (
    <span title={title ?? t('Suggested by the build, not confirmed by the owner.', 'مقترح من فريق البناء، لم يؤكده المالك.')} className="inline-flex">
      <StatusBadge tone="warning" className={cn('border-dashed', className)}>
        {children ?? t('[Proposed]', '[مقترح]')}
      </StatusBadge>
    </span>
  )
}
