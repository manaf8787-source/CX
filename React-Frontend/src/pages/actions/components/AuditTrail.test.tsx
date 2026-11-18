import { beforeAll, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import type { AuditEntry } from '@/types'
import { AuditTrail } from './AuditTrail'

beforeAll(() => preferReducedMotion())

const log: AuditEntry[] = [
  { at: '2026-11-01T09:00:00', what: { en: 'Proposed by Agent 5 from pattern PT-123', ar: 'اقترحه الوكيل 5 من النمط PT-123' }, byRole: 'system' },
  { at: '2026-11-03T14:30:00', what: { en: 'Approved', ar: 'اعتُمد' }, byRole: 'cxmgr' },
  { at: '2026-11-02T10:05:00', what: { en: 'Status set to In progress', ar: 'الحالة: قيد التنفيذ' }, byRole: 'envmgmt' },
]

describe('AuditTrail (v40 F21)', () => {
  it('lists every change newest first with when, what and the role title (never a person)', () => {
    renderWithProviders(<AuditTrail log={log} />)
    expect(screen.getByRole('heading', { name: 'Audit trail' })).toBeInTheDocument()
    expect(screen.getByText('Every change on this fix: when, what, by which role. Nothing is deleted.')).toBeInTheDocument()
    for (const h of ['When', 'What', 'By']) expect(screen.getByRole('columnheader', { name: h })).toBeInTheDocument()
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(3)
    expect(within(rows[0]).getByText('2026-11-03 14:30')).toBeInTheDocument()
    expect(within(rows[0]).getByText('Approved')).toBeInTheDocument()
    expect(within(rows[0]).getByText('CX manager')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Environment management')).toBeInTheDocument()
    expect(within(rows[2]).getByText('System')).toBeInTheDocument()
  })

  it('does not change the order of the stored log (oldest first)', () => {
    const copy = [...log]
    renderWithProviders(<AuditTrail log={copy} />)
    expect(copy.map((e) => e.at)).toEqual(log.map((e) => e.at))
  })

  it('says "No change yet." for an empty log', () => {
    renderWithProviders(<AuditTrail log={[]} />)
    expect(screen.getByText('No change yet.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('reads in Arabic, with the role titles and "النظام" for the system', () => {
    renderWithProviders(<AuditTrail log={log} />, { lang: 'ar' })
    expect(screen.getByRole('heading', { name: 'سجل التدقيق' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'بواسطة' })).toBeInTheDocument()
    expect(screen.getByText('النظام')).toBeInTheDocument()
    expect(screen.getByText('مدير تجربة العملاء')).toBeInTheDocument()
  })
})
