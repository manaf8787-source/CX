import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useProducts } from '@/services/queries'
import { useBriefInputs, useIndicators } from '@/services/queriesV40'
import { BRIEF_COPY, BRIEF_LINES_BY_ROLE, buildBrief } from '@/utils/brief'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AgentChip } from '@/components/common/AgentChip'
import { ProposedBadge } from '@/components/common/ProposedBadge'
import { LoadingState } from '@/components/common/LoadingState'
import { cn } from '@/lib/utils'

/** Chips on the dark feature card are the skill's `--fx-tint` (white 7%), not the light material. */
const TINT_CHIP = 'bg-none bg-(--on-dark-tint) text-foreground shadow-none [&_svg]:text-foreground'

/**
 * The Daily brief (v40 F09, S3): Agent 9's lines for the signed-in role, written from the same numbers the pages show.
 * Every line opens its page when the role may open it and is plain text when not (the prototype's dead links are not copied).
 * Mounted on Home, and meant for the top of the landing page of a role that lands elsewhere (L&D, HR manager, the
 * Internal Audit and Marketing Lead's overview, the HR specialist's actions page). Renders nothing for a role with no brief.
 *
 * Design: on Home it is the view's ONE dark feature card (`surface="dark"`, the default; chips are white-7% tints, rows get a soft pill on
 * hover). A landing page that already has its own feature passes `surface="light"` (a white card, grey pills, `row-divider`).
 *
 * @example <DailyBrief />   <DailyBrief surface="light" />
 */
export function DailyBrief({ className, surface = 'dark' }: { className?: string; surface?: 'dark' | 'light' }) {
  const { t, L } = useI18n()
  const { role } = useRole()
  const inputs = useBriefInputs()
  const indicators = useIndicators()
  const { data: products } = useProducts()
  const dark = surface === 'dark'

  const lines = useMemo(
    () => (inputs.data && indicators.data && products ? buildBrief({ role: role.id, product: role.product, inputs: inputs.data, indicators: indicators.data, products }) : undefined),
    [role.id, role.product, inputs.data, indicators.data, products],
  )

  if (BRIEF_LINES_BY_ROLE[role.id].length === 0) return null

  // one divider per line: the 1px #ececec row divider on white, white 7% on the dark card (last line has none)
  const rowLine = dark ? 'relative after:pointer-events-none after:absolute after:inset-x-3 after:bottom-0 after:h-px after:bg-(--on-dark-tint) last:after:hidden' : 'row-divider'

  return (
    <Card variant={dark ? 'dark' : 'default'} className={className}>
      <CardHeader>
        <CardTitle className="col-span-full flex flex-wrap items-center gap-2 sm:col-span-1">
          <span className="flex flex-wrap items-center gap-2">
            {L(BRIEF_COPY.title)}
            <ProposedBadge title={L(BRIEF_COPY.proposedTitle)} className={dark ? TINT_CHIP : undefined} />
          </span>
        </CardTitle>
        <CardDescription className="col-span-full sm:col-span-1">{L(BRIEF_COPY.hint)}</CardDescription>
        <CardAction className="col-start-1 row-span-1 row-start-3 mt-1 flex items-center gap-2 justify-self-start sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:mt-0 sm:justify-self-end">
          <AgentChip agent={9} className={dark ? TINT_CHIP : undefined} />
        </CardAction>
      </CardHeader>
      <CardContent>
        {!lines ? (
          <LoadingState rows={4} className={dark ? '[&_[data-slot=skeleton]]:bg-(--on-dark-tint)' : undefined} />
        ) : (
          <ul aria-label={t('Daily brief lines', 'أسطر الموجز اليومي')} className="-mx-3 flex flex-col">
            {lines.map((line) => (
              <li key={line.id} className={rowLine}>
                {line.to ? (
                  <Link
                    to={line.to}
                    data-brief-line={line.kind}
                    className={cn(
                      'group flex w-full items-start gap-3 rounded-xl px-3 py-3 text-start text-base outline-none transition-colors duration-200',
                      dark ? 'text-foreground hover:bg-(--on-dark-tint)' : 'hover:bg-row-hover',
                    )}
                  >
                    <ArrowRight
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-400 ease-spring group-hover:translate-x-[3px] group-hover:text-foreground motion-reduce:transform-none rtl:rotate-180 rtl:group-hover:-translate-x-[3px]"
                    />
                    <span className="min-w-0">{L(line.text)}</span>
                  </Link>
                ) : (
                  <p data-brief-line={line.kind} className="flex w-full items-start gap-3 px-3 py-3 text-base">
                    <span aria-hidden className="dot mt-[7px] ms-[5px] me-[5px] bg-muted-foreground" />
                    <span className="min-w-0">
                      {L(line.text)} <span className="sr-only">{L(BRIEF_COPY.noPage)}</span>
                    </span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
