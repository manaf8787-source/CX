import type { Bi, MatrixCells, Pattern, Person, Signal, VipRule } from '../types'

/**
 * The VIP rule of the escalation matrix (v42 F30, rule 1, set 19 Nov 2026), in one place.
 *
 * A fix is VIP-related when its PATTERN includes a person tagged VIP in the CRM (a Club member, an investor, a portfolio owner): one
 * signal of the pattern that belongs to such a person is enough. Then, for that fix only:
 *   - both clocks of the matrix row (respond and resolve) are multiplied by the rule's factor (0.5: halved), so the due date at approval
 *     is approval time + half the row's Resolve (h) in working hours;
 *   - the head of the environment is added to "informed" at once;
 *   - the CX manager becomes the backup;
 *   - the fix shows "VIP · clocks halved".
 * The receiver does not change ("same receiver, clocks halved"). An empty clock stays empty (the employee row has no resolve clock).
 * Nothing here reads the sample store: callers pass the data in, so the rule is the same for the mock and for a real API.
 */

const SEPARATOR = ' · '

/**
 * True when at least one signal of the pattern belongs to a person tagged VIP. A signal with no person (a public mention, or an
 * unidentified customer) never counts. No pattern (a fix proposed from AI Insights) is never VIP-related.
 */
export function patternHasVip(
  pattern: Pick<Pattern, 'signalIds'> | undefined,
  signals: readonly Pick<Signal, 'id' | 'personId'>[],
  persons: readonly Pick<Person, 'id' | 'vip'>[],
): boolean {
  if (!pattern) return false
  const vipIds = new Set(persons.filter((p) => p.vip).map((p) => p.id))
  if (vipIds.size === 0) return false
  const inPattern = new Set(pattern.signalIds)
  return signals.some((s) => inPattern.has(s.id) && !!s.personId && vipIds.has(s.personId))
}

/** A clock multiplied by the rule's factor; an empty clock (null) stays empty. */
export function scaleHours(hours: number | null, factor: number): number | null {
  return hours === null ? null : hours * factor
}

/**
 * "Informed" with the head of the environment added at once: first in the list, unless the cell already names that title. A cell of
 * nobody ("–", null) becomes just the title. The result is still one string per language ("A · B"), as every cell is.
 */
export function addInformed(informed: Bi | null, add: Bi): Bi {
  if (!informed) return add
  const has = informed.en.split(SEPARATOR).some((part) => part.trim().toLowerCase() === add.en.trim().toLowerCase())
  return has ? informed : { en: `${add.en}${SEPARATOR}${informed.en}`, ar: `${add.ar}${SEPARATOR}${informed.ar}` }
}

/** The cells of a row as they apply to a VIP-related fix: receiver as is, the head informed, the CX manager as backup, both clocks scaled. A clock written in days is hours again. */
export function applyVipRule(cells: MatrixCells, rule: VipRule): MatrixCells {
  return {
    receiver: cells.receiver,
    informed: addInformed(cells.informed, rule.informedTitle),
    backup: rule.backup,
    respondH: scaleHours(cells.respondH, rule.factor),
    resolveH: scaleHours(cells.resolveH, rule.factor),
  }
}

/** The cells that apply to a fix: the row's own, or the VIP version. */
export function effectiveCells(cells: MatrixCells, rule: VipRule, vip: boolean): MatrixCells {
  return vip ? applyVipRule(cells, rule) : cells
}

/** The working hours a fix's due date is counted from approval: the row's Resolve (h), halved for a VIP-related fix. Null = no clock (the 14-day fallback applies). */
export function dueHours(resolveH: number | null, rule: Pick<VipRule, 'factor'>, vip: boolean): number | null {
  return vip ? scaleHours(resolveH, rule.factor) : resolveH
}
