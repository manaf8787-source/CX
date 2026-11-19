import type { Bi, CorrectiveAction, DetractorCallItem, Interaction, MatrixCellRow, MatrixRow, MatrixRuleRow, Pattern, Persona, Product, ProductId, SampleCheck, SampleEvidence, SampleEvidenceLine, SampleReader, Signal } from '../types'
import { CHANNEL_LABEL } from '../components/customers/channels'
import { signalCategoryLabel } from '../pages/actions/components/labels'
import { SAMPLE_EVIDENCE_COPY as C } from '../data/weeklySample'
import { MATRIX_COPY, MATRIX_KEY_BY_FIX_KIND } from '../data/escalationDefaults'
import { ownerTitle } from '../data/ownerTitles'
import { PRODUCTS } from '../data/products'
import { JOURNEY_RULES } from './journeyRules'
import { formatClockWithUnit } from './matrixFormat'
import { effectiveCells } from './vipClock'
import { SEVERITY_WORD, bi, day, join, patternRule, signalSeverity, signalSource, signalSummary, signalsInWindow } from './sampleEvidence'
import { ACTION_KIND } from '../lib/actionKinds'

/**
 * The card of one weekly-sample row (v42.2 F34, the prototype's `wsEvidence`): what the AI was given, what it decided, and one line on how.
 * Built from structured facts, one builder per kind of work. Nothing here holds a customer or agent name or a conversation text the viewer may
 * not read: a person is a `personId` (resolved for the viewer by the page), a quoted message is the per-category sample sentence or an
 * event's `conversation` text (shown to the CX manager and the CX team only, verbatim). All wording is sample data.
 */

/** Who reads each kind of row (v42.1 F32, the prototype's `wsReader`): the audit rows go to the Internal Audit and Marketing Lead, the content rows to the CX team. */
export const READER_OF_CHECK: Record<SampleCheck, SampleReader> = {
  fix: 'cx',
  brief: 'cx',
  journey: 'cx',
  classification: 'audit',
  count: 'audit',
  routing: 'audit',
  access: 'audit',
  targeting: 'audit',
}

/** Whose pass rate a row counts toward (the prototype's `agentChip`): a routing or access row is Agent 5's, a targeting row Agent 7's. */
export const AGENT_OF_CHECK: Record<SampleCheck, number> = {
  fix: 5,
  routing: 5,
  access: 5,
  classification: 2,
  count: 3,
  brief: 8,
  journey: 7,
  targeting: 7,
}

/** The registers a card is built from. */
export interface CardContext {
  signalById: ReadonlyMap<string, Signal>
  /** The events a signal was made from (empty for a public mention). */
  eventsOfSignal: (s: Signal) => readonly Interaction[]
}

/** A problem flag in words: the journey rule's label; `detractor` is a survey outcome, not a rule. */
export function flagLabel(flag: string): Bi {
  const rule = JOURNEY_RULES.find((r) => r.id === flag)
  if (rule) return rule.label
  return flag === 'detractor' ? bi('Detractor', 'غير راضٍ') : bi(flag.replace(/_/g, ' '), flag.replace(/_/g, ' '))
}

const text = (en: string, ar = en): Bi => ({ en, ar })

/** How many of ten similar closed cases recovered, read from the sentence the figure is written in ("Tried in 14 …, recovered in 10 …"). Null when it holds no figure. */
export function recoveredOutOfTen(figure: Bi | undefined): number | null {
  if (!figure) return null
  const tried = /Tried in (\d+)/i.exec(figure.en)
  const recovered = /recovered in (\d+)/i.exec(figure.en)
  if (!tried || !recovered || Number(tried[1]) === 0) return null
  return Math.round((Number(recovered[1]) / Number(tried[1])) * 10)
}

/** One quoted signal: its source and date above, the per-category sample sentence in the quote (the sample's signals carry no text of their own). */
export function signalLine(signal: Pick<Signal, 'category' | 'occurredAt'>, events: readonly Pick<Interaction, 'channel'>[]): SampleEvidenceLine {
  return { meta: join([signalSource(events), bi(day(signal.occurredAt), day(signal.occurredAt))]), quote: signalSummary(signal.category) }
}

/** What an agent given a pattern saw: the pattern with its size, then up to three of its signals, quoted with the date, then "+N more". */
export function patternGiven(pattern: Pattern, ctx: CardContext): SampleEvidenceLine[] {
  const signals = pattern.signalIds
    .map((id) => ctx.signalById.get(id))
    .filter((s): s is Signal => !!s)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  const lines: SampleEvidenceLine[] = [{ label: C.pattern, value: join([patternRule(pattern), signalsInWindow(pattern)]), strong: true }]
  for (const s of signals.slice(0, 3)) lines.push(signalLine(s, ctx.eventsOfSignal(s)))
  if (pattern.signalIds.length > 3) lines.push({ value: C.moreSignals(pattern.signalIds.length - 3) })
  return lines
}

/** The card of a classification (Agent 2) or of a single signal counted (Agent 3): the quoted message with source and date, the type and the severity. */
export function signalCard(signal: Signal, events: readonly Interaction[], check: 'classification' | 'count'): SampleEvidence {
  const severity = SEVERITY_WORD[signalSeverity(signal, events)]
  const decided: SampleEvidenceLine[] = [
    { label: C.type, value: signalCategoryLabel(signal.category), strong: true },
    { label: C.severityLabel, value: severity },
  ]
  if (check === 'count') decided.push({ value: C.countedAsSignal })
  return { given: [signalLine(signal, events)], decided, how: C.howClassify }
}

/** The card of a signal count that is a whole pattern (Agent 3): the pattern and its signals; the decision is the count. */
export function countCard(pattern: Pattern, ctx: CardContext): SampleEvidence {
  return {
    given: patternGiven(pattern, ctx),
    decided: [
      { label: C.type, value: signalCategoryLabel(pattern.category), strong: true },
      { value: signalsInWindow(pattern) },
      { value: C.countedAsSignal },
    ],
    how: C.howClassify,
  }
}

/** What the fix card says it was given: its pattern with the signals, or where else it came from. */
function fixGiven(pattern: Pattern | undefined, ctx: CardContext, fallback: Bi): SampleEvidenceLine[] {
  return pattern ? patternGiven(pattern, ctx) : [{ value: fallback }]
}

/** The card of a proposed fix (Agent 5): the pattern and its signals; the fix, its kind and the title it goes to; how often this kind recovered. */
export function fixCard(fix: CorrectiveAction, pattern: Pattern | undefined, ctx: CardContext, fallback: Bi): SampleEvidence {
  const owner = ownerTitle(fix.owner)
  const kind = ACTION_KIND[fix.kind].label
  const figure = pattern?.recoveryFigure ?? fix.fromInsight?.recovery
  const outOfTen = recoveredOutOfTen(figure)
  return {
    given: fixGiven(pattern, ctx, fallback),
    decided: [
      { value: fix.title, strong: true },
      { label: C.kind, value: join([kind, bi(`${C.to.en}: ${owner.en}`, `${C.to.ar}: ${owner.ar}`)]) },
    ],
    how: outOfTen === null ? C.howFixNoFigure : C.howFix(outOfTen),
  }
}

const productOf = (id: ProductId | undefined): Product => PRODUCTS.find((p) => p.id === (id ?? 're')) ?? PRODUCTS[0]

/** A matrix row (and the product's VIP rule) for a fix: the row of its kind in its product's table. */
export interface MatrixFor {
  product: Product
  kindLabel: Bi
  row: MatrixCellRow
  rule: MatrixRuleRow['rule']
}

/** The matrix row that applies to a fix (its kind, its product) and the product's VIP rule, from the same tables the escalation page edits. */
export function matrixFor(fix: Pick<CorrectiveAction, 'kind' | 'product'>, matrix: Readonly<Record<ProductId, readonly MatrixRow[]>>): MatrixFor | undefined {
  const id = fix.product ?? 're'
  const rows = matrix[id] ?? []
  const row = rows.find((r): r is MatrixCellRow => r.kind === MATRIX_KEY_BY_FIX_KIND[fix.kind])
  const rule = rows.find((r): r is MatrixRuleRow => r.kind === 'vip')
  return row && rule ? { product: productOf(id), kindLabel: ACTION_KIND[fix.kind].label, row, rule: rule.rule } : undefined
}

/** The two clocks of a routing row (halved when the fix is VIP-related), with the product and the kind in front when `context` is set. */
function clocksText(m: MatrixFor, vip: boolean, context = true): Bi {
  const cells = effectiveCells(m.row.cells, m.rule, vip)
  // In Arabic a number and its unit are isolated left to right, or the bidi algorithm scrambles "4.5 h" inside the sentence.
  const unit = (h: number | null, field: 'respondH' | 'resolveH', lang: 'en' | 'ar') => {
    const text = formatClockWithUnit(h, { asDays: !!m.row.cells.asDays?.[field], lang })
    return lang === 'ar' ? `⁦${text}⁩` : text
  }
  const side = (lang: 'en' | 'ar') =>
    [
      ...(context ? [m.product.name[lang], m.kindLabel[lang]] : []),
      `${C.respond[lang]} ${unit(cells.respondH, 'respondH', lang)}`,
      `${C.resolve[lang]} ${unit(cells.resolveH, 'resolveH', lang)}`,
      ...(vip ? [MATRIX_COPY.vipTag[lang]] : []),
    ].join(' · ')
  return { en: side('en'), ar: side('ar') }
}

/**
 * [Proposed] The one check the build adds to a routing row, on top of "routed to" against "the matrix says": a Legal and privacy fix is
 * for legal, privacy or safety signals (the only kind of signal that opens a case directly). When the fix's pattern holds none, the fix kind
 * itself is what to question: this is how "repeat contact → Legal" shows as a routing error. Null when the kind fits, or there is no pattern.
 */
export function kindCheckFor(fix: Pick<CorrectiveAction, 'kind'>, pattern: Pattern | undefined, ctx: CardContext): Bi | null {
  if (fix.kind !== 'legal_privacy' || !pattern) return null
  const hasLegal = pattern.signalIds.some((id) => ctx.signalById.get(id)?.kind === 'legal_privacy_safety')
  return hasLegal ? null : C.kindCheckLegal(signalCategoryLabel(pattern.category))
}

/** The list line of a routing row: "Kind: … · product … · matrix says: Legal (respond ½ h · …)". */
export function routingSaw(fix: Pick<CorrectiveAction, 'kind' | 'product'>, m: MatrixFor | undefined, vip: boolean): Bi {
  const kind = ACTION_KIND[fix.kind].label
  const product = productOf(fix.product).name
  const receiver = m?.row.cells.receiver ?? bi('nobody', 'لا أحد')
  const clocks = m ? ` (${clocksText(m, vip, false).en})` : ''
  const clocksAr = m ? ` (${clocksText(m, vip, false).ar})` : ''
  return {
    en: `${C.kind.en}: ${kind.en} · ${C.product.en} ${product.en} · ${C.matrixSaysShort.en}: ${receiver.en}${clocks}`,
    ar: `${C.kind.ar}: ${kind.ar} · ${C.product.ar} ${product.ar} · ${C.matrixSaysShort.ar}: ${receiver.ar}${clocksAr}`,
  }
}

/** The card of a routing row (Agent 5's output, judged by audit): the two titles to compare, the matrix line, and the kind check when it applies. */
export function routingCard(fix: CorrectiveAction, pattern: Pattern | undefined, ctx: CardContext, m: MatrixFor | undefined, vip: boolean, fallback: Bi): SampleEvidence {
  const owner = ownerTitle(fix.owner)
  const decided: SampleEvidenceLine[] = [{ label: C.routedTo, value: owner, strong: true }]
  if (m) {
    decided.push({ label: C.matrixSays, value: m.row.cells.receiver ?? bi('nobody', 'لا أحد'), strong: true })
    decided.push({ value: clocksText(m, vip) })
  }
  const kindCheck = kindCheckFor(fix, pattern, ctx)
  if (kindCheck) decided.push({ label: C.kindCheck, value: kindCheck, attention: true })
  return { given: fixGiven(pattern, ctx, fallback), decided, how: C.howRouting }
}

/** The card of an access row (Agent 5's output as the receiver sees it): the fix, the ids, and what it must not hold. An employee fix names the agent's id inside the direct-manager line only. */
export function accessCard(fix: CorrectiveAction, pattern: Pattern | undefined, ctx: CardContext, traceIds: string[], fallback: Bi): SampleEvidence {
  const names = fix.kind === 'employee' ? C.agentIdInManagerLine : C.none
  return {
    given: fixGiven(pattern, ctx, fallback),
    decided: [
      { label: C.receiverGot, value: fix.title },
      { label: C.namesIn, value: join([names, bi(`${C.conversationText.en}: ${C.none.en}`, `${C.conversationText.ar}: ${C.none.ar}`)]) },
      { label: C.traceSent, value: text(traceIds.join(' · ')) },
    ],
    how: C.howAccess,
  }
}

/** The list lines of an access row. */
export function accessText(fix: Pick<CorrectiveAction, 'title' | 'owner' | 'kind'>): Bi {
  const owner = ownerTitle(fix.owner)
  const contains = fix.kind === 'employee' ? C.accessContainsAgentId : C.accessContains
  return { en: `${fix.title.en} → ${owner.en} · ${contains.en}`, ar: `${fix.title.ar} ← ${owner.ar} · ${contains.ar}` }
}

/** The card of a targeting row (Agent 7's persona, the campaign built from it): the persona and its size on the left, the campaign's who and channel on the right. */
export function targetingCard(persona: Persona): SampleEvidence {
  return {
    given: [
      { label: C.persona, value: persona.name, strong: true },
      { value: bi(`${persona.segmentSize} ${C.peopleOnRecord.en}`, `${persona.segmentSize} ${C.peopleOnRecord.ar}`) },
      { value: persona.who },
    ],
    decided: [
      { label: C.campaign, value: persona.recommendation.campaignType },
      { label: C.whoTargeted, value: persona.recommendation.targetWho },
      { label: C.channelLabel, value: persona.recommendation.channelAndWhen },
    ],
    how: C.howTargeting,
  }
}

/** The list line of a targeting row's input: persona, size and the channels its people use. */
export function targetingSaw(persona: Persona): Bi {
  const side = (lang: 'en' | 'ar') =>
    `${C.persona[lang]}: ${persona.name[lang]} · ${persona.segmentSize} ${C.peopleOnRecord[lang]} · ${C.channelsTheyUse[lang]}: ${persona.channelsUsed.map((c) => CHANNEL_LABEL[c][lang]).join(', ')}`
  return { en: side('en'), ar: side('ar') }
}

/** The list line of a targeting row's output: who and channel, as the campaign says them. */
export function targetingText(persona: Persona): Bi {
  const r = persona.recommendation
  return { en: `${C.who.en}: ${r.targetWho.en} · ${C.channel.en}: ${r.channelAndWhen.en}`, ar: `${C.who.ar}: ${r.targetWho.ar} · ${C.channel.ar}: ${r.channelAndWhen.ar}` }
}

/** The last three events of a person (oldest first) as card lines: date and channel, the problem flagged, and the conversation text for the roles that may read it. A call carries no text, by design. */
function eventLines(events: readonly Interaction[]): SampleEvidenceLine[] {
  return [...events]
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    .slice(-3)
    .map((e): SampleEvidenceLine => {
      const flags = e.problemFlags.length ? join(e.problemFlags.map(flagLabel)) : C.noProblemFlagged
      const meta = join([bi(day(e.occurredAt), day(e.occurredAt)), CHANNEL_LABEL[e.channel]])
      return e.text && e.channel !== 'call' ? { meta, value: flags, conversation: e.text } : { meta, value: flags }
    })
}

/** The card of an interview brief (Agent 8): the person and the first score, the last three events; the reason the brief suggests. */
export function briefCard(item: Pick<DetractorCallItem, 'personId' | 'instrument' | 'firstScore' | 'severity'>, events: readonly Interaction[], reason: Bi): SampleEvidence {
  const score = `${(item.instrument ?? 'nps').toUpperCase()} ${item.firstScore}`
  const critical = item.severity === 'critical'
  return {
    given: [{ personId: item.personId, value: text(score) }, ...eventLines(events)],
    decided: [
      {
        label: C.briefFor,
        value: join([bi(`${C.reasonSuggested.en}: ${reason.en}`, `${C.reasonSuggested.ar}: ${reason.ar}`), ...(critical ? [C.critical] : [])]),
      },
    ],
    how: C.howBrief,
  }
}

/** The card of a journey reading (Agent 7): the person and the events, up to three problems found (the most recent), and the reading. */
export function journeyCard(personId: string, events: readonly Interaction[], reading: Bi): SampleEvidence {
  const flagged = [...events].filter((e) => e.problemFlags.length > 0).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  const findings: SampleEvidenceLine[] = flagged.slice(0, 3).map((e) => ({ value: join([join(e.problemFlags.map(flagLabel)), bi(day(e.occurredAt), day(e.occurredAt))]) }))
  return {
    given: [{ personId, value: bi(`${events.length} ${C.events.en}`, `${events.length} ${C.events.ar}`) }, ...(findings.length ? findings : [{ value: C.noProblemFound }])],
    decided: [{ value: reading, strong: true }],
    how: C.howJourney,
  }
}
