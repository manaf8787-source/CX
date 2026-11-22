import { useMemo } from 'react'
import { useAllInteractions, useDetractorCallItems, useEffortSummaries } from '@/services/queries'
import { classifyRunaway, type RunawayClassification } from '@/utils/runaway'
import type { ChannelId, Interaction, Person } from '@/types'

/** What a person last told us in a scored answer. Prototype rule on the 0 to 10 sample scores: 7 and above is positive, 6 and below is negative. */
export interface LastFeedback {
  score: number
  at: string
  channel: ChannelId
  tone: 'positive' | 'negative'
}

export interface PeopleFacts {
  /** The latest scored answer per person; absent = nothing yet. */
  lastFeedback: Map<string, LastFeedback>
  /** Latest contact per person (ISO), from the unified timeline. */
  lastContact: Map<string, string>
  /** Problems found per person (the same number as the "Problems found" tile on the journey). */
  problems: Map<string, number>
  /** People with a critical row on the close-the-loop list: their problems chip is red (critical), else amber. */
  critical: Set<string>
  /** Runaway type per person who is drifting away (one of the six types); absent = healthy. */
  drifting: Map<string, RunawayClassification>
}

/**
 * What the customers list, Who is leaving and the journey's next-step box need to know about each person, from the
 * unified record: last contact, problems found, drifting (runaway type) and whether a critical row waits on the
 * close-the-loop list. One place, so the three views never disagree.
 */
export function usePeopleFacts(persons: readonly Person[] | undefined): { facts: PeopleFacts; isLoading: boolean } {
  const { data: interactions, isLoading: interactionsLoading } = useAllInteractions()
  const { data: effort, isLoading: effortLoading } = useEffortSummaries()
  // The call-list register is edited in place: `dataUpdatedAt` is the change signal (docs/V40_FOUNDATION_API.md section 1, item 15).
  const { data: loop, dataUpdatedAt } = useDetractorCallItems()

  const facts = useMemo<PeopleFacts>(() => {
    const lastContact = new Map<string, string>()
    const lastFeedback = new Map<string, LastFeedback>()
    const byPerson = new Map<string, Interaction[]>()
    for (const i of interactions ?? []) {
      const list = byPerson.get(i.personKey) ?? []
      list.push(i)
      byPerson.set(i.personKey, list)
      const seen = lastContact.get(i.personKey)
      if (!seen || i.occurredAt > seen) lastContact.set(i.personKey, i.occurredAt)
      if (i.score !== undefined) {
        const f = lastFeedback.get(i.personKey)
        if (!f || i.occurredAt > f.at) lastFeedback.set(i.personKey, { score: i.score, at: i.occurredAt, channel: i.channel, tone: i.score >= 7 ? 'positive' : 'negative' })
      }
    }
    const problems = new Map<string, number>()
    const drifting = new Map<string, RunawayClassification>()
    for (const p of persons ?? []) {
      const e = effort?.find((x) => x.personId === p.id)
      problems.set(p.id, e?.problemsFound ?? 0)
      const c = classifyRunaway(p, e, byPerson.get(p.id) ?? [])
      if (c) drifting.set(p.id, c)
    }
    const critical = new Set((loop ?? []).filter((i) => i.severity === 'critical' && i.status !== 'done').map((i) => i.personId))
    return { lastContact, lastFeedback, problems, critical, drifting }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [persons, interactions, effort, loop, dataUpdatedAt])

  return { facts, isLoading: interactionsLoading || effortLoading }
}
