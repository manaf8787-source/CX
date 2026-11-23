import type { RoleId } from '../types'
import { canEditCampaignAudit, canStartCampaign } from '../auth/permissions'
import {
  CHECK_IDS,
  sampleResults,
  type AuditCampaign,
  type CampaignResults,
  type CampaignStage,
  type CheckId,
  type Clearance,
  type Verdict,
} from '../data/campaignAudit'

/**
 * The campaign audit register (v42.1, F33): the five checks, the verdict and the stage of every campaign, kept in memory like the other
 * mock registers so it survives navigation. A real API replaces this module; the hooks in `campaignAuditQueries.ts` are the seam.
 *
 * The rules live here, not only in the buttons, so no caller can get round them:
 * - only the Internal Audit and Marketing Lead and the CX manager mark checks and decide (`canEditCampaignAudit`);
 * - "Cleared to run" needs all five checks passed, "Send back" at least one failed [Proposed: the prototype lets either be pressed at any time];
 * - changing a check after a verdict withdraws the verdict (the campaign waits for clearance again) [Proposed];
 * - the checks and the verdict are closed once the campaign has started [Proposed];
 * - 23 Nov (owner): there is no clearance before a run any more; `start` no longer checks a verdict. The audit is after the run only.
 */

export type CampaignAuditErrorCode = 'not_found' | 'not_allowed' | 'locked' | 'checks_incomplete' | 'no_failed_check' | 'not_cleared' | 'wrong_stage'

export class CampaignAuditError extends Error {
  readonly code: CampaignAuditErrorCode
  constructor(code: CampaignAuditErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'CampaignAuditError'
    this.code = code
  }
}

interface AuditRecord {
  stage: CampaignStage
  checks: Partial<Record<CheckId, boolean>>
  verdict?: Verdict
  /** 'YYYY-MM-DD'. */
  decidedAt?: string
  decidedBy?: RoleId
}

/** A campaign with its audit state: what the page, the gates, the inbox and the brief read. */
export interface AuditCampaignView extends AuditCampaign {
  stage: CampaignStage
  checks: Partial<Record<CheckId, boolean>>
  verdict?: Verdict
  decidedAt?: string
  decidedBy?: RoleId
  /** The checks marked ✗, in the order of the five. */
  failed: CheckId[]
  clearance: Clearance
  /** The sample numbers of the run: for a running campaign (so far) and a finished one, none before it starts. */
  results: CampaignResults | null
}

/** The sample clearance dates of the campaigns that run or finished already (sample data). */
const SEED_DECIDED: Record<string, string> = { 'MC-101': '2026-11-10', 'MC-102': '2026-11-11', 'MC-105': '2026-10-27', 'MC-106': '2026-10-29', 'camp-ai-1': '2026-11-12' }
const DEFAULT_DECIDED = '2026-11-12'

const allPassed = (): Partial<Record<CheckId, boolean>> => Object.fromEntries(CHECK_IDS.map((id) => [id, true]))

/** A campaign that already runs or finished was cleared (sample data): nothing is sent before clearance, so the sample respects it too. */
function seedRecord(c: AuditCampaign): AuditRecord {
  if (c.seedStage === 'before') return { stage: 'before', checks: {} }
  return { stage: c.seedStage, checks: allPassed(), verdict: 'ok', decidedAt: SEED_DECIDED[c.id] ?? DEFAULT_DECIDED, decidedBy: 'auditmkt' }
}

export const clearanceOf = (verdict: Verdict | undefined): Clearance => (verdict === 'ok' ? 'cleared' : verdict === 'back' ? 'sent_back' : 'waiting')

export interface CampaignAuditStore {
  list(): AuditCampaignView[]
  setCheck(input: { id: string; check: CheckId; value: boolean | null; by: RoleId }): AuditCampaignView
  setVerdict(input: { id: string; verdict: Verdict; by: RoleId }): AuditCampaignView
  /** The gate: starts a cleared campaign, refuses any other. */
  start(input: { id: string; by: RoleId }): AuditCampaignView
  finish(input: { id: string; by: RoleId }): AuditCampaignView
  /** Back to the seeded state (tests). */
  reset(): void
}

/**
 * `getCampaigns` is the live list of campaigns (built from the personas and the AI interview campaigns, so a campaign created later shows
 * up as "waiting"); `onStage` lets the caller mirror a stage change on the campaign's own register (an AI campaign's status).
 */
export function createCampaignAuditStore(
  getCampaigns: () => AuditCampaign[],
  options: { onStage?: (campaign: AuditCampaign, stage: CampaignStage) => void; now?: () => Date } = {},
): CampaignAuditStore {
  const records = new Map<string, AuditRecord>()
  const today = () => (options.now?.() ?? new Date()).toISOString().slice(0, 10)

  const recordOf = (c: AuditCampaign): AuditRecord => {
    let rec = records.get(c.id)
    if (!rec) {
      rec = seedRecord(c)
      records.set(c.id, rec)
    }
    return rec
  }

  const view = (c: AuditCampaign): AuditCampaignView => {
    const rec = recordOf(c)
    return {
      ...c,
      stage: rec.stage,
      checks: { ...rec.checks },
      verdict: rec.verdict,
      decidedAt: rec.decidedAt,
      decidedBy: rec.decidedBy,
      failed: CHECK_IDS.filter((id) => rec.checks[id] === false),
      clearance: clearanceOf(rec.verdict),
      results: rec.stage === 'before' ? null : sampleResults(c),
    }
  }

  const find = (id: string): AuditCampaign => {
    const c = getCampaigns().find((x) => x.id === id)
    if (!c) throw new CampaignAuditError('not_found', `Campaign ${id} not found`)
    return c
  }

  const mayEdit = (by: RoleId) => {
    if (!canEditCampaignAudit(by)) throw new CampaignAuditError('not_allowed', 'Only the Internal Audit and Marketing Lead and the CX manager mark checks and decide')
  }

  const mayRun = (c: AuditCampaign, by: RoleId) => {
    if (!canStartCampaign(by, c.kind)) throw new CampaignAuditError('not_allowed', 'This role does not start or finish this campaign')
  }

  const setStage = (c: AuditCampaign, rec: AuditRecord, stage: CampaignStage) => {
    rec.stage = stage
    options.onStage?.(c, stage)
  }

  return {
    list: () => getCampaigns().map(view),

    setCheck({ id, check, value, by }) {
      mayEdit(by)
      const c = find(id)
      const rec = recordOf(c)
      if (rec.stage !== 'before') throw new CampaignAuditError('locked', 'The checks are closed once the campaign has started')
      if (value === null) delete rec.checks[check]
      else rec.checks[check] = value
      // a changed check withdraws the verdict: the campaign waits for clearance again
      delete rec.verdict
      delete rec.decidedAt
      delete rec.decidedBy
      return view(c)
    },

    setVerdict({ id, verdict, by }) {
      mayEdit(by)
      const c = find(id)
      const rec = recordOf(c)
      if (rec.stage !== 'before') throw new CampaignAuditError('locked', 'The verdict is closed once the campaign has started')
      if (verdict === 'ok' && !CHECK_IDS.every((k) => rec.checks[k] === true)) throw new CampaignAuditError('checks_incomplete', 'Pass all five checks before clearing a campaign')
      if (verdict === 'back' && !CHECK_IDS.some((k) => rec.checks[k] === false)) throw new CampaignAuditError('no_failed_check', 'Mark at least one failed check before sending a campaign back')
      rec.verdict = verdict
      rec.decidedAt = today()
      rec.decidedBy = by
      return view(c)
    },

    start({ id, by }) {
      const c = find(id)
      mayRun(c, by)
      const rec = recordOf(c)
      if (rec.stage !== 'before') throw new CampaignAuditError('wrong_stage', 'Only a campaign that has not started can start')
      // THE GATE: nothing reaches a customer before the Internal Audit and Marketing Lead has cleared it.
      // 23 Nov (owner): no clearance before a campaign runs; the audit is after the run only (Marketing campaigns page)
      setStage(c, rec, 'running')
      return view(c)
    },

    finish({ id, by }) {
      const c = find(id)
      mayRun(c, by)
      const rec = recordOf(c)
      if (rec.stage !== 'running') throw new CampaignAuditError('wrong_stage', 'Only a running campaign can finish')
      setStage(c, rec, 'after')
      return view(c)
    },

    reset: () => records.clear(),
  }
}

