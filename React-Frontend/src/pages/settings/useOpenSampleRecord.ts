import { useNavigate } from 'react-router-dom'
import { useTraceNav } from '@/services/queriesV40'
import type { WeeklySampleItem } from '@/types'

/**
 * What "Open" does for a sample row: a trace record through the trace host (a fix, a signal, a pattern) or a page (a call, a customer).
 * Shared by the list's Open button and the card's "Open the fix" / "Open the signal". The caller shows it to CX roles only (`canOpenSampleRecord`).
 */
export function useOpenSampleRecord(): (item: Pick<WeeklySampleItem, 'open'>) => void {
  const trace = useTraceNav()
  const navigate = useNavigate()
  return (item) => {
    const target = item.open
    if (!target) return
    if ('to' in target) navigate(target.to)
    else trace.open(target.traceKind, target.id)
  }
}
