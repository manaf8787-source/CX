import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath } from '@/auth/access'
import { STEPS } from '@/data/steps'
import { cn } from '@/lib/utils'
import type { StepDef, StepId } from '@/types'

interface StepStripProps {
  /** The step the record is on: highlighted, and every step before it is marked done. None highlighted on Home. */
  current?: StepId
  /** 'full' shows the name and the title of each step (Home); 'small' only the names (inside the next-step box). */
  size?: 'full' | 'small'
  className?: string
}

/**
 * The six-step line: 1 Listen, 2 Signal, 3 Pattern, 4 Fix, 5 Check, 6 Report (v40 F02). Each step is a link to its
 * page when the signed-in role may open it, plain text otherwise (the strip never links to a page the role cannot open).
 * Three columns on a phone, six from `sm` up. The current step carries `aria-current="step"`.
 *
 * @example <StepStrip />  <StepStrip current="ca" size="small" />
 */
export function StepStrip({ current, size = 'full', className }: StepStripProps) {
  const { t, L } = useI18n()
  const { role } = useRole()
  const currentIndex = current ? STEPS.findIndex((s) => s.id === current) : -1
  const small = size === 'small'

  return (
    <nav aria-label={t('The six steps', 'الخطوات الست')} className={className}>
      <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {STEPS.map((step: StepDef, i) => {
          const on = i === currentIndex
          const done = currentIndex >= 0 && i < currentIndex
          const body = (
            <>
              <span className="flex items-center gap-1 text-sm font-semibold">
                {done && <Check aria-hidden className="size-3.5 shrink-0 text-success-text" />}
                {L(step.name)}
              </span>
              {!small && <span className="text-xs text-muted-foreground">{L(step.title)}</span>}
            </>
          )
          const cls = cn(
            'flex h-full min-w-0 flex-col gap-1 rounded-lg border px-3 py-2 text-start outline-none transition-colors duration-150',
            on ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-border bg-card',
            small && 'py-1.5',
          )
          const to = `${step.to}${step.hash ?? ''}`
          return (
            <li key={step.id} className="min-w-0">
              {canAccessPath(role.id, step.to) ? (
                <Link to={to} title={L(step.title)} aria-current={on ? 'step' : undefined} className={cn(cls, 'hover:border-primary/40 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50')}>
                  {body}
                </Link>
              ) : (
                <div title={L(step.title)} aria-current={on ? 'step' : undefined} className={cls}>
                  {body}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
