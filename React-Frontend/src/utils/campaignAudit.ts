import type { InboxItem, RoleId } from '../types'
import { CAMPAIGN_AUDIT_COPY, CAMPAIGN_AUDIT_PATH, belowTargetingLine, pct, type CheckId } from '../data/campaignAudit'
import type { AuditCampaignView } from '../services/mockCampaignAudit'

/**
 * What the campaign audit hands to the rest of the portal (v42.1, F33): the counts of the inbox and of the Daily brief, the targeting
 * signals, the gate. Pure functions over the views of `useCampaignAudit`, so a real API can reuse them.
 */

export interface CampaignAuditSummary {
  /** Before the run, no verdict yet: what the inbox row "Clear or send back" counts. */
  waiting: number
  /** Before the run, sent back with failed checks: with Marketing, not on the audit lead. */
  sentBack: number
  running: number
  /** After the run: what the inbox row "Audit after the run" counts. */
  finished: number
  /** Runs that reached under 80% of the right people. */
  signals: number
  /** The reached-the-right-people share of every running campaign, as whole percents, in list order (the brief line). */
  runningReachedPct: number[]
}

export function summariseCampaignAudit(views: readonly AuditCampaignView[]): CampaignAuditSummary {
  const before = views.filter((c) => c.stage === 'before')
  const running = views.filter((c) => c.stage === 'running')
  return {
    waiting: before.filter((c) => c.clearance === 'waiting').length,
    sentBack: before.filter((c) => c.clearance === 'sent_back').length,
    running: running.length,
    finished: views.filter((c) => c.stage === 'after').length,
    signals: targetingSignals(views).length,
    // the prototype reads `res.reached` and falls back to 71% for a running campaign without one; every running campaign has one here
    runningReachedPct: running.map((c) => pct(c.results?.reached ?? 0.71)),
  }
}

export interface TargetingSignal {
  campaignId: string
  /** Whole percent of the recipients that match the persona on the record. */
  reachedPct: number
}

/** A run that reached under 80% of the right people raises one targeting signal to Marketing (Decision 4). Derived, never stored. */
export function targetingSignals(views: readonly AuditCampaignView[]): TargetingSignal[] {
  return views.flatMap((c) => (c.results && belowTargetingLine(c.results) ? [{ campaignId: c.id, reachedPct: pct(c.results.reached) }] : []))
}

/**
 * The inbox of the Internal Audit and Marketing Lead (prototype `CAUD`, `CAUD2`): "Clear or send back: N campaigns waiting before they
 * run" (2 working days, urgent, with the Marketing manager) and "Audit after the run: N finished campaigns" (normal, nobody). Both open
 * the campaign audit page. A row with nothing to count is not listed. Nobody else gets these rows.
 */
export function campaignAuditInboxItems(role: RoleId, summary: Pick<CampaignAuditSummary, 'waiting' | 'finished'> | undefined): InboxItem[] {
  if (role !== 'auditmkt' || !summary) return []
  const items: InboxItem[] = []
  if (summary.waiting > 0) {
    items.push({
      id: 'campaign-audit:waiting',
      kind: 'caud',
      text: CAMPAIGN_AUDIT_COPY.inboxWaiting(summary.waiting),
      daysLeft: 2,
      unit: 'wd',
      who: CAMPAIGN_AUDIT_COPY.owners.marketing,
      priority: 2,
      target: CAMPAIGN_AUDIT_PATH,
    })
  }
  if (summary.finished > 0) {
    items.push({
      id: 'campaign-audit:finished',
      kind: 'caud2',
      text: CAMPAIGN_AUDIT_COPY.inboxFinished(summary.finished),
      daysLeft: 5,
      unit: 'wd',
      who: null,
      priority: 0,
      target: CAMPAIGN_AUDIT_PATH,
    })
  }
  return items
}

/** Why a campaign may not start yet, or null when it may: the gate the Close the loop and Personas buttons read. */
export function startBlock(c: Pick<AuditCampaignView, 'stage' | 'clearance'>): 'waiting' | 'sent_back' | null {
  if (c.stage !== 'before') return null
  return c.clearance === 'cleared' ? null : c.clearance
}

/** The campaign the page opens on: for an editor the first one waiting for clearance, else the first of the list (the prototype opens the first). */
export function defaultCampaignId(views: readonly AuditCampaignView[], canEdit: boolean): string | undefined {
  const waiting = canEdit ? views.find((c) => c.stage === 'before' && c.clearance === 'waiting') : undefined
  return (waiting ?? views[0])?.id
}

/** "Right people, The money": the failed checks by name, in the order of the five (Arabic joins with "،"). */
export function failedCheckNames(failed: readonly CheckId[], title: (id: CheckId) => string, lang: 'en' | 'ar' = 'en'): string {
  return failed.map(title).join(lang === 'ar' ? '، ' : ', ')
}
