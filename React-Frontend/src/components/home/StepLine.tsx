import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath } from '@/auth/access'
import { STEPS } from '@/data/steps'
import { useBriefInputs, useIndicators } from '@/services/queriesV40'
import { stepCounts } from '@/utils/brief'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * The six-step line on Home with a live count under each step (v40 F02 plus the counts [Proposed]: the prototype's strip
 * has none). Same steps, titles and targets as the shared `StepStrip`, none highlighted on Home. A step links to its page
 * only when the role may open it, and the count shows only for such a step, so a role never reads a number about a
 * page it cannot see. The counts come from the same inputs as the Daily brief and follow the environment switch.
 */
export function StepLine({ className }: { className?: string }) {
  const { t, L } = useI18n()
  const { role } = useRole()
  const inputs = useBriefInputs()
  const indicators = useIndicators()
  const counts = inputs.data && indicators.data ? stepCounts(inputs.data, indicators.data) : null
  const loading = !counts

  return (
    <nav aria-label={t('The six steps, with live counts', 'الخطوات الست، مع أعدادها الحية')} className={className}>
      <ol className="grid grid-cols-2 gap-2 min-[560px]:grid-cols-3 lg:grid-cols-6">
        {STEPS.map((step) => {
          const open = canAccessPath(role.id, step.to)
          const count = counts?.[step.id]
          const body = (
            <>
              <span className="text-sm font-semibold">{L(step.name)}</span>
              <span className="text-xs text-muted-foreground">{L(step.title)}</span>
              {open && (
                <div className="mt-auto pt-1 text-sm font-medium text-foreground">
                  {loading ? <Skeleton className="h-5 w-24" /> : count ? L(count) : null}
                </div>
              )}
            </>
          )
          const cls = 'flex h-full min-w-0 flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2.5 text-start outline-none transition-[border-color,background-color,box-shadow] duration-150'
          return (
            <li key={step.id} className="min-w-0">
              {open ? (
                <Link
                  to={`${step.to}${step.hash ?? ''}`}
                  title={L(step.title)}
                  data-step={step.id}
                  className={cn(cls, 'hover:border-primary/40 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50')}
                >
                  {body}
                </Link>
              ) : (
                <div title={L(step.title)} data-step={step.id} className={cls}>
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
