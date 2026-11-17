import type { AfterSalesQueueItem } from '../types'

function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 3_600_000).toISOString()
}
function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString()
}

// After-Sales desk queue (Programme KB section 8.2): each agent sees only
// their own list, with retries (max 3) and call-backs.
export const AFTER_SALES_QUEUE: AfterSalesQueueItem[] = [
  { id: 'q1', customerName: 'Khalid Al-Marri', mobileMasked: '+9715••••212', unitStatus: 'ready', surveyId: 'sv_af_ready', assignedAgent: 'Yousef A.', tries: 0, maxTries: 3, dueAt: hoursFromNow(4), status: 'queued' },
  { id: 'q2', customerName: 'Sara Haddad', mobileMasked: '+9715••••845', unitStatus: 'offplan', surveyId: 'sv_af_offplan', assignedAgent: 'Yousef A.', tries: 1, maxTries: 3, dueAt: hoursFromNow(2), nextTryAt: hoursFromNow(24), status: 'in_progress', lastOutcome: 'no_answer' },
  { id: 'q3', customerName: 'Mohammed Idris', mobileMasked: '+9715••••390', unitStatus: 'rental', surveyId: 'sv_af_rental', assignedAgent: 'Mariam H.', tries: 2, maxTries: 3, dueAt: hoursFromNow(-2), nextTryAt: hoursFromNow(22), status: 'in_progress', lastOutcome: 'callback' },
  { id: 'q4', customerName: 'Aisha Noor', mobileMasked: '+9715••••114', unitStatus: 'ready', surveyId: 'sv_af_ready', assignedAgent: 'Mariam H.', tries: 3, maxTries: 3, dueAt: hoursAgo(5), status: 'exhausted', lastOutcome: 'no_answer' },
  { id: 'q5', customerName: 'Peter Nassar', mobileMasked: '+9715••••677', unitStatus: 'offplan', surveyId: 'sv_af_offplan', assignedAgent: 'Yousef A.', tries: 1, maxTries: 3, dueAt: hoursFromNow(6), status: 'done', lastOutcome: 'reached' },
  { id: 'q6', customerName: 'Huda Barakat', mobileMasked: '+9715••••903', unitStatus: 'rental', surveyId: 'sv_af_rental', assignedAgent: 'Mariam H.', tries: 0, maxTries: 3, dueAt: hoursFromNow(8), status: 'queued' },
]

export const AFTER_SALES_AGENTS = ['Yousef A.', 'Mariam H.']
