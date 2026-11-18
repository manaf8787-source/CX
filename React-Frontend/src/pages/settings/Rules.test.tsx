import { beforeAll, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import * as mock from '@/services/mockData'
import type { RoleId } from '@/types'
import Rules from './Rules'

beforeAll(() => preferReducedMotion())

const open = async (role: RoleId = 'cxmgr', lang: 'en' | 'ar' = 'en') => {
  renderWithProviders(<Rules />, { route: '/settings/rules', role, lang })
  await screen.findByText(lang === 'en' ? 'Decision 4 · The escalation matrix' : 'القرار 4 · مصفوفة التصعيد')
}

describe('Rules page (v40 F16, F22)', () => {
  it('Decision 4 points to the escalation matrix page instead of an empty template', async () => {
    await open()
    expect(screen.getByText('Decision 4 · The escalation matrix')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open the escalation matrix' })).toHaveAttribute('href', '/settings/escalation-matrix')
    // the superseded template: no "Pending" cells, no "Cells pending" badge, no per-category columns
    expect(screen.queryByText('Cells pending')).not.toBeInTheDocument()
    expect(screen.queryAllByText('Pending')).toHaveLength(0)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    // the six principles stay
    expect(screen.getByText('Heads and C-level are informed only.')).toBeInTheDocument()
  })

  it('lists the clocks and calling settings decided on 18 November, with the small Legal note and no [Proposed]', async () => {
    await open()
    expect(screen.getByText('Added on 18 November · Clocks and calling')).toBeInTheDocument()
    for (const label of [
      'Working days per week (Monday to Friday)',
      'Fix due date when the matrix cell is empty',
      'Calling hours start (hour of day, UAE time)',
      'Call attempts before "needs a human" (CX team list)',
      'No-answers before an AI campaign hands over to a person',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(screen.getAllByText('Legal to confirm the hours')).toHaveLength(2)
    expect(screen.queryByText('[Proposed]')).not.toBeInTheDocument()
    // runaway types stay in "other"
    expect(screen.getByText('Other thresholds (runaway types)')).toBeInTheDocument()
  })

  it('badges an item that is still a proposal', async () => {
    const rule = mock.MOCK_RULES_CONFIG.find((r) => r.id === 'rule_calls_per_hour')!
    rule.proposed = true
    try {
      await open()
      expect(screen.getAllByText('[Proposed]')).toHaveLength(1)
    } finally {
      rule.proposed = undefined
    }
  })

  it('gives the working week a weekday picker: Monday to Friday ticked, the CX manager can change it', async () => {
    await open()
    const week = screen.getByRole('group', { name: 'Working days per week (Monday to Friday)' })
    const boxes = within(week).getAllByRole('checkbox')
    expect(boxes).toHaveLength(7)
    const names = boxes.map((b) => b.closest('label')!.textContent!.trim())
    expect(names).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    expect(boxes.map((b) => (b as HTMLInputElement).checked)).toEqual([true, true, true, true, true, false, false])
    expect(boxes.every((b) => !(b as HTMLInputElement).disabled)).toBe(true)
  })

  it('other roles see the picker read-only', async () => {
    await open('cxteam')
    const week = screen.getByRole('group', { name: 'Working days per week (Monday to Friday)' })
    expect(within(week).getAllByRole('checkbox').every((b) => (b as HTMLInputElement).disabled)).toBe(true)
    expect(screen.getByRole('note')).toHaveTextContent('View only')
  })

  it('reads in Arabic, with Arabic weekday names', async () => {
    await open('cxmgr', 'ar')
    expect(screen.getByText('أُضيف في 18 نوفمبر · المهل والاتصال')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'افتح مصفوفة التصعيد' })).toBeInTheDocument()
    const week = screen.getByRole('group', { name: 'أيام العمل في الأسبوع (من الإثنين إلى الجمعة)' })
    expect(within(week).getAllByRole('checkbox')[0].closest('label')!.textContent).toMatch(/الاثنين|الإثنين/)
  })
})

// This edits the shared sample store, so it runs last.
describe('Rules page: saving the working week', () => {
  it('ticking Saturday and saving makes it a six-day week (value follows the days)', async () => {
    await open()
    const week = screen.getByRole('group', { name: 'Working days per week (Monday to Friday)' })
    await userEvent.click(within(week).getByRole('checkbox', { name: 'Saturday' }))
    const save = within(week.parentElement!).getByRole('button', { name: 'Save' })
    await userEvent.click(save)
    const rule = mock.MOCK_RULES_CONFIG.find((r) => r.id === 'rule_working_days')!
    await waitFor(() => expect(rule.days).toEqual([1, 2, 3, 4, 5, 6]))
    expect(rule.value).toBe(6)
    // put it back for anything that runs after
    rule.days = [1, 2, 3, 4, 5]
    rule.value = 5
  })
})
