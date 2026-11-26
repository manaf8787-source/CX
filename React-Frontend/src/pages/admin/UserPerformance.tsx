import { PerformanceReport } from '@/components/performance/PerformanceReport'

/** The user performance dashboard (22 Nov): every user who receives work, for the Admin and the Super admin; exporting needs the per-person export permission. */
export default function UserPerformance() {
  return <PerformanceReport scope="all" />
}
