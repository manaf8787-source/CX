import { beforeAll, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import IntelligentCxTeam from './IntelligentCxTeam'

beforeAll(() => preferReducedMotion())

describe('Intelligent CX team page (v40 F33, F36)', () => {
  it('keeps "ten single-task agents" and lists ten agent cards and the supervisor', () => {
    renderWithProviders(<IntelligentCxTeam />, { role: 'cxmgr' })
    expect(screen.getByText(/Ten single-task agents and one supervisor/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'The ten agents' })).toBeInTheDocument()
    expect(screen.queryByText(/Nine agents/i)).not.toBeInTheDocument()
  })

  it('names the agent in the recent-activity table with the reusable chip', async () => {
    renderWithProviders(<IntelligentCxTeam />, { role: 'cxmgr' })
    const section = screen.getByText('Recent activity').closest('div[data-slot="card"]') as HTMLElement
    const chips = await within(section).findAllByText(/^Agent \d+ · /, {}, { timeout: 8000 })
    expect(chips.length).toBeGreaterThan(0)
  })

  it('shows the chip in Arabic: "الوكيل n · name"', async () => {
    renderWithProviders(<IntelligentCxTeam />, { role: 'cxmgr', lang: 'ar' })
    const section = screen.getByText('النشاط الأخير').closest('div[data-slot="card"]') as HTMLElement
    const chips = await within(section).findAllByText(/^الوكيل \d+ · /, {}, { timeout: 8000 })
    expect(chips.length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { level: 2, name: 'الوكلاء العشرة' })).toBeInTheDocument()
  })
})
