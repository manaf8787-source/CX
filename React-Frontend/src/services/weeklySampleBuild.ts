import type { AiJourneyReading, Bi, CorrectiveAction, DetractorCallItem, Interaction, MatrixRow, Pattern, Persona, Person, ProductId, SampleCheck, SampleEvidence, Signal, WeeklySampleItem } from '../types'
import { SAMPLE_AUDIT_KIND, SAMPLE_EVIDENCE_COPY } from '../data/weeklySample'
import { ownerTitle } from '../data/ownerTitles'
import { signalCategoryLabel } from '../pages/actions/components/labels'
import { RUNAWAY_TYPE_LABEL } from '../utils/runaway'
import { REASON_CODE_LABEL, suggestReasonCode } from '../utils/closeTheLoop'
import { SEVERITY_WORD, briefSaw, countSaw, fixSaw, journeySaw, signalSaw, signalSeverity } from '../utils/sampleEvidence'
import {
  AGENT_OF_CHECK,
  READER_OF_CHECK,
  accessCard,
  accessText,
  briefCard,
  countCard,
  fixCard,
  journeyCard,
  kindCheckFor,
  matrixFor,
  routingCard,
  routingSaw,
  signalCard,
  targetingCard,
  targetingSaw,
  targetingText,
  type CardContext,
} from '../utils/sampleCards'
import { caId, sgId } from '../utils/trace'
import { patternHasVip } from '../utils/vipClock'

/**
 * The weekly sample (v40 F31, split by reader in v42.1 F32, as cards in v42.2 F34). `mockDataV40.ts` re-exports this module, so every
 * importer keeps its path. Deterministic (no random draws). All figures and names are sample data.
 */

export const WEEKLY_SAMPLE_SIZE = 50

export interface SampleInput {
  fixes: readonly CorrectiveAction[]
  signals: readonly Signal[]
  patterns: readonly Pattern[]
  loopItems: readonly DetractorCallItem[]
  persons: readonly Person[]
  readings: readonly AiJourneyReading[]
  /** Every event: the input an agent read (v41.1 F29). */
  interactions: readonly Interaction[]
  /** v42.1 (F32): the escalation matrix as it stood when the AI routed the fixes; a routing row compares the title a fix went to with it. */
  matrix: Readonly<Record<ProductId, readonly MatrixRow[]>>
  /** v42.1 (F32): the personas a campaign is built from; a targeting row compares the campaign's "who" and channel with the persona. */
  personas: readonly Persona[]
}

const KIND = {
  fix: { en: 'Proposed fix', ar: 'حل مقترح' },
  classification: { en: 'Classification', ar: 'تصنيف' },
  brief: { en: 'Interview brief', ar: 'ملخص مقابلة' },
  journey: { en: 'Journey reading', ar: 'قراءة رحلة' },
  count: { en: 'Signal count', ar: 'عدّ إشارة' },
} satisfies Record<string, Bi>

/** The audit rows the prototype appends: a routing row for every fix, an access row for the first 3 fixes, a targeting row for the first 4 personas. */
const ACCESS_ROWS = 3
const TARGETING_ROWS = 4

/**
 * The outputs of the week. The original fifty are the prototype's composition: every fix (Agent 5), the first 18 signals (Agent 2), the first 12
 * close-the-loop rows (Agent 8), the first 10 people (Agent 7), padded with Agent 3 signal counts. [Proposed] composition (not in the spec).
 * No text carries a customer name: items about a person carry `personId`, and the page resolves the name only for roles that may see names.
 *
 * v41.1 (F29): a row can be judged from itself. `saw` is the input the agent worked from, `text` the output in one line, and
 * `open` what the CX roles' "Open" button opens. Evidence lines come from `utils/sampleEvidence.ts`: facts, never names or text.
 *
 * v42.1 (F32): the sample is split by reader. The original fifty stay, ids unchanged, and the prototype's audit rows are appended after them
 * (ids `ws-51` on): a routing row for every fix, an access row for the first three, a targeting row for the first four personas. Each row
 * says its `check` and its `reader`; the CX team reads fixes, briefs and readings, the Internal Audit and Marketing Lead the rest.
 * v42.2 (F34): each row carries its `card` (`utils/sampleCards.ts`), built here from the same registers.
 */
export function buildWeeklySample(input: SampleInput): WeeklySampleItem[] {
  const out: WeeklySampleItem[] = []
  let capped = true
  const add = (
    check: SampleCheck,
    kind: Bi,
    saw: Bi,
    text: Bi,
    ref: string,
    card: SampleEvidence,
    extra: { open?: WeeklySampleItem['open']; personId?: string; supervisor?: Bi } = {},
  ) => {
    if (capped && out.length >= WEEKLY_SAMPLE_SIZE) return
    out.push({ id: `ws-${out.length + 1}`, agent: AGENT_OF_CHECK[check], check, reader: READER_OF_CHECK[check], card, kind, saw, text, ref, verdict: null, ...extra })
  }
  const eventsOf = new Map<string, Interaction[]>()
  const eventById = new Map<string, Interaction>()
  for (const i of input.interactions) {
    eventById.set(i.id, i)
    eventsOf.set(i.personKey, [...(eventsOf.get(i.personKey) ?? []), i])
  }
  const patternById = new Map(input.patterns.map((p) => [p.id, p]))
  const signalEvents = (s: Signal) => s.eventIds.map((id) => eventById.get(id)).filter((e): e is Interaction => !!e)
  const ctx: CardContext = { signalById: new Map(input.signals.map((s) => [s.id, s])), eventsOfSignal: signalEvents }

  for (const f of input.fixes) {
    const owner = ownerTitle(f.owner)
    const pattern = f.patternId ? patternById.get(f.patternId) : undefined
    add('fix', KIND.fix, fixSaw(f, pattern), { en: `${f.title.en} → ${owner.en}`, ar: `${f.title.ar} ← ${owner.ar}` }, caId(f.id), fixCard(f, pattern, ctx, fixSaw(f, undefined)), {
      open: { traceKind: 'fix', id: caId(f.id) },
    })
  }
  for (const s of input.signals.slice(0, 18)) {
    const label = signalCategoryLabel(s.category)
    const events = signalEvents(s)
    const severity = SEVERITY_WORD[signalSeverity(s, events)]
    add('classification', KIND.classification, signalSaw(s, events), { en: `${label.en} · ${severity.en} severity`, ar: `${label.ar} · خطورة ${severity.ar}` }, sgId(s.id), signalCard(s, events, 'classification'), {
      open: { traceKind: 'signal', id: sgId(s.id) },
    })
  }
  for (const l of input.loopItems.slice(0, 12)) {
    const events = eventsOf.get(l.personId) ?? []
    const reason = REASON_CODE_LABEL[suggestReasonCode(events)]
    const critical = l.severity === 'critical'
    add(
      'brief',
      KIND.brief,
      briefSaw(l, events),
      { en: `Reason suggested: ${reason.en}${critical ? ' · critical' : ''}`, ar: `السبب المقترح: ${reason.ar}${critical ? ' · حرج' : ''}` },
      l.id,
      briefCard(l, events, reason),
      { open: { to: `/close-the-loop?item=${l.id}` }, personId: l.personId },
    )
  }
  for (const p of input.persons.slice(0, 10)) {
    const verdict = input.readings.find((r) => r.personId === p.id)?.verdict
    const label: Bi = verdict && verdict !== 'healthy' && verdict !== 'high_effort' ? RUNAWAY_TYPE_LABEL[verdict] : verdict === 'high_effort' ? { en: 'High effort', ar: 'جهد مرتفع' } : { en: 'Healthy', ar: 'سليم' }
    const events = eventsOf.get(p.id) ?? []
    add('journey', KIND.journey, journeySaw(events), { en: `Reading: ${label.en}`, ar: `القراءة: ${label.ar}` }, p.id.toUpperCase(), journeyCard(p.id, events, label), {
      open: { to: `/customers/${p.id}` },
      personId: p.id,
    })
  }
  for (const p of input.patterns) {
    const label = signalCategoryLabel(p.category)
    add('count', KIND.count, countSaw(p), { en: `${label.en}: ${p.signalIds.length} signals`, ar: `${label.ar}: ${p.signalIds.length} إشارات` }, p.traceId, countCard(p, ctx), {
      open: { traceKind: 'pattern', id: p.traceId },
    })
  }
  for (const s of input.signals.slice(18)) {
    const label = signalCategoryLabel(s.category)
    const events = signalEvents(s)
    add('count', KIND.count, signalSaw(s, events), { en: `Counted toward ${label.en}`, ar: `مُحتسبة ضمن ${label.ar}` }, sgId(s.id), signalCard(s, events, 'count'), {
      open: { traceKind: 'signal', id: sgId(s.id) },
    })
  }

  // v42.1 (F32): the audit rows the prototype appends. Not capped: the cap is the original composition's.
  capped = false
  const E = SAMPLE_EVIDENCE_COPY
  for (const f of input.fixes) {
    const pattern = f.patternId ? patternById.get(f.patternId) : undefined
    const vip = patternHasVip(pattern, input.signals, input.persons)
    const m = matrixFor(f, input.matrix)
    const owner = ownerTitle(f.owner)
    const kindCheck = kindCheckFor(f, pattern, ctx)
    const produced: Bi = {
      en: `${f.title.en} → ${owner.en}${kindCheck ? ` · ${E.kindCheckShort.en}` : ''}`,
      ar: `${f.title.ar} ← ${owner.ar}${kindCheck ? ` · ${E.kindCheckShort.ar}` : ''}`,
    }
    add('routing', SAMPLE_AUDIT_KIND.routing, routingSaw(f, m, vip), produced, caId(f.id), routingCard(f, pattern, ctx, m, vip, fixSaw(f, undefined)), {
      open: { traceKind: 'fix', id: caId(f.id) },
      supervisor: E.supervisorRouting,
    })
  }
  for (const f of input.fixes.slice(0, ACCESS_ROWS)) {
    const pattern = f.patternId ? patternById.get(f.patternId) : undefined
    const trace = [pattern?.traceId, caId(f.id)].filter((x): x is string => !!x)
    add('access', SAMPLE_AUDIT_KIND.access, E.accessSaw, accessText(f), caId(f.id), accessCard(f, pattern, ctx, trace, fixSaw(f, undefined)), {
      open: { traceKind: 'fix', id: caId(f.id) },
      supervisor: E.supervisorAccess,
    })
  }
  input.personas.slice(0, TARGETING_ROWS).forEach((p, i) => {
    add('targeting', SAMPLE_AUDIT_KIND.targeting, targetingSaw(p), targetingText(p), `MC-${101 + i}`, targetingCard(p), { supervisor: E.supervisorTargeting })
  })
  return out
}
