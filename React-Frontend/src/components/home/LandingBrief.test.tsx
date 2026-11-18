import { beforeAll, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import { canAccessPath } from '@/auth/access'
import { ROLE_DEFS } from '@/data/roles'
import Ld from '@/pages/settings/Ld'
import HrTeamPerf from '@/pages/settings/HrTeamPerf'
import OverviewPage from '@/pages/OverviewPage'
import ActionsLayout from '@/pages/actions/ActionsLayout'
import { LandingBrief } from './LandingBrief'

beforeAll(() => preferReducedMotion())

const T = { timeout: 8000 }
const brief = () => screen.findByText('Daily brief', {}, T)
const noBrief = () => expect(screen.queryByText('Daily brief')).not.toBeInTheDocument()

describe('Daily brief on the landing pages of the roles that land outside Home (v40 F09, F35)', () => {
  it('the roles that land outside Home are exactly the four the delta names (plus the shopper, which has no brief)', () => {
    const outside = ROLE_DEFS.filter((r) => r.home !== '/home').map((r) => `${r.id}:${r.home}`)
    expect(outside.sort()).toEqual(['auditmkt:/overview', 'hrmgr:/settings/hr-team', 'hrspec:/actions', 'ld:/settings/ld', 'shopper:/settings/mystery-shopper'])
  })

  it('shows only to the roles it is given', async () => {
    const { unmount } = renderWithProviders(<LandingBrief roles={['ld']} />, { role: 'ld' })
    await brief()
    unmount()
    renderWithProviders(<LandingBrief roles={['ld']} />, { role: 'cxmgr' })
    noBrief()
  })

  it('L&D: at the top of the L&D page, with its training-gap line', async () => {
    renderWithProviders(<Ld />, { role: 'ld', route: '/settings/ld' })
    const heading = await brief()
    expect(heading.compareDocumentPosition(await screen.findByText('Training-gap actions', {}, T)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(await screen.findByText(/training-gap fix(es)? (is|are) with L&D right now/, {}, T)).toBeInTheDocument()
  })

  it('the HR manager: on the HR team page, NPS as plain text (no Overview for this role)', async () => {
    renderWithProviders(<HrTeamPerf />, { role: 'hrmgr', route: '/settings/hr-team' })
    await brief()
    expect(canAccessPath('hrmgr', '/overview')).toBe(false)
    const list = await screen.findByRole('list', { name: 'Daily brief lines' }, T)
    expect(within(list).queryAllByRole('link')).toHaveLength(0)
    expect(within(list).getAllByRole('listitem').length).toBeGreaterThan(0)
  })

  it('the Internal Audit and Marketing Lead: on the Overview, every link filtered by what the role can open', async () => {
    renderWithProviders(<OverviewPage />, { role: 'auditmkt', route: '/overview' })
    await brief()
    const list = await screen.findByRole('list', { name: 'Daily brief lines' }, T)
    for (const a of within(list).queryAllByRole('link')) expect(canAccessPath('auditmkt', new URL(a.getAttribute('href')!, 'http://x').pathname)).toBe(true)
    expect(within(list).getByText(/Weekly sample/)).toBeInTheDocument()
  })

  it('the HR specialist: on the fixes tab (the landing page of Actions), with the conduct line; not on the other tabs', async () => {
    const { unmount } = renderWithProviders(<ActionsLayout />, { role: 'hrspec', route: '/actions/corrective' })
    await brief()
    expect(await screen.findByText(/conduct note/, {}, T)).toBeInTheDocument()
    unmount()
    renderWithProviders(<ActionsLayout />, { role: 'hrspec', route: '/actions/signals' })
    noBrief()
  })

  it('the CX manager sees no second brief on these pages (it is on their Home)', async () => {
    renderWithProviders(<ActionsLayout />, { role: 'cxmgr', route: '/actions/corrective' })
    await screen.findByRole('region', { name: 'Next step' })
    noBrief()
  })
})
