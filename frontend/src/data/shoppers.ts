import type { Assignment, Shopper } from '../types'

export const SHOPPERS: Shopper[] = [
  { id: 'sh1', name: 'Lina K.', type: 'internal', email: 'lina.k@psi.example', mobile: '+971501234567', languages: ['en', 'ar'], shopsCompleted: 14, reliability: 96, active: true },
  { id: 'sh2', name: 'Omar R.', type: 'internal', email: 'omar.r@psi.example', mobile: '+971502345678', languages: ['en', 'ar'], shopsCompleted: 9, reliability: 91, active: true },
  { id: 'sh3', name: 'Fatima S.', type: 'external', agency: 'Gulf Mystery Shoppers', email: 'fatima.s@gms.example', mobile: '+971503456789', languages: ['ar'], shopsCompleted: 22, reliability: 98, active: true },
  { id: 'sh4', name: 'James T.', type: 'external', agency: 'Gulf Mystery Shoppers', email: 'james.t@gms.example', mobile: '+971504567890', languages: ['en'], shopsCompleted: 6, reliability: 83, active: true },
  { id: 'sh5', name: 'Noura A.', type: 'internal', email: 'noura.a@psi.example', mobile: '+971505678901', languages: ['en', 'ar'], shopsCompleted: 3, reliability: 100, active: true },
  { id: 'sh6', name: 'Khalid M.', type: 'external', agency: 'Insight Shoppers', email: 'khalid.m@insight.example', mobile: '+971506789012', languages: ['ar'], shopsCompleted: 17, reliability: 88, active: false },
]

export function shopper(id: string): Shopper | undefined {
  return SHOPPERS.find((s) => s.id === id)
}

export const ASSIGNMENTS: Assignment[] = [
  { id: 'asg1', checklistId: 'cl_re_digital', scenarioId: 'sc_digital_buy', shopperId: 'sh1', via: 'wa', sentAt: '2026-10-20T09:00:00', dueAt: '2026-10-23T18:00:00', status: 'approved', score: 88, criticalFails: 0 },
  { id: 'asg2', checklistId: 'cl_re_call', scenarioId: 'sc_call_general', shopperId: 'sh2', via: 'email', sentAt: '2026-10-21T09:00:00', dueAt: '2026-10-24T18:00:00', status: 'review', score: 64, criticalFails: 1 },
  { id: 'asg3', checklistId: 'cl_re_branch', scenarioId: 'sc_branch_walkin', shopperId: 'sh3', via: 'email', sentAt: '2026-10-22T09:00:00', dueAt: '2026-10-25T18:00:00', status: 'submitted' },
  { id: 'asg4', checklistId: 'cl_re_app', scenarioId: 'sc_app_support', shopperId: 'sh4', via: 'sms', sentAt: '2026-10-22T09:00:00', dueAt: '2026-10-26T18:00:00', status: 'progress' },
  { id: 'asg5', checklistId: 'cl_re_digital', scenarioId: 'sc_digital_rent', shopperId: 'sh5', via: 'wa', sentAt: '2026-10-23T09:00:00', dueAt: '2026-10-26T18:00:00', status: 'opened' },
  { id: 'asg6', checklistId: 'cl_re_branch', scenarioId: 'sc_branch_walkin', shopperId: 'sh6', via: 'email', sentAt: '2026-10-15T09:00:00', dueAt: '2026-10-18T18:00:00', status: 'overdue' },
  { id: 'asg7', checklistId: 'cl_re_call', scenarioId: 'sc_call_general', shopperId: 'sh1', via: 'email', sentAt: '2026-10-24T09:00:00', dueAt: '2026-10-27T18:00:00', status: 'sent' },
  { id: 'asg8', checklistId: 'cl_re_app', scenarioId: 'sc_app_support', shopperId: 'sh3', via: 'wa', sentAt: '2026-10-18T09:00:00', dueAt: '2026-10-21T18:00:00', status: 'returned', score: 52, criticalFails: 1 },
]
