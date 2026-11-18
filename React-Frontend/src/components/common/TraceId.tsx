import type { ReactNode } from 'react'
import { useI18n } from '@/i18n'
import { useTraceNav } from '@/services/queriesV40'
import { cn } from '@/lib/utils'
import { displayId, isDisplayId } from '@/utils/trace'
import type { TraceKind } from '@/types'

interface TraceIdProps {
  kind: TraceKind
  /** The internal id (`i-0012`, `sig-0007`, `ca-1`) or the display id (`EV-12`). For a pattern pass `pattern.traceId` (`PT-123`). */
  id: string
  /** Extra text after the id inside the same button, e.g. `call · 10-23`. */
  children?: ReactNode
  /** Render the grey tag only, no button (rows where opening makes no sense). */
  plain?: boolean
  /** Replaces the default open behaviour (`useTraceNav().open`). */
  onOpen?: () => void
  className?: string
}

/** A flat grey tag (well fill, 12px tabular figures: ids are numbers, not code, so no mono face). Ink on hover when it is a button. */
const TAG = 'inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-well px-2.5 pt-px text-xs font-medium tabular text-muted-foreground whitespace-nowrap'

/**
 * A trace id as a grey tag (v40 F10 to F12): `EV-12`, `SG-7`, `PT-123`, `CA-201`, `VR-201`, `RP-2026-11`. A button that
 * opens the record when the role may open it: a signal opens the detail dialog (`?sg=`), an event the person's journey,
 * a pattern the Signals page, a fix or its check the fix, the report the Monthly pack. A public mention keeps its
 * `PUB-3nn` id and never links to a person. Needs a Router and the query provider.
 *
 * @example <TraceId kind="signal" id={signal.id} />   <TraceId kind="pattern" id={pattern.traceId} />
 */
export function TraceId({ kind, id, children, plain, onOpen, className }: TraceIdProps) {
  const { t } = useI18n()
  const nav = useTraceNav()
  const text = isDisplayId(id) ? id : displayId(kind, id)
  const content = (
    <>
      <bdi dir="ltr">{text}</bdi>
      {children}
    </>
  )
  if (plain || (!onOpen && !nav.canOpen(kind, id))) {
    return (
      <span data-slot="trace-id" className={cn(TAG, className)}>
        {content}
      </span>
    )
  }
  return (
    <button
      type="button"
      data-slot="trace-id"
      onClick={onOpen ?? (() => nav.open(kind, id))}
      aria-label={children ? undefined : t(`Open ${text}`, `افتح ${text}`)}
      className={cn(TAG, 'cursor-pointer outline-none transition-colors duration-200 hover:bg-well-hover hover:text-foreground', className)}
    >
      {content}
    </button>
  )
}
