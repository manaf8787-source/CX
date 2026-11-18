import { beforeAll, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import type { RoleId } from '@/types'
import { CustomersTabs } from './CustomersTabs'

beforeAll(() => preferReducedMotion())

const tabs = () => within(screen.getByRole('navigation', { name: 'Customers sections' })).getAllByRole('link')

describe('Customers tab strip (v40 F17)', () => {
  it('shows Find a person, Who is leaving and Personas and campaigns, each its own URL', () => {
    renderWithProviders(<CustomersTabs />, { role: 'cxmgr', route: '/customers' })
    expect(tabs().map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
      ['Find a person', '/customers'],
      ['Who is leaving', '/runaway'],
      ['Personas and campaigns', '/personas'],
    ])
  })

  it('keeps "Find a person" as the current tab when a person is open', () => {
    renderWithProviders(<CustomersTabs />, { role: 'cxmgr', route: '/customers/p-001' })
    expect(screen.getByRole('link', { name: 'Find a person' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Who is leaving' })).not.toHaveAttribute('aria-current')
  })

  it.each<[RoleId, string[]]>([
    ['cxmgr', ['Find a person', 'Who is leaving', 'Personas and campaigns']],
    ['marketing', ['Find a person', 'Who is leaving', 'Personas and campaigns']],
    ['auditmkt', ['Find a person', 'Who is leaving', 'Personas and campaigns']],
    ['envmgmt', ['Find a person', 'Who is leaving']],
    ['teamlead', ['Find a person']],
  ])('%s sees only the tabs it can open', (role, expected) => {
    renderWithProviders(<CustomersTabs />, { role })
    expect(tabs().map((l) => l.textContent)).toEqual(expected)
  })

  it('speaks Arabic', () => {
    renderWithProviders(<CustomersTabs />, { role: 'cxmgr', lang: 'ar' })
    expect(within(screen.getByRole('navigation', { name: 'أقسام العملاء' })).getByText('من يبتعد')).toBeInTheDocument()
  })
})
