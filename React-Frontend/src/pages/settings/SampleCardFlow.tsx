import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Check, X } from 'lucide-react'
import { useI18n } from '@/i18n'
import type { SampleEvidenceLine, WeeklySampleItem } from '@/types'
import { SAMPLE_FLOW_COPY as FLOW, SAMPLE_QUESTION } from '@/data/weeklySample'
import { kindOfTraceId } from '@/utils/trace'
import { AgentChip } from '@/components/common/AgentChip'
import { TraceId } from '@/components/common/TraceId'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { FoldNote } from './sampleParts'
import { useOpenSampleRecord } from './useOpenSampleRecord'

/**
 * The weekly sample as a card flow in plain words (v42.2 F34): the AI team is a new employee and this is the weekly spot-check of its work.
 * One piece of work at a time: on the left what the AI was given, on the right what it decided and one line on how; then one question and
 * three answers (Yes, I would do the same / No, that is wrong / Not sure, skip for now). Nobody approves anything here.
 *
 * - A verdict advances at once (a local copy of it; the query catches up), the way a card deck does. Skip puts the card at the end of the
 *   queue, so "Not sure" never loses it, and the cards you skipped come back once the others are done.
 * - Keyboard: every answer is a real button; after an answer or a skip the focus moves to the new card's heading; a polite live region
 *   says "n of N checked". Reduced motion collapses the card's entrance (theme.css).
 * - Names and conversation text follow the viewer: the person line is `personName` (the reference for the Internal Audit and Marketing Lead,
 *   which never reads a customer name) and a `restricted` quote is dropped unless `canReadText`.
 */

interface Props {
  /** The reader's own rows, in the sample's order. */
  items: readonly WeeklySampleItem[]
  /** Whether this viewer gets "Open the fix" / "Open the signal" (the CX manager and the CX team). */
  canOpen: boolean
  /** The name of a person for this viewer (null when there is none): the reference when the role may not see names. */
  personName: (personId: string) => string | null
  /** Whether this viewer may read conversation text (the CX manager and the CX team). */
  canReadText: boolean
  onAnswer: (id: string, right: boolean) => void
  onList: () => void
}

/** The "Open the fix" / "Open the signal" button of a card: CX roles only, and only for a fix or a signal (the prototype's `caOpen` and `trSg`). */
function openLabel(item: WeeklySampleItem) {
  const target = item.open
  if (!target || 'to' in target) return null
  if (target.traceKind === 'fix') return FLOW.openFix
  if (target.traceKind === 'signal') return FLOW.openSignal
  return null
}

function Line({ line, personName, canReadText }: { line: SampleEvidenceLine; personName: Props['personName']; canReadText: boolean }) {
  const { L } = useI18n()
  const quote = line.quote && (!line.restricted || canReadText) ? L(line.quote) : null
  const who = line.personId ? personName(line.personId) : null
  const label = line.label ? L(line.label) : null
  const value = line.value ? L(line.value) : null
  if (!line.meta && !label && !value && !who && !quote) return null
  return (
    <li className="row-divider row-divider-well flex flex-col gap-1.5 py-2 text-sm">
      {line.meta && <span className="text-xs text-muted-foreground tabular">{L(line.meta)}</span>}
      {(label || value || who) && (
        <p className="flex items-start gap-2">
          {line.attention && <span aria-hidden className="dot dot-warning mt-[7px]" />}
          <span className="min-w-0">
            {label && <span className="text-muted-foreground">{label}: </span>}
            <span className={cn('text-foreground', line.strong && 'font-medium')}>
              {who && <bdi>{who}</bdi>}
              {who && value ? ' · ' : ''}
              {value}
            </span>
          </span>
        </p>
      )}
      {quote && (
        <blockquote dir="auto" className="rounded-xl bg-card px-3.5 py-2.5 text-start text-sm text-foreground shadow-hairline">
          “{quote}”
        </blockquote>
      )}
    </li>
  )
}

function Side({ heading, lines, how, personName, canReadText }: { heading: string; lines: SampleEvidenceLine[]; how?: string; personName: Props['personName']; canReadText: boolean }) {
  const { L } = useI18n()
  return (
    <section className="well flex min-w-0 flex-col gap-1">
      <h4 className="label-style text-muted-foreground">{heading}</h4>
      <ul className="flex flex-col">
        {lines.map((line, i) => (
          <Line key={i} line={line} personName={personName} canReadText={canReadText} />
        ))}
      </ul>
      {how && (
        <p className="pt-1 text-sm text-muted-foreground">
          <span className="t-small-strong text-foreground">{L(FLOW.how)}</span>: {how}
        </p>
      )}
    </section>
  )
}

export function SampleCardFlow({ items, canOpen, personName, canReadText, onAnswer, onList }: Props) {
  const { t, L } = useI18n()
  const open = useOpenSampleRecord()
  // A verdict advances the card at once; the query (and the other readers' numbers) catch up behind it.
  const [local, setLocal] = useState<Record<string, boolean>>({})
  const [skipped, setSkipped] = useState<string[]>([])
  const [announce, setAnnounce] = useState('')
  const [focusTick, setFocusTick] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const verdictOf = (i: WeeklySampleItem) => local[i.id] ?? i.verdict
  const total = items.length
  const done = items.filter((i) => verdictOf(i) !== null).length
  const wrong = items.filter((i) => verdictOf(i) === false).length
  const unread = items.filter((i) => verdictOf(i) === null)
  // The cards you have not skipped first, in the sample's order; then the skipped ones, oldest skip first.
  const queue = [...unread.filter((i) => !skipped.includes(i.id)), ...skipped.flatMap((id) => unread.filter((i) => i.id === id))]
  const current = queue[0]
  const fromSkipped = !!current && skipped.includes(current.id)

  // After an answer or a skip the focus follows to the new card (or the "All done" card): the heading takes it, not the first button.
  useEffect(() => {
    if (focusTick > 0) headingRef.current?.focus()
  }, [focusTick])

  function answer(item: WeeklySampleItem, right: boolean) {
    setLocal((prev) => ({ ...prev, [item.id]: right }))
    onAnswer(item.id, right)
    setAnnounce(L(done + 1 >= total ? FLOW.announceDone : FLOW.announceChecked(done + 1, total)))
    setFocusTick((n) => n + 1)
  }

  function skip(item: WeeklySampleItem) {
    setSkipped((prev) => [...prev.filter((id) => id !== item.id), item.id])
    setAnnounce(L(FLOW.announceSkipped(done, total)))
    setFocusTick((n) => n + 1)
  }

  const counter = (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <p className="text-sm text-muted-foreground" data-testid="sample-counter">
        <bdi dir="ltr" className="font-medium text-foreground tabular">
          {done} / {total}
        </bdi>{' '}
        {L(FLOW.checked)}
        {wrong > 0 && (
          <>
            {' · '}
            <span className="text-danger-text">
              <bdi dir="ltr" className="tabular">
                {wrong}
              </bdi>{' '}
              {L(FLOW.markedWrong)}
            </span>
          </>
        )}
        {' · '}
        {L(FLOW.dueThursday)}
      </p>
      <Button variant="outline" size="sm" data-view-switch onClick={onList}>
        {L(FLOW.seeList)}
      </Button>
    </div>
  )

  const live = (
    <p role="status" aria-live="polite" aria-atomic="true" data-testid="sample-live" className="sr-only">
      {announce}
    </p>
  )

  if (!current) {
    return (
      <div className="flex flex-col gap-4">
        {counter}
        {live}
        <Card data-tour="sample" data-testid="sample-done" className="animate-[cx-pop-in_200ms_var(--ease-out)]">
          <div className="flex flex-col gap-2 px-(--card-pad)">
            <h3 ref={headingRef} tabIndex={-1} className="t-card-title outline-hidden focus-visible:[--tw-ring-shadow:0_0_#0000]">
              {L(FLOW.doneTitle)}
            </h3>
            <p className="text-sm text-muted-foreground">{wrong > 0 ? L(FLOW.doneWrong(wrong)) : L(FLOW.doneNone)}</p>
            <div className="pt-2">
              <Button variant="outline" size="sm" data-view-switch onClick={onList}>
                {L(FLOW.seeList)}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const traceKind = kindOfTraceId(current.ref)
  const openText = canOpen ? openLabel(current) : null
  const questionId = `sample-q-${current.id}`
  return (
    <div className="flex flex-col gap-4">
      {counter}
      {live}
      {fromSkipped && <p className="text-sm text-muted-foreground">{L(FLOW.skippedNote)}</p>}
      <Card key={current.id} data-tour="sample" data-testid="sample-card" data-check={current.check} className="animate-[cx-pop-in_200ms_var(--ease-out)]">
        <div className="flex flex-col gap-4 px-(--card-pad)">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <h3 ref={headingRef} tabIndex={-1} className="t-card-title outline-hidden focus-visible:[--tw-ring-shadow:0_0_#0000]">
              {L(current.kind)}
              <span className="sr-only">
                {' '}
                ({t(`${done + 1} of ${total}`, `${done + 1} من ${total}`)})
              </span>
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <AgentChip agent={current.agent} short />
              {traceKind ? <TraceId kind={traceKind} id={current.ref} plain /> : <bdi dir="ltr" className="text-xs text-muted-foreground tabular">{current.ref}</bdi>}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Side heading={L(FLOW.given)} lines={current.card.given} personName={personName} canReadText={canReadText} />
            <Side heading={L(FLOW.decided)} lines={current.card.decided} how={L(current.card.how)} personName={personName} canReadText={canReadText} />
          </div>
          <div className="flex flex-col gap-3 pt-1">
            <h4 id={questionId} className="t-h4">
              {L(SAMPLE_QUESTION[current.check])}
            </h4>
            <div role="group" aria-labelledby={questionId} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <Button size="lg" roll={false} className="w-full sm:w-auto" onClick={() => answer(current, true)}>
                <Check aria-hidden />
                {L(FLOW.yes)}
              </Button>
              <Button size="lg" variant="outline" roll={false} className="w-full sm:w-auto" onClick={() => answer(current, false)}>
                <X aria-hidden />
                {L(FLOW.no)}
              </Button>
              <Button size="lg" variant="ghost" roll={false} className="w-full text-muted-foreground sm:w-auto" onClick={() => skip(current)}>
                {L(FLOW.skip)}
              </Button>
              {openText && (
                <Button size="sm" variant="outline" roll={false} className="w-full sm:ms-auto sm:w-auto" onClick={() => open(current)}>
                  {L(openText)}
                  <ArrowUpRight aria-hidden className="rtl:-scale-x-100" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

/** The intro card of the flow (the "new employee" text), put above the cards by the page. */
export function SampleIntro() {
  const { L } = useI18n()
  return (
    <FoldNote id="intro" title={L(FLOW.introTitle)} data-testid="sample-intro">
      {L(FLOW.introText)}
    </FoldNote>
  )
}
