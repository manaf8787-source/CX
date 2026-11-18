import { beforeAll, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import * as mock from '@/services/mockData'
import { usePatterns } from '@/services/queries'
import { WHAT_IF_CANDIDATES } from '@/data/whatIf'
import { RulesPointer } from './RulesPointer'
import { WhatIfCard } from './WhatIfCard'

beforeAll(() => preferReducedMotion())

function Both() {
  const { data } = usePatterns()
  return (
    <>
      <span data-testid="count">{data?.length}</span>
      <WhatIfCard />
    </>
  )
}

const rowOf = (label: string) => screen.getByRole('row', { name: (name) => name.startsWith(label) })

describe('What if card (v40 F32)', () => {
  it('counts the patterns with today’s thresholds, the same number the Patterns list holds', async () => {
    renderWithProviders(<Both />)
    await screen.findByRole('table')
    // the card and the Patterns query load separately: wait until the list has its count
    await waitFor(() => expect(Number(screen.getByTestId('count').textContent)).toBeGreaterThan(0))
    const count = Number(screen.getByTestId('count').textContent)
    expect(screen.getByText(`With today's thresholds there are ${count} patterns. Each cell shows how many there would be with that one value changed; the dark one is the current setting. Change it under Settings.`)).toBeInTheDocument()
  })

  it('has the three rows with their candidate values from the data file, current value dark', async () => {
    renderWithProviders(<WhatIfCard />)
    await screen.findByRole('table')
    expect(screen.getByRole('columnheader', { name: 'Threshold' })).toBeInTheDocument()
    for (const [label, key] of [['Same issue, times', 'sameIssueMin'], ['Same agent, times', 'sameAgentMin'], ['Window (days)', 'windowDays']] as const) {
      const row = rowOf(label)
      expect(within(row).getAllByRole('listitem')).toHaveLength(WHAT_IF_CANDIDATES[key].length)
    }
    // today's values: 5 times, 3 times, 30 days
    expect(within(rowOf('Same issue, times')).getByText(/^5 → \d+ patterns/).closest('li')).toHaveAttribute('data-current', 'true')
    expect(within(rowOf('Same agent, times')).getByText(/^3 → \d+ patterns/).closest('li')).toHaveAttribute('data-current', 'true')
    expect(within(rowOf('Window (days)')).getByText(/^30 → \d+ patterns/).closest('li')).toHaveAttribute('data-current', 'true')
    expect(document.querySelectorAll('li[data-current="true"]')).toHaveLength(3)
  })

  it('the current setting always gives today’s total, and a stricter threshold never gives more patterns', async () => {
    renderWithProviders(<Both />)
    await screen.findByRole('table')
    const total = Number(screen.getByTestId('count').textContent)
    const n = (text: string) => Number(/→ (\d+)/.exec(text)![1])
    const issue = within(rowOf('Same issue, times')).getAllByRole('listitem').map((li) => n(li.textContent!))
    expect(issue[2]).toBe(total) // 5
    expect(issue[0]).toBeGreaterThanOrEqual(issue[2]) // 3 times: at least as many
    expect(issue[4]).toBeLessThanOrEqual(issue[2]) // 8 times: at most as many
    const agent = within(rowOf('Same agent, times')).getAllByRole('listitem').map((li) => n(li.textContent!))
    expect(agent[1]).toBe(total) // 3
    expect(agent[0]).toBeGreaterThanOrEqual(agent[3])
  })

  it('reads in Arabic', async () => {
    renderWithProviders(<WhatIfCard />, { lang: 'ar' })
    await screen.findByRole('table')
    expect(screen.getByText('ماذا لو')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'العتبة' })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /^نفس المشكلة، مرات/ })).toBeInTheDocument()
    expect(screen.getAllByText(/→ \d+ أنماط/).length).toBeGreaterThan(5)
  })

  it('recomputes when a threshold is edited under Settings (patterns are computed from the rules)', async () => {
    const { client } = renderWithProviders(<Both />)
    await screen.findByRole('table')
    const rule = mock.MOCK_RULES_CONFIG.find((r) => r.id === 'rule_pattern_same_issue')!
    const before = Number(screen.getByTestId('count').textContent)
    rule.value = 8
    try {
      await client.invalidateQueries({ queryKey: ['rules-config'] })
      await client.invalidateQueries({ queryKey: ['patterns'] })
      // the dark cell moves to 8, and the count of the card follows the list
      await waitFor(() => expect(within(rowOf('Same issue, times')).getByText(/^8 → \d+ patterns/).closest('li')).toHaveAttribute('data-current', 'true'))
      const after = Number(screen.getByTestId('count').textContent)
      expect(after).toBeLessThanOrEqual(before)
      const issue = within(rowOf('Same issue, times')).getAllByRole('listitem')
      expect(Number(/→ (\d+)/.exec(issue[4].textContent!)![1])).toBe(after)
    } finally {
      rule.value = 5
    }
  })
})

describe('Rules pointer (v40 F16)', () => {
  it('says there is one place for every threshold and offers the Rules page to a role that may open it', () => {
    renderWithProviders(<RulesPointer />, { role: 'cxmgr' })
    expect(screen.getByText('One place for every threshold.')).toBeInTheDocument()
    expect(screen.getByText(/These are the same numbers as Settings → Rules as configuration; change them there and every page recomputes\./)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/settings/rules')
  })

  it('shows the sentence without a link to a role that cannot open the Rules page', () => {
    renderWithProviders(<RulesPointer />, { role: 'teamlead' })
    expect(screen.getByText('One place for every threshold.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open' })).not.toBeInTheDocument()
  })

  it('reads in Arabic', () => {
    renderWithProviders(<RulesPointer />, { lang: 'ar' })
    expect(screen.getByText('مكان واحد لكل عتبة.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'افتح' })).toBeInTheDocument()
  })
})
