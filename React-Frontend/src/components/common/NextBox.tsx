import type { ReactNode } from 'react'
import { useI18n } from '@/i18n'
import { NEXT_LABEL } from '@/data/steps'
import { cn } from '@/lib/utils'
import type { NextStep } from '@/types'
import { StepStrip } from './StepStrip'

interface NextBoxProps {
  /** Step, text and (optionally) the due phrase. Build it with `fixNext`, `actionsNext`, `journeyNext`, `CLOSE_LOOP_NEXT`, `OVERVIEW_NEXT`. */
  next: NextStep
  /** [Proposed] the owner title from the record ("with who", the KB says "with who and by when"). The prototype never passes it. */
  who?: ReactNode
  /** An optional small button (for example "Monthly pack"). */
  action?: ReactNode
  className?: string
}

/**
 * "Where you are, what happens next" (v40 F07): the small step strip with the current step highlighted, then
 * "Next step:" with the sentence, "· who" and "· due", and an optional button. Sits above a fix, above the Actions
 * tabs, on Close the loop, on a person's journey and on the Overview.
 *
 * @example <NextBox next={fixNext(fix.status, { approveDays, verifyDays })} who={fix.owner} />
 */
export function NextBox({ next, who, action, className }: NextBoxProps) {
  const { L } = useI18n()
  return (
    <section aria-label={L(NEXT_LABEL)} className={cn('flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground', className)}>
      <StepStrip current={next.step} size="small" />
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <strong className="font-semibold">{L(NEXT_LABEL)}:</strong>
        <span>{L(next.text)}</span>
        {who && <span className="text-muted-foreground">· {who}</span>}
        {next.due && <span className="text-muted-foreground">· {L(next.due)}</span>}
        {action && <span className="ms-auto">{action}</span>}
      </p>
    </section>
  )
}
