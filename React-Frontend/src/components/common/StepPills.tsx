import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PillStep {
  key: string
  label: ReactNode
  state: 'done' | 'current' | 'todo'
}

export type OutcomeTone = 'success' | 'warning' | 'danger'

interface StepPillsProps {
  steps: PillStep[]
  /** Accessible name of the ordered list. */
  label: string
  /** An optional last pill for the outcome (a fix's Effective, Partial or Failed). `state: 'current'` once the outcome is known. */
  outcome?: { label: ReactNode; state: 'current' | 'todo'; tone?: OutcomeTone }
  className?: string
}

const PILL = 'inline-flex h-[30px] items-center gap-2 rounded-full pe-3.5 text-sm font-medium whitespace-nowrap'
const CHIP = 'inline-grid size-5 shrink-0 place-items-center rounded-full text-2xs leading-none tabular'

/**
 * The skill's stepper (multi-step pattern): a number chip and a label per step. The current step is the dark material, a completed step is
 * a quiet well pill with a 20px dark check circle, the rest are quiet pills with a light number chip. No connectors. The outcome pill of a
 * fix is dark when effective and tinted only when it needs action (partial, failed). Used by the fix lifecycle and the shopper case flow.
 */
export function StepPills({ steps, label, outcome, className }: StepPillsProps) {
  const nextNumber = steps.length + 1
  return (
    <ol aria-label={label} className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {steps.map((s, i) => (
        <li
          key={s.key}
          aria-current={s.state === 'current' ? 'step' : undefined}
          data-state={s.state}
          className={cn(PILL, 'ps-[5px]', s.state === 'current' ? 'material-dark' : s.state === 'done' ? 'bg-well text-foreground' : 'bg-well text-muted-foreground')}
        >
          {s.state === 'done' ? (
            <span aria-hidden className={cn(CHIP, 'material-dark')}>
              <Check className="size-3 stroke-[2.4]" />
            </span>
          ) : (
            <span aria-hidden className={cn(CHIP, s.state === 'current' ? 'bg-on-dark/20' : 'bg-card text-muted-foreground')}>
              {i + 1}
            </span>
          )}
          <span>{s.label}</span>
        </li>
      ))}
      {outcome && (
        <li
          aria-current={outcome.state === 'current' ? 'step' : undefined}
          data-state={outcome.state}
          className={cn(
            PILL,
            'ps-[5px]',
            outcome.state === 'todo'
              ? 'bg-well text-muted-foreground'
              : outcome.tone === 'warning'
                ? 'pill-warning'
                : outcome.tone === 'danger'
                  ? 'pill-error'
                  : 'material-dark',
          )}
        >
          <span aria-hidden className={cn(CHIP, outcome.state === 'todo' ? 'bg-card text-muted-foreground' : outcome.tone ? 'bg-card/60' : 'bg-on-dark/20')}>
            {outcome.state === 'current' && !outcome.tone ? <Check className="size-3 stroke-[2.4]" /> : nextNumber}
          </span>
          <span>{outcome.label}</span>
        </li>
      )}
    </ol>
  )
}
