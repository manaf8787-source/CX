import { beforeAll, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import { AssistantContext } from '@/components/ai/AssistantContext'
import { canUseAssistant } from '@/auth/access'
import Home from '@/pages/Home'
import type { RoleId } from '@/types'
import { WatchTeamButton } from './WatchTeamButton'

beforeAll(() => preferReducedMotion())

const T = { timeout: 8000 }

describe('"Watch the AI team work" button (v42 F31)', () => {
  it.each(['cxmgr', 'cxteam', 'envmgmt', 'marketing', 'auditmkt', 'exec'] as RoleId[])('%s gets a link to the replay page', (role) => {
    renderWithProviders(<WatchTeamButton />, { role })
    const link = screen.getByRole('link', { name: 'Watch the AI team work' })
    expect(link).toHaveAttribute('href', '/settings/watch-ai-team')
    // the link is the button (asChild), not a button inside a link
    expect(link).toHaveAttribute('data-slot', 'button')
    expect(link.querySelector('button')).toBeNull()
  })

  it.each(['teamlead', 'aslead', 'ld', 'hrspec', 'hrmgr', 'shopper'] as RoleId[])('%s gets no button: it may not open the page', (role) => {
    renderWithProviders(<WatchTeamButton />, { role })
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByText('Watch the AI team work')).not.toBeInTheDocument()
  })

  it('speaks Arabic', () => {
    renderWithProviders(<WatchTeamButton />, { role: 'cxmgr', lang: 'ar' })
    expect(screen.getByRole('link', { name: 'شاهد فريق الذكاء يعمل' })).toHaveAttribute('href', '/settings/watch-ai-team')
  })

  it('sits on Home right under the six steps, after the step line and before the Daily brief', async () => {
    const ui: ReactNode = (
      <AssistantContext.Provider value={{ available: canUseAssistant('cxmgr'), open: () => {} }}>
        <Home />
      </AssistantContext.Provider>
    )
    renderWithProviders(ui, { role: 'cxmgr' })
    const steps = await screen.findByRole('navigation', { name: 'The six steps, with live counts' }, T)
    const link = screen.getByRole('link', { name: 'Watch the AI team work' })
    // after the steps, not inside them (the step line keeps exactly its six links)
    expect(steps.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(steps).queryByRole('link', { name: 'Watch the AI team work' })).not.toBeInTheDocument()
    expect(within(steps).getAllByRole('link')).toHaveLength(6)
    const brief = await screen.findByRole('list', { name: 'Daily brief lines' }, T)
    expect(link.compareDocumentPosition(brief) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('a team lead sees Home without the button', async () => {
    renderWithProviders(<Home />, { role: 'teamlead' })
    await screen.findByRole('navigation', { name: 'The six steps, with live counts' }, T)
    expect(screen.queryByRole('link', { name: 'Watch the AI team work' })).not.toBeInTheDocument()
  })
})
