import type { CorrectiveAction } from '../types'
import type { WatchCounterId } from '../data/watchTeam'

/**
 * "This week, by the same team" (v42 F31): the eight counters under the replay. Five are computed from the same registers the pages read; three
 * are the prototype's constants and are sample figures (the whole block is badged `sample`).
 *
 * - Events read: every interaction in scope plus 16, as the prototype does (`EV.length + 16`). The 16 is a sample figure with no register behind it.
 * - Sent back by the supervisor and Handed to a person: constants in the prototype, no register behind them yet.
 */
export const WATCH_EVENTS_BEYOND_SAMPLE = 16
export const WATCH_SENT_BACK_BY_SUPERVISOR = 3
export const WATCH_HANDED_TO_PERSON = 2

export interface WatchCounterInput {
  /** Interactions in the selected environment. */
  interactions: number
  /** Signals in the selected environment. */
  signals: number
  /** Patterns the rules find over the signals in scope. */
  patterns: number
  /** Fixes in scope: `proposed` ones wait for a yes. */
  fixes: Pick<CorrectiveAction, 'status'>[]
  /** Call-list items in scope: Agent 8 writes one brief for each. */
  briefs: number
}

export interface WatchCounter {
  id: WatchCounterId
  value: number
}

/** The eight counters in the prototype's order (`watchCounters()`): ids only, the page picks the labels. */
export function watchCounters(i: WatchCounterInput): WatchCounter[] {
  return [
    { id: 'events', value: i.interactions + WATCH_EVENTS_BEYOND_SAMPLE },
    { id: 'signals', value: i.signals },
    { id: 'patterns', value: i.patterns },
    { id: 'fixes', value: i.fixes.length },
    { id: 'waiting', value: i.fixes.filter((f) => f.status === 'proposed').length },
    { id: 'sentBack', value: WATCH_SENT_BACK_BY_SUPERVISOR },
    { id: 'handedOver', value: WATCH_HANDED_TO_PERSON },
    { id: 'briefs', value: i.briefs },
  ]
}
