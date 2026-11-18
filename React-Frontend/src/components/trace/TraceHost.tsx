import { useLocation } from 'react-router-dom'
import { SignalDetailDialog } from './SignalDetailDialog'

/**
 * Mounted once in Shell. Opens the signal detail dialog from any page when the URL carries `?sg=SG-12` (or `PUB-351`),
 * and closes by removing it (`useTraceNav().close()`). The dialog and the Trace card are workstream B's
 * (`SignalDetailDialog`, `TraceCard`); the data seam is `useSignalDetail(id)` and `useTrace(kind, id)`.
 *
 * Cheap on every page: it only reads the URL. The data hooks run in the dialog, mounted only while `?sg=` is present
 * (always-mounted data hooks held up the sign-out transition and cost five queries on every page).
 */
export function TraceHost() {
  const { search } = useLocation()
  const id = new URLSearchParams(search).get('sg')
  return id ? <SignalDetailDialog id={id} /> : null
}
