import type { InboxItem, RoleId } from '../types'
import { CAMPAIGN_AUDIT_PATH, belowTargetingLine, pct, type CheckId } from '../data/campaignAudit'
import type { AuditCampaignView } from '../services/mockCampaignAudit'
import { auditWindow, listCampaigns, readAuditState } from '../data/marketingCampaigns'

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
 * The inbox of the Internal Audit and Marketing Lead. 23 Nov (owner): no clearance before a run, so only one row: the marketing
 * campaigns whose audit window is open (or past its date) and that have no verdict yet. It opens the audit tab of Marketing campaigns.
 * The summary argument is kept for the callers' signature and no longer read.
 */
export function campaignAuditInboxItems(role: RoleId, _summary?: Pick<CampaignAuditSummary, 'waiting' | 'finished'>): InboxItem[] {
  if (role !== 'auditmkt') return []
  const st = readAuditState()
  const ready = listCampaigns().filter((c) => {
    const w = auditWindow(c, st.settings)
    return (w.phase === 'open' || w.phase === 'overdue') && !st.audits[c.id]?.verdict
  })
  if (!ready.length) return []
  const overdue = ready.some((c) => auditWindow(c, st.settings).phase === 'overdue')
  return [
    {
      id: 'campaign-audit:ready',
      kind: 'caud2',
      text: {
        en: `Audit after the run: ${ready.length === 1 ? '1 campaign is ready' : `${ready.length} campaigns are ready`}${overdue ? ', one or more past the date' : ''}`,
        ar: `التدقيق بعد التشغيل: ${ready.length === 1 ? 'حملة واحدة جاهزة' : `${ready.length} حملات جاهزة`}${overdue ? '، وبعضها تجاوز الموعد' : ''}`,
      },
      daysLeft: overdue ? 0 : 5,
      unit: 'wd',
      who: null,
      priority: overdue ? 2 : 0,
      target: `${CAMPAIGN_AUDIT_PATH}?tab=audit`,
    },
  ]
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

