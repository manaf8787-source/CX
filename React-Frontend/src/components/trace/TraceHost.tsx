// FOUNDATION STUB: owner = workstream B (minimal working dialog: B replaces the body with SignalDetailDialog and the TraceCard).
import { useLocation } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { useSignalDetail, useTraceNav } from '@/services/queriesV40'
import { TRACE_COPY } from '@/data/steps'
import { signalCategoryLabel } from '@/pages/actions/components/labels'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/common/StatusBadge'
import { TraceId } from '@/components/common/TraceId'
import { envNameFromShort } from '@/data/environments'

/**
 * Mounted once in Shell. Opens the signal detail dialog from any page when the URL carries `?sg=SG-12` (or `PUB-351`),
 * and closes by removing it. Foundation provides the seam (`useTraceNav().open('signal', id)` sets the param,
 * `useSignalDetail(id)` and `useTrace(kind, id)` return the data); workstream B builds the real dialog and the trace card.
 */
export function TraceHost() {
  // Cheap on every page: it only reads the URL. The data hooks run in <SignalDialog/>, mounted only while `?sg=` is present
  // (always-mounted data hooks here held up the sign-out transition and cost five queries on every page).
  const { search } = useLocation()
  const id = new URLSearchParams(search).get('sg')
  return id ? <SignalDialog id={id} /> : null
}

function SignalDialog({ id }: { id: string }) {
  const { t, L } = useI18n()
  const { close } = useTraceNav()
  const { signal, chain, traceId } = useSignalDetail(id)
  if (signal === undefined) return null
  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-[920px]">
        <DialogHeader>
          <DialogTitle>{signal ? `${traceId} · ${L(signalCategoryLabel(signal.category))}` : t('Signal not found', 'الإشارة غير موجودة')}</DialogTitle>
          <DialogDescription>{L(TRACE_COPY.hint)}</DialogDescription>
        </DialogHeader>
        {signal && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge>{signal.kind.replace(/_/g, ' ')}</StatusBadge>
              <StatusBadge>{L(envNameFromShort(signal.environment))}</StatusBadge>
              <StatusBadge tone={signal.kind === 'legal_privacy_safety' ? 'danger' : 'warning'}>{signal.occurredAt.slice(0, 10)}</StatusBadge>
            </div>
            <p className="text-sm text-muted-foreground">
              {t(
                'Counted by Agent 3; it is worked only through the pattern it belongs to, never alone.',
                'عدّه الوكيل 3؛ يُعالج فقط عبر النمط الذي ينتمي إليه، لا وحده.',
              )}
            </p>
            {chain && (
              <ul className="flex flex-wrap items-center gap-2" aria-label={L(TRACE_COPY.title)}>
                {chain.events.map((e) => (
                  <li key={e.id}><TraceId kind="event" id={e.id} /></li>
                ))}
                {chain.signals.map((s) => (
                  <li key={s.id}><TraceId kind="signal" id={s.id} plain /></li>
                ))}
                {chain.pattern && <li><TraceId kind="pattern" id={chain.pattern.traceId} /></li>}
                {chain.fix && <li><TraceId kind="fix" id={chain.fix.id} /></li>}
                {chain.check && <li><TraceId kind="check" id={chain.check.fixId} /></li>}
                {chain.report && <li><TraceId kind="report" id={chain.report.traceId} /></li>}
              </ul>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
