import { useId, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Check, Minus, Undo2, X } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canEditCampaignAudit } from '@/auth/permissions'
import {
  AUDIT_CHECKS,
  CAMPAIGN_AUDIT_COPY as COPY,
  CHECK_IDS,
  belowTargetingLine,
  campaignSays,
  checkById,
  pct,
  type CheckId,
  type Verdict,
} from '@/data/campaignAudit'
import { CampaignAuditError, type AuditCampaignView } from '@/services/mockCampaignAudit'
import { useCampaignAudit, useSetCampaignCheck, useSetCampaignVerdict } from '@/services/campaignAuditQueries'
import { defaultCampaignId, failedCheckNames, summariseCampaignAudit } from '@/utils/campaignAudit'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { ErrorState } from '@/components/common/ErrorState'
import { InlineNote } from '@/components/common/InlineNote'
import { KpiTile } from '@/components/common/KpiTile'
import { LoadingState } from '@/components/common/LoadingState'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { SubPageHeader, ViewOnlyNotice } from './SubPageHeader'

/**
 * Campaign audit (v42.1 F33, Decision 4 of 19 Nov 2026). Every campaign, Marketing's (one per persona) and the CX team's AI interview
 * campaigns, is cleared or sent back by the Internal Audit and Marketing Lead before anything reaches a customer, and audited again after
 * the run. One campaign at a time (a segmented control), five checks each answered against what the campaign itself says (✓ or ✗), then
 * the verdict: "Cleared to run" (all five passed) or "Send back to Marketing with the failed checks" (at least one failed, listed).
 * After the run: the share of recipients matching the persona on the record (under 80% raises a targeting signal to Marketing), the
 * response rate, leads or recoveries and the cost per result. The Internal Audit and Marketing Lead and the CX manager edit; the CX team,
 * the Marketing manager and Executive read the marks and the verdict (`canEditCampaignAudit`). The gate itself lives where campaigns
 * start (Close the loop, Personas: `CampaignGate`) and in the data layer.
 *
 * Design: a register, so dense. KPI cards on top, the segmented control (pressed variant, `?campaign=` keeps the choice), one card for the
 * campaign with its five checks as rows that stack on a narrow page (the page is a container: three columns from 42rem of width), then the
 * after-run card. Colour appears only as the status tags; ✓ and ✗ are the dark material when selected.
 */
export default function CampaignAudit() {
  const { L } = useI18n()
  const { role } = useRole()
  const canEdit = canEditCampaignAudit(role.id)
  const [params, setParams] = useSearchParams()
  const { data: campaigns, isLoading, isError, refetch } = useCampaignAudit()
  // The campaign on show is fixed when the list first loads (the one in the link, else the first waiting for an editor), so clearing a
  // campaign does not jump to the next one under the auditor's hands.
  const [picked, setPicked] = useState<string | null>(params.get('campaign'))
  if (campaigns && picked === null) setPicked(defaultCampaignId(campaigns, canEdit) ?? null)
  const selected = campaigns?.find((c) => c.id === picked) ?? campaigns?.find((c) => c.id === defaultCampaignId(campaigns, canEdit))
  const summary = campaigns ? summariseCampaignAudit(campaigns) : undefined

  const pick = (id: string) => {
    setPicked(id)
    const next = new URLSearchParams(params)
    next.set('campaign', id)
    setParams(next, { replace: true })
  }

  return (
    <section data-density="dense" className="@container flex flex-col gap-4">
      <SubPageHeader title={L(COPY.title)} description={L(COPY.intro)} />
      {!canEdit && <ViewOnlyNotice>{L(COPY.viewOnly)}</ViewOnlyNotice>}

      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : isLoading || !campaigns || !summary ? (
        <LoadingState rows={6} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KpiTile label={L(COPY.kpi.waiting)} value={summary.waiting} sub={L(COPY.kpi.waitingSub(summary.sentBack))} accent={summary.waiting ? 'var(--warning)' : undefined} />
            <KpiTile label={L(COPY.kpi.running)} value={summary.running} sub={L(COPY.kpi.runningSub)} />
            <KpiTile label={L(COPY.kpi.finished)} value={summary.finished} sub={L(COPY.kpi.finishedSub)} />
            <KpiTile label={L(COPY.kpi.signals)} value={summary.signals} sub={L(COPY.kpi.signalsSub)} accent={summary.signals ? 'var(--warning)' : undefined} />
          </div>

          <Segmented
            variant="pressed"
            label={L(COPY.campaignsLabel)}
            value={selected?.id ?? ''}
            onValueChange={pick}
            options={campaigns.map((c) => ({
              value: c.id,
              label: (
                <span className="inline-flex items-center gap-1.5">
                  {c.clearance === 'cleared' ? <Check aria-hidden className="size-3.5" /> : c.clearance === 'sent_back' ? <Undo2 aria-hidden className="size-3.5" /> : null}
                  <bdi className="tabular">{c.id}</bdi>
                  <span className="sr-only">
                    {' · '}
                    {c.clearance === 'cleared' ? L(COPY.chipCleared) : c.clearance === 'sent_back' ? L(COPY.chipSentBack) : L(COPY.gate.badgeWaiting)}
                  </span>
                </span>
              ),
            }))}
          />

          {selected && <CampaignCard key={selected.id} campaign={selected} canEdit={canEdit} />}
          {selected?.results && <AfterRun campaign={selected} />}
        </>
      )}

    </section>
  )
}

/** The one campaign on show: what it is, the five checks against what it says, and the verdict. */
function CampaignCard({ campaign: c, canEdit }: { campaign: AuditCampaignView; canEdit: boolean }) {
  const { t, L, lang } = useI18n()
  const setCheck = useSetCampaignCheck()
  const setVerdict = useSetCampaignVerdict()
  const hintId = useId()
  const open = canEdit && c.stage === 'before'
  const allPassed = CHECK_IDS.every((id) => c.checks[id] === true)
  const anyFailed = c.failed.length > 0
  const locale = lang === 'ar' ? 'ar-AE' : 'en-GB'
  const day = (iso: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${iso}T00:00:00`))
  const failedNames = failedCheckNames(c.failed, (id) => L(checkById(id).title), lang)
  const stage = c.stage

  const fail = (e: unknown) => toast.error(e instanceof CampaignAuditError ? e.message : t('Could not save the audit.', 'تعذّر حفظ التدقيق.'))
  const mark = (check: CheckId, value: boolean | null) => setCheck.mutate({ id: c.id, check, value }, { onError: fail })
  const decide = (verdict: Verdict) => {
    // aria-disabled keeps the focus on the button, so the press is ignored here, and the hint under the buttons says why
    if (verdict === 'ok' ? !allPassed : !anyFailed) return
    setVerdict.mutate({ id: c.id, verdict }, { onSuccess: () => toast(L(verdict === 'ok' ? COPY.toastCleared : COPY.toastSentBack)), onError: fail })
  }

  const hints = [!allPassed && L(COPY.verdictHint.needAll), !anyFailed && L(COPY.verdictHint.needFailed)].filter(Boolean).join(' ')

  return (
    <div data-tour="campaign-audit" data-testid="campaign-card" data-campaign={c.id} data-clearance={c.clearance} data-stage={stage}>
      <SectionCard
        title={L(c.name)}
        description={`${c.id} · ${L(c.kind === 'persona' ? COPY.kindPersona : COPY.kindAi)} · ${L(COPY.owner)}: ${L(c.owner)} · ${L(COPY.stateText[stage])}`}
        actions={<StatusBadge tone={stage === 'before' ? 'warning' : stage === 'running' ? 'info' : 'neutral'}>{L(COPY.stageBadge[stage])}</StatusBadge>}
        contentClassName="flex flex-col gap-4"
      >
        <div aria-hidden className="hidden gap-x-6 text-sm text-muted-foreground @2xl:grid @2xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)_7.5rem]">
          <span>{L(COPY.columns.check)}</span>
          <span>{L(COPY.columns.says)}</span>
          <span className="justify-self-end">{L(COPY.columns.verdict)}</span>
        </div>
        <ol aria-label={L(COPY.checksLabel)} className="flex flex-col">
          {AUDIT_CHECKS.map((q) => {
            const v = c.checks[q.id]
            return (
              <li key={q.id} data-check={q.id} data-mark={v === true ? 'pass' : v === false ? 'fail' : 'none'} className="row-divider grid grid-cols-1 gap-x-6 gap-y-3 py-4 @2xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)_7.5rem] @2xl:items-start">
                <div className="min-w-0">
                  <h3 className="t-small-strong text-foreground">{L(q.title)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{L(q.rule)}</p>
                </div>
                <div className="min-w-0">
                  <p className="label-style mb-1 @2xl:hidden">{L(COPY.columns.says)}</p>
                  <p className="text-sm text-foreground">{L(campaignSays(c, q.id))}</p>
                </div>
                <div className="@2xl:justify-self-end">
                  <p className="label-style mb-1 @2xl:hidden">{L(COPY.columns.verdict)}</p>
                  {open ? (
                    <div role="group" aria-label={`${L(q.title)}: ${L(COPY.columns.verdict)}`} className="flex items-center gap-1.5">
                      <Button size="icon" variant={v === true ? 'default' : 'outline'} aria-pressed={v === true} aria-label={`${L(q.title)}: ${L(COPY.pass)}`} title={L(COPY.pass)} onClick={() => mark(q.id, v === true ? null : true)}>
                        <Check aria-hidden />
                      </Button>
                      <Button size="icon" variant={v === false ? 'default' : 'outline'} aria-pressed={v === false} aria-label={`${L(q.title)}: ${L(COPY.fail)}`} title={L(COPY.fail)} onClick={() => mark(q.id, v === false ? null : false)}>
                        <X aria-hidden />
                      </Button>
                    </div>
                  ) : (
                    <StatusBadge tone={v === true ? 'success' : v === false ? 'danger' : 'neutral'} icon={v === true ? <Check aria-hidden /> : v === false ? <X aria-hidden /> : <Minus aria-hidden />}>
                      {v === true ? L(COPY.pass) : v === false ? L(COPY.fail) : L(COPY.notChecked)}
                    </StatusBadge>
                  )}
                </div>
              </li>
            )
          })}
        </ol>

        {open && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button aria-disabled={!allPassed || undefined} aria-describedby={hints ? hintId : undefined} loading={setVerdict.isPending} onClick={() => decide('ok')}>
                {L(COPY.cleared)}
              </Button>
              <Button
                variant="outline"
                roll={false}
                className="h-auto! min-h-10 whitespace-normal! py-2 text-center"
                aria-disabled={!anyFailed || undefined}
                aria-describedby={hints ? hintId : undefined}
                loading={setVerdict.isPending}
                onClick={() => decide('back')}
              >
                {L(COPY.sendBack)}
              </Button>
              {c.verdict && <StatusBadge tone={c.verdict === 'ok' ? 'success' : 'danger'}>{c.verdict === 'ok' ? L(COPY.chipCleared) : L(COPY.chipSentBack)}</StatusBadge>}
            </div>
            {hints && (
              <p id={hintId} className="text-sm text-muted-foreground">
                {hints}
              </p>
            )}
          </div>
        )}

        {c.verdict === 'back' ? (
          <div className="flex flex-col gap-3" data-testid="campaign-verdict">
            <InlineNote tone="warning" title={L(COPY.summary.sentBackTitle)}>
              {L(COPY.summary.sentBack(failedNames))}
            </InlineNote>
            <ul aria-label={t('Failed checks', 'الفحوصات الفاشلة')} className="flex flex-wrap gap-2">
              {c.failed.map((id) => (
                <li key={id}>
                  <StatusBadge tone="danger" icon={<X aria-hidden />}>
                    {L(checkById(id).title)}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          </div>
        ) : c.verdict === 'ok' && c.decidedAt ? (
          <InlineNote tone="success" data-testid="campaign-verdict">
            {stage === 'before' ? L(COPY.summary.cleared(day(c.decidedAt))) : L(COPY.verdictHint.locked(stage, day(c.decidedAt)))}
          </InlineNote>
        ) : (
          <InlineNote tone="neutral" data-testid="campaign-verdict">
            {L(COPY.summary.waiting)}
          </InlineNote>
        )}
      </SectionCard>
    </div>
  )
}

/** After the run: reached the right people, responded, leads or recoveries, cost per result, and the targeting signal under 80%. */
function AfterRun({ campaign: c }: { campaign: AuditCampaignView }) {
  const { L } = useI18n()
  const r = c.results!
  const reached = pct(r.reached)
  const low = belowTargetingLine(r)
  return (
    <SectionCard
      title={L(COPY.afterTitle)}
      actions={c.stage === 'running' ? <StatusBadge tone="neutral">{L(COPY.soFar)}</StatusBadge> : undefined}
      description={L(COPY.afterHint)}
      contentClassName="flex flex-col gap-4"
    >
      <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-4" data-testid="campaign-results">
        <KpiTile variant="well" label={L(COPY.tiles.reached)} value={reached} unit="%" accent={low ? 'var(--warning)' : undefined} />
        <KpiTile variant="well" label={L(COPY.tiles.responded)} value={pct(r.responded)} unit="%" />
        <KpiTile variant="well" label={L(COPY.tiles.leads)} value={r.leads} />
        <KpiTile variant="well" label={L(COPY.tiles.cost)} value={r.leads ? `AED ${Math.round(r.cost / r.leads).toLocaleString('en-US')}` : '–'} />
      </div>
      {low ? (
        <InlineNote tone="warning" title={L(COPY.signal.title)} data-testid="targeting-signal" role="note">
          {L(COPY.signal.text(reached))}
        </InlineNote>
      ) : (
        <InlineNote tone="neutral" data-testid="targeting-ok">
          {L(COPY.signal.none(reached))}
        </InlineNote>
      )}
    </SectionCard>
  )
}

