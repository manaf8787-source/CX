import type {
  CorrectiveAction,
  CorrectiveActionStatus,
  Interaction,
  Pattern,
  Signal,
  TraceChain,
  TraceEventRef,
  TraceKind,
  TraceSignalRef,
} from '../types'
import { TRACE_COPY } from '../data/steps'

/**
 * Trace ids on one chain: event EV, signal SG, pattern PT, fix CA, check VR, report RP (v40 F10).
 * Internal ids (i-0001, sig-0001, pat-key, ca-1) never change; these are the display ids.
 */

/** The last run of digits in an id, or NaN. */
function lastNumber(id: string): number {
  const m = /(\d+)(?!.*\d)/.exec(id)
  return m ? Number(m[1]) : Number.NaN
}

/** `i-0012` -> `EV-12`. Interactions added at run time (`i-ctl-dcl-3-121`) end in their running number. */
export function evId(interactionId: string): string {
  const n = lastNumber(interactionId)
  return Number.isNaN(n) ? interactionId.toUpperCase() : `EV-${n}`
}

/** `sig-0007` -> `SG-7`. A public mention keeps its `PUB-3nn` id (no person, no events). */
export function sgId(signalId: string): string {
  if (/^PUB-/i.test(signalId)) return signalId.toUpperCase()
  const n = lastNumber(signalId)
  return Number.isNaN(n) ? signalId.toUpperCase() : `SG-${n}`
}

/** `ca-1` -> `CA-201` (fix ids run CA-2nn in the prototype). */
export function caId(fixId: string): string {
  const n = lastNumber(fixId)
  return Number.isNaN(n) ? fixId.toUpperCase() : `CA-${200 + n}`
}

/** The check of a fix carries the fix number: `ca-1` -> `VR-201`. */
export function vrId(fixId: string): string {
  const n = lastNumber(fixId)
  return Number.isNaN(n) ? fixId.toUpperCase() : `VR-${200 + n}`
}

/** `inv-3` -> `INV-3`. */
export function invId(investigationId: string): string {
  const n = lastNumber(investigationId)
  return Number.isNaN(n) ? investigationId.toUpperCase() : `INV-${n}`
}

/** The monthly report the chain ends in (fixed in the prototype). [Proposed] stays fixed until a real report register exists. */
export const RP_ID = 'RP-2026-11'

/** `p-005` -> `P-005`: a person reference that carries no name (weekly sample for roles that may not see names). */
export function personRef(personId: string): string {
  return personId.toUpperCase()
}

function fnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** `PT-nnn` from a stable pattern key (100 + hash mod 900). Two keys can collide: use `patternTraceIds` for a set. */
export function ptId(key: string): string {
  return `PT-${100 + (fnv1a(key) % 900)}`
}

/**
 * `PT-nnn` for a whole set of pattern keys, with collisions probed away in sorted key order, so
 * the same set always gives the same ids and no two patterns share one (the prototype's ids collide).
 */
export function patternTraceIds(keys: readonly string[]): Map<string, string> {
  const taken = new Set<number>()
  const out = new Map<string, string>()
  for (const key of [...keys].sort()) {
    let n = fnv1a(key) % 900
    for (let guard = 0; taken.has(n) && guard < 900; guard++) n = (n + 1) % 900
    taken.add(n)
    out.set(key, `PT-${100 + n}`)
  }
  return out
}

/** Display id of a record of any kind. For patterns pass the pattern's `traceId` yourself; this hashes the key. */
export function displayId(kind: TraceKind, id: string): string {
  switch (kind) {
    case 'event':
      return evId(id)
    case 'signal':
      return sgId(id)
    case 'pattern':
      return ptId(id)
    case 'fix':
      return caId(id)
    case 'check':
      return vrId(id)
    case 'report':
      return RP_ID
  }
}

/** True for a display id written the canonical (upper case) way, `EV-12`. Internal ids such as `ca-1` or `sig-0007` are not display ids even when they look similar. */
export function isDisplayId(text: string): boolean {
  return text === text.toUpperCase() && kindOfTraceId(text) !== null
}

/** Which kind a display id belongs to (`EV-12` -> event), or null when it is not a trace id. */
export function kindOfTraceId(text: string): TraceKind | null {
  const t = text.trim().toUpperCase()
  if (/^EV-\d+$/.test(t)) return 'event'
  if (/^(SG-\d+|PUB-\d+)$/.test(t)) return 'signal'
  if (/^PT-\d+$/.test(t)) return 'pattern'
  if (/^CA-\d+$/.test(t)) return 'fix'
  if (/^VR-\d+$/.test(t)) return 'check'
  if (/^RP-\d{4}-\d{2}$/.test(t)) return 'report'
  return null
}

// --- The chain ---------------------------------------------------------------

export interface TraceData {
  interactions: Interaction[]
  signals: Signal[]
  patterns: Pattern[]
  fixes: CorrectiveAction[]
}

export interface TraceIndex {
  interactionById: Map<string, Interaction>
  signalById: Map<string, Signal>
  signalsByEvent: Map<string, Signal[]>
  patternById: Map<string, Pattern>
  patternsBySignal: Map<string, Pattern[]>
  fixById: Map<string, CorrectiveAction>
  fixesByPattern: Map<string, CorrectiveAction[]>
  /** `EV-12` -> { event, 'i-0012' }, `SG-7`, `PT-123`, `CA-201`, `VR-201` (-> the fix id), `RP-2026-11`. */
  byTraceId: Map<string, { kind: TraceKind; id: string }>
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}

/** Indexes the registers once so a chain walk is a few lookups, not a scan per call. */
export function buildTraceIndex(data: TraceData): TraceIndex {
  const ix: TraceIndex = {
    interactionById: new Map(),
    signalById: new Map(),
    signalsByEvent: new Map(),
    patternById: new Map(),
    patternsBySignal: new Map(),
    fixById: new Map(),
    fixesByPattern: new Map(),
    byTraceId: new Map(),
  }
  for (const i of data.interactions) {
    ix.interactionById.set(i.id, i)
    ix.byTraceId.set(evId(i.id), { kind: 'event', id: i.id })
  }
  for (const s of data.signals) {
    ix.signalById.set(s.id, s)
    ix.byTraceId.set(sgId(s.id), { kind: 'signal', id: s.id })
    for (const e of s.eventIds) push(ix.signalsByEvent, e, s)
  }
  for (const p of data.patterns) {
    ix.patternById.set(p.id, p)
    ix.byTraceId.set(p.traceId, { kind: 'pattern', id: p.id })
    for (const sid of p.signalIds) push(ix.patternsBySignal, sid, p)
  }
  for (const f of data.fixes) {
    ix.fixById.set(f.id, f)
    ix.byTraceId.set(caId(f.id), { kind: 'fix', id: f.id })
    ix.byTraceId.set(vrId(f.id), { kind: 'check', id: f.id })
    if (f.patternId) push(ix.fixesByPattern, f.patternId, f)
  }
  ix.byTraceId.set(RP_ID, { kind: 'report', id: RP_ID })
  return ix
}

let lastData: TraceData | null = null
let lastIndex: TraceIndex | null = null
let lastLengths = ''
const lengthKey = (d: TraceData) => `${d.interactions.length}.${d.signals.length}.${d.patterns.length}.${d.fixes.length}`

/** `buildTraceIndex` for the same four arrays is computed once. */
export function traceIndexFor(data: TraceData): TraceIndex {
  if (
    lastData &&
    lastIndex &&
    lastData.interactions === data.interactions &&
    lastData.signals === data.signals &&
    lastData.patterns === data.patterns &&
    lastData.fixes === data.fixes &&
    // The mock registers grow in place (a new fix, a new interview event): a changed length is a change.
    lastLengths === lengthKey(data)
  ) {
    return lastIndex
  }
  lastData = data
  lastLengths = lengthKey(data)
  lastIndex = buildTraceIndex(data)
  return lastIndex
}

/** Fix statuses from which the 60-day check exists (VR). */
const CHECK_STATUSES: ReadonlySet<CorrectiveActionStatus> = new Set(['verification', 'effective', 'partial', 'failed'])
/** Fix statuses from which the report line exists (RP): a verdict that counts in the pack. [Proposed] (prototype: effective or failed). */
const REPORT_STATUSES: ReadonlySet<CorrectiveActionStatus> = new Set(['effective', 'failed'])

export function fixHasCheck(status: CorrectiveActionStatus): boolean {
  return CHECK_STATUSES.has(status)
}
export function fixHasReport(status: CorrectiveActionStatus): boolean {
  return REPORT_STATUSES.has(status)
}

const byTime = <T extends { occurredAt: string; id: string }>(a: T, b: T) => a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id)

function eventRef(i: Interaction): TraceEventRef {
  return { id: i.id, traceId: evId(i.id), channel: i.channel, occurredAt: i.occurredAt, personId: i.personKey }
}

function signalRef(s: Signal): TraceSignalRef {
  return { id: s.id, traceId: sgId(s.id), occurredAt: s.occurredAt, kind: s.kind }
}

/**
 * Walks the chain from any record: an event, a signal, a pattern, a fix, a check or the report.
 * `id` may be the internal id or the display id (`SG-12`). Returns null when the record is unknown.
 * A pattern is chosen for an event or signal that sits in several (the first that has a fix, else the first);
 * the check and the report are derived from the fix's status.
 */
export function chainFrom(kind: TraceKind, id: string, ix: TraceIndex): TraceChain | null {
  const mapped = lookupDisplay(ix, id)
  const rec = mapped && mapped.kind === kind ? mapped.id : id
  let seed: Signal[] = []
  let events: Interaction[] = []
  let pattern: Pattern | undefined
  let fix: CorrectiveAction | undefined
  let publicMention = false

  const eventsOf = (signals: Signal[]) => {
    const seen = new Set<string>()
    const out: Interaction[] = []
    for (const s of signals) {
      for (const e of s.eventIds) {
        const rec2 = ix.interactionById.get(e)
        if (rec2 && !seen.has(rec2.id)) {
          seen.add(rec2.id)
          out.push(rec2)
        }
      }
    }
    return out.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
  }
  const pickPattern = (signals: Signal[]) => {
    const candidates = signals.flatMap((s) => ix.patternsBySignal.get(s.id) ?? [])
    return candidates.find((p) => (ix.fixesByPattern.get(p.id) ?? []).length > 0) ?? candidates[0]
  }

  switch (kind) {
    case 'event': {
      const e = ix.interactionById.get(rec)
      if (!e) return null
      events = [e]
      seed = ix.signalsByEvent.get(e.id) ?? []
      pattern = pickPattern(seed)
      break
    }
    case 'signal': {
      const s = ix.signalById.get(rec)
      if (!s) return null
      seed = [s]
      events = eventsOf(seed)
      publicMention = s.kind === 'public_mention'
      pattern = pickPattern(seed)
      break
    }
    case 'pattern': {
      pattern = ix.patternById.get(rec)
      if (!pattern) return null
      seed = pattern.signalIds.map((sid) => ix.signalById.get(sid)).filter((s): s is Signal => !!s)
      events = eventsOf(seed)
      break
    }
    case 'fix':
    case 'check': {
      fix = ix.fixById.get(rec)
      if (!fix) return null
      pattern = fix.patternId ? ix.patternById.get(fix.patternId) : undefined
      seed = pattern ? pattern.signalIds.map((sid) => ix.signalById.get(sid)).filter((s): s is Signal => !!s) : []
      events = eventsOf(seed)
      break
    }
    case 'report': {
      const verdict = [...ix.fixById.values()].find((f) => REPORT_STATUSES.has(f.status))
      return {
        from: { kind, id: RP_ID },
        events: [],
        signals: [],
        fix: verdict ? { id: verdict.id, traceId: caId(verdict.id), status: verdict.status } : undefined,
        check: verdict ? { traceId: vrId(verdict.id), fixId: verdict.id, dueAt: verdict.verificationDueAt, status: verdict.status } : undefined,
        report: { traceId: RP_ID, label: TRACE_COPY.reportLabel },
        publicMention: false,
      }
    }
  }

  if (!fix && pattern) fix = ix.fixesByPattern.get(pattern.id)?.[0]
  return {
    from: { kind, id: rec },
    events: events.map(eventRef),
    signals: [...seed].sort(byTime).map(signalRef),
    pattern: pattern ? { id: pattern.id, traceId: pattern.traceId, signalCount: pattern.signalIds.length } : undefined,
    fix: fix ? { id: fix.id, traceId: caId(fix.id), status: fix.status } : undefined,
    check: fix && CHECK_STATUSES.has(fix.status) ? { traceId: vrId(fix.id), fixId: fix.id, dueAt: fix.verificationDueAt, status: fix.status } : undefined,
    report: fix && REPORT_STATUSES.has(fix.status) ? { traceId: RP_ID, label: TRACE_COPY.reportLabel } : undefined,
    publicMention,
  }
}

/** A display id as typed: exact first, then upper-cased (`sg-12` in a URL), but never when the text is itself an internal id. */
function lookupDisplay(ix: TraceIndex, text: string): { kind: TraceKind; id: string } | undefined {
  const t = text.trim()
  const exact = ix.byTraceId.get(t)
  if (exact) return exact
  const internal = ix.signalById.has(t) || ix.interactionById.has(t) || ix.patternById.has(t) || ix.fixById.has(t)
  return internal ? undefined : ix.byTraceId.get(t.toUpperCase())
}

/** Looks a display id (`SG-12`, `PUB-351`, `PT-204`) or an internal id up and returns the kind and internal id, or null. */
export function resolveTraceRef(text: string, ix: TraceIndex): { kind: TraceKind; id: string } | null {
  const hit = lookupDisplay(ix, text)
  if (hit) return hit
  if (ix.signalById.has(text)) return { kind: 'signal', id: text }
  if (ix.interactionById.has(text)) return { kind: 'event', id: text }
  if (ix.patternById.has(text)) return { kind: 'pattern', id: text }
  if (ix.fixById.has(text)) return { kind: 'fix', id: text }
  return null
}

/** Where a trace id opens (F11). A signal opens a modal on the current page (`?sg=`), so it has no route here. */
export function traceRoute(kind: TraceKind, internalId: string, ctx: { personId?: string } = {}): string | null {
  switch (kind) {
    case 'event':
      return ctx.personId ? `/customers/${ctx.personId}?ev=${evId(internalId)}` : null
    case 'signal':
      return null
    case 'pattern':
      return `/actions/signals?pt=${encodeURIComponent(internalId)}#patterns`
    case 'fix':
    case 'check':
      return `/actions/corrective?fix=${caId(internalId)}`
    case 'report':
      return '/settings/monthly-pack'
  }
}
