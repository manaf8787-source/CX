import { TRACE_NEXT } from '@/data/steps'
import type { Bi, TraceChain } from '@/types'

/** The "what happens next" line by how far the chain goes (S4); none once the report exists. */
export function traceNextLine(chain: TraceChain): Bi | null {
  if (chain.report) return TRACE_NEXT.report
  if (chain.check) return TRACE_NEXT.check
  if (chain.fix) return TRACE_NEXT.fix
  if (chain.pattern) return TRACE_NEXT.pattern
  if (chain.signals.length > 0) return TRACE_NEXT.signals
  return TRACE_NEXT.event
}
