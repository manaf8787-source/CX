import { useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { latency, mock } from './mockStore'
import {
  useAllInteractions,
  useCorrectiveActions,
  useCorrectiveActionsAll,
  usePersons,
  useDetractorCallItems,
  useEffortSummaries,
  useInvestigations,
  usePatternsAll,
  usePersonsAll,
  useProducts,
  useRulesConfig,
  useSignals,
  useSignalsAll,
  useVocRows,
  useAiCampaigns,
  usePatterns,
  useShopperCases,
} from './queries'
import { useNpsTrend, usePublicMentions } from './referenceQueries'
import { useEnvScope } from './envScope'
import { useRole } from '../auth/RoleContext'
import { canAccessPath } from '../auth/access'
import { useNow } from '../hooks/useNow'
import { AGENT_JDS, CES_SAMPLE } from '../data/v38Reference'
import { publicReplyBreaches } from '../data/publicMentions'
import { applyApprovalClock, applyDoneClock } from './fixClockStore'
import { fixDue } from '../utils/fixClock'
import { agentPassRates, syncSampleEffects } from '../utils/passRate'
import { summariseFeeds } from '../data/feeds'
import { MATRIX_KEY_BY_FIX_KIND } from '../data/escalationDefaults'
import { classifyRunaway } from '../utils/runaway'
import { recoveryRate } from '../utils/closeTheLoop'
import { buildInbox, workTodayStats } from '../utils/inbox'
import { liveIndicators } from '../utils/indicators'
import { callRulesFrom, recordNoAnswer, CALL_COPY } from '../utils/callSchedule'
import { chainFrom, resolveTraceRef, sgId, traceIndexFor, traceRoute } from '../utils/trace'
import { statusAudit } from '../utils/audit'
import { rulesFromConfig, type RulesBag } from '../utils/ruleValues'
import { nextWeekday } from '../utils/workingDays'
import type { Lang } from '../i18n'
import type {
  BriefInputs,
  Bi,
  CorrectiveAction,
  CorrectiveActionStatus,
  CrmMapping,
  DataFeed,
  AgentPassRate,
  FeedScope,
  FixDue,
  FixMatrixLine,
  IndicatorSet,
  InboxItem,
  MappingKind,
  MatrixField,
  MatrixKind,
  MatrixRow,
  ProductId,
  RoleId,
  SupervisorTest,
  SurveyQuestionSet,
  TraceChain,
  TraceKind,
  WeeklySampleItem,
} from '../types'

/**
 * Hooks for the v39/v40 features (docs/V40_FOUNDATION_API.md). Same repository seam as `queries.ts`:
 * each fetch is the call a real API replaces later; components call the `use*` hooks only.
 */

export { useEnvScope } from './envScope'

const LATENCY_MS = 150

/** The rules configuration read as plain values (patterns, windows, working week, calling hours). Defaults while loading. */
export function useRules(): RulesBag {
  // The mock registers are edited in place, so `data` keeps its identity after an edit: `dataUpdatedAt` is the change signal.
  const { data, dataUpdatedAt } = useRulesConfig()
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => rulesFromConfig(data ?? []), [data, dataUpdatedAt])
}

// --- Data feeds and the "Data as of" bar (F13, F14) -------------------------------------------------

export const useFeeds = () =>
  useQuery({
    queryKey: ['feeds'],
    queryFn: async (): Promise<DataFeed[]> => {
      await latency(LATENCY_MS)
      return mock.MOCK_FEEDS.map((f) => ({ ...f }))
    },
  })

/** Feeds in scope of the environment switch (shared feeds plus the selected CRM, or all three), the "as of" time and the late count. */
export function useFeedScope() {
  const { env } = useEnvScope()
  return useQuery({
    queryKey: ['feeds'],
    queryFn: async (): Promise<DataFeed[]> => {
      await latency(LATENCY_MS)
      return mock.MOCK_FEEDS.map((f) => ({ ...f }))
    },
    select: (feeds): FeedScope => summariseFeeds(feeds, env),
  })
}

// --- CRM mapping (F15) -------------------------------------------------------------------------------

export const useCrmMapping = () =>
  useQuery({
    queryKey: ['crm-mapping'],
    queryFn: async (): Promise<CrmMapping> => {
      await latency(LATENCY_MS)
      return { rows: mock.MOCK_MAPPING.rows.map((r) => ({ ...r })), options: mock.MOCK_MAPPING.options }
    },
  })

/** Edit one mapping row (CX manager and Internal Audit and Marketing Lead only: the page enforces it with `canEditMapping`). */
export function useSaveMapping() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { kind: MappingKind; crmValue: string; portalValue: string }) => {
      await latency(LATENCY_MS)
      const row = mock.MOCK_MAPPING.rows.find((r) => r.kind === input.kind && r.crmValue === input.crmValue)
      if (!row) throw new Error('Mapping row not found')
      if (!mock.MOCK_MAPPING.options[input.kind].some((o) => o.id === input.portalValue)) throw new Error('Unknown portal value')
      row.portalValue = input.portalValue
      return { ...row }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-mapping'] }),
  })
}

// --- Escalation matrix (F22) -----------------------------------------------------------------------------

/** The ten rows of one product's matrix (default Real Estate), every cell with its `isDefault` flag. */
export const useMatrix = (product: ProductId = 're') =>
  useQuery({
    queryKey: ['matrix', product],
    queryFn: async (): Promise<MatrixRow[]> => {
      await latency(LATENCY_MS)
      return mock.MOCK_MATRIX[product].map((r) => ({ ...r, cells: { ...r.cells }, isDefault: { ...r.isDefault } }))
    },
  })

/**
 * Edit one cell. Text cells take a string typed in the active language (the other language keeps its
 * default until someone edits it) or null for "nobody"; the clock cells take a number of working hours or null.
 */
export function useSaveMatrixCell() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { product: ProductId; kind: MatrixKind; field: MatrixField; value: string | number | null; lang?: Lang }) => {
      await latency(LATENCY_MS)
      const row = mock.MOCK_MATRIX[input.product].find((r) => r.kind === input.kind)
      if (!row) throw new Error('Matrix row not found')
      if (input.field === 'respondH' || input.field === 'resolveH') {
        row.cells[input.field] = typeof input.value === 'number' ? input.value : null
      } else {
        const text = typeof input.value === 'string' ? input.value.trim() : ''
        const current = row.cells[input.field]
        row.cells[input.field] = text ? { en: input.lang === 'ar' ? (current?.en ?? text) : text, ar: input.lang === 'ar' ? text : (current?.ar ?? text) } : null
      }
      row.isDefault[input.field] = false
      return { ...row, cells: { ...row.cells }, isDefault: { ...row.isDefault } }
    },
    onSuccess: (_row, v) => qc.invalidateQueries({ queryKey: ['matrix', v.product] }),
  })
}

/** The line on a fix before the Classification card: the fix's product, its kind's row. Undefined until loaded. */
export function useFixMatrixLine(fix?: Pick<CorrectiveAction, 'kind' | 'product'>): FixMatrixLine | undefined {
  const product = fix?.product ?? 're'
  const { data } = useMatrix(product)
  if (!fix || !data) return undefined
  const kind = MATRIX_KEY_BY_FIX_KIND[fix.kind]
  const row = data.find((r) => r.kind === kind)
  return row ? { product, kind, row } : undefined
}

// --- Survey questions (F23) -----------------------------------------------------------------------------------

/** The question sets of one product, or every set when `product` is omitted. A product with none returns an empty list. */
export const useQuestionSets = (product?: ProductId) =>
  useQuery({
    queryKey: ['question-sets', product ?? 'all'],
    queryFn: async (): Promise<SurveyQuestionSet[]> => {
      await latency(LATENCY_MS)
      return mock.MOCK_QUESTION_SETS.filter((s) => !product || s.product === product)
    },
  })

// --- Indicators and the brief (F03, F09) ------------------------------------------------------------------

/** NPS, CSAT, CES, answers and the change on last month, per live product. One source for the Home tiles, the Overview and the brief. */
export function useIndicators(): { data: IndicatorSet[] | undefined; isLoading: boolean } {
  // The product list is edited in place (launch toggle), so `dataUpdatedAt` is the change signal, not the array identity.
  const { data: products, isLoading: l1, dataUpdatedAt } = useProducts()
  const { data: rows, isLoading: l2 } = useVocRows()
  const { data: trend, isLoading: l3 } = useNpsTrend()
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  const data = useMemo(() => (products && rows && trend ? liveIndicators(products, rows, trend, CES_SAMPLE) : undefined), [products, rows, trend, dataUpdatedAt])
  return { data, isLoading: l1 || l2 || l3 }
}

const DAY_MS = 86_400_000

/** The numbers the Daily brief reads: the same registers the pages show. (The brief text is workstream A's `utils/brief.ts`.) */
export function useBriefInputs(): { data: BriefInputs | undefined; isLoading: boolean } {
  const now = useNow()
  const rules = useRules()
  const { data: signals, isLoading: l1, dataUpdatedAt: t1 } = useSignals()
  const { data: patterns, isLoading: l2, dataUpdatedAt: t2 } = usePatterns()
  const { data: fixes, isLoading: l3, dataUpdatedAt: t3 } = useCorrectiveActions()
  const { data: cases, isLoading: l4, dataUpdatedAt: t4 } = useShopperCases()
  const { data: loop, isLoading: l5, dataUpdatedAt: t5 } = useDetractorCallItems()
  const { data: persons, isLoading: l6 } = usePersons()
  const { data: allPersons } = usePersonsAll()
  const { data: interactions, isLoading: l7 } = useAllInteractions()
  const { data: effort, isLoading: l8 } = useEffortSummaries()
  const { data: mentions, isLoading: l9, dataUpdatedAt: t9 } = usePublicMentions()
  const { data: sample, isLoading: l10 } = useWeeklySample()
  // The registers are edited in place, so their identity does not change after an edit: these stamps do.
  const stamp = [t1, t2, t3, t4, t5, t9].join('.')

  const data = useMemo<BriefInputs | undefined>(() => {
    if (!signals || !patterns || !fixes || !cases || !loop || !persons || !allPersons || !interactions || !effort || !mentions || !sample) return undefined
    const windowDays = rules.patterns.windowDays
    const closed = (s: CorrectiveActionStatus) => s === 'effective' || s === 'partial' || s === 'failed'
    const patternIdsWithFix = new Set(fixes.map((f) => f.patternId).filter(Boolean))
    const open = loop.filter((l) => l.status !== 'done' && !allPersons.find((p) => p.id === l.personId)?.consent.dncr)
    const byPerson = new Map<string, typeof interactions>()
    for (const i of interactions) byPerson.set(i.personKey, [...(byPerson.get(i.personKey) ?? []), i])
    const drifting = persons.filter((p) => classifyRunaway(p, effort.find((e) => e.personId === p.id), byPerson.get(p.id) ?? [])).length
    const negative = mentions.filter((m) => m.sentiment < 0).length
    const replied = mentions.filter((m) => m.replyHours != null)
    return {
      windowDays,
      signals: {
        inWindow: signals.filter((s) => now - Date.parse(s.occurredAt) <= windowDays * DAY_MS).length,
        patternsOverLine: patterns.filter((p) => p.currentValue >= p.thresholdTarget).length,
        patternsWaitingForFix: patterns.filter((p) => p.currentValue >= p.thresholdTarget && !patternIdsWithFix.has(p.id)).length,
      },
      fixes: {
        proposed: fixes.filter((f) => f.status === 'proposed').length,
        inProgress: fixes.filter((f) => f.status === 'approved' || f.status === 'in_progress').length,
        late: fixes.filter((f) => !closed(f.status) && f.status !== 'verification' && Date.parse(f.dueDate) < now).length,
        effective: fixes.filter((f) => f.status === 'effective').length,
        failed: fixes.filter((f) => f.status === 'failed').length,
      },
      shopper: {
        open: cases.filter((c) => c.status !== 'closed').length,
        late: cases.filter((c) => c.status !== 'closed' && Date.parse(c.resolveDueAt) < now).length,
      },
      loop: {
        open: open.length,
        critical: open.filter((l) => l.severity === 'critical').length,
        recoveredByPhonePct: recoveryRate(loop.filter((l) => l.channel === 'human'), now).pct,
        recoveredByAiPct: recoveryRate(loop.filter((l) => l.channel === 'ai_campaign'), now).pct,
      },
      people: { drifting, total: persons.length },
      publicMentions: {
        last30: mentions.length,
        overdue: publicReplyBreaches(mentions, now, rules.publicReplyHours).length,
        negativePct: mentions.length ? Math.round((negative / mentions.length) * 100) : null,
        avgReplyHours: replied.length ? Math.round(replied.reduce((s, m) => s + (m.replyHours as number), 0) / replied.length) : null,
        target: rules.publicReplyHours,
      },
      ldFixes: fixes.filter((f) => f.kind === 'training_gap' && !closed(f.status)).length,
      conductNotes: fixes.filter((f) => f.kind === 'employee').length,
      sample: { toRead: sample.size, read: sample.read },
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [signals, patterns, fixes, cases, loop, persons, allPersons, interactions, effort, mentions, sample, rules, now, stamp])

  return { data, isLoading: l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8 || l9 || l10 }
}

// --- My inbox (F20) --------------------------------------------------------------------------------------------

/** Everything on the signed-in role, ordered by urgency; `stats` feeds "Your work today". */
export function useInbox(): { data: InboxItem[] | undefined; isLoading: boolean; stats: { total: number; urgent: number } } {
  const { role } = useRole()
  const now = useNow()
  const rules = useRules()
  const { data: fixes, isLoading: l1, dataUpdatedAt: t1 } = useCorrectiveActions()
  const { data: patterns, isLoading: l2 } = usePatternsAll()
  const { data: loop, isLoading: l3, dataUpdatedAt: t3 } = useDetractorCallItems()
  const { data: investigations, isLoading: l4, dataUpdatedAt: t4 } = useInvestigations()
  const { data: campaigns, isLoading: l5, dataUpdatedAt: t5 } = useAiCampaigns()
  const { data: persons, isLoading: l6 } = usePersonsAll()
  const { data: sample, isLoading: l7 } = useWeeklySample()
  // The registers are edited in place, so their identity does not change after an edit: these stamps do.
  const stamp = [t1, t3, t4, t5].join('.')
  const data = useMemo(() => {
    if (!fixes || !patterns || !loop || !investigations || !campaigns || !persons || !sample) return undefined
    return buildInbox({
      role: role.id,
      today: new Date(now),
      rules,
      roleEnvironment: role.environment,
      fixes,
      patterns,
      loopItems: loop,
      investigations,
      campaigns,
      persons,
      sampleRead: sample.read,
      sampleSize: sample.size,
      sampleDue: sample.due,
    })
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [role.id, role.environment, now, rules, fixes, patterns, loop, investigations, campaigns, persons, sample, stamp])
  const stats = useMemo(() => workTodayStats(data ?? []), [data])
  return { data, isLoading: l1 || l2 || l3 || l4 || l5 || l6 || l7, stats }
}

// --- Trace (F10, F11) -------------------------------------------------------------------------------------------

/** The four registers indexed once for chain walks. Not narrowed by the environment switch. */
export function useTraceIndex() {
  const interactions = useAllInteractions()
  const signals = useSignalsAll()
  const patterns = usePatternsAll()
  const fixes = useCorrectiveActionsAll()
  const index = useMemo(
    () =>
      interactions.data && signals.data && patterns.data && fixes.data
        ? traceIndexFor({ interactions: interactions.data, signals: signals.data, patterns: patterns.data, fixes: fixes.data })
        : undefined,
    // dataUpdatedAt: the mock registers are mutated in place, so the array identity alone is not a change signal.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [interactions.dataUpdatedAt, signals.dataUpdatedAt, patterns.dataUpdatedAt, fixes.dataUpdatedAt],
  )
  // A change signal for derived data (a fix changing status does not rebuild the index, but it changes every chain through it).
  const version = [interactions.dataUpdatedAt, signals.dataUpdatedAt, patterns.dataUpdatedAt, fixes.dataUpdatedAt].join('.')
  return { index, version, isLoading: interactions.isLoading || signals.isLoading || patterns.isLoading || fixes.isLoading }
}

/** The chain EV, SG, PT, CA, VR, RP from any record. `id` is the internal id or the display id (`SG-12`). */
export function useTrace(kind: TraceKind, id: string | null | undefined): { data: TraceChain | null | undefined; isLoading: boolean } {
  const { index, version, isLoading } = useTraceIndex()
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  const data = useMemo(() => (index && id ? chainFrom(kind, id, index) : index ? null : undefined), [index, kind, id, version])
  return { data, isLoading }
}

/** One signal for the detail modal: the record, its display id and the chain. Null when unknown. */
export function useSignalDetail(id: string | null | undefined) {
  const { index, version, isLoading } = useTraceIndex()
  const signal = useMemo(() => {
    if (!index || !id) return undefined
    const ref = resolveTraceRef(id, index)
    return ref?.kind === 'signal' ? (index.signalById.get(ref.id) ?? null) : null
  }, [index, id])
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  const chain = useMemo(() => (index && signal ? chainFrom('signal', signal.id, index) : null), [index, signal, version])
  return { signal, chain, traceId: signal ? sgId(signal.id) : null, isLoading }
}

/**
 * Opens a trace id from any page (F11). A signal opens the detail modal through the \`?sg=\` search param (mounted
 * once in Shell by \`<TraceHost/>\`); an event opens the person's journey scrolled to it (\`?ev=\`); a pattern, a fix
 * (or its check) and the report open their pages. \`canOpen\` says whether the signed-in role may open that page.
 */
export function useTraceNav() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { role } = useRole()
  const { index } = useTraceIndex()

  const routeFor = useCallback(
    (kind: TraceKind, id: string): string | null => {
      const ref = index ? resolveTraceRef(id, index) : null
      const internal = ref?.id ?? id
      if (kind === 'signal') return null
      const personId = kind === 'event' && index ? index.interactionById.get(internal)?.personKey : undefined
      return traceRoute(kind, internal, { personId })
    },
    [index],
  )

  const canOpen = useCallback(
    (kind: TraceKind, id: string): boolean => {
      if (kind === 'signal') return true
      const route = routeFor(kind, id)
      return route ? canAccessPath(role.id, route.split('?')[0].split('#')[0]) : false
    },
    [routeFor, role.id],
  )

  const open = useCallback(
    (kind: TraceKind, id: string) => {
      if (kind === 'signal') {
        const ref = index ? resolveTraceRef(id, index) : null
        const next = new URLSearchParams(params)
        next.set('sg', sgId(ref?.id ?? id))
        setParams(next)
        return
      }
      const route = routeFor(kind, id)
      if (route) navigate(route)
    },
    [index, params, setParams, routeFor, navigate],
  )

  const close = useCallback(() => {
    const next = new URLSearchParams(params)
    next.delete('sg')
    setParams(next, { replace: true })
  }, [params, setParams])

  return { openSignalId: params.get('sg'), open, close, canOpen, routeFor }
}

// --- Fix status and evidence (F21, F26) ---------------------------------------------------------------------

/** Moves a fix to another status and writes the audit line (owner marks done, Agent 6 verdict, ...). The signed-in role is the actor. */
export function useSetFixStatus() {
  const qc = useQueryClient()
  const { role } = useRole()
  return useMutation({
    mutationFn: async (input: { id: string; status: CorrectiveActionStatus; byRole?: RoleId | 'system' }) => {
      await latency(LATENCY_MS)
      const fix = mock.MOCK_CORRECTIVE_ACTIONS.find((f) => f.id === input.id)
      if (!fix) throw new Error('Corrective action not found')
      fix.status = input.status
      // Approval starts the due-date clock (matrix Resolve (h) in working hours); marking done starts the 60-day check.
      if (input.status === 'approved') applyApprovalClock(fix)
      if (input.status === 'verification') applyDoneClock(fix)
      if (input.status === 'effective' || input.status === 'partial' || input.status === 'failed') fix.verificationResult = input.status
      fix.auditLog.push(statusAudit(input.status, input.byRole ?? role.id))
      return fix
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['corrective-actions'] }),
  })
}

export interface InvestigationEvidence {
  investigationId: string
  /** `INV-n` */
  traceId: string
  result: Bi
}

/** Evidence from returned investigations, by pattern id: the green "Evidence from investigation · INV-1: ..." line on the pattern card. */
export function useInvestigationEvidence(): { data: Record<string, InvestigationEvidence> | undefined; isLoading: boolean } {
  const { data: investigations, isLoading, dataUpdatedAt } = useInvestigations()
  const data = useMemo(() => {
    if (!investigations) return undefined
    const out: Record<string, InvestigationEvidence> = {}
    for (const inv of investigations) {
      if (inv.status === 'returned' && inv.patternId && inv.result) {
        out[inv.patternId] = { investigationId: inv.id, traceId: `INV-${inv.id.replace(/\D+/g, '')}`, result: inv.result }
      }
    }
    return out
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [investigations, dataUpdatedAt])
  return { data, isLoading }
}

// --- Weekly sample (F31) -------------------------------------------------------------------------------------------

export interface WeeklySample {
  items: WeeklySampleItem[]
  size: number
  read: number
  /** Each wrong verdict becomes a new test for the supervisor. */
  wrong: number
  /** Share of the outputs read that were right, null before any is read. */
  accuracyPct: number | null
  /** Due date 'YYYY-MM-DD': every Thursday (the prototype's own date was a Friday). [Proposed] */
  due: string
}

export const useWeeklySample = () =>
  useQuery({
    queryKey: ['weekly-sample'],
    queryFn: async (): Promise<WeeklySample> => {
      await latency(LATENCY_MS)
      const items = mock.MOCK_WEEKLY_SAMPLE.map((i) => ({ ...i }))
      const read = items.filter((i) => i.verdict !== null).length
      const wrong = items.filter((i) => i.verdict === false).length
      return { items, size: mock.MOCK_WEEKLY_SAMPLE_SIZE, read, wrong, accuracyPct: read ? Math.round(((read - wrong) / read) * 100) : null, due: nextWeekday(new Date(), 4) }
    },
  })

/** Right or wrong on one output. [Proposed] CX manager, CX team and Internal Audit and Marketing Lead may judge (`canJudgeSample`). */
export function useJudgeSample() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; right: boolean }) => {
      await latency(LATENCY_MS)
      const item = mock.MOCK_WEEKLY_SAMPLE.find((i) => i.id === input.id)
      if (!item) throw new Error('Sample item not found')
      item.verdict = input.right
      item.judgedAt = new Date().toISOString()
      // A "wrong" lowers that agent's pass rate and becomes a supervisor test (decided 18 Nov); a changed verdict gives them back.
      syncSampleEffects(mock.MOCK_WEEKLY_SAMPLE, mock.MOCK_SUPERVISOR_TESTS, AGENT_JDS)
      return { ...item }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weekly-sample'] })
      qc.invalidateQueries({ queryKey: ['agent-pass-rates'] })
      qc.invalidateQueries({ queryKey: ['supervisor-tests'] })
      qc.invalidateQueries({ queryKey: ['agent-jds'] })
    },
  })
}

/** Pass rate per agent in the sample: before and after the week's "wrong" verdicts (see `utils/passRate.ts`). The agents page reads the same figure from `AGENT_JDS`. */
export const useAgentPassRates = () =>
  useQuery({
    queryKey: ['agent-pass-rates'],
    queryFn: async (): Promise<AgentPassRate[]> => {
      await latency(LATENCY_MS)
      const base: Record<number, number | null> = {}
      for (const jd of AGENT_JDS) base[jd.id] = jd.baseApprovalPct ?? jd.approvalPct
      return agentPassRates(mock.MOCK_WEEKLY_SAMPLE, base)
    },
  })

/** The tests the supervisor gained from "wrong" verdicts, newest last. */
export const useSupervisorTests = () =>
  useQuery({
    queryKey: ['supervisor-tests'],
    queryFn: async (): Promise<SupervisorTest[]> => {
      await latency(LATENCY_MS)
      return mock.MOCK_SUPERVISOR_TESTS.map((t) => ({ ...t }))
    },
  })

// --- Fix clocks (decided 18 Nov) -------------------------------------------------------------------------------------

/**
 * The due date of a fix. Once approved it is the stored one (`dueSource` 'matrix' or 'fallback'); before that, a preview
 * of what approval now would give: the matrix "Resolve (h)" for its product and kind in working hours, or Agent 5's 14 days
 * when the cell is empty. `preview` says which. Undefined until the matrix has loaded.
 */
export function useFixDue(fix?: Pick<CorrectiveAction, 'kind' | 'product' | 'dueDate' | 'dueSource'>): (FixDue & { preview: boolean }) | undefined {
  const rules = useRules()
  const now = useNow()
  const { data: rows } = useMatrix(fix?.product ?? 're')
  if (!fix) return undefined
  if (fix.dueSource) return { dueAt: fix.dueDate, source: fix.dueSource, preview: false }
  if (!rows) return undefined
  const resolveH = rows.find((r) => r.kind === MATRIX_KEY_BY_FIX_KIND[fix.kind])?.cells.resolveH ?? null
  return { ...fixDue(now, resolveH, rules), preview: true }
}

// --- Public mentions (F30) -------------------------------------------------------------------------------------------

/** Mentions with no reply past the reply clock (48 h): CX raises a signal for each (decided 18 Nov). Marketing owns the reply. */
export function usePublicReplyBreaches() {
  const { data, isLoading } = usePublicMentions()
  const rules = useRules()
  const now = useNow()
  const breaches = useMemo(() => (data ? publicReplyBreaches(data, now, rules.publicReplyHours) : undefined), [data, now, rules.publicReplyHours])
  return { data: breaches, isLoading }
}

/** "Mark replied": reply hours = days since the mention x 24, at least 1 (the prototype's rule); the reputation index updates. CX roles and Marketing only. */
export function useMarkReplied() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string }) => {
      await latency(LATENCY_MS)
      const { PUBLIC_MENTIONS } = await import('../data/v38Reference')
      const m = PUBLIC_MENTIONS.find((x) => x.id === input.id)
      if (!m) throw new Error('Public mention not found')
      const days = Math.max(0, Math.floor((Date.now() - Date.parse(m.date)) / DAY_MS))
      m.replied = true
      m.replyHours = Math.max(1, days * 24)
      m.repliedAt = new Date().toISOString()
      return { ...m }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['public-mentions'] }),
  })
}

// --- Close the loop: no answer (F27) ----------------------------------------------------------------------------------

/**
 * "No answer": attempts + 1, next attempt the following working day; on the last attempt a WhatsApp message goes
 * out and the row becomes "needs a human" (still open). Refuses a DNCR person. Resolves with the updated row, the
 * result and the toast text to show.
 */
export function useRecordNoAnswer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string }) => {
      await latency(LATENCY_MS)
      const item = mock.MOCK_DETRACTOR_CALL_ITEMS.find((d) => d.id === input.id)
      if (!item) throw new Error('Detractor call item not found')
      if (mock.MOCK_PERSONS.find((p) => p.id === item.personId)?.consent.dncr) throw new Error('DNCR: no calls, no surveys by call')
      if (item.status === 'done') throw new Error('This call is already done')
      const rules = callRulesFrom(rulesFromConfig(mock.MOCK_RULES_CONFIG))
      const result = recordNoAnswer(item, new Date(), rules)
      item.attempts = result.attempts
      item.status = result.status
      item.nextAttemptOn = result.nextAttemptOn
      const toast: Bi = result.needsHuman ? CALL_COPY.noAnswerLast(result.attempts) : CALL_COPY.noAnswerMore(result.nextAttemptOn as string)
      return { item: { ...item }, result, toast }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['detractor-call-items'] }),
  })
}
