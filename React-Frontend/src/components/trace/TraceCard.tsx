import { useId, type ReactNode } from 'react'
import { useI18n } from '@/i18n'
import { useTrace } from '@/services/queriesV40'
import { TRACE_COPY } from '@/data/steps'
import { traceNextLine } from './traceNext'
import { TraceId } from '@/components/common/TraceId'
import { CHANNEL_LABEL } from '@/components/customers/channels'
import { LoadingState } from '@/components/common/LoadingState'
import { CORRECTIVE_STATUS_LABEL } from '@/lib/status'
import { cn } from '@/lib/utils'
import type { Bi, TraceChain, TraceKind } from '@/types'

/** At most this many ids per cell; the rest read "+n" (v40 F11). */
const MAX_IN_CELL = 4

/** The column of the record you are on is highlighted (v40 F11). */
const COLUMN_OF_KIND: Record<TraceKind, number> = { event: 0, signal: 1, pattern: 2, fix: 3, check: 4, report: 5 }

/**
 * The id on its own line, the detail under it (six narrow columns): the button stacks its two lines. The tag is white with a hairline
 * because the card is a well (the grey tag would vanish on it); long details wrap inside a rounded box instead of a pill.
 */
const CELL_BUTTON = 'h-auto min-h-6 w-full flex-col items-start gap-0 rounded-xl py-1.5 whitespace-normal text-start'

/**
 * The Trace card (v40 F11): six columns, 1 Event, 2 Signal, 3 Pattern, 4 Fix, 5 Check, 6 Report, every id a button
 * that opens the record (walkable in both directions), the column of the current record highlighted, and one line on
 * what happens next. A public mention shows "public mention, no person identified" in the Event column and never
 * links to a person. Presentational: it takes the chain; `TraceCard` below fetches it.
 *
 * Composition: card -> well -> text. The card is ONE well; the six columns sit on it with no boxes of their own. Each column head is the
 * small step pill ("2 Signal"): the column of the record you are on is the dark material, the others are white pills, and the ids under it
 * are white hairline tags. The ordered list keeps `aria-current="true"` on the current column.
 */
export function TraceCardView({ chain, chip, className }: { chain: TraceChain; chip?: ReactNode; className?: string }) {
  const { t, L } = useI18n()
  const headingId = useId()
  const current = COLUMN_OF_KIND[chain.from.kind]
  const next = traceNextLine(chain)

  const more = (n: number) => <span className="t-body-s">+{n}</span>
  const events = [
    ...chain.events.slice(0, MAX_IN_CELL).map((e) => (
      <TraceId key={e.id} kind="event" id={e.id} surface="well" className={CELL_BUTTON}>
        <span className="font-sans">
          {L(CHANNEL_LABEL[e.channel])} <span aria-hidden>·</span> <bdi dir="ltr">{e.occurredAt.slice(5, 10)}</bdi>
        </span>
      </TraceId>
    )),
    ...(chain.events.length > MAX_IN_CELL ? [<span key="more">{more(chain.events.length - MAX_IN_CELL)}</span>] : []),
  ]
  const signals = [
    ...chain.signals.slice(0, MAX_IN_CELL).map((s) => (
      <TraceId key={s.id} kind="signal" id={s.id} surface="well" className={CELL_BUTTON}>
        <span className="font-sans">
          <bdi dir="ltr">{s.occurredAt.slice(5, 10)}</bdi>
        </span>
      </TraceId>
    )),
    ...(chain.signals.length > MAX_IN_CELL ? [<span key="more">{more(chain.signals.length - MAX_IN_CELL)}</span>] : []),
  ]
  const pattern = chain.pattern
    ? [
        <TraceId key="pt" kind="pattern" id={chain.pattern.traceId} surface="well" className={CELL_BUTTON}>
          <span className="font-sans">
            {chain.pattern.signalCount} {t('signals', 'إشارات')}
          </span>
        </TraceId>,
      ]
    : []
  const fix = chain.fix
    ? [
        <TraceId key="ca" kind="fix" id={chain.fix.id} surface="well" className={CELL_BUTTON}>
          <span className="font-sans">{L(CORRECTIVE_STATUS_LABEL[chain.fix.status])}</span>
        </TraceId>,
      ]
    : []
  const check = chain.check
    ? [
        <TraceId key="vr" kind="check" id={chain.check.fixId} surface="well" className={CELL_BUTTON}>
          <span className="font-sans">
            <bdi dir="ltr">{chain.check.dueAt.slice(0, 10)}</bdi> <span aria-hidden>·</span> {L(CORRECTIVE_STATUS_LABEL[chain.check.status])}
          </span>
        </TraceId>,
      ]
    : []
  const report = chain.report
    ? [
        <TraceId key="rp" kind="report" id={chain.report.traceId} surface="well" className={CELL_BUTTON}>
          <span className="font-sans">{L(chain.report.label)}</span>
        </TraceId>,
      ]
    : []

  const columns: { items: ReactNode[]; empty: Bi }[] = [
    { items: events, empty: chain.publicMention ? TRACE_COPY.emptyEventPublic : TRACE_COPY.emptyEvent },
    { items: signals, empty: TRACE_COPY.emptySignal },
    { items: pattern, empty: TRACE_COPY.emptyPattern },
    { items: fix, empty: TRACE_COPY.emptyFix },
    { items: check, empty: TRACE_COPY.emptyCheck },
    { items: report, empty: TRACE_COPY.emptyReport },
  ]

  return (
    <section aria-labelledby={headingId} className={cn('well @container flex flex-col gap-4 text-card-foreground', className)} data-testid="trace-card" data-tour="trace">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 id={headingId} className="t-h4">
            {L(TRACE_COPY.title)}
          </h3>
          <p className="text-sm text-muted-foreground">{L(TRACE_COPY.hint)}</p>
        </div>
        {chip}
      </div>
      <ol className="grid grid-cols-2 gap-x-3 gap-y-4 @md:grid-cols-3 @3xl:grid-cols-6">
        {columns.map((col, i) => (
          <li
            key={i}
            aria-current={i === current ? 'true' : undefined}
            data-current={i === current ? 'true' : undefined}
            className="flex min-w-0 flex-col items-start gap-2"
          >
            <span className={cn('inline-flex h-6 items-center rounded-full px-2.5 pt-px text-xs font-medium whitespace-nowrap', i === current ? 'material-dark' : 'bg-card text-muted-foreground shadow-hairline')}>
              {L(TRACE_COPY.columns[i])}
            </span>
            {col.items.length > 0 ? col.items : <span className="t-body-s">{L(col.empty)}</span>}
          </li>
        ))}
      </ol>
      {next && (
        <p className="text-sm text-muted-foreground">
          <strong className="font-medium text-foreground">{L(TRACE_COPY.nextLabel)}:</strong> {L(next)}
        </p>
      )}
    </section>
  )
}

/**
 * The Trace card of one record: `kind` and `id` (internal or display id) as `useTrace` takes them. Appended to every
 * fix and to the signal detail dialog. Renders nothing for an unknown record or one with no events, signals or fix.
 */
export function TraceCard({ kind, id, chip, className }: { kind: TraceKind; id: string; chip?: ReactNode; className?: string }) {
  const { data: chain, isLoading } = useTrace(kind, id)
  if (isLoading || chain === undefined) return <LoadingState rows={2} />
  if (!chain || (chain.events.length === 0 && chain.signals.length === 0 && !chain.fix)) return null
  return <TraceCardView chain={chain} chip={chip} className={className} />
}
