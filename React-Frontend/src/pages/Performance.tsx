import { PerformanceReport } from '@/components/performance/PerformanceReport'

/** The CX manager's team performance report (22 Nov): his CX team only, for appraisal; exportable for the period chosen. */
export default function Performance() {
  return <PerformanceReport scope="team" canExport />
}
