import type {
  Access,
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
  PatternThresholdKind,
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
import { daysAgoIso, intBetween, pick, seededRandom } from '../utils/random'
import { classifyRunaway } from '../utils/runaway'
import { GLOSSARY_TERMS } from '../data/glossary'

/** Sample data only, matching the scale the source documents use throughout
 * (~30 people, ~120 interactions) — never a real PSI number
 * (PROJECT_ANALYSIS.md §1, "all figures and names ... are sample data"). */
const SEED = 20261117
const rng = seededRandom(SEED)

const ENVIRONMENTS = ['Dubai', 'Abu Dhabi', 'Amman', 'Sharjah']
const CHANNELS: ChannelId[] = ['website', 'app', 'whatsapp', 'call', 'branch', 'email']
const FIRST_NAMES = ['Sara', 'Omar', 'Lina', 'Khaled', 'Maya', 'Yousef', 'Rana', 'Tariq', 'Dana', 'Fadi', 'Noura', 'Hassan', 'Aisha', 'Zaid', 'Lara']
const LAST_NAMES = ['Haddad', 'Khoury', 'Saleh', 'Nasser', 'Qasim', 'Hamad', 'Farouk', 'Aziz']

function buildPersons(count: number): Person[] {
  return Array.from({ length: count }, (_, i) => {
    const products: ProductId[] = [pick(rng, ['re', 'af', 'cl', 'to', 'ev', 'wl'] as ProductId[])]
    return {
      id: `p-${String(i + 1).padStart(3, '0')}`,
      identity: {
        mobile: `+9715${intBetween(rng, 10000000, 99999999)}`,
        email: `sample.contact${i + 1}@example.test`,
        crmContactId: `crm-${1000 + i}`,
      },
      type: rng() > 0.35 ? 'customer' : 'lead',
      name: `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`,
      environment: pick(rng, ENVIRONMENTS),
      products,
      unitsOrDeals: intBetween(rng, 0, 3),
      preferredChannel: pick(rng, CHANNELS),
      language: rng() > 0.5 ? 'en' : 'ar',
      vip: rng() > 0.85,
      createdAt: daysAgoIso(rng, 540),
    }
  })
}

/** 12 agents across the two live products — role-gated name resolution
 * (NFR-2): visible to CX plus the agent's own line management only. */
function buildAgentDirectory(): AgentDirectoryEntry[] {
  return Array.from({ length: 12 }, (_, i) => {
    const isAfterSales = i >= 8
    const visibleTo: RoleId[] = isAfterSales
      ? ['cxmgr', 'cxteam', 'aslead']
      : ['cxmgr', 'cxteam', 'envmgmt', 'teamlead']
    return {
      agentRef: `agent-${i + 1}`,
      displayName: `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`,
      directManagerTitle: isAfterSales ? 'After-Sales team lead' : 'Sales team lead',
      visibleTo,
    }
  })
}

const PROBLEM_FLAGS: ProblemFlag[] = ['promise_not_kept', 'forced_channel_switch', 'repeat_contact', 'slow_reply', 'wrong_language', 'hand_off', 'silence', 'detractor']

function buildInteractions(persons: Person[], total: number): Interaction[] {
  const out: Interaction[] = []
  for (let i = 0; i < total; i++) {
    const person = pick(rng, persons)
    const hasProblem = rng() > 0.72
    const channel = pick(rng, CHANNELS)
    out.push({
      id: `i-${String(i + 1).padStart(4, '0')}`,
      personKey: person.id,
      sourceRef: `src-${1000 + i}`,
      channel,
      direction: rng() > 0.5 ? 'inbound' : 'outbound',
      occurredAt: daysAgoIso(rng, 180),
      product: person.products[0],
      environment: person.environment,
      agentRef: `agent-${intBetween(rng, 1, 12)}`,
      language: person.language,
      score: rng() > 0.5 ? intBetween(rng, 0, 10) : undefined,
      // FR-2.9 — agent calls are never recorded: a call event carries only
      // fact/time/reason/result, never a transcript, even in the mock data.
      text: hasProblem && channel !== 'call' ? 'Sample conversation note — visible to CX team and CX manager only.' : undefined,
      promiseKept: hasProblem ? rng() > 0.6 : undefined,
      problemFlags: hasProblem ? [pick(rng, PROBLEM_FLAGS)] : [],
    })
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

const SIGNAL_CATEGORIES = ['slow_response', 'unapproved_discount', 'wrong_language', 'repeat_contact', 'promise_not_kept']

function buildSignals(interactions: Interaction[]): Signal[] {
  return interactions
    .filter((i) => i.problemFlags.length > 0)
    .map((i, idx) => ({
      id: `sig-${String(idx + 1).padStart(4, '0')}`,
      kind: rng() > 0.8 ? 'public_mention' : 'complaint',
      personId: rng() > 0.1 ? i.personKey : undefined,
      product: i.product,
      environment: i.environment,
      category: pick(rng, SIGNAL_CATEGORIES),
      occurredAt: i.occurredAt,
      agentRef: i.agentRef,
      isPublic: rng() > 0.85,
      publicReplyDueAt: rng() > 0.85 ? daysAgoIso(rng, -2) : undefined,
    }))
}

const CORRECTIVE_KINDS: CorrectiveActionKind[] = ['employee', 'service_behaviour', 'training_gap', 'product_app', 'process', 'environment', 'legal_privacy', 'marketing']
const MINIMUM_SAMPLE = 10

function recoverySentence(tried: number, recovered: number): { en: string; ar: string } {
  const pct = Math.round((recovered / tried) * 100)
  return {
    en: `Tried in ${tried} similar closed cases, recovered in ${recovered}, ${recovered} of ${tried} is ${pct}%.`,
    ar: `جُرّب في ${tried} حالة مشابهة مغلقة، وتعافت ${recovered} منها، أي ${pct}%.`,
  }
}

/** FR-4.6 — three independent threshold rules, each producing its own
 * patterns: same agent x3+, same issue x5+ (30-day window), or a single
 * environment carrying >=50% of a category's signals with sample >=10. */
function buildPatterns(signals: Signal[]): Pattern[] {
  const patterns: Pattern[] = []
  let n = 0

  const byCategory = new Map<string, Signal[]>()
  for (const s of signals) {
    const list = byCategory.get(s.category) ?? []
    list.push(s)
    byCategory.set(s.category, list)
  }
  for (const [category, list] of byCategory) {
    if (list.length < 5) continue
    n += 1
    patterns.push({
      id: `pat-${n}`,
      signalIds: list.map((s) => s.id),
      team: `${list[0].environment} team`,
      category,
      windowDays: 30,
      sampleSize: list.length,
      thresholdKind: 'same_issue' as PatternThresholdKind,
      thresholdTarget: 5,
      currentValue: list.length,
      hasMinimumSample: list.length >= MINIMUM_SAMPLE,
      aiSuggestion: { en: `Review ${category.replace(/_/g, ' ')} handling for this team.`, ar: 'مراجعة طريقة التعامل مع هذا النمط لهذا الفريق.' },
      recoveryFigure: recoverySentence(list.length + 4, list.length),
    })
  }

  const byAgent = new Map<string, Signal[]>()
  for (const s of signals) {
    if (!s.agentRef) continue
    const list = byAgent.get(s.agentRef) ?? []
    list.push(s)
    byAgent.set(s.agentRef, list)
  }
  for (const [agentRef, list] of byAgent) {
    if (list.length < 3) continue
    n += 1
    patterns.push({
      id: `pat-${n}`,
      signalIds: list.map((s) => s.id),
      team: `${list[0].environment} team`,
      category: list[0].category,
      windowDays: 30,
      sampleSize: list.length,
      thresholdKind: 'same_agent' as PatternThresholdKind,
      thresholdTarget: 3,
      currentValue: list.length,
      agentRef,
      hasMinimumSample: list.length >= MINIMUM_SAMPLE,
      aiSuggestion: { en: 'Coach this agent on the repeated issue before it becomes a team-wide pattern.', ar: 'تدريب هذا الوكيل على المشكلة المتكررة قبل أن تتحول لنمط عام للفريق.' },
      recoveryFigure: recoverySentence(list.length + 6, Math.max(1, list.length - 1)),
    })
  }

  const byEnvironmentWithinCategory = new Map<string, Map<string, Signal[]>>()
  for (const s of signals) {
    const byEnv = byEnvironmentWithinCategory.get(s.category) ?? new Map<string, Signal[]>()
    const list = byEnv.get(s.environment) ?? []
    list.push(s)
    byEnv.set(s.environment, list)
    byEnvironmentWithinCategory.set(s.category, byEnv)
  }
  for (const [category, byEnv] of byEnvironmentWithinCategory) {
    const totalForCategory = [...byEnv.values()].reduce((sum, l) => sum + l.length, 0)
    if (totalForCategory < MINIMUM_SAMPLE) continue
    for (const [environment, list] of byEnv) {
      const pct = (list.length / totalForCategory) * 100
      if (pct < 50) continue
      n += 1
      patterns.push({
        id: `pat-${n}`,
        signalIds: list.map((s) => s.id),
        team: `${environment} team`,
        category,
        windowDays: 30,
        sampleSize: totalForCategory,
        thresholdKind: 'environment_concentration' as PatternThresholdKind,
        thresholdTarget: 50,
        currentValue: Math.round(pct),
        hasMinimumSample: true,
        aiSuggestion: { en: `${environment} carries most of this category's signals — look at local process or environment causes first.`, ar: `بيئة ${environment} تحمل معظم إشارات هذه الفئة — راجع العملية المحلية أو أسباب البيئة أولاً.` },
        recoveryFigure: recoverySentence(totalForCategory + 3, list.length),
      })
    }
  }

  return patterns
}

function buildCorrectiveActions(patterns: Pattern[]): CorrectiveAction[] {
  const eligible = patterns.filter((p) => p.hasMinimumSample)
  return eligible.map((p, idx) => {
    const status = pick(rng, ['proposed', 'approved', 'in_progress', 'verification', 'effective', 'partial', 'failed'] as const)
    const startedMonthIndex = 3
    const monthlySignalSeries = Array.from({ length: 6 }, (_, m) => {
      const base = intBetween(rng, 3, 9)
      return m < startedMonthIndex ? base : Math.max(0, base - (status === 'effective' ? intBetween(rng, 3, 5) : status === 'partial' ? intBetween(rng, 1, 2) : 0))
    })
    const decisionRoll = rng()
    const decision = decisionRoll > 0.75 ? 'modified' : decisionRoll > 0.65 ? 'rejected' : undefined
    return {
      id: `ca-${idx + 1}`,
      kind: p.thresholdKind === 'same_agent' ? pick(rng, ['employee', 'training_gap'] as const) : pick(rng, CORRECTIVE_KINDS),
      patternId: p.id,
      title: { en: `Address ${p.category.replace(/_/g, ' ')} in ${p.team}`, ar: 'معالجة النمط المرصود لهذا الفريق' },
      owner: p.team.includes('team') ? `${p.team.replace(' team', '')} environment manager` : 'Environment manager',
      dueDate: daysAgoIso(rng, -14),
      status,
      ...(decision ? { decision, decisionReason: { en: 'Scope narrowed to the current quarter.', ar: 'تم تضييق النطاق للربع الحالي.' } } : {}),
      verificationDueAt: daysAgoIso(rng, -60),
      verificationResult: status === 'effective' || status === 'partial' || status === 'failed' ? status : undefined,
      monthlySignalSeries,
      startedMonthIndex,
    }
  })
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
        whyThisTeam: { en: `${pattern?.sampleSize ?? 0} signals in this category trace back to this team within the last ${pattern?.windowDays ?? 30} days.`, ar: `${pattern?.sampleSize ?? 0} إشارة من هذه الفئة تعود لهذا الفريق خلال ${pattern?.windowDays ?? 30} يوماً.` },
        whatAiDidNotDo: { en: 'Did not contact the customer, did not change any system record, did not assign blame to a named individual.', ar: 'لم يتم التواصل مع العميل، ولم يُغيَّر أي سجل في النظام، ولم تُنسب المسؤولية لشخص بعينه.' },
      },
      evidence: (pattern?.signalIds ?? []).slice(0, 5).map((sid, i) => ({ sourceType: 'signal', sourceId: sid, occurredAt: daysAgoIso(rng, 30), summary: { en: `Signal #${i + 1} in the pattern window.`, ar: `إشارة رقم ${i + 1} ضمن نافذة النمط.` } })),
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
  return Array.from({ length: 6 }, (_, i) => {
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
      environment: pick(rng, ENVIRONMENTS),
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
  })
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
      resultSummary: status === 'returned' ? { en: 'Evidence returned: root cause confirmed, ready to propose an action.', ar: 'عادت الأدلة: تم تأكيد السبب الجذري، جاهز لاقتراح إجراء.' } : undefined,
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
 * kept visibly separate from Signals (FR-4.13). FR-4.12: "send to a case"
 * only when a shopper case shares this insight's category. */
function buildAiInsightEnvelopes(shopperCases: ShopperCase[]): AgentOutputEnvelope<AiInsightPayload>[] {
  return SHOPPER_CHECKLIST_CATEGORIES.map((category, idx) => {
    const environment = pick(rng, ENVIRONMENTS)
    const sampleSize = intBetween(rng, 4, 22)
    const recovered = Math.max(1, Math.round(sampleSize * (0.5 + rng() * 0.3)))
    const matchingCase = shopperCases.find((c) => c.category === category && c.status !== 'closed')
    return {
      agentId: 'agent-4-ai-insights',
      runId: `run-insight-${idx + 1}`,
      subjectType: 'ai_insight',
      subjectId: `insight-${category}`,
      payload: {
        category,
        environment,
        serviceTimeBand: pick(rng, AI_INSIGHT_SERVICE_BANDS),
        recoveryFigure: recoverySentence(sampleSize, recovered),
        sampleSize,
        chartSeries: [
          { label: 'Low score', value: sampleSize - recovered },
          { label: 'Recovered after action', value: recovered },
        ],
        sendToCaseEligibleCaseId: matchingCase?.id,
      },
      evidence: [{ sourceType: 'survey_response', sourceId: `svy-${idx + 1}`, occurredAt: daysAgoIso(rng, 30), summary: { en: `Scored record below threshold for ${category.replace(/_/g, ' ')}.`, ar: 'سجل مُقيَّم دون الحد المطلوب.' } }],
      confidence: sampleSize >= MINIMUM_SAMPLE ? 0.74 : 0.38,
      rulesApplied: ['ai_insights.scored_record_pattern'],
      model: 'mock-agent-4',
      lang: 'en',
      supervisorVerdict: 'approved',
      createdAt: daysAgoIso(rng, 3),
    }
  })
}

function buildDetractorCallItems(persons: Person[]): DetractorCallItem[] {
  return persons.slice(0, 12).map((p, idx) => ({
    id: `dcl-${idx + 1}`,
    personId: p.id,
    product: p.products[0],
    environment: p.environment,
    severity: pick(rng, ['critical', 'medium', 'low'] as const),
    firstScore: intBetween(rng, 0, 6),
    channel: rng() > 0.5 ? 'human' : 'ai_campaign',
    outcome: pick(rng, ['reached', 'resolved_on_call', 'declined', 'callback_requested'] as const),
  }))
}

const PERSONA_SEED: Omit<Persona, 'runawayCount' | 'segmentSize'>[] = [
  { id: 'overseas_investor', name: { en: 'Overseas investor', ar: 'مستثمر مغترب' }, who: { en: 'Buys remotely, rarely visits.', ar: 'يشتري عن بعد ونادراً ما يزور.' }, mainPain: { en: 'Slow document turnaround.', ar: 'بطء إنجاز المستندات.' }, channelsUsed: ['whatsapp', 'email'], recommendation: { targetWho: { en: 'Active overseas leads', ar: 'عملاء محتملون نشطون في الخارج' }, channelAndWhen: { en: 'WhatsApp, business hours in their timezone', ar: 'واتساب، ضمن ساعات العمل بتوقيتهم' }, campaignType: { en: 'Document-progress nudge', ar: 'تذكير بتقدم المستندات' }, whatNotToDo: { en: 'Do not call unannounced.', ar: 'تجنب الاتصال دون سابق إشعار.' } }, approvedByCxManager: true },
  { id: 'first_time_expat_buyer', name: { en: 'First-time expat buyer', ar: 'مشترٍ مغترب لأول مرة' }, who: { en: 'New resident, first property purchase.', ar: 'مقيم جديد يشتري عقاره الأول.' }, mainPain: { en: 'Confused by the process.', ar: 'الارتباك من خطوات العملية.' }, channelsUsed: ['app', 'call'], recommendation: { targetWho: { en: 'New leads under 90 days', ar: 'عملاء محتملون جدد منذ أقل من 90 يوماً' }, channelAndWhen: { en: 'In-app guide at enquiry stage', ar: 'دليل داخل التطبيق عند مرحلة الاستفسار' }, campaignType: { en: 'Process walkthrough', ar: 'شرح خطوات العملية' }, whatNotToDo: { en: 'Do not skip the viewing step.', ar: 'لا تتخطَّ خطوة المعاينة.' } }, approvedByCxManager: true },
  { id: 'local_family_renter', name: { en: 'Local family renter', ar: 'عائلة مستأجرة محلية' }, who: { en: 'Renews yearly, price-sensitive.', ar: 'يجدد سنوياً وحساس تجاه السعر.' }, mainPain: { en: 'Renewal terms unclear.', ar: 'غموض شروط التجديد.' }, channelsUsed: ['call', 'branch'], recommendation: { targetWho: { en: 'Leases expiring in 60 days', ar: 'عقود تنتهي خلال 60 يوماً' }, channelAndWhen: { en: 'Call 60 days before expiry', ar: 'اتصال قبل 60 يوماً من الانتهاء' }, campaignType: { en: 'Renewal offer', ar: 'عرض تجديد' }, whatNotToDo: { en: 'Do not wait until expiry week.', ar: 'لا تنتظر أسبوع الانتهاء.' } }, approvedByCxManager: true },
  { id: 'portfolio_owner', name: { en: 'Portfolio owner', ar: 'مالك محفظة عقارية' }, who: { en: 'Owns multiple units, wants aggregated reporting.', ar: 'يملك عدة وحدات ويريد تقريراً مجمعاً.' }, mainPain: { en: 'No single view across units.', ar: 'لا توجد رؤية موحدة لجميع الوحدات.' }, channelsUsed: ['email', 'wallet'], recommendation: { targetWho: { en: 'Owners with 3+ units', ar: 'مالكون لديهم 3 وحدات أو أكثر' }, channelAndWhen: { en: 'Quarterly portfolio email', ar: 'بريد ربع سنوي عن المحفظة' }, campaignType: { en: 'Portfolio summary', ar: 'ملخص المحفظة' }, whatNotToDo: { en: 'Do not mix unit statuses in one message.', ar: 'لا تدمج حالات الوحدات في رسالة واحدة.' } }, approvedByCxManager: false, auditNote: { en: 'Segment criteria rely on PSI Wallet data that is still pilot-only — recheck segment size once Wallet exits pilot.', ar: 'معايير الشريحة تعتمد على بيانات محفظة PSI التي ما زالت تجريبية — يُعاد التحقق من حجم الشريحة بعد خروج المحفظة من مرحلة التجربة.' } },
  { id: 'comparison_shopper', name: { en: 'Comparison shopper', ar: 'متسوق مقارن' }, who: { en: 'Compares multiple developers before deciding.', ar: 'يقارن بين عدة مطورين قبل القرار.' }, mainPain: { en: 'Slow first response loses them.', ar: 'بطء الرد الأول يفقدهم.' }, channelsUsed: ['website', 'whatsapp'], recommendation: { targetWho: { en: 'New enquiries, first 24 hours', ar: 'استفسارات جديدة خلال أول 24 ساعة' }, channelAndWhen: { en: 'WhatsApp within the hour', ar: 'واتساب خلال ساعة واحدة' }, campaignType: { en: 'Fast-response offer', ar: 'عرض الرد السريع' }, whatNotToDo: { en: 'Do not let the first reply wait a day.', ar: 'لا تترك الرد الأول ليوم كامل.' } }, approvedByCxManager: true, auditNote: { en: 'Criteria checked against the lead funnel’s "why they stopped" reasons — consistent for two reviews running.', ar: 'جرى فحص المعايير مقابل أسباب "لماذا توقفوا" في قمع العملاء المحتملين — متسقة لمراجعتين متتاليتين.' } },
  { id: 'referral_driven_member', name: { en: 'Referral-driven member', ar: 'عضو عبر الإحالة' }, who: { en: 'PSI Club member who refers others.', ar: 'عضو في النادي يحيل عملاء آخرين.' }, mainPain: { en: 'Referral status is not visible to them.', ar: 'حالة الإحالة غير واضحة له.' }, channelsUsed: ['club', 'whatsapp'], recommendation: { targetWho: { en: 'Club members with 1+ referral', ar: 'أعضاء النادي الذين لديهم إحالة واحدة أو أكثر' }, channelAndWhen: { en: 'Club app notification on status change', ar: 'إشعار داخل تطبيق النادي عند تغيّر الحالة' }, campaignType: { en: 'Referral status update', ar: 'تحديث حالة الإحالة' }, whatNotToDo: { en: 'Do not go silent after the referral is made.', ar: 'لا تنقطع المتابعة بعد تقديم الإحالة.' } }, approvedByCxManager: true },
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
function buildAiJourneyReadings(persons: Person[], interactions: Interaction[], effortSummaries: EffortSummary[]): AiJourneyReading[] {
  return persons.map((p) => {
    const mine = interactions.filter((i) => i.personKey === p.id).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    const effort = effortSummaries.find((e) => e.personId === p.id)
    const classification = classifyRunaway(p, effort, mine)
    const problemEvents = mine.filter((i) => i.problemFlags.length > 0)
    const verdict: AiJourneyReading['verdict'] = classification
      ? classification.type
      : effort && effort.problemsFound >= 2
        ? 'high_effort'
        : 'healthy'
    const years = Math.max(1, Math.round((Date.now() - new Date(p.createdAt).getTime()) / (365 * 86_400_000)))
    const channelsUsed = [...new Set(mine.map((i) => i.channel))]

    return {
      personId: p.id,
      whoHowLongChannels: {
        en: `${p.type === 'customer' ? 'Customer' : 'Lead'} for about ${years} year${years === 1 ? '' : 's'}, across ${channelsUsed.length} channel${channelsUsed.length === 1 ? '' : 's'}${channelsUsed.length ? ` (${channelsUsed.slice(0, 3).join(', ')}${channelsUsed.length > 3 ? '…' : ''})` : ''}.`,
        ar: `${p.type === 'customer' ? 'عميل' : 'عميل محتمل'} منذ نحو ${years} سنة، عبر ${channelsUsed.length} قناة.`,
      },
      whatWentWrong: problemEvents.length
        ? {
            en: `${problemEvents.slice(0, 3).map((e) => `${(e.problemFlags[0] ?? '').replace(/_/g, ' ')} on ${new Date(e.occurredAt).toLocaleDateString()}`).join('; ')}.`,
            ar: 'مشاكل مسجّلة على الجدول الزمني — راجع الأحداث المظلّلة أدناه.',
          }
        : { en: 'Nothing wrong found on the timeline.', ar: 'لم يُسجَّل أي خطأ على الجدول الزمني.' },
      verdict,
      whatToDoNext: classification
        ? classification.reason
        : { en: 'No action needed — keep the current cadence.', ar: 'لا حاجة لإجراء — الاستمرار بالوتيرة الحالية.' },
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
      segmentDescription: { en: 'Medium/low-severity detractors, WhatsApp-reachable, not critical.', ar: 'منتقدون بخطورة متوسطة/منخفضة، قابلون للتواصل عبر واتساب، غير حرجين.' },
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
  { id: 'st-csat-call', product: 're', instrument: 'csat_ces', triggerDescription: { en: 'Agent call over 2 minutes, a viewing, or an offer — CSAT + CES on one screen. Inside the 30-day window the portal keeps the most important touchpoint: viewing over offer over call.', ar: 'مكالمة وكيل تتجاوز دقيقتين، أو معاينة، أو عرض — CSAT وCES على شاشة واحدة. ضمن نافذة الثلاثين يوماً يحتفظ النظام بأهم نقطة تواصل: المعاينة قبل العرض قبل المكالمة.' }, capDays: 30 },
  { id: 'st-stopped', product: 're', instrument: 'what_stopped_you', triggerDescription: { en: 'Lead silent for 14 days — "What stopped you?", once, then never again for that enquiry.', ar: 'عميل محتمل صامت لمدة 14 يوماً — "ما الذي أوقفك؟"، مرة واحدة، ثم لا يُعاد طرحه لهذا الاستفسار.' }, capDays: null },
  { id: 'st-abandoned', product: 're', instrument: 'abandoned_ces', triggerDescription: { en: 'Abandoned digital step (upload, booking, payment) — CES, identified users only, never on the public site.', ar: 'التخلي عن خطوة رقمية (رفع مستند، حجز، دفع) — CES، للمستخدمين المعرَّفين فقط، وليس على الموقع العام.' }, capDays: null },
  { id: 'st-nps-milestone', product: 're', instrument: 'nps', triggerDescription: { en: 'Deal completed, lease signed, handover done — transactional NPS, only after a completed milestone, once per 90 days per person.', ar: 'إتمام صفقة، توقيع عقد إيجار، تسليم منجز — مؤشر NPS معاملاتي، فقط بعد إتمام مرحلة رئيسية، مرة كل 90 يوماً للشخص الواحد.' }, capDays: 90 },
  { id: 'st-closed-ticket', product: 're', instrument: 'abandoned_ces', triggerDescription: { en: 'Maintenance or complaint ticket closed — CES, sent after the closure message.', ar: 'إغلاق تذكرة صيانة أو شكوى — CES، تُرسل بعد رسالة الإغلاق.' }, capDays: null },
  { id: 'st-nps-relationship', product: 're', instrument: 'nps', triggerDescription: { en: 'Owner or investor, yearly — relationship NPS, once a year, never inside the 90-day window of a transactional NPS.', ar: 'مالك أو مستثمر، سنوياً — مؤشر NPS العلائقي، مرة في السنة، وليس ضمن نافذة الـ90 يوماً لمؤشر NPS المعاملاتي.' }, capDays: 365 },
  { id: 'st-resurvey', product: 're', instrument: 're_survey', triggerDescription: { en: 'Detractor, 7 to 14 days after resolution — the same question again, exempt from the caps, reports the recovery delta.', ar: 'منتقد، بعد 7 إلى 14 يوماً من الحل — السؤال نفسه مجدداً، مستثنى من الحدود، يقرّر فارق التعافي.' }, capDays: null },
]

const FUNNEL_SOURCES: Bi[] = [
  { en: 'PSI Website', ar: 'موقع بي إس آي' },
  { en: 'PSI Real Estate app', ar: 'تطبيق بي إس آي العقاري' },
  { en: 'PSI Club', ar: 'نادي بي إس آي' },
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
    { product: 're', hasNps: true, momentsSummary: { en: 'Asks after the call, the viewing, the offer and the signed deal.', ar: 'يُستبين بعد المكالمة، والمعاينة، والعرض، والصفقة الموقعة.' } },
    { product: 'af', hasNps: true, momentsSummary: { en: 'Asks after handover, a closed ticket, and renewal.', ar: 'يُستبين بعد التسليم، وإغلاق التذكرة، والتجديد.' } },
    { product: 'cl', hasNps: true, momentsSummary: { en: 'Club leads ride the Real Estate journey with a VIP tag; members get a member NPS at the end of a nomination cycle.', ar: 'يسير عملاء النادي المحتملون ضمن رحلة العقارية بعلامة كبار الشخصيات؛ ويحصل الأعضاء على مؤشر NPS خاص بالعضوية في نهاية دورة الترشيح.' } },
    { product: 'to', hasNps: true, momentsSummary: { en: 'End-of-tour survey only, after a completed tour (driver, guide, ride, car, cleanliness, then NPS). The stop survey goes to the commercial team, not the portal.', ar: 'استبيان نهاية الجولة فقط، بعد جولة مكتملة (السائق، المرشد، الرحلة، السيارة، النظافة، ثم NPS). استبيان التوقف يذهب للفريق التجاري، وليس للبوابة.' } },
    { product: 'ev', hasNps: false, momentsSummary: { en: 'No NPS: an external QR rating at the booth and an internal staff evaluation.', ar: 'لا يوجد مؤشر NPS: تقييم خارجي عبر رمز QR عند الجناح وتقييم داخلي للموظفين.' } },
    { product: 'wl', hasNps: false, momentsSummary: { en: 'Pilot: CES after a failed or completed upload, plus a draft investor survey.', ar: 'تجريبي: CES بعد رفع ملف فاشل أو ناجح، بالإضافة إلى استبيان مستثمرين مسودة.' } },
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
    subjectSummary: { en: `Reconciled ${interactions.length} interactions across every feed; matched to a person or kept in the unmatched queue.`, ar: `جرت مطابقة ${interactions.length} تفاعلاً عبر كل التغذيات؛ إما لشخص محدد أو في قائمة غير المطابق.` },
    supervisorVerdict: verdict(),
    createdAt: daysAgoIso(rng, 0.2),
  })
  out.push({
    id: 'act-classify-1',
    agentKey: 'classify',
    runId: 'run-classify-latest',
    subjectSummary: { en: `Classified ${interactions.filter((i) => i.problemFlags.length > 0).length} events with a problem flag into one category and reason code each.`, ar: `تصنيف ${interactions.filter((i) => i.problemFlags.length > 0).length} حدثاً يحمل علامة مشكلة إلى فئة ورمز سبب واحد لكل منها.` },
    supervisorVerdict: verdict(),
    createdAt: daysAgoIso(rng, 0.3),
  })
  out.push({
    id: 'act-signals-1',
    agentKey: 'signals',
    runId: 'run-signals-nightly',
    subjectSummary: { en: `Nightly recount: ${signals.length} signals counted, ${patterns.length} past threshold and published as patterns.`, ar: `إعادة عد ليلية: ${signals.length} إشارة مُحتسبة، ${patterns.length} تجاوزت الحد ونُشرت كأنماط.` },
    supervisorVerdict: verdict(),
    createdAt: daysAgoIso(rng, 1),
  })
  Object.values(correctiveRationales).slice(0, 4).forEach((env, idx) => {
    out.push({
      id: `act-actions-${idx + 1}`,
      agentKey: 'actions',
      runId: env.runId,
      subjectSummary: { en: `Proposed a corrective action for pattern ${env.subjectId}, with its basis from past actions.`, ar: `اقتراح إجراء تصحيحي للنمط ${env.subjectId}، بالاستناد إلى إجراءات سابقة.` },
      supervisorVerdict: env.supervisorVerdict === 'approved' ? 'approved' : 'returned',
      createdAt: env.createdAt,
    })
  })
  const verified = correctiveActions.filter((a) => a.verificationResult)
  out.push({
    id: 'act-verify-1',
    agentKey: 'verify',
    runId: 'run-verify-daily',
    subjectSummary: { en: `Ran the daily 06:00 clock: ${verified.length} actions carry a verification verdict (effective, partial or failed).`, ar: `تشغيل الساعة اليومية 06:00: ${verified.length} إجراءً يحمل نتيجة تحقق (فعّال أو جزئي أو فاشل).` },
    supervisorVerdict: verdict(),
    createdAt: daysAgoIso(rng, 0.1),
  })
  const runaway = readings.filter((r) => r.verdict !== 'healthy' && r.verdict !== 'high_effort')
  out.push({
    id: 'act-journey-1',
    agentKey: 'journey',
    runId: 'run-journey-nightly',
    subjectSummary: { en: `Refreshed ${readings.length} journey readings overnight; ${runaway.length} now carry a runaway type.`, ar: `تحديث ${readings.length} قراءة رحلة ليلاً؛ ${runaway.length} منها تحمل الآن نوع هروب.` },
    supervisorVerdict: verdict(),
    createdAt: daysAgoIso(rng, 0.4),
  })
  out.push({
    id: 'act-loop-1',
    agentKey: 'loop',
    runId: 'run-loop-monthly-capacity',
    subjectSummary: { en: `Monthly capacity run: ${callItems.length} detractors listed, ${campaigns.reduce((n, c) => n + c.memberIds.length, 0)} routed to a running AI interview campaign.`, ar: `تشغيل السعة الشهري: ${callItems.length} منتقداً مُدرجاً، ${campaigns.reduce((n, c) => n + c.memberIds.length, 0)} منهم ضمن حملة مقابلات ذكاء اصطناعي قائمة.` },
    supervisorVerdict: verdict(),
    createdAt: daysAgoIso(rng, 2),
  })
  out.push({
    id: 'act-report-1',
    agentKey: 'report',
    runId: 'run-report-month',
    subjectSummary: { en: 'Drafted the monthly management report from the metric store — held for the CX manager to release.', ar: 'إعداد مسودة التقرير الإداري الشهري من مخزن المؤشرات — بانتظار إصدار مدير تجربة العملاء.' },
    supervisorVerdict: 'approved',
    createdAt: daysAgoIso(rng, 5),
  })
  out.push({
    id: 'act-survey-1',
    agentKey: 'survey_triggers',
    runId: 'run-survey-0900',
    subjectSummary: { en: `09:00 run: checked every person against ${surveyTriggers.length} trigger/cap rules; sends and skips logged by reason.`, ar: `تشغيل الساعة 09:00: فحص كل شخص مقابل ${surveyTriggers.length} قاعدة محفّز/حد؛ تم تسجيل الإرسال والتخطي مع السبب.` },
    supervisorVerdict: verdict(),
    createdAt: daysAgoIso(rng, 0.05),
  })
  out.push({
    id: 'act-supervisor-1',
    agentKey: 'supervisor',
    runId: 'run-supervisor-weekly-sample',
    subjectSummary: { en: 'Weekly calibration: sampled 50 approved outputs for the CX team and Internal Audit and Marketing Lead to review.', ar: 'معايرة أسبوعية: أخذ عينة من 50 مخرجاً معتمداً لمراجعة فريق تجربة العملاء ومسؤول التدقيق الداخلي والتسويق.' },
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
    { id: 'std_hr_procedures', code: 'M-01', source: 'platform_rule', group: { en: 'Platform rules', ar: 'قواعد المنصة' }, title: { en: 'HR mystery-shopper procedures', ar: 'إجراءات الموارد البشرية للتسوق السري' }, writer: { en: 'HR', ar: 'الموارد البشرية' }, readBy: { en: 'HR', ar: 'الموارد البشرية' }, owner: 'HR', linkedItems: 0, status: 'not_started' },
    { id: 'std_sla_targets', code: 'M-02', source: 'platform_rule', group: { en: 'Platform rules', ar: 'قواعد المنصة' }, title: { en: 'Agreed SLA targets by complaint type', ar: 'أهداف اتفاقية مستوى الخدمة حسب نوع الشكوى' }, writer: { en: 'CX manager', ar: 'مدير تجربة العملاء' }, readBy: { en: 'CX, signals, Actions', ar: 'تجربة العملاء، الإشارات، الإجراءات' }, owner: 'CX manager', linkedItems: 27, status: 'drafted' },
    { id: 'std_as_script', code: 'M-03', source: 'platform_rule', group: { en: 'Platform rules', ar: 'قواعد المنصة' }, title: { en: 'After-Sales real call script', ar: 'نص مكالمة ما بعد البيع الفعلي' }, writer: { en: 'After-Sales lead', ar: 'قائد ما بعد البيع' }, readBy: { en: 'After-Sales', ar: 'ما بعد البيع' }, owner: 'After-Sales lead', linkedItems: 0, status: 'not_started' },
    { id: 'std_legal_calling', code: 'M-04', source: 'platform_rule', group: { en: 'Platform rules', ar: 'قواعد المنصة' }, title: { en: 'Calling hours, consent and recording policy', ar: 'سياسة ساعات الاتصال والموافقة والتسجيل' }, writer: { en: 'Legal', ar: 'القانونية' }, readBy: { en: 'Legal, call center', ar: 'القانونية، مركز الاتصال' }, owner: 'Legal', linkedItems: 0, status: 'legal_review' },
    { id: 'std_shopper_rubric', code: 'M-05', source: 'platform_rule', group: { en: 'Platform rules', ar: 'قواعد المنصة' }, title: { en: 'Mystery shopper scoring rubric', ar: 'معايير تقييم التسوق السري' }, writer: { en: 'CX team', ar: 'فريق تجربة العملاء' }, readBy: { en: 'CX, mystery shopper', ar: 'تجربة العملاء، التسوق السري' }, owner: 'CX team', linkedItems: 6, status: 'drafted' },
    { id: 'std_ai_rubric', code: 'M-06', source: 'platform_rule', group: { en: 'Platform rules', ar: 'قواعد المنصة' }, title: { en: 'AI call evaluator rubric', ar: 'معايير تقييم مُقيّم المكالمات الذكي' }, writer: { en: 'CX team', ar: 'فريق تجربة العملاء' }, readBy: { en: 'AI call center', ar: 'مركز الاتصال الذكي' }, owner: 'CX team', linkedItems: 8, status: 'drafted' },
    { id: 'std_whatsapp_policy', code: 'M-07', source: 'platform_rule', group: { en: 'Platform rules', ar: 'قواعد المنصة' }, title: { en: 'WhatsApp messaging and Meta template policy', ar: 'سياسة رسائل واتساب وقوالب ميتا' }, writer: { en: 'CX manager', ar: 'مدير تجربة العملاء' }, readBy: { en: 'CX', ar: 'تجربة العملاء' }, owner: 'CX manager', linkedItems: 6, status: 'drafted' },
    { id: 'std_escalation_policy', code: 'M-08', source: 'platform_rule', group: { en: 'Platform rules', ar: 'قواعد المنصة' }, title: { en: 'Complaint escalation and routing policy', ar: 'سياسة تصعيد وتوجيه الشكاوى' }, writer: { en: 'CX manager', ar: 'مدير تجربة العملاء' }, readBy: { en: 'CX, Actions', ar: 'تجربة العملاء، الإجراءات' }, owner: 'CX manager', linkedItems: 27, status: 'drafted' },
    { id: 'std_branch_checklist', code: 'M-09', source: 'platform_rule', group: { en: 'Platform rules', ar: 'قواعد المنصة' }, title: { en: 'Branch and gallery visit standard', ar: 'معيار زيارة الفرع والمعرض' }, writer: { en: 'CX team', ar: 'فريق تجربة العملاء' }, readBy: { en: 'Mystery shopper', ar: 'التسوق السري' }, owner: 'CX team', linkedItems: 4, status: 'drafted' },
    { id: 'std_re_sales_script', code: 'M-10', source: 'platform_rule', group: { en: 'Platform rules', ar: 'قواعد المنصة' }, title: { en: 'Real Estate sales script', ar: 'نص مبيعات العقارات' }, writer: { en: 'Head of Sales', ar: 'رئيس المبيعات' }, readBy: { en: 'Sales', ar: 'المبيعات' }, owner: 'Head of Sales', linkedItems: 0, status: 'not_started' },
    { id: 'std_club_policy', code: 'M-11', source: 'platform_rule', group: { en: 'Platform rules', ar: 'قواعد المنصة' }, title: { en: 'PSI Club VIP nomination policy', ar: 'سياسة ترشيح أعضاء نادي بي إس آي المميزين' }, writer: { en: 'Club lead', ar: 'قائد النادي' }, readBy: { en: 'Club', ar: 'النادي' }, owner: 'Club lead', linkedItems: 0, status: 'not_started' },
    { id: 'std_tour_safety', code: 'M-12', source: 'platform_rule', group: { en: 'Platform rules', ar: 'قواعد المنصة' }, title: { en: 'Tour Estate safety and conduct standard', ar: 'معيار السلامة والسلوك في تور إستيت' }, writer: { en: 'Tour operations', ar: 'عمليات الجولات' }, readBy: { en: 'Tour Estate', ar: 'تور إستيت' }, owner: 'Tour operations', linkedItems: 0, status: 'not_started' },
    { id: 'std_events_registration', code: 'M-13', source: 'platform_rule', group: { en: 'Platform rules', ar: 'قواعد المنصة' }, title: { en: 'Events registration and follow-up standard', ar: 'معيار تسجيل ومتابعة الفعاليات' }, writer: { en: 'Events lead', ar: 'قائد الفعاليات' }, readBy: { en: 'PSI Events', ar: 'فعاليات بي إس آي' }, owner: 'Events lead', linkedItems: 0, status: 'not_started' },
  ]

  const g1: Bi = { en: '1. Frontline and branch', ar: '١. الواجهة والفرع' }
  const g2: Bi = { en: '2. Communication and selling', ar: '٢. التواصل والبيع' }
  const g3: Bi = { en: '3. Digital channels and chat', ar: '٣. القنوات الرقمية والمحادثة' }
  const g4: Bi = { en: '4. Call center', ar: '٤. مركز الاتصال' }
  const g5: Bi = { en: '5. After-Sales and rental (PSI Assets)', ar: '٥. ما بعد البيع والإيجار (بي إس آي أسيتس)' }
  const g6: Bi = { en: '6. Follow-up and conduct', ar: '٦. المتابعة والسلوك' }
  const ld = (en: string, ar: string) => ({ en, ar }) as Bi

  type LdRow = [string, Bi, Bi, Bi, Bi, Bi | undefined, 1 | 2 | 3 | 4 | 5, 'not_started' | 'drafted' | 'legal_review']
  const ldRows: LdRow[] = [
    ['std_branch_presentation', g1, ld('Branch and gallery presentation standard', 'معيار عرض الفرع والمعرض'), ld('Operations with the environment champions', 'العمليات مع أبطال البيئات'), ld('Shopper, survey (branch visit)', 'المتسوق، الاستبيان'), ld('Assets: leasing offices/show units instead of galleries', 'أسيتس: مكاتب التأجير بدل المعارض'), 1, 'drafted'],
    ['std_meeting_room', g1, ld('Meeting room and privacy standard', 'معيار غرفة الاجتماعات والخصوصية'), ld('L&D with Legal', 'التعلم والتطوير مع القانونية'), ld('Shopper, survey', 'المتسوق، الاستبيان'), ld('Assets: tenant documents raise the bar', 'أسيتس: مستندات المستأجر ترفع السقف'), 5, 'not_started'],
    ['std_dress_code', g1, ld('Appearance and dress code', 'المظهر والزي'), ld('L&D with HR', 'التعلم والتطوير مع الموارد البشرية'), ld('Shopper, L&D', 'المتسوق، التعلم والتطوير'), ld('Assets: field dress code for site/maintenance staff', 'أسيتس: زي ميداني لموظفي الصيانة'), 1, 'drafted'],
    ['std_reception_greeting', g1, ld('Reception and greeting standard', 'معيار الاستقبال والترحيب'), ld('L&D', 'التعلم والتطوير'), ld('Shopper, survey', 'المتسوق، الاستبيان'), undefined, 1, 'drafted'],
    ['std_waiting', g1, ld('Waiting standard', 'معيار الانتظار'), ld('L&D with the environment managers', 'التعلم والتطوير مع مديري البيئات'), ld('Shopper, survey, CRM', 'المتسوق، الاستبيان، نظام العملاء'), ld('Assets: complaining walk-in tenants take priority', 'أسيتس: أولوية للمستأجرين ذوي الشكاوى'), 5, 'not_started'],

    ['std_communication', g2, ld('Communication standard', 'معيار التواصل'), ld('L&D', 'التعلم والتطوير'), ld('Shopper, chat signals, survey, AI reading', 'المتسوق، إشارات المحادثة، الاستبيان، قراءة الذكاء الاصطناعي'), undefined, 1, 'drafted'],
    ['std_needs_discovery', g2, ld('Needs discovery and qualification', 'اكتشاف الاحتياجات والتأهيل'), ld('L&D with sales managers', 'التعلم والتطوير مع مديري المبيعات'), ld('Shopper, CRM notes', 'المتسوق، ملاحظات نظام العملاء'), ld('Assets: tenant needs replace buyer needs', 'أسيتس: احتياجات المستأجر بدل المشتري'), 5, 'not_started'],
    ['std_accurate_info', g2, ld('Accurate information standard', 'معيار دقة المعلومات'), ld('Sales support with L&D', 'دعم المبيعات مع التعلم والتطوير'), ld('Shopper (critical), AI call center, signals', 'المتسوق (حرج)، مركز الاتصال الذكي، الإشارات'), ld('Assets: rent/deposit/fees sheet instead of price sheet', 'أسيتس: جدول الإيجار والرسوم بدل جدول السعر'), 1, 'drafted'],
    ['std_promises_discounts', g2, ld('Approved promises and discounts', 'الوعود والخصومات المعتمدة'), ld('Sales management with L&D', 'إدارة المبيعات مع التعلم والتطوير'), ld('Shopper (critical), chat signals, journey', 'المتسوق (حرج)، إشارات المحادثة، الرحلة'), ld('Assets: rent negotiation and fee waivers have their own path', 'أسيتس: مسار خاص للتفاوض على الإيجار'), 1, 'drafted'],
    ['std_presenting_closing', g2, ld('Presenting a unit and closing', 'عرض الوحدة والإغلاق'), ld('L&D with the sales managers', 'التعلم والتطوير مع مديري المبيعات'), ld('Shopper, survey', 'المتسوق، الاستبيان'), ld('Assets: viewing and the move-in condition report', 'أسيتس: المعاينة وتقرير حالة الانتقال'), 5, 'not_started'],
    ['std_scripts_objections', g2, ld('Scripts and objection handling', 'النصوص ومعالجة الاعتراضات'), ld('L&D with the call center and product owners', 'التعلم والتطوير مع مركز الاتصال وأصحاب المنتجات'), ld('Shopper, AI call center, chat signals', 'المتسوق، مركز الاتصال الذكي، إشارات المحادثة'), ld('Per product: Real Estate sales, After-Sales, Assets leasing', 'حسب المنتج'), 5, 'not_started'],

    ['std_official_channels', g3, ld('Official channels policy', 'سياسة القنوات الرسمية'), ld('Sales operations with IT and Legal', 'عمليات المبيعات مع تقنية المعلومات والقانونية'), ld('Shopper (critical), signals', 'المتسوق (حرج)، الإشارات'), ld('None: a group rule', 'لا يوجد: قاعدة جماعية'), 1, 'legal_review'],
    ['std_reply_time', g3, ld('Reply time standard per channel', 'معيار زمن الرد لكل قناة'), ld('Sales operations with L&D', 'عمليات المبيعات مع التعلم والتطوير'), ld('Chat signals (slow reply), journey, shopper, survey', 'إشارات المحادثة، الرحلة، المتسوق، الاستبيان'), ld('Assets: maintenance requests have their own target', 'أسيتس: هدف خاص لطلبات الصيانة'), 2, 'not_started'],
    ['std_chat_conduct', g3, ld('Chat conduct and language', 'سلوك المحادثة واللغة'), ld('L&D', 'التعلم والتطوير'), ld('Chat signals (language), AI reading, shopper', 'إشارات المحادثة (اللغة)، قراءة الذكاء الاصطناعي، المتسوق'), undefined, 2, 'not_started'],
    ['std_digital_lead', g3, ld('Digital lead handling', 'التعامل مع العميل المحتمل الرقمي'), ld('Sales operations with the CRM owner', 'عمليات المبيعات مع مالك نظام العملاء'), ld('Journey, CRM, shopper', 'الرحلة، نظام العملاء، المتسوق'), ld('Assets: a rental enquiry becomes a viewing request, not a lead', 'أسيتس: الاستفسار يصبح طلب معاينة'), 5, 'not_started'],
    ['std_app_portal', g3, ld('App and portal service standard', 'معيار خدمة التطبيق والبوابة'), ld('App product teams with CX', 'فرق منتج التطبيق مع تجربة العملاء'), ld('App ratings, signals, journey', 'تقييمات التطبيق، الإشارات، الرحلة'), ld('Assets: the tenant app is the main channel; Wallet: investors', 'أسيتس: تطبيق المستأجر القناة الرئيسية'), 5, 'not_started'],

    ['std_inbound_call', g4, ld('Inbound call standard', 'معيار المكالمات الواردة'), ld('Call center lead with L&D', 'قائد مركز الاتصال مع التعلم والتطوير'), ld('Shopper (call scenario), CRM activity, journey', 'المتسوق، نشاط نظام العملاء، الرحلة'), ld('Per product section', 'حسب قسم المنتج'), 4, 'not_started'],
    ['std_outbound_ai_caller', g4, ld('Outbound and AI caller standard', 'معيار المكالمات الصادرة والمتصل الذكي'), ld('Call center lead with the AI vendor and Legal', 'قائد مركز الاتصال مع مزوّد الذكاء الاصطناعي والقانونية'), ld('AI call center log, signals (call timing), journey, shopper', 'سجل مركز الاتصال الذكي، الإشارات، الرحلة، المتسوق'), ld('None: a group rule', 'لا يوجد: قاعدة جماعية'), 4, 'not_started'],
    ['std_ivr_wording', g4, ld('IVR wording and routing', 'نصوص وتوجيه الرد الصوتي التفاعلي'), ld('Call center lead with CX', 'قائد مركز الاتصال مع تجربة العملاء'), ld('IVR log, signals', 'سجل الرد الصوتي، الإشارات'), undefined, 4, 'not_started'],
    ['std_complaint_intake', g4, ld('Complaint intake standard', 'معيار استقبال الشكاوى'), ld('CX with L&D', 'تجربة العملاء مع التعلم والتطوير'), ld('Shopper cases, signals, corrective actions', 'حالات المتسوق، الإشارات، الإجراءات التصحيحية'), ld('Assets: tenant complaints have their own owners', 'أسيتس: شكاوى المستأجر لها مالكون خاصون'), 4, 'not_started'],
    ['std_call_quality', g4, ld('Call quality criteria', 'معايير جودة المكالمة'), ld('L&D with the call center lead', 'التعلم والتطوير مع قائد مركز الاتصال'), ld('AI call center, L&D', 'مركز الاتصال الذكي، التعلم والتطوير'), undefined, 4, 'not_started'],

    ['std_handover', g5, ld('Handover standard', 'معيار التسليم'), ld('After-Sales lead with L&D', 'قائد ما بعد البيع مع التعلم والتطوير'), ld('Signals (handover missed), survey, journey', 'الإشارات، الاستبيان، الرحلة'), ld('After-Sales only', 'ما بعد البيع فقط'), 3, 'not_started'],
    ['std_snagging', g5, ld('Snagging standard', 'معيار ملاحظات التشطيب'), ld('After-Sales lead with the developer liaison', 'قائد ما بعد البيع مع منسّق المطوّر'), ld('Signals, survey, journey', 'الإشارات، الاستبيان، الرحلة'), ld('After-Sales only', 'ما بعد البيع فقط'), 5, 'not_started'],
    ['std_maintenance_request', g5, ld('Maintenance request standard', 'معيار طلب الصيانة'), ld('Assets leasing and maintenance leads with L&D', 'قادة التأجير والصيانة في أسيتس مع التعلم والتطوير'), ld('App signals, journey (repeat contact), survey', 'إشارات التطبيق، الرحلة، الاستبيان'), ld('Assets only', 'أسيتس فقط'), 5, 'not_started'],
    ['std_move_in_out', g5, ld('Move-in and move-out standard', 'معيار الانتقال والإخلاء'), ld('Assets leasing lead with Legal', 'قائد التأجير في أسيتس مع القانونية'), ld('Survey, signals (deposit disputes), shopper', 'الاستبيان، الإشارات، المتسوق'), ld('Assets only', 'أسيتس فقط'), 5, 'not_started'],
    ['std_renewal', g5, ld('Renewal standard', 'معيار التجديد'), ld('Assets leasing lead with CX', 'قائد التأجير في أسيتس مع تجربة العملاء'), ld('Runaway (did not renew), journey, survey', 'العملاء الهاربون، الرحلة، الاستبيان'), ld('Assets only', 'أسيتس فقط'), 3, 'not_started'],
    ['std_payment_statement', g5, ld('Payment and statement standard', 'معيار الدفع وكشف الحساب'), ld('Finance with After-Sales and Assets', 'المالية مع ما بعد البيع وأسيتس'), ld('Signals, survey', 'الإشارات، الاستبيان'), ld('Both, with product sections', 'كلاهما'), 5, 'not_started'],
    ['std_offplan_updates', g5, ld('Off-plan construction updates', 'تحديثات البناء على الخارطة'), ld('After-Sales lead with the product owner', 'قائد ما بعد البيع مع مالك المنتج'), ld('Survey (confidence), signals, journey', 'الاستبيان، الإشارات، الرحلة'), ld('After-Sales only', 'ما بعد البيع فقط'), 5, 'not_started'],

    ['std_lead_followup', g6, ld('Lead follow-up standard', 'معيار متابعة العميل المحتمل'), ld('Sales management with L&D', 'إدارة المبيعات مع التعلم والتطوير'), ld('Journey (silence, promise), shopper, CRM activity', 'الرحلة، المتسوق، نشاط نظام العملاء'), ld('Assets: shorter viewing follow-up/application chase cycle', 'أسيتس: دورة متابعة أقصر'), 3, 'not_started'],
    ['std_promise_callback', g6, ld('Promise and callback standard', 'معيار الوعد والاتصال التالي'), ld('L&D with the CRM owner', 'التعلم والتطوير مع مالك نظام العملاء'), ld('Journey (promise not kept), signals, shopper', 'الرحلة، الإشارات، المتسوق'), undefined, 2, 'not_started'],
    ['std_ownership_handoff', g6, ld('Customer ownership and hand-off', 'ملكية العميل والتسليم بين الفرق'), ld('CX with the environment managers', 'تجربة العملاء مع مديري البيئات'), ld('Journey (hand-off), runaway (dormant owner)', 'الرحلة، العملاء الهاربون'), ld('Assets and After-Sales share owners for tenant-owners', 'أسيتس وما بعد البيع يتشاركان الملاك'), 3, 'not_started'],
    ['std_conduct', g6, ld('Conduct standard', 'معيار السلوك'), ld('HR with L&D', 'الموارد البشرية مع التعلم والتطوير'), ld('Shopper (critical conduct), signals (attitude), HR pool', 'المتسوق، الإشارات، مجموعة الموارد البشرية'), ld('None: a group rule', 'لا يوجد: قاعدة جماعية'), 5, 'not_started'],
    ['std_privacy', g6, ld('Data and privacy in customer contact', 'البيانات والخصوصية في التواصل مع العميل'), ld('Legal with IT and L&D', 'القانونية مع تقنية المعلومات والتعلم والتطوير'), ld('Shopper (privacy items), signals', 'المتسوق، الإشارات'), ld('Assets: tenant documents', 'أسيتس: مستندات المستأجر'), 5, 'legal_review'],
  ]

  const ldDocuments: Standard[] = ldRows.map(([id, group, title, writer, readBy, environmentVariant, priorityTier, status], i) => ({
    id,
    code: `M-${String(14 + i).padStart(2, '0')}`,
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
  const ci = (text: Bi, section: string, weight: number, opts: Partial<{ type: 'passfail' | 'scale' | 'text'; critical: boolean; evidence: 'none' | 'optional' | 'required' }> = {}) => {
    seq++
    return { id: `item${seq}`, text, section, weight, type: opts.type ?? ('passfail' as const), critical: !!opts.critical, evidence: opts.evidence ?? ('none' as const) }
  }
  return [
    {
      id: 'cl_re_digital', name: { en: 'Real Estate: digital lead (WhatsApp/web/social)', ar: 'العقارات: عميل محتمل رقمي' }, product: 're', channel: 'digital', status: 'published', version: 3,
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
      id: 'cl_re_call', name: { en: 'Real Estate: AI call center lead', ar: 'العقارات: عميل محتمل عبر مركز الاتصال الذكي' }, product: 're', channel: 'call', status: 'published', version: 2,
      items: [
        ci({ en: 'Called within the allowed hours', ar: 'تم الاتصال ضمن الساعات المسموحة' }, GREETING, 20, { critical: true }),
        ci({ en: 'Disclosed it is an AI assistant', ar: 'أفصح أنه مساعد ذكاء اصطناعي' }, GREETING, 15, { critical: true }),
        ci({ en: 'Understood the stated need correctly', ar: 'فهم الاحتياج المذكور بشكل صحيح' }, NEEDS, 20, { type: 'scale' }),
        ci({ en: 'Handed over to a human when asked', ar: 'حوّل إلى موظف بشري عند الطلب' }, CLOSE, 25, { critical: true }),
        ci({ en: 'Call recording attached', ar: 'تم إرفاق تسجيل المكالمة' }, CLOSE, 20, { evidence: 'required' }),
      ],
    },
    {
      id: 'cl_re_branch', name: { en: 'Real Estate: branch / gallery visit', ar: 'العقارات: زيارة فرع / معرض' }, product: 're', channel: 'branch', status: 'published', version: 4,
      items: [
        ci({ en: 'Greeted within 2 minutes of arrival', ar: 'تم الترحيب خلال دقيقتين من الوصول' }, GREETING, 15, { evidence: 'required' }),
        ci({ en: 'Gallery was staffed and tidy', ar: 'المعرض كان مجهزاً بالموظفين ومرتباً' }, GREETING, 15, { critical: true, evidence: 'required' }),
        ci({ en: 'Agent understood budget and preferences', ar: 'فهم الوكيل الميزانية والتفضيلات' }, NEEDS, 20, { type: 'scale' }),
        ci({ en: 'No unapproved discount offered', ar: 'لم يُعرض خصم غير معتمد' }, INFO, 25, { critical: true }),
        ci({ en: 'Agent followed up within 24 hours', ar: 'تابع الوكيل خلال 24 ساعة' }, CLOSE, 25),
      ],
    },
    {
      id: 'cl_af_call', name: { en: 'After-Sales: outbound call quality', ar: 'ما بعد البيع: جودة المكالمة الصادرة' }, product: 'af', channel: 'call', status: 'draft', version: 1,
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
    { id: 'sc_digital_buy', title: { en: 'Looking to buy a 2-bedroom unit', ar: 'يبحث عن شراء وحدة غرفتي نوم' }, tests: { en: 'Response time, qualification, pricing accuracy', ar: 'وقت الاستجابة، التأهيل، دقة الأسعار' } },
    { id: 'sc_call_general', title: { en: 'General project enquiry by phone', ar: 'استفسار عام عن المشروع عبر الهاتف' }, tests: { en: 'AI disclosure, allowed hours, handover', ar: 'الإفصاح، الساعات المسموحة، التحويل' } },
    { id: 'sc_branch_walkin', title: { en: 'Walk-in couple comparing two projects', ar: 'زوجان يزوران المعرض لمقارنة مشروعين' }, tests: { en: 'Staffing, greeting time, discount discipline', ar: 'التوظيف، وقت الترحيب، الانضباط في الخصومات' } },
  ]
}

function buildMsShoppers(): MsShopper[] {
  return [
    { id: 'sh1', name: 'Lina K.', type: 'internal', email: 'lina.k@psi.example', shopsCompleted: 14, reliability: 96, active: true },
    { id: 'sh2', name: 'Omar R.', type: 'internal', email: 'omar.r@psi.example', shopsCompleted: 9, reliability: 91, active: true },
    { id: 'sh3', name: 'Fatima S.', type: 'external', agency: 'Gulf Mystery Shoppers', email: 'fatima.s@gms.example', shopsCompleted: 22, reliability: 98, active: true },
    { id: 'sh4', name: 'James T.', type: 'external', agency: 'Gulf Mystery Shoppers', email: 'james.t@gms.example', shopsCompleted: 6, reliability: 83, active: true },
  ]
}

function buildMsAssignments(): MsAssignment[] {
  return [
    { id: 'asg1', checklistId: 'cl_re_digital', scenarioId: 'sc_digital_buy', shopperId: 'sh1', via: 'wa', sentAt: '2026-10-20T09:00:00', dueAt: '2026-10-23T18:00:00', status: 'approved', score: 88, criticalFails: 0 },
    { id: 'asg2', checklistId: 'cl_re_call', scenarioId: 'sc_call_general', shopperId: 'sh2', via: 'email', sentAt: '2026-10-21T09:00:00', dueAt: '2026-10-24T18:00:00', status: 'review', score: 52, criticalFails: 1 },
    { id: 'asg3', checklistId: 'cl_re_branch', scenarioId: 'sc_branch_walkin', shopperId: 'sh3', via: 'email', sentAt: '2026-10-22T09:00:00', dueAt: '2026-10-25T18:00:00', status: 'submitted', score: 58, criticalFails: 0 },
    { id: 'asg4', checklistId: 'cl_af_call', scenarioId: 'sc_call_general', shopperId: 'sh4', via: 'sms', sentAt: '2026-10-22T09:00:00', dueAt: '2026-10-26T18:00:00', status: 'progress' },
    { id: 'asg5', checklistId: 'cl_re_digital', scenarioId: 'sc_digital_buy', shopperId: 'sh2', via: 'wa', sentAt: '2026-10-23T09:00:00', dueAt: '2026-10-26T18:00:00', status: 'opened' },
    { id: 'asg6', checklistId: 'cl_re_branch', scenarioId: 'sc_branch_walkin', shopperId: 'sh1', via: 'email', sentAt: '2026-10-24T09:00:00', dueAt: '2026-10-27T18:00:00', status: 'sent' },
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
    { product: 're', channel: 'app', sentiment: 'positive', theme: { en: 'Agent responsiveness', ar: 'استجابة الوكيل' }, text: { en: 'The agent answered every question within minutes, very impressed.', ar: 'أجاب الوكيل على كل الأسئلة خلال دقائق، انطباع رائع.' } },
    { product: 're', channel: 'branch', sentiment: 'negative', theme: { en: 'Staffing', ar: 'التوظيف' }, text: { en: 'No one at the gallery desk for almost 10 minutes.', ar: 'لا أحد عند مكتب المعرض لمدة 10 دقائق تقريباً.' } },
    { product: 'af', channel: 'call', sentiment: 'negative', theme: { en: 'Handover delay', ar: 'تأخر التسليم' }, text: { en: 'Three weeks late and nobody called to explain why.', ar: 'تأخر ثلاثة أسابيع ولم يتصل أحد لشرح السبب.' } },
    { product: 'af', channel: 'digital', sentiment: 'positive', theme: { en: 'Maintenance', ar: 'الصيانة' }, text: { en: 'Maintenance request was handled the same day, thank you.', ar: 'تمت معالجة طلب الصيانة في نفس اليوم، شكراً.' } },
  ]
}

function buildRulesConfig(): RuleConfigItem[] {
  const bi = (en: string, ar: string): Bi => ({ en, ar })
  return [
    { id: 'rule_pattern_same_agent', area: bi('Signals & patterns', 'الإشارات والأنماط'), label: bi('Same-agent threshold', 'حد نفس الوكيل'), value: 3, unit: bi('occurrences', 'مرات'), source: 'FR-4.6' },
    { id: 'rule_pattern_same_issue', area: bi('Signals & patterns', 'الإشارات والأنماط'), label: bi('Same-issue threshold', 'حد نفس المشكلة'), value: 5, unit: bi('occurrences', 'مرات'), source: 'FR-4.6' },
    { id: 'rule_pattern_env_concentration', area: bi('Signals & patterns', 'الإشارات والأنماط'), label: bi('Environment-concentration threshold', 'حد تركّز البيئة'), value: 50, unit: bi('%', '%'), source: 'FR-4.6' },
    { id: 'rule_pattern_window', area: bi('Signals & patterns', 'الإشارات والأنماط'), label: bi('Pattern window', 'نافذة النمط'), value: 30, unit: bi('days', 'يوم'), source: 'FR-4.6' },
    { id: 'rule_pattern_min_sample', area: bi('Signals & patterns', 'الإشارات والأنماط'), label: bi('Minimum sample before a fix is proposed', 'الحد الأدنى للعيّنة قبل اقتراح إصلاح'), value: 10, unit: bi('records', 'سجل'), source: 'FR-4.16' },
    { id: 'rule_verification_days', area: bi('Corrective actions', 'الإجراءات التصحيحية'), label: bi('Effectiveness verification window', 'نافذة التحقق من الفعالية'), value: 60, unit: bi('days', 'يوم'), source: 'FR-4.1' },
    { id: 'rule_approval_days', area: bi('Corrective actions', 'الإجراءات التصحيحية'), label: bi('Approval and assignment window', 'نافذة الاعتماد والإسناد'), value: 5, unit: bi('working days', 'يوم عمل'), source: 'FR-4.1' },
    { id: 'rule_shopper_respond', area: bi('Shopper cases', 'حالات المتسوق'), label: bi('Critical case respond clock', 'ساعة الرد على الحالة الحرجة'), value: 1, unit: bi('working day', 'يوم عمل'), source: 'FR-4.14' },
    { id: 'rule_shopper_resolve', area: bi('Shopper cases', 'حالات المتسوق'), label: bi('Critical case resolve clock', 'ساعة حل الحالة الحرجة'), value: 5, unit: bi('working days', 'يوم عمل'), source: 'FR-4.14' },
    { id: 'rule_shopper_floor', area: bi('Shopper cases', 'حالات المتسوق'), label: bi('Visit-score severity floor', 'حد الخطورة لنتيجة الزيارة'), value: 60, unit: bi('%', '%'), source: 'FR-4.14' },
    { id: 'rule_resurvey_min', area: bi('Close the loop', 'إغلاق الحلقة'), label: bi('Re-survey window (min)', 'نافذة إعادة الاستبيان (الأدنى)'), value: 7, unit: bi('days', 'يوم'), source: 'FR-5.4' },
    { id: 'rule_resurvey_max', area: bi('Close the loop', 'إغلاق الحلقة'), label: bi('Re-survey window (max)', 'نافذة إعادة الاستبيان (الأقصى)'), value: 14, unit: bi('days', 'يوم'), source: 'FR-5.4' },
    { id: 'rule_recovered_days', area: bi('Close the loop', 'إغلاق الحلقة'), label: bi('"Recovered" window', 'نافذة "تعافى"'), value: 60, unit: bi('days', 'يوم'), source: 'FR-5.5' },
    { id: 'rule_silence_lead', area: bi('Runaway customers', 'العملاء الهاربون'), label: bi('Silent-lead threshold', 'حد العميل المحتمل الصامت'), value: 30, unit: bi('days', 'يوم'), source: 'FR-3.1' },
    { id: 'rule_silence_owner', area: bi('Runaway customers', 'العملاء الهاربون'), label: bi('Dormant-owner threshold', 'حد المالك الخامل'), value: 12, unit: bi('months', 'شهر'), source: 'FR-3.1' },
    { id: 'rule_public_reply', area: bi('Signals & patterns', 'الإشارات والأنماط'), label: bi('Public-mention reply clock', 'ساعة الرد على الإشارة العامة'), value: 48, unit: bi('hours', 'ساعة'), source: 'FR-4.8' },
    { id: 'rule_survey_nps_cap', area: bi('Surveys and triggers', 'الاستبيانات والمحفزات'), label: bi('NPS cap', 'حد مؤشر NPS'), value: 90, unit: bi('days', 'يوم'), source: 'FR-7.2' },
    { id: 'rule_survey_csat_cap', area: bi('Surveys and triggers', 'الاستبيانات والمحفزات'), label: bi('CSAT+CES cap', 'حد CSAT+CES'), value: 30, unit: bi('days', 'يوم'), source: 'FR-7.2' },
  ]
}

const AI_ACCESS_ROLE_ORDER: RoleId[] = ['cxmgr', 'cxteam', 'envmgmt', 'teamlead', 'aslead', 'ld', 'hrspec', 'hrmgr', 'marketing', 'auditmkt', 'exec', 'shopper']

function aiAccessRow(group: Bi, label: Bi, symbols: string): AiAccessRow {
  const chars = symbols.trim().split(/\s+/)
  const map: Record<string, Access> = { '●': 'full', '◐': 'own', '○': 'view', '✉': 'informed', '✔': 'approve', '–': 'none' }
  const values = {} as Record<RoleId, Access>
  AI_ACCESS_ROLE_ORDER.forEach((id, i) => { values[id] = map[chars[i]] ?? 'none' })
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
    { id: 'ldreq-1', title: { en: 'Refresher: accurate information standard', ar: 'تدريب تنشيطي: معيار دقة المعلومات' }, requestedBy: 'Environment manager, Dubai', environment: 'Dubai', status: 'scheduled', linkedStandardId: 'std_accurate_info' },
    { id: 'ldreq-2', title: { en: 'New-hire induction: communication standard', ar: 'تهيئة الموظف الجديد: معيار التواصل' }, requestedBy: 'After-Sales lead', status: 'requested', linkedStandardId: 'std_communication' },
    { id: 'ldreq-3', title: { en: 'Coaching: reply-time breaches, digital channel', ar: 'تدريب: تجاوزات زمن الرد في القناة الرقمية' }, requestedBy: 'CX team', environment: 'Abu Dhabi', status: 'delivered', linkedStandardId: 'std_reply_time' },
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
export const MOCK_PATTERNS = buildPatterns(MOCK_SIGNALS)
export const MOCK_CORRECTIVE_ACTIONS = buildCorrectiveActions(MOCK_PATTERNS)
export const MOCK_CORRECTIVE_RATIONALES = buildCorrectiveRationales(MOCK_CORRECTIVE_ACTIONS, MOCK_PATTERNS)
export const MOCK_SHOPPER_CASES = buildShopperCases()
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
