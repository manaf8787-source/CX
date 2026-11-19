import { useMemo } from 'react'
import { Check, Play } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canViewMobiles } from '@/auth/permissions'
import { envName, inEnvScope } from '@/data/environments'
import { WATCH_COPY as COPY, WATCH_COUNTER_LABELS, buildWatchSteps, maskMobile, type WatchCustomer, type WatchStep } from '@/data/watchTeam'
import { useWatchReplay } from '@/hooks/useWatchReplay'
import { prefersReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useAllInteractions, useCorrectiveActions, useDetractorCallItems, usePatterns, usePersons, useSignals } from '@/services/queries'
import { useEnvScope } from '@/services/envScope'
import { personLabel } from '@/utils/peopleExport'
import { watchCounters } from '@/utils/watchCounters'
import { AgentChip } from '@/components/common/AgentChip'
import { KpiTile } from '@/components/common/KpiTile'
import { LoadingState } from '@/components/common/LoadingState'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { SubPageHeader } from './SubPageHeader'

/** A chip that names a long agent ("Agent 5 · Corrective action and routing") wraps inside its column instead of running into the text. */
const CHIP_WRAP = 'h-auto min-h-6 max-w-full whitespace-normal py-[3px] text-start'

type RowState = 'ahead' | 'current' | 'done'

/**
 * One step: the clock (always left to right), who did it, what it did. Until the step is reached only its title shows, in the muted ink
 * (4.5:1: no opacity, which axe would read as lower contrast); once reached the description and the output line appear. The current step is
 * a well. Below the container width of 672px the grid stacks: the clock and the chip on one line, the text under them.
 */
function StepRow({ step, state, reveal }: { step: WatchStep; state: RowState; reveal: boolean }) {
  const { L } = useI18n()
  const reached = state !== 'ahead'
  const chip =
    step.agent === 'supervisor' ? (
      <AgentChip agent="supervisor" className={CHIP_WRAP} />
    ) : step.agent !== null ? (
      <AgentChip agent={step.agent} className={CHIP_WRAP} />
    ) : (
      <StatusBadge tone="neutral">{L(COPY.source)}</StatusBadge>
    )

  return (
    <li
      data-watch-step={step.id}
      aria-current={state === 'current' ? 'step' : undefined}
      className={cn(
        'row-divider grid gap-x-3 gap-y-2 rounded-well px-3 py-3.5 @2xl:grid-cols-[4.75rem_minmax(0,15rem)_minmax(0,1fr)]',
        state === 'current' && 'row-divider-none bg-well',
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 @2xl:contents">
        <bdi dir="ltr" className={cn('tabular text-sm font-medium @2xl:pt-0.5', reached ? 'text-foreground' : 'text-muted-foreground')}>
          {step.time}
        </bdi>
        <div className={cn('min-w-0 @2xl:self-start', !reached && 'grayscale')}>{chip}</div>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className={cn('t-ui-strong', !reached && 'text-muted-foreground')}>{L(step.title)}</span>
        {reached && (
          <div className={cn('flex flex-col gap-1.5', reveal && 'animate-[cx-fade-in_400ms_var(--ease-out)]')}>
            <p className="text-sm text-muted-foreground">{L(step.description)}</p>
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm font-medium text-foreground">
              <span>
                <span aria-hidden className="inline-block rtl:-scale-x-100">
                  →
                </span>{' '}
                {L(step.output)}
              </span>
              {step.supervisorTick && (
                <StatusBadge tone="success" icon={<Check aria-hidden className="text-success-text" />}>
                  {L(COPY.supervisorTick)}
                </StatusBadge>
              )}
            </p>
          </div>
        )}
      </div>
    </li>
  )
}

/**
 * Watch the AI team work (v42 F31): one WhatsApp message walked through nine steps with the clock, agent by agent, through the supervisor and
 * into three inboxes. Play runs it in 6 seconds (one step every 750 ms), Next step walks it, Reset starts over. Steps not yet reached show
 * only their title. Under it, "This week, by the same team": eight counters from the sample data, badged `sample`; and a fixed card that says
 * what this page cannot show: the impact, which exists only after Shadow on real data.
 *
 * The sample customer is the first person in the environment in scope. Its name shows only to a role that may see names; the Internal Audit and
 * Marketing Lead reads the reference (`P-001`) and no mobile digits. Nothing here is read from the escalation matrix or the trace index: the
 * replay text is the prototype's, and its ids (EV-9001, SG-9001, ...) are illustrative.
 *
 * A11y: an ordered list, `aria-current="step"` on the current step, a polite live region that announces the step reached, real buttons.
 * Motion: a reached step fades its text in over 400 ms; under reduced motion Play still advances but nothing animates.
 *
 * Design (docs/MEO_DESIGN_SYSTEM.md): dense settings sub-page, a card for the replay, a card -> well -> text group for the counters.
 */
export default function WatchTeam() {
  const { t, L } = useI18n()
  const { role } = useRole()
  const { env } = useEnvScope()
  const persons = usePersons()
  const interactions = useAllInteractions()
  const signals = useSignals()
  const patterns = usePatterns()
  const fixes = useCorrectiveActions()
  const calls = useDetractorCallItems()

  const person = persons.data?.[0]
  const mayShowDigits = canViewMobiles(role.id)
  const customer = useMemo<WatchCustomer>(
    () =>
      person
        ? { name: { en: personLabel(person, role.id), ar: personLabel(person, role.id) }, mobile: maskMobile(person.identity.mobile, mayShowDigits), env: envName(person.envId) }
        : // no one in this environment: the prototype's fallback customer, in Abu Dhabi
          { name: { en: 'A customer', ar: 'عميل' }, mobile: maskMobile(undefined, mayShowDigits), env: envName('auh') },
    [person, role.id, mayShowDigits],
  )
  const steps = useMemo(() => buildWatchSteps(customer), [customer])
  const replay = useWatchReplay(steps.length)
  const atEnd = replay.index >= steps.length - 1
  const reveal = !prefersReducedMotion()

  const countsReady = !!(interactions.data && signals.data && patterns.data && fixes.data && calls.data)
  const counters = watchCounters({
    interactions: (interactions.data ?? []).filter((i) => inEnvScope(env, i.envId)).length,
    signals: signals.data?.length ?? 0,
    patterns: patterns.data?.length ?? 0,
    fixes: fixes.data ?? [],
    briefs: calls.data?.length ?? 0,
  })

  const current = steps[replay.index]
  const stepOf = `${replay.index + 1} / ${steps.length}`

  return (
    <section data-density="dense" className="@container flex flex-col gap-4">
      <SubPageHeader title={L(COPY.title)} description={L(COPY.intro)} />

      <SectionCard>
        <div className="flex flex-col gap-3">
          <div role="group" aria-label={t('Replay controls', 'أدوات التشغيل')} className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={replay.play}>
              <Play aria-hidden className="fill-current" />
              {L(COPY.play)}
            </Button>
            {/* aria-disabled, not disabled: pressing Next on step 8 must not drop the keyboard focus the moment it reaches step 9 */}
            <Button size="sm" variant="outline" aria-disabled={atEnd || undefined} onClick={() => !atEnd && replay.next()}>
              {L(COPY.next)}
            </Button>
            <Button size="sm" variant="outline" onClick={replay.reset}>
              {L(COPY.reset)}
            </Button>
            <span data-slot="watch-step-of" className="ms-1 text-sm text-muted-foreground">
              {L(COPY.step)} <bdi dir="ltr" className="tabular">{stepOf}</bdi>
            </span>
          </div>

          <p aria-live="polite" aria-atomic="true" className="sr-only">
            {t(`Step ${replay.index + 1} of ${steps.length}: ${L(current.title)}`, `الخطوة ${replay.index + 1} من ${steps.length}: ${L(current.title)}`)}
          </p>

          {persons.isLoading ? (
            <LoadingState rows={5} />
          ) : (
            <ol aria-label={t('The nine steps of one message', 'الخطوات التسع لرسالة واحدة')} className="flex flex-col">
              {steps.map((step, k) => (
                <StepRow key={step.id} step={step} state={k === replay.index ? 'current' : k < replay.index ? 'done' : 'ahead'} reveal={reveal && k > 0} />
              ))}
            </ol>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title={
          <h3 className="inline-flex flex-wrap items-center gap-2">
            {L(COPY.weekHeading)}
            <StatusBadge tone="neutral">{L(COPY.sample)}</StatusBadge>
          </h3>
        }
        description={L(COPY.weekHint)}
      >
        <ul className="grid grid-cols-2 gap-2.5 @2xl:grid-cols-4">
          {counters.map((c) => (
            <li key={c.id} className="min-w-0">
              <KpiTile variant="well" label={L(WATCH_COUNTER_LABELS[c.id])} value={c.value} loading={!countsReady} />
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title={L(COPY.notHeading)}>
        <p className="max-w-[88ch] text-sm text-muted-foreground">{L(COPY.notText)}</p>
      </SectionCard>
    </section>
  )
}
