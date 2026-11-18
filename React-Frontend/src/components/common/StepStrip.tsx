import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath } from '@/auth/access'
import { STEPS } from '@/data/steps'
import { cn } from '@/lib/utils'
import type { StepDef, StepId } from '@/types'

interface StepStripProps {
  /** The step the record is on: the dark segment, and every step before it shows a dark check circle. None highlighted on Home. */
  current?: StepId
  /** 'full' shows the name and the title of each step (Home); 'small' only the names (inside the next-step box). */
  size?: 'full' | 'small'
  className?: string
}

/**
 * The six-step line: 1 Listen, 2 Signal, 3 Pattern, 4 Fix, 5 Check, 6 Report (v40 F02), drawn as the skill's stepper: the current step is
 * the dark material (selected = dark), a completed step carries a 20px dark check circle, the rest are quiet wells (white pills when the
 * strip sits inside a well, as in the next-step box). Each step is a link to its page when the signed-in role may open it, plain text
 * otherwise (the strip never links to a page the role cannot open). Three columns on a phone, six from `sm` up. The current step carries
 * `aria-current="step"`.
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
              <span className={cn('flex items-center gap-2 text-sm font-medium', small && 'gap-1.5 whitespace-nowrap sm:gap-2')}>
                {done && (
                  <span aria-hidden className="material-dark inline-grid size-5 shrink-0 place-items-center rounded-full">
                    <Check className="size-3 stroke-[2.2]" />
                  </span>
                )}
                {L(step.name)}
              </span>
              {!small && <span className={cn('text-xs', on ? 'text-(--on-dark-muted)' : 'text-muted-foreground')}>{L(step.title)}</span>}
            </>
          )
          const cls = cn(
            'flex h-full min-w-0 flex-col justify-center gap-0.5 text-start outline-hidden transition-[background-color,color] duration-200',
            small ? 'min-h-9 rounded-full px-2.5 pt-1 pb-1.5 sm:px-3.5' : 'min-h-14 rounded-well px-3.5 py-2.5',
            on ? 'material-dark' : small ? 'bg-card text-foreground shadow-hairline' : 'bg-well text-foreground',
          )
          const to = `${step.to}${step.hash ?? ''}`
          return (
            <li key={step.id} className="min-w-0">
              {canAccessPath(role.id, step.to) ? (
                <Link to={to} title={L(step.title)} aria-current={on ? 'step' : undefined} className={cn(cls, !on && 'hover:bg-well-hover')}>
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
