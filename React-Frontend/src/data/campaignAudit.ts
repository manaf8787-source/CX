import type { AiInterviewCampaign, Bi, Persona } from '../types'

/**
 * Campaign audit (v42.1, F33; Decisions of 19 Nov 2026, number 4). Every campaign, Marketing's (one per persona) and the CX team's AI
 * interview campaigns (Close the loop), is cleared or sent back by the Internal Audit and Marketing Lead before anything reaches a
 * customer, and audited again after the run. Five checks, each answered against what the campaign itself says.
 *
 * The strings are the prototype's (`PSI CX Portal.html`, v42.1 block `2. campaign audit`), word for word, English and Arabic. The one
 * change is the role's Arabic title in the intro ("مسؤول", the name the rest of this app uses, where the prototype's string says "مدير").
 * What the prototype does not say (run controls, the sample results of campaigns that have none, the view-only note, the KPI wells) is
 * `[Proposed]` and listed in docs/V42_CAMPAIGN_AUDIT.md. All figures are sample data.
 */

const b = (en: string, ar: string): Bi => ({ en, ar })

export type CampaignKind = 'persona' | 'ai'
/** before = waiting for clearance (or sent back), running, after = finished. */
export type CampaignStage = 'before' | 'running' | 'after'
/** The five checks: the prototype's keys. */
export type CheckId = 'people' | 'proj' | 'chan' | 'msg' | 'money'
export type Verdict = 'ok' | 'back'
/** What the gate reads: a campaign is `cleared`, `waiting` for the audit, or `sent_back` with failed checks. */
export type Clearance = 'cleared' | 'waiting' | 'sent_back'

export interface AuditCheck {
  id: CheckId
  title: Bi
  rule: Bi
}

/** The five checks with their rule texts (prototype `CAUD_Q`). */
export const AUDIT_CHECKS: readonly AuditCheck[] = [
  {
    id: 'people',
    title: b('Right people', 'الأشخاص الصحيحون'),
    rule: b(
      "The segment is the persona's definition, the size is from the record, consent and DNCR applied, no detractor with an open complaint",
      'الشريحة هي تعريف الشخصية، الحجم من السجل، الموافقة وDNCR مطبّقان، لا زبون غير راضٍ بشكوى مفتوحة',
    ),
  },
  {
    id: 'proj',
    title: b('Right projects and developers', 'المشاريع والمطورون الصحيحون'),
    rule: b(
      'The projects fit what these people asked for and can afford; the developers are ones we are allowed to promote',
      'المشاريع تناسب ما سأل عنه هؤلاء وما يقدرون عليه؛ المطورون ممن يحق لنا الترويج لهم',
    ),
  },
  {
    id: 'chan',
    title: b('Right channel, language and timing', 'القناة واللغة والتوقيت الصحيحة'),
    rule: b(
      'The channel is the one these people use (from the timeline), the language is theirs, the time is theirs, the template is approved',
      'القناة هي التي يستخدمونها (من الخط الزمني)، اللغة لغتهم، الوقت وقتهم، القالب معتمد',
    ),
  },
  {
    id: 'msg',
    title: b('Right message', 'الرسالة الصحيحة'),
    rule: b(
      'Nothing promised that the approved sheets do not allow; no discount pushes; the "what not to do" line respected',
      'لا وعد بما لا تسمح به الأوراق المعتمدة؛ لا ضغط بخصومات؛ سطر "ما لا نفعله" محترم',
    ),
  },
  {
    id: 'money',
    title: b('The money', 'المال'),
    rule: b(
      "Budget, cost per contact and expected responses stated; the expected cost per lead is below the product's limit",
      'الميزانية وتكلفة التواصل والاستجابات المتوقعة مذكورة؛ التكلفة المتوقعة للعميل المحتمل أقل من حد المنتج',
    ),
  },
]

export const CHECK_IDS: readonly CheckId[] = AUDIT_CHECKS.map((c) => c.id)

export const checkById = (id: CheckId): AuditCheck => AUDIT_CHECKS.find((c) => c.id === id)!

/** Below this share of recipients matching the persona on the record, the run raises a targeting signal to Marketing (Decision 4). */
export const TARGETING_LINE_PCT = 80

export const CAMPAIGN_AUDIT_PATH = '/settings/campaign-audit'

/** Words of the page, the inbox and the gates. `[P]` marks a string the prototype does not have (Arabic for native review). */
export const CAMPAIGN_AUDIT_COPY = {
  title: b('Campaign audit', 'تدقيق الحملات'),
  intro: b(
    'Every campaign, before it runs and after it ran: the right people, the right projects and developers, the right channel and message, and the money. The Internal Audit and Marketing Lead clears it or sends it back; Marketing runs it. Nothing is sent to a customer before the clearance.',
    'كل حملة، قبل تشغيلها وبعده: الأشخاص الصحيحون، المشاريع والمطورون الصحيحون، القناة والرسالة الصحيحتان، والمال. مسؤول التدقيق الداخلي والتسويق يجيزها أو يعيدها؛ التسويق يشغّلها. لا يُرسل شيء لزبون قبل الإجازة.',
  ),
  columns: { check: b('Check', 'الفحص'), says: b('What the campaign says', 'ما تقوله الحملة'), verdict: b('Verdict', 'الحكم') },
  cleared: b('Cleared to run', 'مُجازة للتشغيل'),
  sendBack: b('Send back to Marketing with the failed checks', 'إعادة للتسويق مع الفحوصات الفاشلة'),
  chipCleared: b('Cleared', 'مُجازة'),
  chipSentBack: b('Sent back', 'أُعيدت'),
  toastCleared: b('Cleared. Marketing can run it.', 'مُجازة. التسويق يستطيع تشغيلها.'),
  toastSentBack: b('Sent back with the failed checks.', 'أُعيدت مع الفحوصات الفاشلة.'),
  kindPersona: b('Marketing campaign from a persona', 'حملة تسويق من شخصية'),
  kindAi: b('AI interview campaign (Close the loop)', 'حملة مقابلات ذكاء (إغلاق الحلقة)'),
  owner: b('owner', 'المالك'),
  stateText: { before: b('waiting for clearance', 'تنتظر الإجازة'), running: b('running', 'تعمل'), after: b('finished', 'انتهت') },
  stageBadge: { before: b('Before', 'قبل'), running: b('Running', 'تعمل'), after: b('After', 'بعد') },
  afterTitle: b('After it ran', 'بعد التشغيل'),
  tiles: {
    reached: b('Reached the right people', 'وصلت للأشخاص الصحيحين'),
    responded: b('Responded', 'استجابوا'),
    leads: b('Leads or recoveries', 'عملاء أو تعافٍ'),
    cost: b('Cost per result', 'التكلفة للنتيجة'),
  },
  afterHint: b(
    'Reached the right people: share of recipients who match the persona definition on the record. Below 80% is a targeting finding and goes to Marketing as a signal.',
    'وصلت للأشخاص الصحيحين: نسبة المستلمين المطابقين لتعريف الشخصية في السجل. أقل من 80% ملاحظة استهداف تذهب للتسويق كإشارة.',
  ),
  soFar: b('so far', 'حتى الآن'),
  owners: { marketing: b('Marketing manager', 'مدير التسويق'), cx: b('CX team', 'فريق CX') },
  /** Inbox rows (prototype `CAUD`, `CAUD2`). */
  inboxWaiting: (n: number): Bi => ({
    en: `Clear or send back: ${n === 1 ? '1 campaign waiting before it runs' : `${n} campaigns waiting before they run`}`,
    ar: `إجازة أو إعادة: ${arCampaigns(n)} ${n === 2 ? 'تنتظران' : 'تنتظر'} قبل التشغيل`,
  }),
  inboxFinished: (n: number): Bi => ({
    en: `Audit after the run: ${n === 1 ? '1 finished campaign' : `${n} finished campaigns`}`,
    ar: `تدقيق بعد التشغيل: ${arCampaigns(n)} ${n === 2 ? 'انتهتا' : 'انتهت'}`,
  }),
  // --- [Proposed]: not in the prototype -------------------------------------------------------------------------
  viewOnly: b(
    'View only: the Internal Audit and Marketing Lead and the CX manager clear or send back campaigns.',
    'للعرض فقط: يجيز الحملات أو يعيدها مسؤول التدقيق الداخلي والتسويق ومدير تجربة العملاء.',
  ),
  campaignsLabel: b('Campaigns', 'الحملات'),
  checksLabel: b('The five checks', 'الفحوصات الخمسة'),
  kpi: {
    waiting: b('Waiting for clearance', 'تنتظر الإجازة'),
    waitingSub: (back: number): Bi => ({
      en: back === 0 ? 'none sent back' : `${back} sent back, with Marketing`,
      ar: back === 0 ? 'لا حملات مُعادة' : `${back} مُعادة، لدى التسويق`,
    }),
    running: b('Running', 'تعمل'),
    runningSub: b('cleared before they started', 'أُجيزت قبل أن تبدأ'),
    finished: b('Finished', 'انتهت'),
    finishedSub: b('to audit after the run', 'للتدقيق بعد التشغيل'),
    signals: b('Targeting signals', 'إشارات الاستهداف'),
    signalsSub: b('reached under 80%, sent to Marketing', 'وصلت لأقل من 80%، أُرسلت للتسويق'),
  },
  pass: b('Pass', 'مطابق'),
  fail: b('Fail', 'غير مطابق'),
  notChecked: b('Not checked yet', 'لم يُفحص بعد'),
  verdictHint: {
    needAll: b('Mark all five checks ✓ to clear it.', 'علّم الفحوصات الخمسة بـ ✓ لإجازتها.'),
    needFailed: b('Mark at least one check ✗ to send it back.', 'علّم فحصاً واحداً على الأقل بـ ✗ لإعادتها.'),
    locked: (stage: 'running' | 'after', date: string): Bi => ({
      en: `Cleared on ${date}, before anything was sent. The checks are closed: the campaign is ${stage === 'running' ? 'running' : 'finished'}.`,
      ar: `أُجيزت في ${date} قبل إرسال أي شيء. الفحوصات مغلقة: الحملة ${stage === 'running' ? 'تعمل' : 'انتهت'}.`,
    }),
  },
  summary: {
    waiting: b(
      'Waiting for clearance. Nothing is sent to a customer until it is cleared.',
      'تنتظر الإجازة. لا يُرسل شيء لزبون قبل إجازتها.',
    ),
    cleared: (date: string): Bi => ({
      en: `Cleared on ${date}. It can start; nothing was sent before this.`,
      ar: `أُجيزت في ${date}. يمكن أن تبدأ؛ ولم يُرسل شيء قبل ذلك.`,
    }),
    sentBackTitle: b('Sent back with the failed checks', 'أُعيدت مع الفحوصات الفاشلة'),
    sentBack: (names: string): Bi => ({
      en: `Failed: ${names}. It cannot start until it is cleared.`,
      ar: `الفاشلة: ${names}. لا يمكن أن تبدأ قبل إجازتها.`,
    }),
  },
  signal: {
    title: b('Targeting signal raised to Marketing', 'إشارة استهداف رُفعت للتسويق'),
    text: (pct: number): Bi => ({
      en: `${pct}% of the recipients match the persona on the record, below the ${TARGETING_LINE_PCT}% line.`,
      ar: `${pct}% من المستلمين يطابقون الشخصية في السجل، أقل من حد ${TARGETING_LINE_PCT}%.`,
    }),
    none: (pct: number): Bi => ({
      en: `${pct}% match the persona on the record: at or above the ${TARGETING_LINE_PCT}% line, no signal.`,
      ar: `${pct}% يطابقون الشخصية في السجل: عند حد ${TARGETING_LINE_PCT}% أو فوقه، دون إشارة.`,
    }),
  },
  // --- gates and run controls (Close the loop, Personas) ----------------------------------------------------------
  gate: {
    badgeCleared: b('Cleared by Internal Audit', 'أجازها التدقيق الداخلي'),
    badgeWaiting: b('Waiting for clearance', 'تنتظر الإجازة'),
    badgeSentBack: b('Sent back', 'أُعيدت'),
    start: b('Start campaign', 'ابدأ الحملة'),
    finish: b('Mark as finished', 'علّمها منتهية'),
    started: b('Campaign started.', 'بدأت الحملة.'),
    finished: b('Campaign marked as finished.', 'عُلّمت الحملة منتهية.'),
    blockedWaiting: b(
      'Not cleared yet: it cannot start. The Internal Audit and Marketing Lead clears it first; nothing is sent to a customer until then.',
      'لم تُجَز بعد: لا يمكن أن تبدأ. يجيزها مسؤول التدقيق الداخلي والتسويق أولاً؛ ولا يُرسل شيء لزبون قبل ذلك.',
    ),
    blockedSentBack: (names: string): Bi => ({
      en: `Sent back, so it cannot start. Failed: ${names}. It starts after a new clearance.`,
      ar: `أُعيدت، فلا يمكن أن تبدأ. الفاشلة: ${names}. تبدأ بعد إجازة جديدة.`,
    }),
    seeAudit: b('Campaign audit', 'تدقيق الحملات'),
    column: b('Campaign audit', 'تدقيق الحملة'),
    runColumn: b('Run', 'التشغيل'),
    created: b('It cannot start until the Internal Audit and Marketing Lead clears it.', 'لا يمكن أن تبدأ قبل أن يجيزها مسؤول التدقيق الداخلي والتسويق.'),
    stageRunning: b('Running', 'تعمل'),
    stageAfter: b('Finished', 'انتهت'),
  },
} as const

/** "حملة واحدة", "حملتان", "3 حملات", "12 حملة". */
function arCampaigns(n: number): string {
  if (n === 1) return 'حملة واحدة'
  if (n === 2) return 'حملتان'
  if (n <= 10) return `${n} حملات`
  return `${n} حملة`
}

// --- The campaigns --------------------------------------------------------------------------------------------------

/** One campaign as the audit reads it: who, where, what, how much. Built from the registers (personas, AI interview campaigns). */
export interface AuditCampaign {
  /** `MC-101`... for a Marketing campaign (one per persona, in persona order), the AI campaign's own id for an interview campaign. */
  id: string
  kind: CampaignKind
  /** The persona id, or the AI campaign id: what the Personas page and Close the loop look the campaign up by. */
  sourceId: string
  /** The campaign's own name (Marketing: the recommended campaign type; AI: its name). */
  name: Bi
  owner: Bi
  /** Null for an AI campaign (it has no persona; the prototype prints "–"). */
  persona: Bi | null
  who: Bi
  /** People in the segment. */
  size: number
  projects: Bi
  channel: Bi
  whatNot: Bi
  budget: number
  costPerContact: number
  /** The stage the sample starts it in: it moves with Start and Finish. */
  seedStage: CampaignStage
}

/** The prototype's two project lines, alternating by persona (names are kept as written in both languages). */
const PROJECTS = ['Al Reeman II, Saadiyat Lagoons (Aldar, Bloom)', 'Reem Hills Phase 2, Yas Bay (Aldar)']

/**
 * The campaign list (prototype `campList`): one Marketing campaign per persona (MC-101 ...), then every AI interview campaign.
 * Size is the segment size on the record x 40 + 60, budget (k+2) x 3,500, cost per contact 3 + k mod 3, as the prototype computes them;
 * the first two Marketing campaigns run, the next two wait for clearance, the last two finished. An AI campaign follows its own status
 * (draft waits, running runs, closed finished) with budget AED 400 and AED 1 per contact.
 */
export function buildAuditCampaigns(personas: readonly Persona[], aiCampaigns: readonly AiInterviewCampaign[]): AuditCampaign[] {
  const out: AuditCampaign[] = personas.map((p, k) => ({
    id: `MC-${101 + k}`,
    kind: 'persona' as const,
    sourceId: p.id,
    name: p.recommendation.campaignType,
    owner: CAMPAIGN_AUDIT_COPY.owners.marketing,
    persona: p.name,
    who: p.recommendation.targetWho,
    size: p.segmentSize * 40 + 60,
    projects: b(PROJECTS[k % 2], PROJECTS[k % 2]),
    channel: p.recommendation.channelAndWhen,
    whatNot: p.recommendation.whatNotToDo,
    budget: (k + 2) * 3500,
    costPerContact: 3 + (k % 3),
    seedStage: k < 2 ? 'running' : k < 4 ? 'before' : 'after',
  }))
  for (const c of aiCampaigns) {
    out.push({
      id: c.id,
      kind: 'ai',
      sourceId: c.id,
      name: c.name,
      owner: CAMPAIGN_AUDIT_COPY.owners.cx,
      persona: null,
      who: b('Detractors in the segment', 'زبائن غير راضين في الشريحة'),
      size: c.memberIds.length,
      projects: b('–', '–'),
      channel: b('AI call then WhatsApp', 'مكالمة ذكاء ثم واتساب'),
      whatNot: b('No critical cases', 'لا حالات حرجة'),
      budget: 400,
      costPerContact: 1,
      seedStage: c.status === 'draft' ? 'before' : c.status === 'running' ? 'running' : 'after',
    })
  }
  return out
}

/** "AED 7,000": a plain figure, the same in both languages. */
export const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`

/** Responses the campaign expects: 12% of the segment (prototype). */
export const expectedResponses = (c: Pick<AuditCampaign, 'size'>) => Math.round(c.size * 0.12)

/** Expected cost per lead: budget over 30% of the expected responses, at least one (prototype). */
export const expectedCostPerLead = (c: Pick<AuditCampaign, 'size' | 'budget'>) => Math.round(c.budget / Math.max(1, c.size * 0.12 * 0.3))

/** What the campaign says for each check (the middle column; prototype `vCampAudit`). */
export function campaignSays(c: AuditCampaign, check: CheckId): Bi {
  switch (check) {
    case 'people': {
      const persona = c.persona ?? b('–', '–')
      return b(`${persona.en} · ${c.who.en} · ${c.size} people`, `${persona.ar} · ${c.who.ar} · ${c.size} شخصاً`)
    }
    case 'proj':
      return c.projects
    case 'chan':
      return c.channel
    case 'msg':
      return b(`${c.name.en} · not: ${c.whatNot.en}`, `${c.name.ar} · ليس: ${c.whatNot.ar}`)
    case 'money': {
      const resp = expectedResponses(c)
      return b(
        `Budget ${aed(c.budget)} · AED ${c.costPerContact} per contact · ${resp} expected responses · ${aed(expectedCostPerLead(c))} per expected lead`,
        `الميزانية ${aed(c.budget)} · AED ${c.costPerContact} للتواصل · ${resp} استجابة متوقعة · ${aed(expectedCostPerLead(c))} للعميل المحتمل المتوقع`,
      )
    }
  }
}

// --- Sample results of a run ------------------------------------------------------------------------------------------

export interface CampaignResults {
  /** 0 to 1: share of recipients matching the persona on the record. */
  reached: number
  /** 0 to 1. */
  responded: number
  /** Leads for a Marketing campaign, recoveries for an interview campaign. */
  leads: number
  /** AED spent so far. */
  cost: number
}

/**
 * The sample numbers of a run (deterministic, as the prototype's `res`). The prototype gives the two running Marketing campaigns
 * {71%, 14%, 9 leads, the budget}; the other campaigns have none there, so the rest are `[Proposed]`: MC-105 above the line (86%) and
 * MC-106 below it (78%), so both outcomes show, and a campaign started later reads a figure derived from its id.
 */
const SEED_RESULTS: Record<string, Omit<CampaignResults, 'cost'> & { cost?: number }> = {
  'MC-101': { reached: 0.71, responded: 0.14, leads: 9 },
  'MC-102': { reached: 0.71, responded: 0.14, leads: 9 },
  'MC-105': { reached: 0.86, responded: 0.21, leads: 14 },
  'MC-106': { reached: 0.78, responded: 0.18, leads: 11 },
  'camp-ai-1': { reached: 0.71, responded: 0.4, leads: 2 },
}

export function sampleResults(c: Pick<AuditCampaign, 'id' | 'budget'>): CampaignResults {
  const seeded = SEED_RESULTS[c.id]
  if (seeded) return { reached: seeded.reached, responded: seeded.responded, leads: seeded.leads, cost: seeded.cost ?? c.budget }
  const n = [...c.id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  return { reached: [0.72, 0.78, 0.84, 0.9][n % 4], responded: 0.12 + (n % 5) * 0.04, leads: 3 + (n % 6), cost: c.budget }
}

/** The share as a whole percent, the way every page and the brief print it. */
export const pct = (share: number) => Math.round(share * 100)

/** A run below the line raises a targeting signal to Marketing. */
export const belowTargetingLine = (r: Pick<CampaignResults, 'reached'>) => pct(r.reached) < TARGETING_LINE_PCT
