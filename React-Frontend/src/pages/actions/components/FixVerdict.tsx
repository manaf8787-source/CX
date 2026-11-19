import { Fragment, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath } from '@/auth/access'
import { canRecordFixVerdict } from '@/auth/permissions'
import { useSetFixStatus } from '@/services/queriesV40'
import { useAcceptFixAsIs, useInvestigateFromFix, useRequestSecondStep, useSecondSteps } from '@/services/fixVerdictQueries'
import { CORRECTIVE_STATUS_LABEL } from '@/lib/status'
import { acceptToast, hasOpenSecondStep, investigateToast, isOpenVerdict, secondStepToast, VERDICT_COPY, type VerdictOutcome } from '@/utils/fixVerdict'
import { caId, invId } from '@/utils/trace'
import { Button } from '@/components/ui/button'
import { TraceId } from '@/components/common/TraceId'
import { cn } from '@/lib/utils'
import type { CorrectiveAction, Pattern } from '@/types'

/**
 * v40.1: closing the 60-day check (docs/V401_VERDICT.md; prototype block "v40.1 · partial verdict, second step, investigate from a fix").
 *
 * - `FixVerdictSection`: on a fix in the 60-day check, the three verdict buttons; on a partial or failed fix, the bar with decision 3.
 *   Only the CX manager and the CX team see either (`canRecordFixVerdict`); every other role, the owner included, sees nothing.
 * - `FixLineage`: "Second step after CA-2xx (Partial: second step needed)" on the new fix, "Second step: CA-2yy" on the original.
 *
 * Composition (Meo-inspired): a well, not a coloured banner. The status colour is the 6px dot only (warning for partial, error for
 * failed), the words carry the meaning. The long labels wrap inside the pill instead of being cut (a phone is 224px of card).
 */

/** Pill buttons whose labels are long sentences: they wrap instead of overflowing a 320px phone, and keep the label roll off. */
const LONG_PILL = 'h-auto min-h-9 max-w-full py-1.5 text-center leading-snug whitespace-normal'

export function FixVerdictSection({ fix, pattern }: { fix: CorrectiveAction; pattern?: Pattern }) {
  const { role } = useRole()
  if (!canRecordFixVerdict(role.id)) return null
  if (fix.status === 'verification') return <VerdictButtons fix={fix} />
  if (isOpenVerdict(fix.status)) return <DecisionBar fix={fix} outcome={fix.status} pattern={pattern} />
  return null
}

/** Effective, partial, failed: each calls `useSetFixStatus` (status, `verificationResult`, an audit line) and toasts. The automatic readout stays above as the evidence. */
function VerdictButtons({ fix }: { fix: CorrectiveAction }) {
  const { L } = useI18n()
  const setStatus = useSetFixStatus()
  const titleId = useId()

  // `mutateAsync`, not `mutate(…, { onSuccess })`: the verdict changes the status, so this section unmounts before the call-level callbacks would run.
  async function record(status: 'effective' | 'partial' | 'failed') {
    try {
      await setStatus.mutateAsync({ id: fix.id, status })
      toast.success(L(VERDICT_COPY.verdictToast[status]))
    } catch {
      toast.error(L(VERDICT_COPY.saveFailed))
    }
  }

  return (
    <section role="group" aria-labelledby={titleId} data-testid="fix-verdict" className="well flex flex-col gap-3 px-4 py-3.5">
      <div className="flex flex-col gap-1">
        <h3 id={titleId} className="t-small-strong">
          {L(VERDICT_COPY.recordTitle)}
        </h3>
        <p className="max-w-[80ch] text-sm text-muted-foreground">{L(VERDICT_COPY.recordHint)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" roll={false} className={LONG_PILL} disabled={setStatus.isPending} onClick={() => record('effective')} data-verdict="effective">
          {L(VERDICT_COPY.buttons.effective)}
        </Button>
        <Button size="sm" variant="outline" roll={false} className={LONG_PILL} disabled={setStatus.isPending} onClick={() => record('partial')} data-verdict="partial">
          {L(VERDICT_COPY.buttons.partial)}
        </Button>
        <Button size="sm" variant="outline" roll={false} className={LONG_PILL} disabled={setStatus.isPending} onClick={() => record('failed')} data-verdict="failed">
          {L(VERDICT_COPY.buttons.failed)}
        </Button>
      </div>
    </section>
  )
}

/**
 * Decision 3 after a partial or failed verdict: ask the owner for a second step (a NEW fix on the same pattern, which then becomes the
 * selected one), investigate first (five interviews, then the Investigations page), or accept the result as it is (the fix ends
 * effective). A second step already open turns the first button off (`aria-disabled`, described by the reason, still focusable); a fix
 * with no pattern has nothing to investigate, so that button is left out.
 */
function DecisionBar({ fix, outcome, pattern }: { fix: CorrectiveAction; outcome: VerdictOutcome; pattern?: Pattern }) {
  const { L } = useI18n()
  const { role } = useRole()
  const navigate = useNavigate()
  const steps = useSecondSteps(fix.id)
  const second = useRequestSecondStep()
  const investigate = useInvestigateFromFix()
  const accept = useAcceptFixAsIs()
  const titleId = useId()
  const hintId = useId()
  const busy = second.isPending || investigate.isPending || accept.isPending
  const secondOpen = hasOpenSecondStep(steps, fix.id)

  // `mutateAsync` throughout: the call-level callbacks of `mutate` are dropped when the bar unmounts (accept as is changes the status).
  async function askForSecondStep() {
    if (secondOpen) return
    try {
      const child = await second.mutateAsync({ parentId: fix.id })
      toast.success(L(secondStepToast(child.id)))
      // The new fix becomes the selected one: highlighted, scrolled to, focused (`?fix=`).
      navigate(`/actions/corrective?fix=${caId(child.id)}`)
    } catch {
      toast.error(L(VERDICT_COPY.saveFailed))
    }
  }

  async function investigateFirst() {
    try {
      const inv = await investigate.mutateAsync({ fixId: fix.id, environment: pattern?.team })
      toast.success(L(investigateToast()))
      if (canAccessPath(role.id, '/actions/investigations')) navigate(`/actions/investigations?inv=${invId(inv.id)}`)
    } catch {
      toast.error(L(VERDICT_COPY.saveFailed))
    }
  }

  async function acceptAsIs() {
    try {
      await accept.mutateAsync({ id: fix.id })
      toast.success(L(acceptToast()))
    } catch {
      toast.error(L(VERDICT_COPY.saveFailed))
    }
  }

  return (
    <section role="group" aria-labelledby={titleId} data-testid="fix-second-step-bar" data-outcome={outcome} className="well flex items-start gap-3 px-4 py-3.5">
      <span aria-hidden className={cn('dot mt-[7px]', outcome === 'failed' ? 'dot-error' : 'dot-warning')} />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 id={titleId} className="t-small-strong">
            {L(VERDICT_COPY.barTitle[outcome])}
          </h3>
          <p className="max-w-[80ch] text-sm text-muted-foreground">{L(VERDICT_COPY.barText)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            roll={false}
            className={LONG_PILL}
            disabled={busy}
            aria-disabled={secondOpen || undefined}
            aria-describedby={secondOpen ? hintId : undefined}
            onClick={askForSecondStep}
          >
            {L(VERDICT_COPY.second)}
          </Button>
          {fix.patternId && (
            <Button size="sm" variant="outline" roll={false} className={LONG_PILL} disabled={busy} onClick={investigateFirst}>
              {L(VERDICT_COPY.investigate)}
            </Button>
          )}
          <Button size="sm" variant="outline" roll={false} className={LONG_PILL} disabled={busy} onClick={acceptAsIs}>
            {L(VERDICT_COPY.accept)}
          </Button>
        </div>
        {secondOpen && (
          <p id={hintId} className="text-sm text-muted-foreground">
            {L(VERDICT_COPY.secondOpen)}
          </p>
        )}
      </div>
    </section>
  )
}

/**
 * The link between a fix and its second step, both ways, as trace ids. The new fix reads "Second step after CA-201 (Partial: second step
 * needed)" (the verdict it followed, kept on the fix); the original lists its second steps, "Second step: CA-205". Nothing for a fix with neither.
 */
export function FixLineage({ fix }: { fix: CorrectiveAction }) {
  const { t, L } = useI18n()
  const steps = useSecondSteps(fix.id)
  if (!fix.parentFixId && steps.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5 text-sm text-muted-foreground" data-testid="fix-lineage">
      {fix.parentFixId && (
        <p data-testid="fix-parent" className="leading-7">
          {t('Second step after', 'خطوة ثانية بعد')} <TraceId kind="fix" id={fix.parentFixId} />
          {fix.parentOutcome && <> ({L(CORRECTIVE_STATUS_LABEL[fix.parentOutcome])})</>}
        </p>
      )}
      {steps.length > 0 && (
        <p data-testid="fix-children" className="leading-7">
          {L(VERDICT_COPY.secondStepList)}:
          {steps.map((s) => (
            <Fragment key={s.id}> <TraceId kind="fix" id={s.id} /></Fragment>
          ))}
        </p>
      )}
    </div>
  )
}
