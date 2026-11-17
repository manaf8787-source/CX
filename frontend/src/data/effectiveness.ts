import type { EffectivenessRecord } from '../types'

// Each record mirrors "Measuring whether fixes work" (Modules KB section 9):
// complaints per 100 customers before/after a preventive action, monthly.
// Figures are samples but the series are built so lib/effectiveness.ts
// reproduces all four documented verdicts (working / not working / unclear
// / too early) against the real thresholds.
export const EFFECTIVENESS: EffectivenessRecord[] = [
  {
    typeId: 'call_timing',
    action: 'Fixed dialer time-zone configuration for the affected campaign',
    startedMonth: 4,
    series: [8.2, 7.9, 8.5, 8.0, 3.1, 2.8, 2.5],
    reopenedBefore: 2, reopenedAfter: 0,
    satisfactionBefore: 61, satisfactionAfter: 84,
  },
  {
    typeId: 'af_finishing_quality',
    action: 'Added a finishing QA checkpoint before handover for the subcontractor',
    startedMonth: 3,
    series: [6.5, 6.2, 6.8, 6.0],
    reopenedBefore: 1, reopenedAfter: 0,
    satisfactionBefore: 58, satisfactionAfter: 66,
  },
  {
    typeId: 're_unapproved_discount',
    action: 'Retrained the sales floor on discount approval limits',
    startedMonth: 3,
    series: [4.0, 4.2, 3.9, 4.1, 3.8, 3.9, 3.7],
    reopenedBefore: 0, reopenedAfter: 1,
    satisfactionBefore: 70, satisfactionAfter: 71,
  },
  {
    typeId: 'af_rental_maintenance',
    action: 'Added a 24-hour technician dispatch SLA for urgent repairs',
    startedMonth: 3,
    series: [5.0, 5.2, 4.8, 5.0, 4.3, 4.2, 4.1],
    reopenedBefore: 3, reopenedAfter: 1,
    satisfactionBefore: 55, satisfactionAfter: 63,
  },
]
