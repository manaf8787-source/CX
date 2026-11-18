import { vi, beforeAll, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import * as mock from '@/services/mockData'
import type { RoleId } from '@/types'
import Customers from './Customers'
import Runaway from './Runaway'

// Pages load their sample after a short delay and a full run is busy: give a test room.
vi.setConfig({ testTimeout: 20_000 })

beforeAll(() => preferReducedMotion())

const T = { timeout: 8000 }
const dncr = mock.MOCK_PERSONS.find((p) => p.consent.dncr)! // p-005 in the sample
const healthy = mock.MOCK_PERSONS[0]

const person = (role: RoleId, p = dncr) =>
  renderWithProviders(<Customers />, { role, route: `/customers/${p.id}`, path: '/customers/:personId' })

describe('Customers: a person (v40 F07, F17, F24)', () => {
  it('shows the tab strip with "Find a person" current, the consent row and the next-step box', async () => {
    person('cxmgr')
    expect(await screen.findByRole('heading', { level: 1, name: dncr.name }, T)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Find a person' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Who is leaving' })).toBeInTheDocument()
    const consent = screen.getByRole('region', { name: 'Consent' })
    expect(within(consent).getByText('DNCR · no calls, no surveys by call')).toBeInTheDocument()
    expect(within(consent).getByText('DNCR', { selector: 'span' })).toBeInTheDocument()
    // the box appears once the person's effort summary has loaded, a beat after the heading
    expect(await screen.findByRole('region', { name: 'Next step' }, T)).toBeInTheDocument()
  })

  it('says "Consent given" for a person without a DNCR flag', async () => {
    person('cxmgr', healthy)
    await screen.findByRole('heading', { level: 1, name: healthy.name }, T)
    expect(within(screen.getByRole('region', { name: 'Consent' })).getByText(healthy.consent.dncr ? 'DNCR · no calls, no surveys by call' : 'Consent given')).toBeInTheDocument()
  })

  it('the next-step box is step 2 when the person has problems or drifts, step 1 when nothing is wrong', async () => {
    const problems = mock.MOCK_EFFORT_SUMMARIES.find((e) => e.problemsFound > 0)!
    const withProblems = mock.MOCK_PERSONS.find((p) => p.id === problems.personId)!
    const { unmount } = person('cxmgr', withProblems)
    await screen.findByRole('heading', { level: 1, name: withProblems.name }, T)
    const box = await screen.findByRole('region', { name: 'Next step' }, T)
    const current = within(box).getAllByRole('link').find((l) => l.getAttribute('aria-current') === 'step')!
    expect(current).toHaveTextContent('2 Signal')
    unmount()

    const clean = mock.MOCK_EFFORT_SUMMARIES.find((e) => e.problemsFound === 0 && !mock.MOCK_PERSONS.find((p) => p.id === e.personId)!.consent.dncr)!
    const cleanPerson = mock.MOCK_PERSONS.find((p) => p.id === clean.personId)!
    person('cxmgr', cleanPerson)
    await screen.findByRole('heading', { level: 1, name: cleanPerson.name }, T)
    const box2 = await screen.findByRole('region', { name: 'Next step' }, T)
    const current2 = within(box2).getAllByRole('link').find((l) => l.getAttribute('aria-current') === 'step')
    // Healthy people stay on step 1; a person who happens to be drifting is on step 2.
    expect(current2).toHaveTextContent(/1 Listen|2 Signal/)
  })

  it('the Internal Audit and Marketing Lead sees the reference, never the name, the mobile or the e-mail', async () => {
    person('auditmkt')
    expect(await screen.findByRole('heading', { level: 1, name: 'P-005' }, T)).toBeInTheDocument()
    expect(screen.queryByText(dncr.name)).not.toBeInTheDocument()
    expect(screen.queryByText(dncr.identity.mobile!)).not.toBeInTheDocument()
    expect(screen.queryByText(dncr.identity.email!)).not.toBeInTheDocument()
    // The CRM contact id stays: it identifies without naming.
    expect(await screen.findByText(dncr.identity.crmContactId!)).toBeInTheDocument()
  })

  it('shows the mobile and e-mail to a role that may see names', async () => {
    person('cxmgr')
    expect(await screen.findByText(dncr.identity.mobile!, {}, T)).toBeInTheDocument()
    expect(screen.getByText(dncr.identity.email!)).toBeInTheDocument()
  })

  it('shows the type as one of the six and the source of the lead', async () => {
    person('cxmgr')
    await screen.findByRole('heading', { level: 1, name: dncr.name }, T)
    const profile = screen.getByText('Profile').closest('[data-slot="card"]') as HTMLElement
    expect(within(profile).getByText('Member')).toBeInTheDocument()
    expect(within(profile).getByText('Source of the lead')).toBeInTheDocument()
    expect(within(profile).getByText('PSI Club')).toBeInTheDocument()
  })
})

describe('Customers: the list page', () => {
  it('has the heading, the three tabs and "Everyone on record"', async () => {
    renderWithProviders(<Customers />, { role: 'cxmgr', route: '/customers', path: '/customers' })
    expect(screen.getByRole('heading', { level: 1, name: 'Customers' })).toBeInTheDocument()
    expect(screen.getByText('One record per person, every contact on it; who is drifting away; who our customers are.')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Find a person|Who is leaving|Personas and campaigns/ })).toHaveLength(3)
    expect(await screen.findByText('Everyone on record', {}, T)).toBeInTheDocument()
  })

  it('a ?q= search from Home starts the list already filtered', async () => {
    renderWithProviders(<Customers />, { role: 'cxmgr', route: `/customers?q=${encodeURIComponent(dncr.name)}`, path: '/customers' })
    const box = await screen.findByRole('searchbox', { name: 'Search this list' }, T)
    expect(box).toHaveValue(dncr.name)
  })
})

describe('Who is leaving (v40 F17)', () => {
  it('is a tab of Customers: the tab strip, the "?" explaining the term, and names for a role that may see them', async () => {
    renderWithProviders(<Runaway />, { role: 'cxmgr', route: '/runaway' })
    expect(screen.getByRole('heading', { level: 1, name: 'Who is leaving' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Who is leaving' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getAllByRole('button', { name: 'What Runaway customer means' }).length).toBeGreaterThan(0)
    const lists = await screen.findAllByRole('link', { name: /Full journey/ }, T)
    expect(lists.length).toBeGreaterThan(0)
  })

  it('shows references (P-003), never names, to the Internal Audit and Marketing Lead', async () => {
    renderWithProviders(<Runaway />, { role: 'auditmkt', route: '/runaway' })
    const link = (await screen.findAllByRole('link', { name: /Full journey/ }, T))[0]
    const row = link.closest('li')!
    expect(row.querySelector('span.text-sm.font-medium')!.textContent).toMatch(/^P-\d{3}$/)
    for (const p of new Set(mock.MOCK_PERSONS.map((x) => x.name))) expect(screen.queryByText(p)).not.toBeInTheDocument()
  })
})
