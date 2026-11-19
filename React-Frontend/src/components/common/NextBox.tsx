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
 * "Where you are, what happens next" (v40 F07): a well holding the small step strip with the current step dark, then a 6px ink dot,
 * "Next step:" with the sentence, "· who" and "· due", and an optional button. Not a coloured banner. Sits above a fix, above the
 * Actions tabs, on Close the loop, on a person's journey and on the Overview.
 *
 * @example <NextBox next={fixNext(fix.status, { approveDays, verifyDays })} who={fix.owner} />
 */
export function NextBox({ next, who, action, className }: NextBoxProps) {
  const { L } = useI18n()
  return (
    <section aria-label={L(NEXT_LABEL)} data-tour="nextbox" className={cn('well flex flex-col gap-3.5 text-card-foreground', className)}>
      <StepStrip current={next.step} size="small" />
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-foreground" />
        <strong className="font-medium">{L(NEXT_LABEL)}:</strong>
        <span>{L(next.text)}</span>
        {who && <span className="text-muted-foreground">· {who}</span>}
        {next.due && <span className="text-muted-foreground">· {L(next.due)}</span>}
        {action && <span className="ms-auto">{action}</span>}
      </p>
    </section>
  )
}
