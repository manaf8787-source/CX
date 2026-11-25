import type {
  Access,
  EnvId,
  Environment,
  SupervisorTest,
  AgentActivityEntry,
  AgentDirectoryEntry,
  AgentOutputEnvelope,
  AiAccessRow,
  AiInsightPayload,
  AiInterviewCampaign,
  AiJourneyReading,
  Bi,
  CampaignRecommendation,
  ChannelId,
  CorrectiveAction,
  CorrectiveActionKind,
  CorrectiveRationale,
  DetractorCallItem,
  FeedbackInstrument,
  RecoveryEvent,
  EffortSummary,
  GlossaryTerm,
  HandoffItem,
  HrPoolMember,
  Interaction,
  Investigation,
  LdRequest,
  LeadFunnelPoint,
  MsAssignment,
  MsChecklist,
  MsScenario,
  MsShopper,
  Pattern,
  Person,
  PersonaKey,
  Persona,
  ProblemFlag,
  ProductId,
  ProductSurveyMoments,
  RoleId,
  RuleConfigItem,
  ShopperCase,
  Signal,
  Standard,
  SurveyTrigger,
  VocComment,
  VocRow,
} from '../types'
import { fixTitle } from '@/data/fixProblem'
import { daysAgoIso, intBetween, pick, seededRandom } from '../utils/random'
import type { InsightCategory } from '../data/insightSuggestions'
import { PATTERN_RULES, detectPatterns } from '../utils/patterns'
import { classifyRunaway } from '../utils/runaway'
import { GLOSSARY_TERMS } from '../data/glossary'
import { ENVIRONMENTS as ENVIRONMENT_LIST, environmentById } from '../data/environments'
import { loadShopperCases } from '../data/shopperSample'
import { RULE_IDS } from '../utils/ruleValues'
import { MON_FRI } from '../utils/workingDays'
import { MOCK_MATRIX, WEEKLY_SAMPLE_SIZE, buildWeeklySample, seedAuditLog, seedCallAttempts } from './mockDataV40'

export * from './mockDataV40'

/** Sample data only, matching the scale the source documents use throughout
 * (~30 people, ~120 interactions) — never a real PSI number
 * (PROJECT_ANALYSIS.md §1, "all figures and names ... are sample data"). */
const SEED = 20261117
const rng = seededRandom(SEED)

// The three v40 CRM environments: Dubai, Abu Dhabi, PSI Assets (rental). The legacy `environment` string
// fields hold the short English label; `envId` is the canonical key.
const ENVIRONMENTS = ENVIRONMENT_LIST.map((e) => e.short)
const envFields = (e: Environment) => ({ environment: e.short, envId: e.id })

// Sample people are not spread evenly: the largest market holds the most customers.
// One rng() draw, same as a uniform pick.
const ENVIRONMENT_WEIGHTS: [EnvId, number][] = [
  ['dub', 0.4],
  ['auh', 0.27],
  ['ast', 0.23],
  ['ai', 0.1],
]

function pickPersonEnvironment(): Environment {
  let r = rng()
  for (const [id, weight] of ENVIRONMENT_WEIGHTS) {
    if (r < weight) return environmentById(id)
    r -= weight
  }
  return environmentById(ENVIRONMENT_WEIGHTS[0][0])
}
const CHANNELS: ChannelId[] = ['website', 'app', 'whatsapp', 'call', 'branch', 'email']
const FIRST_NAMES = ['Sara', 'Omar', 'Lina', 'Khaled', 'Maya', 'Yousef', 'Rana', 'Tariq', 'Dana', 'Fadi', 'Noura', 'Hassan', 'Aisha', 'Zaid', 'Lara']
const LAST_NAMES = ['Haddad', 'Khoury', 'Saleh', 'Nasser', 'Qasim', 'Hamad', 'Farouk', 'Aziz']

// v40 sample pattern (F24): DNCR for index 4, 13 and 22; WhatsApp off for 3, 10, 17, 24; email off for every
// fifth person from 2; SMS always on. [Proposed] these flags are synthetic until the CRM supplies them.
const DNCR_INDEXES = new Set([4, 13, 22])
const NO_WHATSAPP_INDEXES = new Set([3, 10, 17, 24])
const CUSTOMER_SEGMENTS: Person['segment'][] = ['buyer', 'tenant', 'owner', 'investor', 'buyer']
const LEAD_SOURCES: Person['sourceOfLead'][] = ['website', 'app', 'whatsapp', 'website', 'crm']

function buildPersons(count: number): Person[] {
  return Array.from({ length: count }, (_, i) => {
    // The draws below keep the order of the original object literal, so the seeded sample is stable.
    const products: ProductId[] = [pick(rng, ['re', 'af', 'cl', 'to', 'ev', 'wl'] as ProductId[])]
    const mobile = `+9715${intBetween(rng, 10000000, 99999999)}`
    const type: Person['type'] = rng() > 0.35 ? 'customer' : 'lead'
    const name = `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`
    const env = pickPersonEnvironment()
    const unitsOrDeals = intBetween(rng, 0, 3)
    const preferredChannel = pick(rng, CHANNELS)
    const language: Person['language'] = rng() > 0.5 ? 'en' : 'ar'
    const vip = rng() > 0.85
    const createdAt = daysAgoIso(rng, 540)
    return {
      id: `p-${String(i + 1).padStart(3, '0')}`,
      identity: {
        mobile,
        email: `sample.contact${i + 1}@example.test`,
        crmContactId: `crm-${1000 + i}`,
      },
      type,
      segment: type === 'lead' ? 'lead' : vip ? 'member' : CUSTOMER_SEGMENTS[i % CUSTOMER_SEGMENTS.length],
      sourceOfLead: vip ? 'club' : LEAD_SOURCES[i % LEAD_SOURCES.length],
      consent: { dncr: DNCR_INDEXES.has(i), whatsapp: !NO_WHATSAPP_INDEXES.has(i), email: i % 5 !== 2, sms: true },
      name,
      ...envFields(env),
      products,
      unitsOrDeals,
      preferredChannel,
      language,
      vip,
      createdAt,
    }
  })
}

/** 12 agents across the two live products — role-gated name resolution
 * (NFR-2): visible to CX plus the agent's own line management only. */
function buildAgentDirectory(): AgentDirectoryEntry[] {
  return Array.from({ length: 12 }, (_, i) => {
    const isAfterSales = i >= 8
    // 22 Nov (owner): agent names are visible to every signed-in role except the external mystery shopper
    const visibleTo: RoleId[] = ['cxmgr', 'cxteam', 'envmgmt', 'teamlead', 'aslead', 'ld', 'hrspec', 'hrmgr', 'marketing', 'auditmkt', 'exec']
    return {
      agentRef: `agent-${i + 1}`,
      displayName: `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`,
      directManagerTitle: isAfterSales ? 'After-Sales team lead' : 'Sales team lead',
      visibleTo,
    }
  })
}

const PROBLEM_FLAGS: ProblemFlag[] = [
  'promise_not_kept',
  'forced_channel_switch',
  'repeat_contact',
  'slow_reply',
  'wrong_language',
  'hand_off',
  'silence',
  'detractor',
]

// Patterns are counted in a rolling 30-day window (Rules Decision 1), so most problem
// contacts sit in the last month; the rest, and every other contact, keep the older
// history that timelines and trends need. One rng() draw, same as daysAgoIso.
const RECENT_PROBLEM_SHARE = 0.9

function problemOccurredAt(): string {
  const u = rng()
  const days =
    u < RECENT_PROBLEM_SHARE ? Math.floor((u / RECENT_PROBLEM_SHARE) * 29) : 30 + Math.floor(((u - RECENT_PROBLEM_SHARE) / (1 - RECENT_PROBLEM_SHARE)) * 151)
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function buildInteractions(persons: Person[], total: number): Interaction[] {
  const out: Interaction[] = []
  for (let i = 0; i < total; i++) {
    const person = pick(rng, persons)
    const hasProblem = rng() > 0.68
    const channel = pick(rng, CHANNELS)
    out.push({
      id: `i-${String(i + 1).padStart(4, '0')}`,
      personKey: person.id,
      sourceRef: `src-${1000 + i}`,
      channel,
      direction: rng() > 0.5 ? 'inbound' : 'outbound',
      occurredAt: hasProblem ? problemOccurredAt() : daysAgoIso(rng, 180),
      product: person.products[0],
      environment: person.environment,
      envId: person.envId,
      agentRef: `agent-${intBetween(rng, 1, 12)}`,
      language: person.language,
      score: rng() > 0.5 ? intBetween(rng, 0, 10) : undefined,
      // FR-2.9 — agent calls are never recorded: a call event carries only
      // fact/time/reason/result, never a transcript, even in the mock data.
      text: hasProblem && channel !== 'call' ? 'Sample conversation note — visible to CX team and CX manager only.' : undefined,
      promiseKept: hasProblem ? rng() > 0.6 : undefined,
      problemFlags: hasProblem ? [pick(rng, PROBLEM_FLAGS)] : [],
    })
    // A promise carries its due time (KB §4); derived, so the seeded sequence is unchanged.
    const last = out[out.length - 1]
    if (last.promiseKept !== undefined) last.promiseDueAt = new Date(Date.parse(last.occurredAt) + 24 * 3_600_000).toISOString()
  }
  return out
}

function buildEffortSummaries(persons: Person[], interactions: Interaction[]): EffortSummary[] {
  return persons.map((p) => {
    const mine = interactions.filter((i) => i.personKey === p.id)
    const last = mine.at(-1)
    const daysSince = last ? Math.floor((Date.now() - new Date(last.occurredAt).getTime()) / 86_400_000) : 999
    return {
      personId: p.id,
      interactions: mine.length,
      contactsLast90Days: mine.filter((i) => Date.now() - new Date(i.occurredAt).getTime() < 90 * 86_400_000).length,
      problemsFound: mine.filter((i) => i.problemFlags.length > 0).length,
      daysSinceLastContact: daysSince,
    }
  })
}

// Real complaint mixes are skewed, not uniform: a couple of issues dominate.
// One rng() draw per signal, same as a uniform pick, so the rest of the seeded sample is unchanged.
const SIGNAL_CATEGORY_WEIGHTS: [string, number][] = [
  ['slow_response', 0.36],
  ['repeat_contact', 0.3],
  ['wrong_language', 0.14],
  ['promise_not_kept', 0.12],
  ['unapproved_discount', 0.08],
]

// Local process issues concentrate in one place (the environment-concentration rule exists
// for exactly this): Dubai's sample skews to slow replies, PSI Assets' (rental) to repeat contacts.
const ENVIRONMENT_CATEGORY_WEIGHTS: Record<string, [string, number][]> = {
  Dubai: [
    ['slow_response', 0.6],
    ['repeat_contact', 0.2],
    ['wrong_language', 0.08],
    ['promise_not_kept', 0.07],
    ['unapproved_discount', 0.05],
  ],
  'PSI Assets': [
    ['repeat_contact', 0.6],
    ['slow_response', 0.15],
    ['wrong_language', 0.1],
    ['promise_not_kept', 0.1],
    ['unapproved_discount', 0.05],
  ],
}

function pickSignalCategory(environment: string): string {
  const weights = ENVIRONMENT_CATEGORY_WEIGHTS[environment] ?? SIGNAL_CATEGORY_WEIGHTS
  let r = rng()
  for (const [category, weight] of weights) {
    if (r < weight) return category
    r -= weight
  }
  return SIGNAL_CATEGORY_WEIGHTS[0][0]
}

/** v40 trace (F10): a signal lists the event that produced it and, for every third one, the nearest other event of
 * the same person (same environment and product, flagged ones first). Deterministic: no random draws. */
function secondEvent(i: Interaction, byPerson: Map<string, Interaction[]>): Interaction | undefined {
  const t = Date.parse(i.occurredAt)
  return (byPerson.get(i.personKey) ?? [])
    .filter((x) => x.id !== i.id && x.envId === i.envId && x.product === i.product)
    .sort(
      (a, b) =>
        Number(b.problemFlags.length > 0) - Number(a.problemFlags.length > 0) ||
        Math.abs(Date.parse(a.occurredAt) - t) - Math.abs(Date.parse(b.occurredAt) - t) ||
        a.id.localeCompare(b.id),
    )[0]
}

function buildSignals(interactions: Interaction[]): Signal[] {
  const byPerson = new Map<string, Interaction[]>()
  for (const i of interactions) byPerson.set(i.personKey, [...(byPerson.get(i.personKey) ?? []), i])
  let publicSeq = 0
  return interactions
    .filter((i) => i.problemFlags.length > 0)
    .map((i, idx): Signal => {
      // Same draws, same order as before v40, so the rest of the seeded sample is unchanged.
      const kind: Signal['kind'] = rng() > 0.8 ? 'public_mention' : 'complaint'
      const identified = rng() > 0.1
      const category = pickSignalCategory(i.environment)
      rng() // formerly an independent isPublic roll; v40 makes isPublic follow kind
      if (rng() > 0.85) daysAgoIso(rng, -2) // formerly a random reply clock; now derived below
      const isPublic = kind === 'public_mention'
      // A public mention never links to a person or an event (F12); its id stays PUB-3nn.
      const second = !isPublic && idx % 3 === 0 ? secondEvent(i, byPerson) : undefined
      return {
        id: isPublic ? `PUB-${351 + publicSeq++}` : `sig-${String(idx + 1).padStart(4, '0')}`,
        kind,
        personId: !isPublic && identified ? i.personKey : undefined,
        product: i.product,
        environment: i.environment,
        envId: i.envId,
        category,
        occurredAt: i.occurredAt,
        agentRef: i.agentRef,
        isPublic,
        eventIds: isPublic ? [] : second ? [i.id, second.id] : [i.id],
        publicReplyDueAt: isPublic ? new Date(Date.parse(i.occurredAt) + 48 * 3_600_000).toISOString() : undefined,
      }
    })
}

const CORRECTIVE_KINDS: CorrectiveActionKind[] = [
  'employee',
  'service_behaviour',
  'training_gap',
  'product_app',
  'process',
  'environment',
  'legal_privacy',
  'marketing',
]
const MINIMUM_SAMPLE = 10

function recoverySentence(tried: number, recovered: number): { en: string; ar: string } {
  const pct = Math.round((recovered / tried) * 100)
  return {
    en: `Tried in ${tried} similar closed cases, recovered in ${recovered}, ${recovered} of ${tried} is ${pct}%.`,
    ar: `جُرّب في ${tried} حالة مشابهة مغلقة، وتعافت ${recovered} منها، أي ${pct}%.`,
  }
}

function buildCorrectiveActions(patterns: Pattern[], signals: Signal[]): CorrectiveAction[] {
  const eligible = patterns.filter((p) => p.hasMinimumSample)
  const signalById = new Map(signals.map((s) => [s.id, s]))
  return eligible.map((p, idx) => {
    const drawnStatus = pick(rng, ['proposed', 'approved', 'in_progress', 'verification', 'effective', 'partial', 'failed'] as const)
    // Demo (22 Nov): pin a few fixes as approved and being carried out, so the late-owner flag on the performance report always has an L&D fix and a branch (environment) manager fix to show.
    const status = idx % 4 === 1 ? ('in_progress' as const) : idx % 4 === 3 ? ('approved' as const) : drawnStatus
    const startedMonthIndex = 3
    // Same rng draws as before (one base per month, plus the drop draw), but the
    // after-months follow the status so the 60-day verdict never contradicts it.
    const rawSeries = Array.from({ length: 6 }, (_, m) => {
      const base = intBetween(rng, 3, 9)
      if (m >= startedMonthIndex) {
        if (status === 'effective') intBetween(rng, 3, 5)
        else if (status === 'partial') intBetween(rng, 1, 2)
      }
      return base
    })
    const beforeAvg = rawSeries.slice(0, startedMonthIndex).reduce((s, v) => s + v, 0) / startedMonthIndex
    // An effective fix is past the rule's 50% drop; one still in its 60-day check reads 40% so far (under half); a partial one 18%.
    const afterFactor = status === 'effective' ? 0.45 : status === 'verification' ? 0.6 : status === 'partial' ? 0.82 : 1
    const afterMonths = rawSeries.length - startedMonthIndex
    const afterTotal = Math.round(beforeAvg * afterFactor * afterMonths)
    const monthlySignalSeries = rawSeries.map((v, m) => {
      if (m < startedMonthIndex) return v
      const k = m - startedMonthIndex
      return Math.floor(afterTotal / afterMonths) + (k < afterTotal % afterMonths ? 1 : 0)
    })
    const decisionRoll = rng()
    // A proposed action has no decision yet; a rejected one never moves on (KB §6).
    const rolled = decisionRoll > 0.75 ? 'modified' : decisionRoll > 0.65 ? 'rejected' : undefined
    const decision = status === 'proposed' ? undefined : rolled === 'rejected' ? 'modified' : rolled
    const drawnKind = p.thresholdKind === 'same_agent' ? pick(rng, ['employee', 'training_gap'] as const) : pick(rng, CORRECTIVE_KINDS)
    const kind = idx % 4 === 1 ? ('training_gap' as const) : idx % 4 === 3 ? ('employee' as const) : drawnKind
    const envManager = p.team.includes('team') ? `${p.team.replace(' team', '')} environment manager` : 'Environment manager'
    // The receiver follows the kind (KB §6 classification table), by title.
    const owner: Record<string, string> = {
      employee: `Direct manager (${envManager})`,
      training_gap: 'L&D manager with the environment champion',
      product_app: 'Product owner and IT',
      legal_privacy: 'Legal',
      marketing: 'Internal Audit and Marketing Lead',
    }
    const drawnDue = daysAgoIso(rng, -14)
    // Some approved fixes that are still being carried out are past their date, so the late-owner flag on the performance report has something to show (no extra random draw).
    const lateSeed = (status === 'approved' || status === 'in_progress') && idx % 3 !== 2
    const dueDate = lateSeed ? new Date(Date.now() - (2 + (idx % 6)) * 86_400_000).toISOString() : drawnDue
    const verificationDueAt = daysAgoIso(rng, -60)
    // v40: a proposed fix was proposed in the last few days (some are close to the 5-working-day window);
    // the others were proposed weeks ago. Deterministic from the index, no extra draws.
    const proposedAt = new Date(Date.now() - (status === 'proposed' ? 2 + idx * 2 : 20 + idx * 4) * 86_400_000).toISOString()
    const decisionReason: Bi | undefined = decision ? { en: 'Scope narrowed to the current quarter.', ar: 'تم تضييق النطاق للربع الحالي.' } : undefined
    return {
      id: `ca-${idx + 1}`,
      kind,
      patternId: p.id,
      title: fixTitle(p.category, p.team),
      owner: owner[kind] ?? envManager,
      dueDate,
      status,
      ...(decision ? { decision, decisionReason } : {}),
      verificationDueAt,
      verificationResult: status === 'effective' || status === 'partial' || status === 'failed' ? status : undefined,
      monthlySignalSeries,
      startedMonthIndex,
      proposedAt,
      product: p.signalIds.map((id) => signalById.get(id)).find((s) => !!s)?.product ?? 're',
      auditLog: seedAuditLog({ kind, status, decision, decisionReason }, proposedAt, p.traceId),
    }
  })
}

/**
 * v42 (F30): the sample needs a fix whose pattern includes a person tagged VIP in the CRM, so the halved clocks are visible and testable.
 * The seeded draws give one VIP person and none on a pattern, so one more person is tagged: the lowest id among the people on the FIRST
 * fix's pattern. No random draw, so the rest of the seeded sample is unchanged. A VIP is a Club member by definition, so the person gets
 * what `buildPersons` gives every VIP (segment member, or lead for a lead; lead source Club).
 */
function tagVipOnFirstFix(persons: Person[], signals: Signal[], patterns: Pattern[], fixes: CorrectiveAction[]): void {
  const pattern = patterns.find((p) => p.id === fixes[0]?.patternId)
  if (!pattern) return
  const inPattern = new Set(pattern.signalIds)
  const ids = signals.flatMap((s) => (inPattern.has(s.id) && s.personId ? [s.personId] : [])).sort()
  const person = persons.find((p) => p.id === ids[0])
  if (!person || person.vip) return
  person.vip = true
  person.segment = person.type === 'lead' ? 'lead' : 'member'
  person.sourceOfLead = 'club'
}

function buildCorrectiveRationales(actions: CorrectiveAction[], patterns: Pattern[]): Record<string, AgentOutputEnvelope<CorrectiveRationale>> {
  const out: Record<string, AgentOutputEnvelope<CorrectiveRationale>> = {}
  actions.forEach((a, idx) => {
    const pattern = patterns.find((p) => p.id === a.patternId)
    out[a.id] = {
      agentId: 'agent-5-corrective-actions',
      runId: `run-ca-${idx + 1}`,
      subjectType: 'corrective_action',
      subjectId: a.id,
      payload: {
        whyThisTeam: {
          en: `${pattern?.sampleSize ?? 0} signals in this category trace back to this team within the last ${pattern?.windowDays ?? 30} days.`,
          ar: `${pattern?.sampleSize ?? 0} إشارة من هذه الفئة تعود لهذا الفريق خلال ${pattern?.windowDays ?? 30} يوماً.`,
        },
        whatAiDidNotDo: {
          en: 'Did not contact the customer, did not change any system record, did not assign blame to a named individual.',
          ar: 'لم يتم التواصل مع العميل، ولم يُغيَّر أي سجل في النظام، ولم تُنسب المسؤولية لشخص بعينه.',
        },
      },
      evidence: (pattern?.signalIds ?? []).slice(0, 5).map((sid, i) => ({
        sourceType: 'signal',
        sourceId: sid,
        occurredAt: daysAgoIso(rng, 30),
        summary: { en: `Signal #${i + 1} in the pattern window.`, ar: `إشارة رقم ${i + 1} ضمن نافذة النمط.` },
      })),
      confidence: pattern?.hasMinimumSample ? 0.78 : 0.42,
      rulesApplied: pattern ? [`signals.${pattern.thresholdKind}`] : [],
      model: 'mock-agent-5',
      lang: 'en',
      supervisorVerdict: 'approved',
      createdAt: daysAgoIso(rng, 5),
    }
  })
  return out
}

const SHOPPER_CHECKLIST_CATEGORIES = ['greeting', 'needs_discovery', 'pricing_disclosure', 'handover_process', 'follow_up_commitment']

function buildShopperCases(): ShopperCase[] {
  return Array.from({ length: 6 }, (_, i): ShopperCase => {
    const visitScorePct = intBetween(rng, 35, 98)
    // FR-4.14 — a visit under 60% is at least medium regardless of individual item results.
    const rolled = pick(rng, ['critical', 'medium', 'low'] as const)
    const severity = visitScorePct < 60 && rolled === 'low' ? 'medium' : rolled
    const isConductIssue = severity !== 'low' && rng() > 0.6
    return {
      id: `sc-${i + 1}`,
      severity,
      assignmentId: `asn-${100 + i}`,
      product: pick(rng, ['re', 'af'] as ProductId[]),
      ...envFields(pick(rng, ENVIRONMENT_LIST)),
      openedAt: daysAgoIso(rng, 20),
      // Critical opens same-day: respond within 1 working day, resolve within 5 (FR-4.14).
      respondDueAt: severity === 'critical' ? daysAgoIso(rng, -1) : daysAgoIso(rng, -3),
      resolveDueAt: severity === 'critical' ? daysAgoIso(rng, -5) : daysAgoIso(rng, -10),
      status: severity === 'critical' ? 'open' : pick(rng, ['triaged', 'owner_decision', 'hr_review', 'closed'] as const),
      proposedActions: Array.from({ length: intBetween(rng, 1, 3) }, (_, n) => ({
        n: n + 1,
        text: { en: `Proposed action ${n + 1} for this visit's finding.`, ar: `إجراء مقترح رقم ${n + 1} لهذه النتيجة.` },
        decision: pick(rng, ['pending', 'confirmed', 'modified', 'rejected'] as const),
      })),
      category: pick(rng, SHOPPER_CHECKLIST_CATEGORIES),
      visitScorePct,
      ownerTitle: isConductIssue ? "Agent's direct manager" : 'Environment manager',
      isConductIssue,
    }
  }).map(withShopperCaseStopTimes)
}

const HOUR_MS = 3_600_000

/** Deterministic (no rng draws, so the seeded sample stays stable): a case
 * past `open` was responded to 6h after opening; a closed one closed 3 days in. */
function withShopperCaseStopTimes(c: ShopperCase): ShopperCase {
  const opened = new Date(c.openedAt).getTime()
  return {
    ...c,
    respondedAt: c.status === 'open' ? undefined : new Date(opened + 6 * HOUR_MS).toISOString(),
    closedAt: c.status === 'closed' ? new Date(opened + 72 * HOUR_MS).toISOString() : undefined,
  }
}

/** FR-4.16 — only patterns with thin evidence (below the minimum sample)
 * get an investigation instead of a guessed fix. */
function buildInvestigations(patterns: Pattern[]): Investigation[] {
  const thin = patterns.filter((p) => !p.hasMinimumSample)
  return thin.map((p, idx) => {
    const kind = idx % 2 === 0 ? 'customer_interviews' : 'mystery_shopper_check'
    const status = pick(rng, ['requested', 'in_progress', 'returned'] as const)
    return {
      id: `inv-${idx + 1}`,
      patternId: p.id,
      kind,
      requestedCount: kind === 'customer_interviews' ? 5 : undefined,
      environment: p.team,
      scenario: kind === 'mystery_shopper_check' ? { en: `${p.category.replace(/_/g, ' ')} scenario, ${p.team}`, ar: `سيناريو ${p.team}` } : undefined,
      status,
      resultSummary:
        status === 'returned'
          ? { en: 'Evidence returned: root cause confirmed, ready to propose an action.', ar: 'عادت الأدلة: تم تأكيد السبب الجذري، جاهز لاقتراح إجراء.' }
          : undefined,
      // v40 (F26): the recorded result is the evidence on the pattern; interviews done count up to the request.
      result:
        status === 'returned'
          ? { en: 'Evidence returned: root cause confirmed, ready to propose an action.', ar: 'عادت الأدلة: تم تأكيد السبب الجذري، جاهز لاقتراح إجراء.' }
          : undefined,
      doneCount: kind === 'customer_interviews' ? (status === 'returned' ? 5 : status === 'in_progress' ? 3 : 0) : undefined,
    }
  })
}

const HANDOFF_KINDS = ['crm_do_not_call', 'recovery_call', 'club_member_recovery'] as const
const HANDOFF_OWNER: Record<(typeof HANDOFF_KINDS)[number], { en: string; ar: string }> = {
  crm_do_not_call: { en: 'CRM', ar: 'نظام إدارة علاقات العملاء' },
  recovery_call: { en: 'Close the loop', ar: 'إغلاق الحلقة' },
  club_member_recovery: { en: 'PSI Club', ar: 'نادي PSI' },
}

/** FR-4.9 — one-customer fixes owned by another system; status tracked, no SLA clock runs here. */
function buildHandoffs(persons: Person[]): HandoffItem[] {
  return persons.slice(0, 8).map((p, idx) => {
    const kind = pick(rng, HANDOFF_KINDS)
    return {
      id: `ho-${idx + 1}`,
      kind,
      personId: p.id,
      ownerSystem: HANDOFF_OWNER[kind],
      status: pick(rng, ['open', 'done'] as const),
      createdAt: daysAgoIso(rng, 14),
    }
  })
}

const AI_INSIGHT_SERVICE_BANDS = [
  { en: 'Phone, weekday mornings', ar: 'الهاتف، صباح أيام الأسبوع' },
  { en: 'WhatsApp, evenings', ar: 'واتساب، المساء' },
  { en: 'Branch, weekend', ar: 'الفرع، عطلة نهاية الأسبوع' },
]

/** FR-4.10/4.11 — reads scored records, one insight per category+environment,
 * kept visibly separate from Signals (FR-4.13). Categories are the six the v38
 * prototype's AI Insights uses (communication, attitude, product knowledge,
 * speed, process, mobile app). FR-4.12: "send to a case" only when an open
 * shopper case is in the same category. */
const INSIGHT_SCORED_CATEGORIES: InsightCategory[] = ['communication', 'attitude', 'knowledge', 'speed', 'process']

/** Shopper checklist category → AI Insights category, so "send to a case" can
 * find a shopper case "in the same category" (KB §6). [Proposed] mapping. */
export const SHOPPER_TO_INSIGHT_CATEGORY: Record<string, InsightCategory> = {
  greeting: 'attitude',
  needs_discovery: 'communication',
  pricing_disclosure: 'knowledge',
  handover_process: 'process',
  follow_up_commitment: 'communication',
}

function buildAiInsightEnvelopes(shopperCases: ShopperCase[]): AgentOutputEnvelope<AiInsightPayload>[] {
  const openCaseFor = (category: InsightCategory) => shopperCases.find((c) => SHOPPER_TO_INSIGHT_CATEGORY[c.category] === category && c.status !== 'closed')
  // Same number of rng() draws per insight as before, so the rest of the seeded sample is unchanged.
  const scored = INSIGHT_SCORED_CATEGORIES.map((category, idx): AgentOutputEnvelope<AiInsightPayload> => {
    const environment = pick(rng, ENVIRONMENTS)
    const sampleSize = intBetween(rng, 4, 22)
    const recovered = Math.max(1, Math.round(sampleSize * (0.5 + rng() * 0.3)))
    return insightEnvelope(
      idx,
      category,
      environment,
      pick(rng, AI_INSIGHT_SERVICE_BANDS),
      sampleSize,
      recovered,
      openCaseFor(category)?.id,
      daysAgoIso(rng, 30),
      daysAgoIso(rng, 3),
    )
  })
  // The app category (prototype: Abu Dhabi rent, any time band) is fixed, no rng draws.
  const appDay = new Date(Date.now() - 6 * 86_400_000).toISOString()
  const app = insightEnvelope(5, 'app', 'Abu Dhabi', { en: 'Mobile app, any time', ar: 'تطبيق الجوال، أي وقت' }, 26, 14, openCaseFor('app')?.id, appDay, appDay)
  return [...scored, app]
}

function insightEnvelope(
  idx: number,
  category: InsightCategory,
  environment: string,
  serviceTimeBand: { en: string; ar: string },
  sampleSize: number,
  recovered: number,
  caseId: string | undefined,
  evidenceAt: string,
  createdAt: string,
): AgentOutputEnvelope<AiInsightPayload> {
  return {
    agentId: 'agent-4-ai-insights',
    runId: `run-insight-${idx + 1}`,
    subjectType: 'ai_insight',
    subjectId: `insight-${category}`,
    payload: {
      category,
      environment,
      serviceTimeBand,
      recoveryFigure: recoverySentence(sampleSize, recovered),
      sampleSize,
      chartSeries: [
        { label: 'Low score', value: sampleSize - recovered },
        { label: 'Recovered after action', value: recovered },
      ],
      sendToCaseEligibleCaseId: caseId,
    },
    evidence: [
      {
        sourceType: 'survey_response',
        sourceId: `svy-${idx + 1}`,
        occurredAt: evidenceAt,
        summary: { en: `Scored record below threshold for ${category}.`, ar: 'سجل مُقيَّم دون الحد المطلوب.' },
      },
    ],
    confidence: sampleSize >= MINIMUM_SAMPLE ? 0.74 : 0.38,
    rulesApplied: ['ai_insights.scored_record_pattern'],
    model: 'mock-agent-4',
    lang: 'en',
    supervisorVerdict: 'approved',
    createdAt,
  }
}

/** Days since each sample incident: the first six are still inside the
 * 60-day recovery window ("too early"), the last six have closed. */
const DETRACTOR_INCIDENT_DAYS_AGO = [8, 15, 22, 30, 38, 47, 64, 70, 78, 85, 92, 100]

/** What each sample person did after the incident, as [days after the
 * incident, event] — chosen so every branch of the recovered rule
 * (Rules and Definitions, Decision 3) appears once in the sample. */
const DETRACTOR_FOLLOW_UPS: [number, Omit<RecoveryEvent, 'at'>][][] = [
  [[3, { kind: 'contact', complaint: false }]],
  [],
  [[10, { kind: 'new_lead' }]],
  [[12, { kind: 'rating', instrument: 'nps', score: 3 }]],
  [[6, { kind: 'contact', complaint: true }]],
  [[20, { kind: 'rating', instrument: 'ces', score: 4 }]],
  [[20, { kind: 'rating', instrument: 'nps', score: 8 }]],
  [[30, { kind: 'transaction' }]],
  [[10, { kind: 'contact', complaint: true }]],
  [],
  [
    [15, { kind: 'rating', instrument: 'csat', score: 5 }],
    [40, { kind: 'rating', instrument: 'csat', score: 1 }],
  ],
  [[45, { kind: 'renewal' }]],
]

const INSTRUMENT_CYCLE: FeedbackInstrument[] = ['nps', 'csat', 'ces']

function buildDetractorCallItems(persons: Person[]): DetractorCallItem[] {
  // A person on the do-not-call register is never callable, so never on this list (v40, F24).
  return persons
    .filter((p) => !p.consent.dncr)
    .slice(0, 12)
    .map((p, idx) => {
      const severity = pick(rng, ['critical', 'medium', 'low'] as const)
      const rawScore = intBetween(rng, 0, 6)
      const channel: DetractorCallItem['channel'] = rng() > 0.5 ? 'human' : 'ai_campaign'
      const outcome = pick(rng, ['reached', 'resolved_on_call', 'declined', 'callback_requested'] as const)
      // Derived, no extra rng draws: NPS detractors score 0 to 6, CSAT and CES detractors 1 or 2.
      const instrument = INSTRUMENT_CYCLE[idx % 3]
      const firstScore = instrument === 'nps' ? rawScore : 1 + (rawScore % 2)
      const daysAgo = DETRACTOR_INCIDENT_DAYS_AGO[idx]
      const incidentMs = Date.now() - daysAgo * 86_400_000
      const followUps: RecoveryEvent[] = DETRACTOR_FOLLOW_UPS[idx].map(([after, e]) => ({
        ...e,
        at: new Date(incidentMs + after * 86_400_000).toISOString(),
      }))
      // A third of the month's list is still waiting for its call, so the interview flow has work to do.
      const open = idx % 3 === 2
      return {
        id: `dcl-${idx + 1}`,
        personId: p.id,
        product: p.products[0],
        environment: p.environment,
        envId: p.envId,
        severity,
        firstScore,
        channel,
        outcome: open ? undefined : outcome,
        instrument,
        incidentAt: new Date(incidentMs).toISOString(),
        followUps,
        // An AI campaign row hands over after its 2 no-answers (decided 18 Nov), the CX team's own list after 3.
        ...seedCallAttempts(idx, open, channel === 'ai_campaign' ? 2 : 3),
      }
    })
}

// KB §8 table (who, main pain, channels) and the prototype's recommendation to
// Marketing for each persona (v38 export, PERSONAS) — transcribed, not invented.
const PERSONA_SEED: Omit<Persona, 'runawayCount' | 'segmentSize'>[] = [
  {
    id: 'overseas_investor',
    name: { en: 'Overseas investor', ar: 'مستثمر من الخارج' },
    who: {
      en: 'Lives abroad, business owner, buys off-plan for yield. Few contacts, each one matters. Wants construction updates and payment plan clarity, in writing.',
      ar: 'يعيش في الخارج، صاحب أعمال، يشتري على الخارطة للعائد. تواصل قليل لكن كل اتصال مهم. يريد تحديثات الإنشاء ووضوح خطة الدفع كتابةً.',
    },
    mainPain: { en: 'Wrong payment plan details; silence between milestones', ar: 'تفاصيل خطة دفع خاطئة؛ صمت بين المراحل' },
    channelsUsed: ['wallet', 'whatsapp', 'email'],
    recommendation: {
      targetWho: { en: 'Owners abroad with one unit and no second deal in 18 months', ar: 'مالكون في الخارج بوحدة واحدة ولا صفقة ثانية منذ 18 شهراً' },
      channelAndWhen: {
        en: 'WhatsApp template plus email, Tuesday to Thursday 18:00 to 21:00 their time',
        ar: 'قالب واتساب مع بريد، الثلاثاء إلى الخميس 18:00 إلى 21:00 بتوقيتهم',
      },
      campaignType: { en: 'Portfolio update with a named relationship manager and one new launch', ar: 'تحديث محفظة مع مدير علاقات بالاسم وإطلاق واحد جديد' },
      whatNotToDo: { en: 'No discount pushes; no cold calls at their night', ar: 'لا ضغط بخصومات؛ لا مكالمات باردة في ليلهم' },
    },
    approvedByCxManager: true,
  },
  {
    id: 'first_time_expat_buyer',
    name: { en: 'First-time expat buyer', ar: 'مشترٍ مغترب لأول مرة' },
    who: {
      en: 'Salaried, works in the UAE, buying a home not an asset. Many questions, uses the app and calls, price and payment sensitive, needs handover guidance.',
      ar: 'موظف براتب، يعمل في الإمارات، يشتري منزلاً لا أصلاً. أسئلة كثيرة، يستخدم التطبيق والمكالمات، حساس للسعر والدفع، يحتاج إرشاداً عند التسليم.',
    },
    mainPain: { en: 'Handover date slipped with no call; repeat questions unanswered', ar: 'تأخر موعد التسليم دون اتصال؛ أسئلة متكررة بلا إجابة' },
    channelsUsed: ['app', 'call', 'whatsapp'],
    recommendation: {
      targetWho: {
        en: 'Salaried leads 28 to 40 who viewed twice and asked about payment plans',
        ar: 'عملاء محتملون براتب بين 28 و40 شاهدوا مرتين وسألوا عن خطط الدفع',
      },
      channelAndWhen: { en: 'App notification plus WhatsApp, weekday evenings', ar: 'إشعار التطبيق مع واتساب، مساء أيام الأسبوع' },
      campaignType: {
        en: 'Ready-to-move units with a clear payment plan calculator and a handover guarantee',
        ar: 'وحدات جاهزة مع حاسبة خطة دفع واضحة وضمان تسليم',
      },
      whatNotToDo: { en: 'No off-plan launches; no jargon', ar: 'لا إطلاقات على الخارطة؛ لا مصطلحات' },
    },
    approvedByCxManager: true,
  },
  {
    id: 'local_family_renter',
    name: { en: 'Local family renter', ar: 'عائلة مستأجرة محلية' },
    who: {
      en: 'Tenant in PSI Assets, salaried, uses the app for maintenance. Renews when maintenance is fast; leaves when a request is lost.',
      ar: 'مستأجر في PSI للأصول، موظف براتب، يستخدم التطبيق للصيانة. يجدد عندما تكون الصيانة سريعة ويغادر عندما يضيع طلب.',
    },
    mainPain: { en: 'Maintenance request lost between teams; app request not visible', ar: 'طلب صيانة ضاع بين الفرق؛ طلب التطبيق لا يظهر' },
    channelsUsed: ['app', 'call'],
    recommendation: {
      targetWho: {
        en: 'Tenants with a lease ending in 90 days and at least one open maintenance request',
        ar: 'مستأجرون ينتهي عقدهم خلال 90 يوماً ولديهم طلب صيانة مفتوح واحد على الأقل',
      },
      channelAndWhen: { en: 'App message first, then a call from the leasing manager', ar: 'رسالة التطبيق أولاً ثم مكالمة من مدير التأجير' },
      campaignType: {
        en: 'Renewal offer tied to closing the open request, 60 days before the lease ends',
        ar: 'عرض تجديد مرتبط بإغلاق الطلب المفتوح قبل 60 يوماً من انتهاء العقد',
      },
      whatNotToDo: { en: 'No renewal letter before the request is closed', ar: 'لا رسالة تجديد قبل إغلاق الطلب' },
    },
    approvedByCxManager: true,
  },
  {
    id: 'portfolio_owner',
    name: { en: 'Portfolio owner', ar: 'مالك محفظة' },
    who: {
      en: 'Several units, business owner, delegates to an assistant. Wants rental management and zero friction. Low tolerance for delays and for being passed between teams.',
      ar: 'عدة وحدات، صاحب أعمال، يفوّض مساعداً. يريد إدارة تأجير وبلا احتكاك. تحمّل منخفض للتأخير وللتنقل بين الفرق.',
    },
    mainPain: { en: 'Passed between After-Sales and Assets; statement errors', ar: 'يُحوَّل بين ما بعد البيع والأصول؛ أخطاء في كشف الحساب' },
    channelsUsed: ['wallet', 'email', 'call'],
    recommendation: {
      targetWho: { en: 'Owners with 3 or more units and no referral in 12 months', ar: 'مالكون بثلاث وحدات أو أكثر ولا إحالة منذ 12 شهراً' },
      channelAndWhen: { en: 'Account manager call, then PSI Club invitation by email', ar: 'مكالمة مدير الحساب ثم دعوة نادي PSI بالبريد' },
      campaignType: { en: 'PSI Club referral programme and a single point of contact', ar: 'برنامج إحالة نادي PSI ونقطة تواصل واحدة' },
      whatNotToDo: { en: 'No generic launch mailers', ar: 'لا رسائل إطلاق عامة' },
    },
    approvedByCxManager: false,
    auditNote: {
      en: 'Segment criteria rely on PSI Wallet data that is still pilot-only — recheck segment size once Wallet exits pilot.',
      ar: 'معايير الشريحة تعتمد على بيانات محفظة PSI التي ما زالت تجريبية — يُعاد التحقق من حجم الشريحة بعد خروج المحفظة من مرحلة التجربة.',
    },
  },
  {
    id: 'comparison_shopper',
    name: { en: 'Comparison shopper', ar: 'مقارِن العروض' },
    who: {
      en: 'Lead talking to several brokers at once, WhatsApp heavy, asks for the best price and a discount. Goes where the reply is fastest and clearest.',
      ar: 'عميل محتمل يتحدث مع عدة وسطاء في آن، يعتمد واتساب، يطلب أفضل سعر وخصماً. يذهب حيث الرد أسرع وأوضح.',
    },
    mainPain: {
      en: 'Slow WhatsApp reply; reply in the wrong language; discount promised then withdrawn',
      ar: 'رد واتساب بطيء؛ رد بلغة غير مناسبة؛ خصم وُعد به ثم سُحب',
    },
    channelsUsed: ['whatsapp', 'website'],
    recommendation: {
      targetWho: {
        en: 'Leads who asked for a price on WhatsApp and got no reply within 2 hours',
        ar: 'عملاء محتملون طلبوا سعراً على واتساب ولم يُردّ عليهم خلال ساعتين',
      },
      channelAndWhen: { en: 'WhatsApp within the same hour, from the assigned agent', ar: 'واتساب خلال نفس الساعة من الموظف المعيّن' },
      campaignType: { en: 'Transparent price sheet and viewing slot, no discount games', ar: 'ورقة أسعار شفافة وموعد معاينة، بلا ألعاب خصومات' },
      whatNotToDo: { en: 'No "call me for the price"', ar: 'لا "اتصل بي لمعرفة السعر"' },
    },
    approvedByCxManager: true,
    auditNote: {
      en: 'Criteria checked against the lead funnel’s "why they stopped" reasons — consistent for two reviews running.',
      ar: 'جرى فحص المعايير مقابل أسباب "لماذا توقفوا" في قمع العملاء المحتملين — متسقة لمراجعتين متتاليتين.',
    },
  },
  {
    id: 'referral_driven_member',
    name: { en: 'Referral-driven member', ar: 'عضو يعتمد الإحالة' },
    who: {
      en: 'PSI Club member, refers friends and family, wants to see progress and get paid on time. Talks about PSI to others; the loudest promoter or detractor.',
      ar: 'عضو نادي PSI، يحيل الأصدقاء والعائلة، يريد رؤية التقدم والدفع في موعده. يتحدث عن PSI للآخرين؛ أعلى مروّج أو منتقد.',
    },
    mainPain: { en: 'No update on a nominated lead; commission late', ar: 'لا تحديث عن عميل مرشَّح؛ عمولة متأخرة' },
    channelsUsed: ['club', 'whatsapp'],
    recommendation: {
      targetWho: { en: 'Members with one closed referral and none in 6 months', ar: 'أعضاء لهم إحالة واحدة مغلقة ولا شيء منذ 6 أشهر' },
      channelAndWhen: { en: 'Club app milestone push plus a personal WhatsApp from the admin', ar: 'إشعار المراحل في تطبيق النادي مع واتساب شخصي من المسؤول' },
      campaignType: { en: 'Referral season with visible tracking and a recognition moment', ar: 'موسم إحالات مع تتبع مرئي ولحظة تقدير' },
      whatNotToDo: { en: 'No referral asks while a commission is unpaid', ar: 'لا طلب إحالات وعمولة غير مدفوعة' },
    },
    approvedByCxManager: true,
  },
]

function buildPersonas(): Persona[] {
  return PERSONA_SEED.map((p) => ({ ...p, segmentSize: intBetween(rng, 3, 9), runawayCount: intBetween(rng, 0, 4) }))
}

function buildCampaignRecommendations(personas: Persona[]): CampaignRecommendation[] {
  return personas.map((p, idx) => ({
    id: `camp-${idx + 1}`,
    personaId: p.id as PersonaKey,
    rank: idx + 1,
    title: p.recommendation.campaignType,
    summary: p.recommendation.targetWho,
  }))
}

/** FR-2.4 — exactly four parts, every sentence citing a dated timeline
 * event via `evidence`. Verdict reuses `classifyRunaway` so the per-person
 * reading and the Runaway page agree on the same classification instead of
 * carrying two independent guesses. */
const CHANNEL_NAME: Record<string, { en: string; ar: string }> = {
  website: { en: 'the website', ar: 'الموقع' },
  app: { en: 'the app', ar: 'التطبيق' },
  whatsapp: { en: 'WhatsApp', ar: 'واتساب' },
  call: { en: 'phone calls', ar: 'الاتصال' },
  ivr: { en: 'the phone menu (IVR)', ar: 'الرد الآلي' },
  branch: { en: 'a branch visit', ar: 'زيارة فرع' },
  email: { en: 'email', ar: 'البريد' },
  survey: { en: 'a survey', ar: 'استبيان' },
  shopper: { en: 'a mystery shopper visit', ar: 'تسوق سري' },
  club: { en: 'PSI Club', ar: 'نادي PSI' },
  wallet: { en: 'PSI Wallet', ar: 'محفظة PSI' },
  events: { en: 'an event', ar: 'فعالية' },
  tours: { en: 'Tour Estate', ar: 'تور إستيت' },
  facebook: { en: 'Facebook', ar: 'فيسبوك' },
  instagram: { en: 'Instagram', ar: 'إنستغرام' },
  linkedin: { en: 'LinkedIn', ar: 'لينكد إن' },
  google: { en: 'Google', ar: 'غوغل' },
}

function buildAiJourneyReadings(persons: Person[], interactions: Interaction[], effortSummaries: EffortSummary[]): AiJourneyReading[] {
  return persons.map((p) => {
    const mine = interactions.filter((i) => i.personKey === p.id).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    const effort = effortSummaries.find((e) => e.personId === p.id)
    const classification = classifyRunaway(p, effort, mine)
    const problemEvents = mine.filter((i) => i.problemFlags.length > 0)
    const verdict: AiJourneyReading['verdict'] = classification ? classification.type : effort && effort.problemsFound >= 2 ? 'high_effort' : 'healthy'
    const years = Math.max(1, Math.round((Date.now() - new Date(p.createdAt).getTime()) / (365 * 86_400_000)))
    const channelsUsed = [...new Set(mine.map((i) => i.channel))]

    const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const names = channelsUsed.slice(0, 3).map((c) => CHANNEL_NAME[c]?.en ?? c)
    const namesAr = channelsUsed.slice(0, 3).map((c) => CHANNEL_NAME[c]?.ar ?? c)
    return {
      personId: p.id,
      whoHowLongChannels: {
        en: `${p.type === 'customer' ? 'A customer' : 'A lead'} for about ${years} year${years === 1 ? '' : 's'}. Has contacted us through ${channelsUsed.length} channel${channelsUsed.length === 1 ? '' : 's'}${names.length ? `: ${names.join(', ')}${channelsUsed.length > 3 ? ' and more' : ''}` : ''}.`,
        ar: `${p.type === 'customer' ? 'عميل' : 'عميل محتمل'} منذ نحو ${years} سنة. تواصل معنا عبر ${channelsUsed.length} قنوات${namesAr.length ? `: ${namesAr.join('، ')}${channelsUsed.length > 3 ? ' وغيرها' : ''}` : ''}.`,
      },
      whatWentWrong: problemEvents.length
        ? {
            en: `${problemEvents.length} problem${problemEvents.length === 1 ? '' : 's'}, the latest on ${fmt(problemEvents[problemEvents.length - 1].occurredAt)}.`,
            ar: `${problemEvents.length} مشكلة مسجّلة على رحلته، آخرها بتاريخ ${fmt(problemEvents[problemEvents.length - 1].occurredAt)}.`,
          }
        : { en: 'Nothing went wrong on this journey.', ar: 'لم يحدث أي خطأ على هذه الرحلة.' },
      verdict,
      whatToDoNext: classification
        ? classification.reason
        : verdict === 'high_effort'
          ? {
              en: 'Send a short check-in (a call or a message) to confirm everything is solved, then go back to the normal rhythm.',
              ar: 'أرسل متابعة قصيرة (اتصال أو رسالة) للتأكد أن كل شيء انحلّ، ثم عد إلى الإيقاع المعتاد.',
            }
          : { en: 'Nothing to do now. Keep the normal rhythm.', ar: 'لا شيء مطلوب الآن. استمر بالإيقاع المعتاد.' },
      evidence: problemEvents.slice(0, 5).map((e) => ({ eventId: e.id, occurredAt: e.occurredAt })),
    }
  })
}

/** FR-5.6 — one running sample campaign; `createAiCampaign`'s mutation (in
 * `queries.ts`) re-enforces the critical-exclusion rule at write time too,
 * so this isn't the only place the hard rule lives. */
function buildAiCampaigns(items: DetractorCallItem[]): AiInterviewCampaign[] {
  const eligible = items.filter((i) => i.severity !== 'critical')
  if (!eligible.length) return []
  return [
    {
      id: 'camp-ai-1',
      name: { en: 'Silent renters — WhatsApp recovery', ar: 'مستأجرون صامتون — استرداد عبر واتساب' },
      segmentDescription: {
        en: 'Medium/low-severity detractors, WhatsApp-reachable, not critical.',
        ar: 'منتقدون بخطورة متوسطة/منخفضة، قابلون للتواصل عبر واتساب، غير حرجين.',
      },
      script: {
        en: 'Hello, this is PSI following up on your recent experience. What happened, and what would have made it right?',
        ar: 'مرحباً، معك فريق PSI للمتابعة بخصوص تجربتك الأخيرة. ماذا حدث، وما الذي كان سيصلح الأمر؟',
      },
      status: 'running',
      memberIds: eligible.slice(0, Math.min(4, eligible.length)).map((i) => i.id),
    },
  ]
}

/** FR-7.2 — the nine-row "when we ask, and when we never ask" table,
 * transcribed from Modules KB §9, mapped onto the five confirmed instrument
 * types. This is the product-agnostic rule; the by-product differences
 * (FR-7.4) are `MOCK_PRODUCT_SURVEY_MOMENTS` below, not a second copy of
 * this table per product. */
const SURVEY_TRIGGERS: SurveyTrigger[] = [
  {
    id: 'st-csat-call',
    product: 're',
    instrument: 'csat_ces',
    triggerDescription: {
      en: 'Agent call over 2 minutes, a viewing, or an offer — CSAT + CES on one screen. Inside the 30-day window the portal keeps the most important touchpoint: viewing over offer over call.',
      ar: 'مكالمة وكيل تتجاوز دقيقتين، أو معاينة، أو عرض — CSAT وCES على شاشة واحدة. ضمن نافذة الثلاثين يوماً يحتفظ النظام بأهم نقطة تواصل: المعاينة قبل العرض قبل المكالمة.',
    },
    capDays: 30,
  },
  {
    id: 'st-stopped',
    product: 're',
    instrument: 'what_stopped_you',
    triggerDescription: {
      en: 'Lead silent for 14 days — "What stopped you?", once, then never again for that enquiry.',
      ar: 'عميل محتمل صامت لمدة 14 يوماً — "ما الذي أوقفك؟"، مرة واحدة، ثم لا يُعاد طرحه لهذا الاستفسار.',
    },
    capDays: null,
  },
  {
    id: 'st-abandoned',
    product: 're',
    instrument: 'abandoned_ces',
    triggerDescription: {
      en: 'Abandoned digital step (upload, booking, payment) — CES, identified users only, never on the public site.',
      ar: 'التخلي عن خطوة رقمية (رفع مستند، حجز، دفع) — CES، للمستخدمين المعرَّفين فقط، وليس على الموقع العام.',
    },
    capDays: null,
  },
  {
    id: 'st-nps-milestone',
    product: 're',
    instrument: 'nps',
    triggerDescription: {
      en: 'Deal completed, lease signed, handover done — transactional NPS, only after a completed milestone, once per 90 days per person.',
      ar: 'إتمام صفقة، توقيع عقد إيجار، تسليم منجز — مؤشر NPS معاملاتي، فقط بعد إتمام مرحلة رئيسية، مرة كل 90 يوماً للشخص الواحد.',
    },
    capDays: 90,
  },
  {
    id: 'st-closed-ticket',
    product: 're',
    instrument: 'abandoned_ces',
    triggerDescription: {
      en: 'Maintenance or complaint ticket closed — CES, sent after the closure message.',
      ar: 'إغلاق تذكرة صيانة أو شكوى — CES، تُرسل بعد رسالة الإغلاق.',
    },
    capDays: null,
  },
  {
    id: 'st-nps-relationship',
    product: 're',
    instrument: 'nps',
    triggerDescription: {
      en: 'Owner or investor, yearly — relationship NPS, once a year, never inside the 90-day window of a transactional NPS.',
      ar: 'مالك أو مستثمر، سنوياً — مؤشر NPS العلائقي، مرة في السنة، وليس ضمن نافذة الـ90 يوماً لمؤشر NPS المعاملاتي.',
    },
    capDays: 365,
  },
  {
    id: 'st-resurvey',
    product: 're',
    instrument: 're_survey',
    triggerDescription: {
      en: 'Detractor, 7 to 14 days after resolution — the same question again, exempt from the caps, reports the recovery delta.',
      ar: 'منتقد، بعد 7 إلى 14 يوماً من الحل — السؤال نفسه مجدداً، مستثنى من الحدود، يقرّر فارق التعافي.',
    },
    capDays: null,
  },
]

const FUNNEL_SOURCES: Bi[] = [
  { en: 'PSI Website', ar: 'موقع PSI' },
  { en: 'PSI Real Estate app', ar: 'تطبيق PSI العقاري' },
  { en: 'PSI Club', ar: 'نادي PSI' },
  { en: 'WhatsApp', ar: 'واتساب' },
  { en: 'CRM', ar: 'نظام إدارة علاقات العملاء' },
]

const STOP_REASONS: Bi[] = [
  { en: 'Price or payment plan', ar: 'السعر أو خطة الدفع' },
  { en: 'Slow first reply', ar: 'بطء الرد الأول' },
  { en: 'Unit or paperwork availability', ar: 'توفر الوحدة أو الأوراق' },
  { en: 'Went with a competitor', ar: 'اختار عرضاً منافساً' },
  { en: 'Nothing suitable for them', ar: 'لا يوجد ما يناسبهم' },
]

function splitAcross(total: number, buckets: Bi[]): { label: Bi; count: number }[] {
  let remaining = total
  return buckets.map((label, idx) => {
    if (idx === buckets.length - 1) return { label, count: remaining }
    const share = Math.round(total * (0.4 - idx * 0.08) * (0.85 + rng() * 0.3))
    const take = Math.min(remaining, Math.max(0, share))
    remaining -= take
    return { label, count: take }
  })
}

/** FR-7.1 — the lead funnel, sample figures transcribed from Modules KB §9
 * ("9,000 leads became 7,400 contacted ... 150 signed deals; 12 deals are
 * frozen") — the KB's own illustration, not a number invented for this
 * build, but still sample data like everything else in this layer. */
function buildLeadFunnel(): LeadFunnelPoint[] {
  const stageCounts: { stage: LeadFunnelPoint['stage']; count: number }[] = [
    { stage: 'enquiry', count: 9000 },
    { stage: 'contacted', count: 7400 },
    { stage: 'viewing', count: 2100 },
    { stage: 'offer', count: 640 },
    { stage: 'signed', count: 150 },
  ]
  return stageCounts.map(({ stage, count }, idx) => {
    const nextCount = stageCounts[idx + 1]?.count ?? 0
    const stopped = stage === 'signed' ? 0 : count - nextCount
    return {
      product: 're' as ProductId,
      stage,
      count,
      sourceSplit: splitAcross(count, FUNNEL_SOURCES),
      whyTheyStopped: stopped > 0 ? splitAcross(stopped, STOP_REASONS).map(({ label, count: c }) => ({ reason: label, count: c })) : undefined,
    }
  })
}

/** FR-7.4 — "per product, no group number" (Modules KB §9): each product's
 * own moments text, transcribed per product rather than forced into the
 * five-instrument shape — PSI Events explicitly has no NPS at all. */
function buildProductSurveyMoments(): ProductSurveyMoments[] {
  return [
    {
      product: 're',
      hasNps: true,
      momentsSummary: {
        en: 'Asks after the call, the viewing, the offer and the signed deal.',
        ar: 'يُستبين بعد المكالمة، والمعاينة، والعرض، والصفقة الموقعة.',
      },
    },
    {
      product: 'af',
      hasNps: true,
      momentsSummary: { en: 'Asks after handover, a closed ticket, and renewal.', ar: 'يُستبين بعد التسليم، وإغلاق التذكرة، والتجديد.' },
    },
    {
      product: 'cl',
      hasNps: true,
      momentsSummary: {
        en: 'Club leads ride the Real Estate journey with a VIP tag; members get a member NPS at the end of a nomination cycle.',
        ar: 'يسير عملاء النادي المحتملون ضمن رحلة العقارية بعلامة كبار الشخصيات؛ ويحصل الأعضاء على مؤشر NPS خاص بالعضوية في نهاية دورة الترشيح.',
      },
    },
    {
      product: 'to',
      hasNps: true,
      momentsSummary: {
        en: 'End-of-tour survey only, after a completed tour (driver, guide, ride, car, cleanliness, then NPS). The stop survey goes to the commercial team, not the portal.',
        ar: 'استبيان نهاية الجولة فقط، بعد جولة مكتملة (السائق، المرشد، الرحلة، السيارة، النظافة، ثم NPS). استبيان التوقف يذهب للفريق التجاري، وليس للبوابة.',
      },
    },
    {
      product: 'ev',
      hasNps: false,
      momentsSummary: {
        en: 'No NPS: an external QR rating at the booth and an internal staff evaluation.',
        ar: 'لا يوجد مؤشر NPS: تقييم خارجي عبر رمز QR عند الجناح وتقييم داخلي للموظفين.',
      },
    },
    // v42.3 (F35): the Wallet review of 19 Nov replaced the pilot line; the sentence is the Modules KB's, the Arabic is put together from the prototype's own wording (docs/V42_WALLET.md).
    {
      product: 'wl',
      hasNps: true,
      momentsSummary: {
        en: 'One question per touchpoint: CES after the wallet is created, CSAT after the call with the advisor, CES after a property is added. NPS only on the Dashboard about 30 days after, then yearly.',
        ar: 'سؤال واحد لكل نقطة تماس: CES بعد إنشاء المحفظة، CSAT بعد المكالمة مع المستشار، CES بعد إضافة عقار. NPS فقط على لوحة المعلومات بعد نحو 30 يوماً من إنشاء المحفظة ثم سنوياً.',
      },
    },
  ]
}

/** A light-weight run log for the Intelligent CX team page — not full
 * envelopes, just "who ran, on what, with what verdict" derived from the
 * same seeded arrays every other page already reads. Agent 4 (mystery
 * shopper severity) is deliberately absent: the spec states it "is not
 * built in phase one" (FUNCTIONAL_REQUIREMENTS.md §9), so there is no run to
 * show, not an empty one. The AI Insights payloads are not attributed to
 * any of the ten numbered agents here — the spec's agent list has no entry
 * named "AI Insights"; `agent-4-ai-insights` above is an earlier page's own
 * label, not a claim about which of the ten agents produces it. */
function buildAgentActivity(
  interactions: Interaction[],
  signals: Signal[],
  patterns: Pattern[],
  correctiveActions: CorrectiveAction[],
  correctiveRationales: Record<string, AgentOutputEnvelope<CorrectiveRationale>>,
  readings: AiJourneyReading[],
  campaigns: AiInterviewCampaign[],
  callItems: DetractorCallItem[],
  surveyTriggers: SurveyTrigger[],
): AgentActivityEntry[] {
  const verdict = (): AgentActivityEntry['supervisorVerdict'] => {
    const r = rng()
    return r > 0.94 ? 'escalated' : r > 0.84 ? 'returned' : 'approved'
  }
  const out: AgentActivityEntry[] = []

  out.push({
    id: 'act-intake-1',
    agentKey: 'intake',
    runId: 'run-intake-nightly',
    subjectSummary: {
      en: `Reconciled ${interactions.length} interactions across every feed; matched to a person or kept in the unmatched queue.`,
      ar: `جرت مطابقة ${interactions.length} تفاعلاً عبر كل التغذيات؛ إما لشخص محدد أو في قائمة غير المطابق.`,
    },
    supervisorVerdict: verdict(),
    createdAt: daysAgoIso(rng, 0.2),
  })
  out.push({
    id: 'act-classify-1',
    agentKey: 'classify',
    runId: 'run-classify-latest',
    subjectSummary: {
      en: `Classified ${interactions.filter((i) => i.problemFlags.length > 0).length} events with a problem flag into one category and reason code each.`,
      ar: `تصنيف ${interactions.filter((i) => i.problemFlags.length > 0).length} حدثاً يحمل علامة مشكلة إلى فئة ورمز سبب واحد لكل منها.`,
    },
    supervisorVerdict: verdict(),
    createdAt: daysAgoIso(rng, 0.3),
  })
  out.push({
    id: 'act-signals-1',
    agentKey: 'signals',
    runId: 'run-signals-nightly',
    subjectSummary: {
      en: `Nightly recount: ${signals.length} signals counted, ${patterns.length} past threshold and published as patterns.`,
      ar: `إعادة عد ليلية: ${signals.length} إشارة مُحتسبة، ${patterns.length} تجاوزت الحد ونُشرت كأنماط.`,
    },
    supervisorVerdict: verdict(),
    createdAt: daysAgoIso(rng, 1),
  })
  Object.values(correctiveRationales)
    .slice(0, 4)
    .forEach((env, idx) => {
      out.push({
        id: `act-actions-${idx + 1}`,
        agentKey: 'actions',
        runId: env.runId,
        subjectSummary: {
          en: `Proposed a corrective action for pattern ${env.subjectId}, with its basis from past actions.`,
          ar: `اقتراح إجراء تصحيحي للنمط ${env.subjectId}، بالاستناد إلى إجراءات سابقة.`,
        },
        supervisorVerdict: env.supervisorVerdict === 'approved' ? 'approved' : 'returned',
        createdAt: env.createdAt,
      })
    })
  const verified = correctiveActions.filter((a) => a.verificationResult)
  out.push({
    id: 'act-verify-1',
    agentKey: 'verify',
    runId: 'run-verify-daily',
    subjectSummary: {
      en: `Ran the daily 06:00 clock: ${verified.length} actions carry a verification verdict (effective, partial or failed).`,
      ar: `تشغيل الساعة اليومية 06:00: ${verified.length} إجراءً يحمل نتيجة تحقق (فعّال أو جزئي أو فاشل).`,
    },
    supervisorVerdict: verdict(),
    createdAt: daysAgoIso(rng, 0.1),
  })
  const runaway = readings.filter((r) => r.verdict !== 'healthy' && r.verdict !== 'high_effort')
  out.push({
    id: 'act-journey-1',
    agentKey: 'journey',
    runId: 'run-journey-nightly',
    subjectSummary: {
      en: `Refreshed ${readings.length} journey readings overnight; ${runaway.length} now carry a runaway type.`,
      ar: `تحديث ${readings.length} قراءة رحلة ليلاً؛ ${runaway.length} منها تحمل الآن نوع هروب.`,
    },
    supervisorVerdict: verdict(),
    createdAt: daysAgoIso(rng, 0.4),
  })
  out.push({
    id: 'act-loop-1',
    agentKey: 'loop',
    runId: 'run-loop-monthly-capacity',
    subjectSummary: {
      en: `Monthly capacity run: ${callItems.length} detractors listed, ${campaigns.reduce((n, c) => n + c.memberIds.length, 0)} routed to a running AI interview campaign.`,
      ar: `تشغيل السعة الشهري: ${callItems.length} منتقداً مُدرجاً، ${campaigns.reduce((n, c) => n + c.memberIds.length, 0)} منهم ضمن حملة مقابلات ذكاء اصطناعي قائمة.`,
    },
    supervisorVerdict: verdict(),
    createdAt: daysAgoIso(rng, 2),
  })
  out.push({
    id: 'act-report-1',
    agentKey: 'report',
    runId: 'run-report-month',
    subjectSummary: {
      en: 'Drafted the monthly management report from the metric store — held for the CX manager to release.',
      ar: 'إعداد مسودة التقرير الإداري الشهري من مخزن المؤشرات — بانتظار إصدار مدير تجربة العملاء.',
    },
    supervisorVerdict: 'approved',
    createdAt: daysAgoIso(rng, 5),
  })
  out.push({
    id: 'act-survey-1',
    agentKey: 'survey_triggers',
    runId: 'run-survey-0900',
    subjectSummary: {
      en: `09:00 run: checked every person against ${surveyTriggers.length} trigger/cap rules; sends and skips logged by reason.`,
      ar: `تشغيل الساعة 09:00: فحص كل شخص مقابل ${surveyTriggers.length} قاعدة محفّز/حد؛ تم تسجيل الإرسال والتخطي مع السبب.`,
    },
    supervisorVerdict: verdict(),
    createdAt: daysAgoIso(rng, 0.05),
  })
  out.push({
    id: 'act-supervisor-1',
    agentKey: 'supervisor',
    runId: 'run-supervisor-weekly-sample',
    subjectSummary: {
      en: 'Weekly calibration: sampled 50 approved outputs for the CX team and Internal Audit and Marketing Lead to review.',
      ar: 'معايرة أسبوعية: أخذ عينة من 50 مخرجاً معتمداً لمراجعة فريق تجربة العملاء ومسؤول التدقيق الداخلي والتسويق.',
    },
    supervisorVerdict: 'approved',
    createdAt: daysAgoIso(rng, 3),
  })

  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

// --- Settings and reference (APPLICATION_MODULES.md §C) --------------------
// Everything below backs the folded legacy menu's sub-pages. Most of it is
// ported close to verbatim from the pre-omnichannel `frontend/src/data/*.ts`
// — only the Standards register's `ld_document` rows are new, transcribed
// from `Standards-Documentation-List-for-LD.docx` (see the [Proposed] note
// on the 28-vs-extracted-count mismatch below).

function buildStandards(): Standard[] {
  const platformRules: Standard[] = [
    {
      id: 'std_hr_procedures',
      code: 'M-01',
      source: 'platform_rule',
      group: { en: 'Platform rules', ar: 'قواعد المنصة' },
      title: { en: 'HR mystery-shopper procedures', ar: 'إجراءات الموارد البشرية للتسوق السري' },
      writer: { en: 'HR', ar: 'الموارد البشرية' },
      readBy: { en: 'HR', ar: 'الموارد البشرية' },
      owner: 'HR',
      linkedItems: 0,
      status: 'not_started',
    },
    {
      id: 'std_sla_targets',
      code: 'M-02',
      source: 'platform_rule',
      group: { en: 'Platform rules', ar: 'قواعد المنصة' },
      title: { en: 'Agreed SLA targets by complaint type', ar: 'أهداف اتفاقية مستوى الخدمة حسب نوع الشكوى' },
      writer: { en: 'CX manager', ar: 'مدير تجربة العملاء' },
      readBy: { en: 'CX, signals, Actions', ar: 'تجربة العملاء، الإشارات، الإجراءات' },
      owner: 'CX manager',
      linkedItems: 27,
      status: 'drafted',
    },
    {
      id: 'std_as_script',
      code: 'M-03',
      source: 'platform_rule',
      group: { en: 'Platform rules', ar: 'قواعد المنصة' },
      title: { en: 'After-Sales real call script', ar: 'نص مكالمة ما بعد البيع الفعلي' },
      writer: { en: 'After-Sales lead', ar: 'قائد ما بعد البيع' },
      readBy: { en: 'After-Sales', ar: 'ما بعد البيع' },
      owner: 'After-Sales lead',
      linkedItems: 0,
      status: 'not_started',
    },
    {
      id: 'std_legal_calling',
      code: 'M-04',
      source: 'platform_rule',
      group: { en: 'Platform rules', ar: 'قواعد المنصة' },
      title: { en: 'Calling hours, consent and recording policy', ar: 'سياسة ساعات الاتصال والموافقة والتسجيل' },
      writer: { en: 'Legal', ar: 'القانونية' },
      readBy: { en: 'Legal, call center', ar: 'القانونية، مركز الاتصال' },
      owner: 'Legal',
      linkedItems: 0,
      status: 'legal_review',
    },
    {
      id: 'std_shopper_rubric',
      code: 'M-05',
      source: 'platform_rule',
      group: { en: 'Platform rules', ar: 'قواعد المنصة' },
      title: { en: 'Mystery shopper scoring rubric', ar: 'معايير تقييم التسوق السري' },
      writer: { en: 'CX team', ar: 'فريق تجربة العملاء' },
      readBy: { en: 'CX, mystery shopper', ar: 'تجربة العملاء، التسوق السري' },
      owner: 'CX team',
      linkedItems: 6,
      status: 'drafted',
    },
    {
      id: 'std_ai_rubric',
      code: 'M-06',
      source: 'platform_rule',
      group: { en: 'Platform rules', ar: 'قواعد المنصة' },
      title: { en: 'AI call evaluator rubric', ar: 'معايير تقييم مُقيّم المكالمات الذكي' },
      writer: { en: 'CX team', ar: 'فريق تجربة العملاء' },
      readBy: { en: 'AI call center', ar: 'مركز الاتصال الذكي' },
      owner: 'CX team',
      linkedItems: 8,
      status: 'drafted',
    },
    {
      id: 'std_whatsapp_policy',
      code: 'M-07',
      source: 'platform_rule',
      group: { en: 'Platform rules', ar: 'قواعد المنصة' },
      title: { en: 'WhatsApp messaging and Meta template policy', ar: 'سياسة رسائل واتساب وقوالب ميتا' },
      writer: { en: 'CX manager', ar: 'مدير تجربة العملاء' },
      readBy: { en: 'CX', ar: 'تجربة العملاء' },
      owner: 'CX manager',
      linkedItems: 6,
      status: 'drafted',
    },
    {
      id: 'std_escalation_policy',
      code: 'M-08',
      source: 'platform_rule',
      group: { en: 'Platform rules', ar: 'قواعد المنصة' },
      title: { en: 'Complaint escalation and routing policy', ar: 'سياسة تصعيد وتوجيه الشكاوى' },
      writer: { en: 'CX manager', ar: 'مدير تجربة العملاء' },
      readBy: { en: 'CX, Actions', ar: 'تجربة العملاء، الإجراءات' },
      owner: 'CX manager',
      linkedItems: 27,
      status: 'drafted',
    },
    {
      id: 'std_branch_checklist',
      code: 'M-09',
      source: 'platform_rule',
      group: { en: 'Platform rules', ar: 'قواعد المنصة' },
      title: { en: 'Branch and gallery visit standard', ar: 'معيار زيارة الفرع والمعرض' },
      writer: { en: 'CX team', ar: 'فريق تجربة العملاء' },
      readBy: { en: 'Mystery shopper', ar: 'التسوق السري' },
      owner: 'CX team',
      linkedItems: 4,
      status: 'drafted',
    },
    {
      id: 'std_re_sales_script',
      code: 'M-10',
      source: 'platform_rule',
      group: { en: 'Platform rules', ar: 'قواعد المنصة' },
      title: { en: 'Real Estate sales script', ar: 'نص مبيعات العقارات' },
      writer: { en: 'Head of Sales', ar: 'رئيس المبيعات' },
      readBy: { en: 'Sales', ar: 'المبيعات' },
      owner: 'Head of Sales',
      linkedItems: 0,
      status: 'not_started',
    },
    {
      id: 'std_club_policy',
      code: 'M-11',
      source: 'platform_rule',
      group: { en: 'Platform rules', ar: 'قواعد المنصة' },
      title: { en: 'PSI Club VIP nomination policy', ar: 'سياسة ترشيح أعضاء نادي PSI المميزين' },
      writer: { en: 'Club lead', ar: 'قائد النادي' },
      readBy: { en: 'Club', ar: 'النادي' },
      owner: 'Club lead',
      linkedItems: 0,
      status: 'not_started',
    },
    {
      id: 'std_tour_safety',
      code: 'M-12',
      source: 'platform_rule',
      group: { en: 'Platform rules', ar: 'قواعد المنصة' },
      title: { en: 'Tour Estate safety and conduct standard', ar: 'معيار السلامة والسلوك في تور إستيت' },
      writer: { en: 'Tour operations', ar: 'عمليات الجولات' },
      readBy: { en: 'Tour Estate', ar: 'تور إستيت' },
      owner: 'Tour operations',
      linkedItems: 0,
      status: 'not_started',
    },
    {
      id: 'std_events_registration',
      code: 'M-13',
      source: 'platform_rule',
      group: { en: 'Platform rules', ar: 'قواعد المنصة' },
      title: { en: 'Events registration and follow-up standard', ar: 'معيار تسجيل ومتابعة الفعاليات' },
      writer: { en: 'Events lead', ar: 'قائد الفعاليات' },
      readBy: { en: 'PSI Events', ar: 'فعاليات PSI' },
      owner: 'Events lead',
      linkedItems: 0,
      status: 'not_started',
    },
  ]

  const g1: Bi = { en: '1. Frontline and branch', ar: '١. الواجهة والفرع' }
  const g2: Bi = { en: '2. Communication and selling', ar: '٢. التواصل والبيع' }
  const g3: Bi = { en: '3. Digital channels and chat', ar: '٣. القنوات الرقمية والمحادثة' }
  const g4: Bi = { en: '4. Call center', ar: '٤. مركز الاتصال' }
  const g5: Bi = { en: '5. After-Sales and rental (PSI Assets)', ar: '٥. ما بعد البيع والإيجار (PSI أسيتس)' }
  const g6: Bi = { en: '6. Follow-up and conduct', ar: '٦. المتابعة والسلوك' }
  const ld = (en: string, ar: string) => ({ en, ar }) as Bi

  type LdRow = [string, Bi, Bi, Bi, Bi, Bi | undefined, 1 | 2 | 3 | 4 | 5, 'not_started' | 'drafted' | 'legal_review']
  const ldRows: LdRow[] = [
    [
      'std_branch_presentation',
      g1,
      ld('Branch and gallery presentation standard', 'معيار عرض الفرع والمعرض'),
      ld('Operations with the environment champions', 'العمليات مع أبطال البيئات'),
      ld('Shopper, survey (branch visit)', 'المتسوق، الاستبيان'),
      ld('Assets: leasing offices/show units instead of galleries', 'أسيتس: مكاتب التأجير بدل المعارض'),
      1,
      'drafted',
    ],
    [
      'std_meeting_room',
      g1,
      ld('Meeting room and privacy standard', 'معيار غرفة الاجتماعات والخصوصية'),
      ld('L&D with Legal', 'التعلم والتطوير مع القانونية'),
      ld('Shopper, survey', 'المتسوق، الاستبيان'),
      ld('Assets: tenant documents raise the bar', 'أسيتس: مستندات المستأجر ترفع السقف'),
      5,
      'not_started',
    ],
    [
      'std_dress_code',
      g1,
      ld('Appearance and dress code', 'المظهر والزي'),
      ld('L&D with HR', 'التعلم والتطوير مع الموارد البشرية'),
      ld('Shopper, L&D', 'المتسوق، التعلم والتطوير'),
      ld('Assets: field dress code for site/maintenance staff', 'أسيتس: زي ميداني لموظفي الصيانة'),
      1,
      'drafted',
    ],
    [
      'std_reception_greeting',
      g1,
      ld('Reception and greeting standard', 'معيار الاستقبال والترحيب'),
      ld('L&D', 'التعلم والتطوير'),
      ld('Shopper, survey', 'المتسوق، الاستبيان'),
      undefined,
      1,
      'drafted',
    ],
    [
      'std_waiting',
      g1,
      ld('Waiting standard', 'معيار الانتظار'),
      ld('L&D with the environment managers', 'التعلم والتطوير مع مديري البيئات'),
      ld('Shopper, survey, CRM', 'المتسوق، الاستبيان، نظام العملاء'),
      ld('Assets: complaining walk-in tenants take priority', 'أسيتس: أولوية للمستأجرين ذوي الشكاوى'),
      5,
      'not_started',
    ],

    [
      'std_communication',
      g2,
      ld('Communication standard', 'معيار التواصل'),
      ld('L&D', 'التعلم والتطوير'),
      ld('Shopper, chat signals, survey, AI reading', 'المتسوق، إشارات المحادثة، الاستبيان، قراءة الذكاء الاصطناعي'),
      undefined,
      1,
      'drafted',
    ],
    [
      'std_needs_discovery',
      g2,
      ld('Needs discovery and qualification', 'اكتشاف الاحتياجات والتأهيل'),
      ld('L&D with sales managers', 'التعلم والتطوير مع مديري المبيعات'),
      ld('Shopper, CRM notes', 'المتسوق، ملاحظات نظام العملاء'),
      ld('Assets: tenant needs replace buyer needs', 'أسيتس: احتياجات المستأجر بدل المشتري'),
      5,
      'not_started',
    ],
    [
      'std_accurate_info',
      g2,
      ld('Accurate information standard', 'معيار دقة المعلومات'),
      ld('Sales support with L&D', 'دعم المبيعات مع التعلم والتطوير'),
      ld('Shopper (critical), AI call center, signals', 'المتسوق (حرج)، مركز الاتصال الذكي، الإشارات'),
      ld('Assets: rent/deposit/fees sheet instead of price sheet', 'أسيتس: جدول الإيجار والرسوم بدل جدول السعر'),
      1,
      'drafted',
    ],
    [
      'std_promises_discounts',
      g2,
      ld('Approved promises and discounts', 'الوعود والخصومات المعتمدة'),
      ld('Sales management with L&D', 'إدارة المبيعات مع التعلم والتطوير'),
      ld('Shopper (critical), chat signals, journey', 'المتسوق (حرج)، إشارات المحادثة، الرحلة'),
      ld('Assets: rent negotiation and fee waivers have their own path', 'أسيتس: مسار خاص للتفاوض على الإيجار'),
      1,
      'drafted',
    ],
    [
      'std_presenting_closing',
      g2,
      ld('Presenting a unit and closing', 'عرض الوحدة والإغلاق'),
      ld('L&D with the sales managers', 'التعلم والتطوير مع مديري المبيعات'),
      ld('Shopper, survey', 'المتسوق، الاستبيان'),
      ld('Assets: viewing and the move-in condition report', 'أسيتس: المعاينة وتقرير حالة الانتقال'),
      5,
      'not_started',
    ],
    [
      'std_scripts_objections',
      g2,
      ld('Scripts and objection handling', 'النصوص ومعالجة الاعتراضات'),
      ld('L&D with the call center and product owners', 'التعلم والتطوير مع مركز الاتصال وأصحاب المنتجات'),
      ld('Shopper, AI call center, chat signals', 'المتسوق، مركز الاتصال الذكي، إشارات المحادثة'),
      ld('Per product: Real Estate sales, After-Sales, Assets leasing', 'حسب المنتج'),
      5,
      'not_started',
    ],

    [
      'std_official_channels',
      g3,
      ld('Official channels policy', 'سياسة القنوات الرسمية'),
      ld('Sales operations with IT and Legal', 'عمليات المبيعات مع تقنية المعلومات والقانونية'),
      ld('Shopper (critical), signals', 'المتسوق (حرج)، الإشارات'),
      ld('None: a group rule', 'لا يوجد: قاعدة جماعية'),
      1,
      'legal_review',
    ],
    [
      'std_reply_time',
      g3,
      ld('Reply time standard per channel', 'معيار زمن الرد لكل قناة'),
      ld('Sales operations with L&D', 'عمليات المبيعات مع التعلم والتطوير'),
      ld('Chat signals (slow reply), journey, shopper, survey', 'إشارات المحادثة، الرحلة، المتسوق، الاستبيان'),
      ld('Assets: maintenance requests have their own target', 'أسيتس: هدف خاص لطلبات الصيانة'),
      2,
      'not_started',
    ],
    [
      'std_chat_conduct',
      g3,
      ld('Chat conduct and language', 'سلوك المحادثة واللغة'),
      ld('L&D', 'التعلم والتطوير'),
      ld('Chat signals (language), AI reading, shopper', 'إشارات المحادثة (اللغة)، قراءة الذكاء الاصطناعي، المتسوق'),
      undefined,
      2,
      'not_started',
    ],
    [
      'std_digital_lead',
      g3,
      ld('Digital lead handling', 'التعامل مع العميل المحتمل الرقمي'),
      ld('Sales operations with the CRM owner', 'عمليات المبيعات مع مالك نظام العملاء'),
      ld('Journey, CRM, shopper', 'الرحلة، نظام العملاء، المتسوق'),
      ld('Assets: a rental enquiry becomes a viewing request, not a lead', 'أسيتس: الاستفسار يصبح طلب معاينة'),
      5,
      'not_started',
    ],
    [
      'std_app_portal',
      g3,
      ld('App and portal service standard', 'معيار خدمة التطبيق والبوابة'),
      ld('App product teams with CX', 'فرق منتج التطبيق مع تجربة العملاء'),
      ld('App ratings, signals, journey', 'تقييمات التطبيق، الإشارات، الرحلة'),
      ld('Assets: the tenant app is the main channel; Wallet: investors', 'أسيتس: تطبيق المستأجر القناة الرئيسية'),
      5,
      'not_started',
    ],

    [
      'std_inbound_call',
      g4,
      ld('Inbound call standard', 'معيار المكالمات الواردة'),
      ld('Call center lead with L&D', 'قائد مركز الاتصال مع التعلم والتطوير'),
      ld('Shopper (call scenario), CRM activity, journey', 'المتسوق، نشاط نظام العملاء، الرحلة'),
      ld('Per product section', 'حسب قسم المنتج'),
      4,
      'not_started',
    ],
    [
      'std_outbound_ai_caller',
      g4,
      ld('Outbound and AI caller standard', 'معيار المكالمات الصادرة والمتصل الذكي'),
      ld('Call center lead with the AI vendor and Legal', 'قائد مركز الاتصال مع مزوّد الذكاء الاصطناعي والقانونية'),
      ld('AI call center log, signals (call timing), journey, shopper', 'سجل مركز الاتصال الذكي، الإشارات، الرحلة، المتسوق'),
      ld('None: a group rule', 'لا يوجد: قاعدة جماعية'),
      4,
      'not_started',
    ],
    [
      'std_ivr_wording',
      g4,
      ld('IVR wording and routing', 'نصوص وتوجيه الرد الصوتي التفاعلي'),
      ld('Call center lead with CX', 'قائد مركز الاتصال مع تجربة العملاء'),
      ld('IVR log, signals', 'سجل الرد الصوتي، الإشارات'),
      undefined,
      4,
      'not_started',
    ],
    [
      'std_complaint_intake',
      g4,
      ld('Complaint intake standard', 'معيار استقبال الشكاوى'),
      ld('CX with L&D', 'تجربة العملاء مع التعلم والتطوير'),
      ld('Shopper cases, signals, corrective actions', 'حالات المتسوق، الإشارات، الإجراءات التصحيحية'),
      ld('Assets: tenant complaints have their own owners', 'أسيتس: شكاوى المستأجر لها مالكون خاصون'),
      4,
      'not_started',
    ],
    [
      'std_call_quality',
      g4,
      ld('Call quality criteria', 'معايير جودة المكالمة'),
      ld('L&D with the call center lead', 'التعلم والتطوير مع قائد مركز الاتصال'),
      ld('AI call center, L&D', 'مركز الاتصال الذكي، التعلم والتطوير'),
      undefined,
      4,
      'not_started',
    ],

    [
      'std_handover',
      g5,
      ld('Handover standard', 'معيار التسليم'),
      ld('After-Sales lead with L&D', 'قائد ما بعد البيع مع التعلم والتطوير'),
      ld('Signals (handover missed), survey, journey', 'الإشارات، الاستبيان، الرحلة'),
      ld('After-Sales only', 'ما بعد البيع فقط'),
      3,
      'not_started',
    ],
    [
      'std_snagging',
      g5,
      ld('Snagging standard', 'معيار ملاحظات التشطيب'),
      ld('After-Sales lead with the developer liaison', 'قائد ما بعد البيع مع منسّق المطوّر'),
      ld('Signals, survey, journey', 'الإشارات، الاستبيان، الرحلة'),
      ld('After-Sales only', 'ما بعد البيع فقط'),
      5,
      'not_started',
    ],
    [
      'std_maintenance_request',
      g5,
      ld('Maintenance request standard', 'معيار طلب الصيانة'),
      ld('Assets leasing and maintenance leads with L&D', 'قادة التأجير والصيانة في أسيتس مع التعلم والتطوير'),
      ld('App signals, journey (repeat contact), survey', 'إشارات التطبيق، الرحلة، الاستبيان'),
      ld('Assets only', 'أسيتس فقط'),
      5,
      'not_started',
    ],
    [
      'std_move_in_out',
      g5,
      ld('Move-in and move-out standard', 'معيار الانتقال والإخلاء'),
      ld('Assets leasing lead with Legal', 'قائد التأجير في أسيتس مع القانونية'),
      ld('Survey, signals (deposit disputes), shopper', 'الاستبيان، الإشارات، المتسوق'),
      ld('Assets only', 'أسيتس فقط'),
      5,
      'not_started',
    ],
    [
      'std_renewal',
      g5,
      ld('Renewal standard', 'معيار التجديد'),
      ld('Assets leasing lead with CX', 'قائد التأجير في أسيتس مع تجربة العملاء'),
      ld('Runaway (did not renew), journey, survey', 'العملاء الهاربون، الرحلة، الاستبيان'),
      ld('Assets only', 'أسيتس فقط'),
      3,
      'not_started',
    ],
    [
      'std_payment_statement',
      g5,
      ld('Payment and statement standard', 'معيار الدفع وكشف الحساب'),
      ld('Finance with After-Sales and Assets', 'المالية مع ما بعد البيع وأسيتس'),
      ld('Signals, survey', 'الإشارات، الاستبيان'),
      ld('Both, with product sections', 'كلاهما'),
      5,
      'not_started',
    ],
    [
      'std_offplan_updates',
      g5,
      ld('Off-plan construction updates', 'تحديثات البناء على الخارطة'),
      ld('After-Sales lead with the product owner', 'قائد ما بعد البيع مع مالك المنتج'),
      ld('Survey (confidence), signals, journey', 'الاستبيان، الإشارات، الرحلة'),
      ld('After-Sales only', 'ما بعد البيع فقط'),
      5,
      'not_started',
    ],

    [
      'std_lead_followup',
      g6,
      ld('Lead follow-up standard', 'معيار متابعة العميل المحتمل'),
      ld('Sales management with L&D', 'إدارة المبيعات مع التعلم والتطوير'),
      ld('Journey (silence, promise), shopper, CRM activity', 'الرحلة، المتسوق، نشاط نظام العملاء'),
      ld('Assets: shorter viewing follow-up/application chase cycle', 'أسيتس: دورة متابعة أقصر'),
      3,
      'not_started',
    ],
    [
      'std_promise_callback',
      g6,
      ld('Promise and callback standard', 'معيار الوعد والاتصال التالي'),
      ld('L&D with the CRM owner', 'التعلم والتطوير مع مالك نظام العملاء'),
      ld('Journey (promise not kept), signals, shopper', 'الرحلة، الإشارات، المتسوق'),
      undefined,
      2,
      'not_started',
    ],
    [
      'std_ownership_handoff',
      g6,
      ld('Customer ownership and hand-off', 'ملكية العميل والتسليم بين الفرق'),
      ld('CX with the environment managers', 'تجربة العملاء مع مديري البيئات'),
      ld('Journey (hand-off), runaway (dormant owner)', 'الرحلة، العملاء الهاربون'),
      ld('Assets and After-Sales share owners for tenant-owners', 'أسيتس وما بعد البيع يتشاركان الملاك'),
      3,
      'not_started',
    ],
    [
      'std_conduct',
      g6,
      ld('Conduct standard', 'معيار السلوك'),
      ld('HR with L&D', 'الموارد البشرية مع التعلم والتطوير'),
      ld('Shopper (critical conduct), signals (attitude), HR pool', 'المتسوق، الإشارات، مجموعة الموارد البشرية'),
      ld('None: a group rule', 'لا يوجد: قاعدة جماعية'),
      5,
      'not_started',
    ],
    [
      'std_privacy',
      g6,
      ld('Data and privacy in customer contact', 'البيانات والخصوصية في التواصل مع العميل'),
      ld('Legal with IT and L&D', 'القانونية مع تقنية المعلومات والتعلم والتطوير'),
      ld('Shopper (privacy items), signals', 'المتسوق، الإشارات'),
      ld('Assets: tenant documents', 'أسيتس: مستندات المستأجر'),
      5,
      'legal_review',
    ],
  ]

  const ldDocuments: Standard[] = ldRows.map(([id, group, title, writer, readBy, environmentVariant, priorityTier, status], i) => ({
    id,
    code: `LD-${String(i + 1).padStart(2, '0')}`,
    source: 'ld_document',
    group,
    title,
    writer,
    readBy,
    environmentVariant,
    priorityTier,
    owner: writer.en.split(' with ')[0],
    linkedItems: 0,
    status,
  }))

  return [...platformRules, ...ldDocuments]
}

function buildMsChecklists(): MsChecklist[] {
  const GREETING = 'Greeting and opening'
  const NEEDS = 'Understanding needs'
  const INFO = 'Information accuracy'
  const CLOSE = 'Closing and follow-up'
  let seq = 0
  const ci = (
    text: Bi,
    section: string,
    weight: number,
    opts: Partial<{ type: 'passfail' | 'scale' | 'text'; critical: boolean; evidence: 'none' | 'optional' | 'required' }> = {},
  ) => {
    seq++
    return {
      id: `item${seq}`,
      text,
      section,
      weight,
      type: opts.type ?? ('passfail' as const),
      critical: !!opts.critical,
      evidence: opts.evidence ?? ('none' as const),
    }
  }
  return [
    {
      id: 'cl_re_digital',
      name: { en: 'Real Estate: digital lead (WhatsApp/web/social)', ar: 'العقارات: عميل محتمل رقمي' },
      product: 're',
      channel: 'digital',
      status: 'published',
      version: 3,
      items: [
        ci({ en: 'Responded within 5 minutes', ar: 'تم الرد خلال 5 دقائق' }, GREETING, 20, { critical: true, evidence: 'required' }),
        ci({ en: 'Greeted professionally and gave their name', ar: 'رحّب باحترافية وذكر اسمه' }, GREETING, 10),
        ci({ en: 'Asked qualifying questions about budget and needs', ar: 'طرح أسئلة لتحديد الميزانية والاحتياجات' }, NEEDS, 20, { type: 'scale' }),
        ci({ en: 'Gave accurate project and pricing information', ar: 'قدّم معلومات دقيقة عن المشروع والأسعار' }, INFO, 25, { critical: true }),
        ci({ en: 'Proposed a clear next step', ar: 'اقترح خطوة تالية واضحة' }, CLOSE, 15),
        ci({ en: "Shopper's notes", ar: 'ملاحظات المتسوق' }, CLOSE, 10, { type: 'text' }),
      ],
    },
    {
      id: 'cl_re_call',
      name: { en: 'Real Estate: AI call center lead', ar: 'العقارات: عميل محتمل عبر مركز الاتصال الذكي' },
      product: 're',
      channel: 'call',
      status: 'published',
      version: 2,
      items: [
        ci({ en: 'Called within the allowed hours', ar: 'تم الاتصال ضمن الساعات المسموحة' }, GREETING, 20, { critical: true }),
        ci({ en: 'Disclosed it is an AI assistant', ar: 'أفصح أنه مساعد ذكاء اصطناعي' }, GREETING, 15, { critical: true }),
        ci({ en: 'Understood the stated need correctly', ar: 'فهم الاحتياج المذكور بشكل صحيح' }, NEEDS, 20, { type: 'scale' }),
        ci({ en: 'Handed over to a human when asked', ar: 'حوّل إلى موظف بشري عند الطلب' }, CLOSE, 25, { critical: true }),
        ci({ en: 'Call recording attached', ar: 'تم إرفاق تسجيل المكالمة' }, CLOSE, 20, { evidence: 'required' }),
      ],
    },
    {
      id: 'cl_re_branch',
      name: { en: 'Real Estate: branch / gallery visit', ar: 'العقارات: زيارة فرع / معرض' },
      product: 're',
      channel: 'branch',
      status: 'published',
      version: 4,
      items: [
        ci({ en: 'Greeted within 2 minutes of arrival', ar: 'تم الترحيب خلال دقيقتين من الوصول' }, GREETING, 15, { evidence: 'required' }),
        ci({ en: 'Gallery was staffed and tidy', ar: 'المعرض كان مجهزاً بالموظفين ومرتباً' }, GREETING, 15, { critical: true, evidence: 'required' }),
        ci({ en: 'Agent understood budget and preferences', ar: 'فهم الوكيل الميزانية والتفضيلات' }, NEEDS, 20, { type: 'scale' }),
        ci({ en: 'No unapproved discount offered', ar: 'لم يُعرض خصم غير معتمد' }, INFO, 25, { critical: true }),
        ci({ en: 'Agent followed up within 24 hours', ar: 'تابع الوكيل خلال 24 ساعة' }, CLOSE, 25),
      ],
    },
    {
      id: 'cl_af_call',
      name: { en: 'After-Sales: outbound call quality', ar: 'ما بعد البيع: جودة المكالمة الصادرة' },
      product: 'af',
      channel: 'call',
      status: 'draft',
      version: 1,
      items: [
        ci({ en: 'Called within allowed hours (09:00–20:00)', ar: 'تم الاتصال ضمن الساعات المسموحة' }, GREETING, 25, { critical: true }),
        ci({ en: 'Used the correct survey version for unit status', ar: 'استخدم نسخة الاستبيان الصحيحة' }, INFO, 35, { critical: true }),
        ci({ en: 'Tone and professionalism', ar: 'النبرة والاحترافية' }, CLOSE, 40, { type: 'scale' }),
      ],
    },
  ]
}

function buildMsScenarios(): MsScenario[] {
  return [
    {
      id: 'sc_digital_buy',
      title: { en: 'Looking to buy a 2-bedroom unit', ar: 'يبحث عن شراء وحدة غرفتي نوم' },
      tests: { en: 'Response time, qualification, pricing accuracy', ar: 'وقت الاستجابة، التأهيل، دقة الأسعار' },
    },
    {
      id: 'sc_call_general',
      title: { en: 'General project enquiry by phone', ar: 'استفسار عام عن المشروع عبر الهاتف' },
      tests: { en: 'AI disclosure, allowed hours, handover', ar: 'الإفصاح، الساعات المسموحة، التحويل' },
    },
    {
      id: 'sc_branch_walkin',
      title: { en: 'Walk-in couple comparing two projects', ar: 'زوجان يزوران المعرض لمقارنة مشروعين' },
      tests: { en: 'Staffing, greeting time, discount discipline', ar: 'التوظيف، وقت الترحيب، الانضباط في الخصومات' },
    },
  ]
}

function buildMsShoppers(): MsShopper[] {
  return [
    { id: 'sh1', name: 'Lina K.', type: 'internal', email: 'lina.k@psi.example', shopsCompleted: 14, reliability: 96, active: true },
    { id: 'sh2', name: 'Omar R.', type: 'internal', email: 'omar.r@psi.example', shopsCompleted: 9, reliability: 91, active: true },
    {
      id: 'sh3',
      name: 'Fatima S.',
      type: 'external',
      agency: 'Gulf Mystery Shoppers',
      email: 'fatima.s@gms.example',
      shopsCompleted: 22,
      reliability: 98,
      active: true,
    },
    {
      id: 'sh4',
      name: 'James T.',
      type: 'external',
      agency: 'Gulf Mystery Shoppers',
      email: 'james.t@gms.example',
      shopsCompleted: 6,
      reliability: 83,
      active: true,
    },
  ]
}

function buildMsAssignments(): MsAssignment[] {
  return [
    {
      id: 'asg1',
      checklistId: 'cl_re_digital',
      scenarioId: 'sc_digital_buy',
      shopperId: 'sh1',
      via: 'wa',
      sentAt: '2026-10-20T09:00:00',
      dueAt: '2026-10-23T18:00:00',
      status: 'approved',
      score: 88,
      criticalFails: 0,
    },
    {
      id: 'asg2',
      checklistId: 'cl_re_call',
      scenarioId: 'sc_call_general',
      shopperId: 'sh2',
      via: 'email',
      sentAt: '2026-10-21T09:00:00',
      dueAt: '2026-10-24T18:00:00',
      status: 'review',
      score: 52,
      criticalFails: 1,
    },
    {
      id: 'asg3',
      checklistId: 'cl_re_branch',
      scenarioId: 'sc_branch_walkin',
      shopperId: 'sh3',
      via: 'email',
      sentAt: '2026-10-22T09:00:00',
      dueAt: '2026-10-25T18:00:00',
      status: 'submitted',
      score: 58,
      criticalFails: 0,
    },
    {
      id: 'asg4',
      checklistId: 'cl_af_call',
      scenarioId: 'sc_call_general',
      shopperId: 'sh4',
      via: 'sms',
      sentAt: '2026-10-22T09:00:00',
      dueAt: '2026-10-26T18:00:00',
      status: 'progress',
    },
    {
      id: 'asg5',
      checklistId: 'cl_re_digital',
      scenarioId: 'sc_digital_buy',
      shopperId: 'sh2',
      via: 'wa',
      sentAt: '2026-10-23T09:00:00',
      dueAt: '2026-10-26T18:00:00',
      status: 'opened',
    },
    {
      id: 'asg6',
      checklistId: 'cl_re_branch',
      scenarioId: 'sc_branch_walkin',
      shopperId: 'sh1',
      via: 'email',
      sentAt: '2026-10-24T09:00:00',
      dueAt: '2026-10-27T18:00:00',
      status: 'sent',
    },
  ]
}

function buildVocRows(): VocRow[] {
  return [
    { product: 're', channel: 'digital', n: 420, promoters: 210, passives: 126, detractors: 84, csat: 78 },
    { product: 're', channel: 'call', n: 310, promoters: 140, passives: 93, detractors: 77, csat: 71 },
    { product: 're', channel: 'app', n: 260, promoters: 145, passives: 68, detractors: 47, csat: 80 },
    { product: 'af', channel: 'call', n: 540, promoters: 216, passives: 183, detractors: 141, csat: 68 },
    { product: 'af', channel: 'digital', n: 180, promoters: 90, passives: 54, detractors: 36, csat: 74 },
    { product: 'cl', channel: 'digital', n: 60, promoters: 39, passives: 15, detractors: 6, csat: 86 },
    { product: 'to', channel: 'app', n: 95, promoters: 57, passives: 28, detractors: 10, csat: 83 },
    { product: 'ev', channel: 'event', n: 70, promoters: 38, passives: 22, detractors: 10, csat: 77 },
  ]
}

function buildVocComments(): VocComment[] {
  return [
    {
      product: 're',
      channel: 'app',
      sentiment: 'positive',
      theme: { en: 'Agent responsiveness', ar: 'استجابة الوكيل' },
      text: { en: 'The agent answered every question within minutes, very impressed.', ar: 'أجاب الوكيل على كل الأسئلة خلال دقائق، انطباع رائع.' },
    },
    {
      product: 're',
      channel: 'branch',
      sentiment: 'negative',
      theme: { en: 'Staffing', ar: 'التوظيف' },
      text: { en: 'No one at the gallery desk for almost 10 minutes.', ar: 'لا أحد عند مكتب المعرض لمدة 10 دقائق تقريباً.' },
    },
    {
      product: 'af',
      channel: 'call',
      sentiment: 'negative',
      theme: { en: 'Handover delay', ar: 'تأخر التسليم' },
      text: { en: 'Three weeks late and nobody called to explain why.', ar: 'تأخر ثلاثة أسابيع ولم يتصل أحد لشرح السبب.' },
    },
    {
      product: 'af',
      channel: 'digital',
      sentiment: 'positive',
      theme: { en: 'Maintenance', ar: 'الصيانة' },
      text: { en: 'Maintenance request was handled the same day, thank you.', ar: 'تمت معالجة طلب الصيانة في نفس اليوم، شكراً.' },
    },
  ]
}

function buildRulesConfig(): RuleConfigItem[] {
  const bi = (en: string, ar: string): Bi => ({ en, ar })
  return [
    {
      id: 'rule_pattern_same_agent',
      area: bi('Signals & patterns', 'الإشارات والأنماط'),
      label: bi('Same-agent threshold', 'حد نفس الوكيل'),
      value: 3,
      unit: bi('occurrences', 'مرات'),
      source: 'FR-4.6',
    },
    {
      id: 'rule_pattern_same_issue',
      area: bi('Signals & patterns', 'الإشارات والأنماط'),
      label: bi('Same-issue threshold', 'حد نفس المشكلة'),
      value: 5,
      unit: bi('occurrences', 'مرات'),
      source: 'FR-4.6',
    },
    {
      id: 'rule_pattern_env_concentration',
      area: bi('Signals & patterns', 'الإشارات والأنماط'),
      label: bi('Environment-concentration threshold', 'حد تركّز البيئة'),
      value: 50,
      unit: bi('%', '%'),
      source: 'FR-4.6',
    },
    {
      id: 'rule_pattern_window',
      area: bi('Signals & patterns', 'الإشارات والأنماط'),
      label: bi('Pattern window', 'نافذة النمط'),
      value: 30,
      unit: bi('days', 'يوم'),
      source: 'FR-4.6',
    },
    {
      id: 'rule_pattern_min_sample',
      area: bi('Signals & patterns', 'الإشارات والأنماط'),
      label: bi('Minimum sample before a fix is proposed', 'الحد الأدنى للعيّنة قبل اقتراح إصلاح'),
      value: 10,
      unit: bi('records', 'سجل'),
      source: 'FR-4.16',
    },
    {
      id: 'rule_verification_days',
      area: bi('Corrective actions', 'الإجراءات التصحيحية'),
      label: bi('Effectiveness verification window', 'نافذة التحقق من الفعالية'),
      value: 60,
      unit: bi('days', 'يوم'),
      source: 'FR-4.1',
    },
    {
      id: 'rule_approval_days',
      area: bi('Corrective actions', 'الإجراءات التصحيحية'),
      label: bi('Approval and assignment window', 'نافذة الاعتماد والإسناد'),
      value: 5,
      unit: bi('working days', 'يوم عمل'),
      source: 'FR-4.1',
    },
    {
      id: 'rule_shopper_respond',
      area: bi('Shopper cases', 'حالات المتسوق'),
      label: bi('Critical case respond clock', 'ساعة الرد على الحالة الحرجة'),
      value: 1,
      unit: bi('working day', 'يوم عمل'),
      source: 'FR-4.14',
    },
    {
      id: 'rule_shopper_resolve',
      area: bi('Shopper cases', 'حالات المتسوق'),
      label: bi('Critical case resolve clock', 'ساعة حل الحالة الحرجة'),
      value: 5,
      unit: bi('working days', 'يوم عمل'),
      source: 'FR-4.14',
    },
    {
      id: 'rule_shopper_floor',
      area: bi('Shopper cases', 'حالات المتسوق'),
      label: bi('Visit-score severity floor', 'حد الخطورة لنتيجة الزيارة'),
      value: 60,
      unit: bi('%', '%'),
      source: 'FR-4.14',
    },
    {
      id: 'rule_resurvey_min',
      area: bi('Close the loop', 'إغلاق الحلقة'),
      label: bi('Re-survey window (min)', 'نافذة إعادة الاستبيان (الأدنى)'),
      value: 7,
      unit: bi('days', 'يوم'),
      source: 'FR-5.4',
    },
    {
      id: 'rule_resurvey_max',
      area: bi('Close the loop', 'إغلاق الحلقة'),
      label: bi('Re-survey window (max)', 'نافذة إعادة الاستبيان (الأقصى)'),
      value: 14,
      unit: bi('days', 'يوم'),
      source: 'FR-5.4',
    },
    {
      id: 'rule_recovered_days',
      area: bi('Close the loop', 'إغلاق الحلقة'),
      label: bi('"Recovered" window', 'نافذة "تعافى"'),
      value: 60,
      unit: bi('days', 'يوم'),
      source: 'FR-5.5',
    },
    {
      id: 'rule_silence_lead',
      area: bi('Runaway customers', 'العملاء الهاربون'),
      label: bi('Silent-lead threshold', 'حد العميل المحتمل الصامت'),
      value: 30,
      unit: bi('days', 'يوم'),
      source: 'FR-3.1',
    },
    {
      id: 'rule_silence_owner',
      area: bi('Runaway customers', 'العملاء الهاربون'),
      label: bi('Dormant-owner threshold', 'حد المالك الخامل'),
      value: 12,
      unit: bi('months', 'شهر'),
      source: 'FR-3.1',
    },
    {
      id: 'rule_public_reply',
      area: bi('Signals & patterns', 'الإشارات والأنماط'),
      label: bi('Public comment reply SLA (CX team); past it, escalated to the CX manager', 'مهلة الرد على التعليق العام (فريق CX)؛ بعدها يُصعَّد لمدير CX'),
      value: 48,
      unit: bi('hours', 'ساعة'),
      source: 'FR-4.8',
    },
    {
      id: 'rule_public_reminder',
      area: bi('Signals & patterns', 'الإشارات والأنماط'),
      label: bi('Public comment: remind the CX team member after', 'التعليق العام: تذكير موظف فريق CX بعد'),
      value: 24,
      unit: bi('hours', 'ساعة'),
      source: 'Owner 23 Nov',
    },
    {
      id: 'rule_survey_nps_cap',
      area: bi('Surveys and triggers', 'الاستبيانات والمحفزات'),
      label: bi('NPS cap', 'حد مؤشر NPS'),
      value: 90,
      unit: bi('days', 'يوم'),
      source: 'FR-7.2',
    },
    {
      id: 'rule_survey_csat_cap',
      area: bi('Surveys and triggers', 'الاستبيانات والمحفزات'),
      label: bi('CSAT+CES cap', 'حد CSAT+CES'),
      value: 30,
      unit: bi('days', 'يوم'),
      source: 'FR-7.2',
    },
    // The remaining values of the five decisions (Modules KB §12).
    {
      id: 'rule_legal_once',
      area: bi('Signals & patterns', 'الإشارات والأنماط'),
      label: bi('Legal, privacy and safety: occurrences before a case', 'القانوني والخصوصية والسلامة: عدد المرات قبل فتح حالة'),
      value: 1,
      unit: bi('occurrence', 'مرة'),
      source: 'KB §12 D1',
    },
    {
      id: 'rule_effective_drop',
      area: bi('Corrective actions', 'الإجراءات التصحيحية'),
      label: bi('Effective when the signals drop by', 'فعّال عندما تنخفض الإشارات بنسبة'),
      value: 50,
      unit: bi('%', '%'),
      source: 'KB §12 D3',
    },
    {
      id: 'rule_effective_hold',
      area: bi('Corrective actions', 'الإجراءات التصحيحية'),
      label: bi('… and do not return for', '… ولا تعود خلال'),
      value: 90,
      unit: bi('days', 'يوم'),
      source: 'KB §12 D3',
    },
    {
      id: 'rule_calls_per_hour',
      area: bi('Close the loop', 'إغلاق الحلقة'),
      label: bi('Calls per hour in the capacity formula', 'المكالمات في الساعة في معادلة السعة'),
      value: 4,
      unit: bi('calls', 'مكالمات'),
      source: 'KB §12 D3',
    },
    // v40 (decided 18 Nov): the working week, the working day, the calling rules and the AI-campaign hand-off are settings, not constants.
    {
      id: RULE_IDS.workingDays,
      area: bi('Close the loop', 'إغلاق الحلقة'),
      label: bi('Working days per week (Monday to Friday)', 'أيام العمل في الأسبوع (من الإثنين إلى الجمعة)'),
      value: MON_FRI.length,
      days: [...MON_FRI],
      unit: bi('days', 'أيام'),
      source: 'Decisions 18 Nov, 1',
    },
    {
      id: RULE_IDS.workStart,
      area: bi('Corrective actions', 'الإجراءات التصحيحية'),
      label: bi('Working day starts (hour, working hours clock)', 'بداية يوم العمل (الساعة، ساعة العمل)'),
      value: 9,
      unit: bi('o’clock', 'الساعة'),
      source: 'KB 09:00 to 18:00',
    },
    {
      id: RULE_IDS.workEnd,
      area: bi('Corrective actions', 'الإجراءات التصحيحية'),
      label: bi('Working day ends (hour, working hours clock)', 'نهاية يوم العمل (الساعة، ساعة العمل)'),
      value: 18,
      unit: bi('o’clock', 'الساعة'),
      source: 'KB 09:00 to 18:00',
    },
    {
      id: RULE_IDS.fixFallbackDays,
      area: bi('Corrective actions', 'الإجراءات التصحيحية'),
      label: bi('Fix due date when the matrix cell is empty', 'موعد الحل عندما تكون خلية المصفوفة فارغة'),
      value: 14,
      unit: bi('days', 'يوم'),
      source: 'Decisions 18 Nov, 3',
    },
    {
      id: RULE_IDS.callFrom,
      area: bi('Close the loop', 'إغلاق الحلقة'),
      label: bi('Calling hours start (hour of day, UAE time)', 'بداية ساعات الاتصال (الساعة، توقيت الإمارات)'),
      value: 9,
      unit: bi('o’clock', 'الساعة'),
      source: 'Decisions 18 Nov, 5',
      note: { en: 'Legal to confirm the hours', ar: 'القانونية تؤكد الساعات' },
    },
    {
      id: RULE_IDS.callTo,
      area: bi('Close the loop', 'إغلاق الحلقة'),
      label: bi('Calling hours end (hour of day, UAE time)', 'نهاية ساعات الاتصال (الساعة، توقيت الإمارات)'),
      value: 18,
      unit: bi('o’clock', 'الساعة'),
      source: 'Decisions 18 Nov, 5',
      note: { en: 'Legal to confirm the hours', ar: 'القانونية تؤكد الساعات' },
    },
    {
      id: RULE_IDS.callTries,
      area: bi('Close the loop', 'إغلاق الحلقة'),
      label: bi('Call attempts before "needs a human" (CX team list)', 'محاولات الاتصال قبل "يحتاج إنساناً" (قائمة فريق CX)'),
      value: 3,
      unit: bi('attempts', 'محاولات'),
      source: 'Decisions 18 Nov, 5',
    },
    {
      id: RULE_IDS.aiNoAnswers,
      area: bi('Close the loop', 'إغلاق الحلقة'),
      label: bi('No-answers before an AI campaign hands over to a person', 'عدد عدم الرد قبل أن تسلّم حملة الذكاء الاصطناعي لشخص'),
      value: 2,
      unit: bi('no-answers', 'مرات عدم رد'),
      source: 'Decisions 18 Nov, 5',
    },
    {
      id: 'rule_silence_why',
      area: bi('Surveys and triggers', 'الاستبيانات والمحفزات'),
      label: bi('"What stopped you?" after silence of', '"ما الذي أوقفك؟" بعد صمت لمدة'),
      value: 14,
      unit: bi('days', 'يوم'),
      source: 'KB §12 D5',
    },
  ]
}

const AI_ACCESS_ROLE_ORDER: RoleId[] = ['cxmgr', 'cxteam', 'envmgmt', 'teamlead', 'aslead', 'ld', 'hrspec', 'hrmgr', 'marketing', 'auditmkt', 'exec', 'shopper']

function aiAccessRow(group: Bi, label: Bi, symbols: string): AiAccessRow {
  const chars = symbols.trim().split(/\s+/)
  const map: Record<string, Access> = { '●': 'full', '◐': 'own', '○': 'view', '✉': 'informed', '✔': 'approve', '–': 'none' }
  const values = {} as Record<RoleId, Access>
  AI_ACCESS_ROLE_ORDER.forEach((id, i) => {
    values[id] = map[chars[i]] ?? 'none'
  })
  return { group, label, values }
}

/** The CX manager's editable role×capability grid (USER_ROLES_AND_PERMISSIONS.md
 * §"AI Insights access matrix"), rebuilt for the 12 v38 roles — not the old
 * scaffold's 12-role set, which `data/legacyReference.ts` keeps separately. */
function buildAiAccessMatrix(): AiAccessRow[] {
  const DASH: Bi = { en: 'Dashboards and insights', ar: 'لوحات المعلومات والرؤى' }
  const CASE: Bi = { en: 'Cases and actions', ar: 'الحالات والإجراءات' }
  const NAME: Bi = { en: 'Names and text', ar: 'الأسماء والنصوص' }
  return [
    aiAccessRow(DASH, { en: 'Home, Customers, Runaway', ar: 'الرئيسية، العملاء، الهاربون' }, '● ● ◐ ○ ○ ○ – ✉ ◐ ○ ○ –'),
    aiAccessRow(DASH, { en: 'Personas and campaigns', ar: 'الشخصيات والحملات' }, '● ● – – – – – – ◐ ○ ○ –'),
    aiAccessRow(DASH, { en: 'Intelligent CX team', ar: 'فريق تجربة العملاء الذكي' }, '● ● – – – – – – – ○ – –'),
    aiAccessRow(CASE, { en: 'Corrective actions: act', ar: 'الإجراءات التصحيحية: تصرف' }, '● ● ◐ ◐ ◐ – ◐ – – – – –'),
    aiAccessRow(CASE, { en: 'Corrective actions: approve', ar: 'الإجراءات التصحيحية: اعتماد' }, '✔ – – – – – – – – – – –'),
    aiAccessRow(CASE, { en: 'Shopper cases', ar: 'حالات المتسوق' }, '● ● ◐ ◐ ◐ – ◐ – – – – ◐'),
    aiAccessRow(NAME, { en: 'See conversation text', ar: 'رؤية نص المحادثة' }, '● ● – – – – – – – – – –'),
    aiAccessRow(NAME, { en: 'See agent names', ar: 'رؤية أسماء الوكلاء' }, '● ● ● ● ● – – – – – – –'),
  ]
}

function buildLdRequests(): LdRequest[] {
  return [
    {
      id: 'ldreq-1',
      title: { en: 'Refresher: accurate information standard', ar: 'تدريب تنشيطي: معيار دقة المعلومات' },
      requestedBy: 'Environment manager, Dubai',
      environment: 'Dubai',
      status: 'scheduled',
      linkedStandardId: 'std_accurate_info',
    },
    {
      id: 'ldreq-2',
      title: { en: 'New-hire induction: communication standard', ar: 'تهيئة الموظف الجديد: معيار التواصل' },
      requestedBy: 'After-Sales lead',
      status: 'requested',
      linkedStandardId: 'std_communication',
    },
    {
      id: 'ldreq-3',
      title: { en: 'Coaching: reply-time breaches, digital channel', ar: 'تدريب: تجاوزات زمن الرد في القناة الرقمية' },
      requestedBy: 'CX team',
      environment: 'Abu Dhabi',
      status: 'delivered',
      linkedStandardId: 'std_reply_time',
    },
  ]
}

function buildHrPool(): HrPoolMember[] {
  return [
    { title: 'HR specialist 1', email: 'hr1@psi.example', mobile: '+971507000001', assignedCases: 4, lateCases: 0 },
    { title: 'HR specialist 2', email: 'hr2@psi.example', mobile: '+971507000002', assignedCases: 2, lateCases: 1 },
  ]
}

// --- Built once at module load (seeded, deterministic for this session) ----
export const MOCK_PERSONS = buildPersons(30)
export const MOCK_AGENT_DIRECTORY = buildAgentDirectory()
export const MOCK_INTERACTIONS = buildInteractions(MOCK_PERSONS, 120)
export const MOCK_EFFORT_SUMMARIES = buildEffortSummaries(MOCK_PERSONS, MOCK_INTERACTIONS)
export const MOCK_SIGNALS = buildSignals(MOCK_INTERACTIONS)
export const MOCK_PATTERNS = detectPatterns(MOCK_SIGNALS, { windowDays: PATTERN_RULES.windowDays })
export const MOCK_CORRECTIVE_ACTIONS = buildCorrectiveActions(MOCK_PATTERNS, MOCK_SIGNALS)
tagVipOnFirstFix(MOCK_PERSONS, MOCK_SIGNALS, MOCK_PATTERNS, MOCK_CORRECTIVE_ACTIONS)
export const MOCK_CORRECTIVE_RATIONALES = buildCorrectiveRationales(MOCK_CORRECTIVE_ACTIONS, MOCK_PATTERNS)
// 24 Nov (owner): hand-written sample cases with the visit and real proposed actions. The old generator still runs so the seeded
// random sequence (and every list built after it) stays the same.
void buildShopperCases()
export const MOCK_SHOPPER_CASES = loadShopperCases()
export const MOCK_AI_INSIGHTS = buildAiInsightEnvelopes(MOCK_SHOPPER_CASES)
export const MOCK_INVESTIGATIONS = buildInvestigations(MOCK_PATTERNS)
export const MOCK_HANDOFFS = buildHandoffs(MOCK_PERSONS)
export const MOCK_DETRACTOR_CALL_ITEMS = buildDetractorCallItems(MOCK_PERSONS)
export const MOCK_PERSONAS = buildPersonas()
export const MOCK_CAMPAIGN_RECOMMENDATIONS = buildCampaignRecommendations(MOCK_PERSONAS)
export const MOCK_SURVEY_TRIGGERS = SURVEY_TRIGGERS
export const MOCK_LEAD_FUNNEL = buildLeadFunnel()
export const MOCK_PRODUCT_SURVEY_MOMENTS = buildProductSurveyMoments()
export const MOCK_AI_JOURNEY_READINGS = buildAiJourneyReadings(MOCK_PERSONS, MOCK_INTERACTIONS, MOCK_EFFORT_SUMMARIES)
export const MOCK_AI_CAMPAIGNS = buildAiCampaigns(MOCK_DETRACTOR_CALL_ITEMS)
export const MOCK_WEEKLY_SAMPLE = buildWeeklySample({
  fixes: MOCK_CORRECTIVE_ACTIONS,
  signals: MOCK_SIGNALS,
  patterns: MOCK_PATTERNS,
  loopItems: MOCK_DETRACTOR_CALL_ITEMS,
  persons: MOCK_PERSONS,
  readings: MOCK_AI_JOURNEY_READINGS,
  interactions: MOCK_INTERACTIONS,
  matrix: MOCK_MATRIX,
  personas: MOCK_PERSONAS,
})
export const MOCK_WEEKLY_SAMPLE_SIZE = WEEKLY_SAMPLE_SIZE
/** Tests the supervisor gained from "wrong" verdicts on the weekly sample (decided 18 Nov). Filled by `useJudgeSample`. */
export const MOCK_SUPERVISOR_TESTS: SupervisorTest[] = []
export const MOCK_AGENT_ACTIVITY = buildAgentActivity(
  MOCK_INTERACTIONS,
  MOCK_SIGNALS,
  MOCK_PATTERNS,
  MOCK_CORRECTIVE_ACTIONS,
  MOCK_CORRECTIVE_RATIONALES,
  MOCK_AI_JOURNEY_READINGS,
  MOCK_AI_CAMPAIGNS,
  MOCK_DETRACTOR_CALL_ITEMS,
  MOCK_SURVEY_TRIGGERS,
)

// --- Settings and reference exports -----------------------------------------
export const MOCK_STANDARDS = buildStandards()
export const MOCK_MS_CHECKLISTS = buildMsChecklists()
export const MOCK_MS_SCENARIOS = buildMsScenarios()
export const MOCK_MS_SHOPPERS = buildMsShoppers()
export const MOCK_MS_ASSIGNMENTS = buildMsAssignments()
export const MOCK_VOC_ROWS = buildVocRows()
export const MOCK_VOC_COMMENTS = buildVocComments()
export const MOCK_RULES_CONFIG = buildRulesConfig()
export const MOCK_AI_ACCESS_MATRIX = buildAiAccessMatrix()
export const MOCK_LD_REQUESTS = buildLdRequests()
export const MOCK_HR_POOL = buildHrPool()
export const MOCK_GLOSSARY_TERMS: GlossaryTerm[] = GLOSSARY_TERMS
