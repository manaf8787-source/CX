import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Dot } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useProducts } from '@/services/queries'
import { useBriefInputs, useIndicators } from '@/services/queriesV40'
import { BRIEF_COPY, BRIEF_LINES_BY_ROLE, buildBrief } from '@/utils/brief'
import { SectionCard } from '@/components/common/SectionCard'
import { AgentChip } from '@/components/common/AgentChip'
import { ProposedBadge } from '@/components/common/ProposedBadge'
import { LoadingState } from '@/components/common/LoadingState'
import { cn } from '@/lib/utils'

/**
 * The Daily brief (v40 F09, S3): Agent 9's lines for the signed-in role, written from the same numbers the pages show.
 * Every line opens its page when the role may open it and is plain text when not (the prototype's dead links are not copied).
 * Mounted on Home, and meant for the top of the landing page of a role that lands elsewhere (L&D, HR manager, the
 * Internal Audit and Marketing Lead's overview, the HR specialist's actions page). Renders nothing for a role with no brief.
 *
 * @example <DailyBrief />
 */
export function DailyBrief({ className }: { className?: string }) {
  const { t, L } = useI18n()
  const { role } = useRole()
  const inputs = useBriefInputs()
  const indicators = useIndicators()
  const { data: products } = useProducts()

  const lines = useMemo(
    () => (inputs.data && indicators.data && products ? buildBrief({ role: role.id, product: role.product, inputs: inputs.data, indicators: indicators.data, products }) : undefined),
    [role.id, role.product, inputs.data, indicators.data, products],
  )

  if (BRIEF_LINES_BY_ROLE[role.id].length === 0) return null

  return (
    <SectionCard
      className={className}
      title={
        <span className="flex flex-wrap items-center gap-2">
          {L(BRIEF_COPY.title)}
          <ProposedBadge title={L(BRIEF_COPY.proposedTitle)} />
        </span>
      }
      description={L(BRIEF_COPY.hint)}
      actions={<AgentChip agent={9} />}
    >
      {!lines ? (
        <LoadingState rows={4} />
      ) : (
        <ul aria-label={t('Daily brief lines', 'أسطر الموجز اليومي')} className="-mx-2 flex flex-col divide-y">
          {lines.map((line) => (
            <li key={line.id}>
              {line.to ? (
                <Link
                  to={line.to}
                  data-brief-line={line.kind}
                  className={cn(
                    'group flex w-full items-start gap-3 rounded-md px-2 py-2.5 text-start text-sm outline-none transition-colors duration-150',
                    'hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  )}
                >
                  <ArrowRight
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-primary transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                  />
                  <span className="min-w-0">{L(line.text)}</span>
                </Link>
              ) : (
                <p data-brief-line={line.kind} className="flex w-full items-start gap-3 px-2 py-2.5 text-sm">
                  <Dot aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    {L(line.text)} <span className="sr-only">{L(BRIEF_COPY.noPage)}</span>
                  </span>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
