import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import * as mock from '@/services/mockData'
import { CHECK_IDS } from '@/data/campaignAudit'
import { campaignAuditStore } from '@/services/campaignAuditQueries'
import type { AiInterviewCampaign, RoleId } from '@/types'
import CloseTheLoop from '@/pages/CloseTheLoop'
import Personas from '@/pages/Personas'

vi.setConfig({ testTimeout: 30_000 })

const T = { timeout: 10_000 }

beforeAll(() => preferReducedMotion())

/** A draft AI interview campaign, as the CX team creates one in Close the loop. */
let draft: AiInterviewCampaign
beforeEach(() => {
  campaignAuditStore.reset()
  const members = mock.MOCK_DETRACTOR_CALL_ITEMS.filter((i) => i.severity !== 'critical').slice(0, 3).map((i) => i.id)
  draft = { id: 'camp-ai-gate', name: { en: 'Gate test campaign', ar: 'حملة اختبار البوابة' }, segmentDescription: { en: 'Test segment', ar: 'شريحة اختبار' }, script: { en: 'Hello', ar: 'مرحباً' }, status: 'draft', memberIds: members }
  mock.MOCK_AI_CAMPAIGNS.push(draft)
})
afterEach(() => {
  mock.MOCK_AI_CAMPAIGNS.splice(mock.MOCK_AI_CAMPAIGNS.indexOf(draft), 1)
  campaignAuditStore.reset()
})

/** The audit lead clears a campaign (the register is shared: this is what the Campaign audit page does). */
function clear(id: string, by: RoleId = 'auditmkt') {
  for (const check of CHECK_IDS) campaignAuditStore.setCheck({ id, check, value: true, by })
  campaignAuditStore.setVerdict({ id, verdict: 'ok', by })
}

const gate = (sourceId: string) => screen.findByTestId(`campaign-gate-${sourceId}`, {}, T)
const startButton = (scope: HTMLElement) => within(scope).getByRole('button', { name: 'Start campaign' })

describe('the gate on Close the loop: an AI interview campaign (v42.1 F33)', () => {
  it('says a new campaign is not cleared, gives the reason, and its Start button is aria-disabled and does nothing', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CloseTheLoop />, { role: 'cxmgr', route: '/close-the-loop' })
    const g = await gate('camp-ai-gate')
    expect(g).toHaveAttribute('data-clearance', 'waiting')
    expect(within(g).getByText('Waiting for clearance')).toBeInTheDocument()
    const reason = within(g).getByTestId('campaign-gate-reason-camp-ai-gate')
    expect(reason).toHaveTextContent('Not cleared yet: it cannot start. The Internal Audit and Marketing Lead clears it first; nothing is sent to a customer until then.')
    const start = startButton(g)
    expect(start).toHaveAttribute('aria-disabled', 'true')
    expect(start).toHaveAttribute('aria-describedby', reason.id)
    await user.click(start)
    // nothing started: the campaign is still a draft, in the register and on the page
    expect(draft.status).toBe('draft')
    expect(campaignAuditStore.list().find((c) => c.id === 'camp-ai-gate')!.stage).toBe('before')
    expect(within(g.closest('li')!).getByText('Draft')).toBeInTheDocument()
    // the link opens the audit on that campaign
    expect(within(g).getByRole('link', { name: /Campaign audit/ })).toHaveAttribute('href', '/settings/campaign-audit?campaign=camp-ai-gate')
  })

  it('a campaign sent back says so, lists the failed checks and still cannot start', async () => {
    const user = userEvent.setup()
    campaignAuditStore.setCheck({ id: 'camp-ai-gate', check: 'people', value: false, by: 'auditmkt' })
    campaignAuditStore.setCheck({ id: 'camp-ai-gate', check: 'money', value: false, by: 'auditmkt' })
    campaignAuditStore.setVerdict({ id: 'camp-ai-gate', verdict: 'back', by: 'auditmkt' })
    renderWithProviders(<CloseTheLoop />, { role: 'cxteam', route: '/close-the-loop' })
    const g = await gate('camp-ai-gate')
    expect(g).toHaveAttribute('data-clearance', 'sent_back')
    expect(within(g).getByTestId('campaign-gate-reason-camp-ai-gate')).toHaveTextContent('Sent back, so it cannot start. Failed: Right people, The money. It starts after a new clearance.')
    expect(startButton(g)).toHaveAttribute('aria-disabled', 'true')
    await user.click(startButton(g))
    expect(draft.status).toBe('draft')
  })

  it('once the Internal Audit and Marketing Lead has cleared it, the CX team starts it: the campaign runs, and can be marked finished', async () => {
    const user = userEvent.setup()
    clear('camp-ai-gate')
    renderWithProviders(<CloseTheLoop />, { role: 'cxteam', route: '/close-the-loop' })
    const g = await gate('camp-ai-gate')
    expect(g).toHaveAttribute('data-clearance', 'cleared')
    expect(within(g).getByText('Cleared by Internal Audit')).toBeInTheDocument()
    expect(within(g).queryByTestId('campaign-gate-reason-camp-ai-gate')).not.toBeInTheDocument()
    expect(startButton(g)).not.toHaveAttribute('aria-disabled')
    await user.click(startButton(g))
    await waitFor(() => expect(g).toHaveAttribute('data-stage', 'running'), T)
    expect(draft.status).toBe('running')
    // the page's own status badge follows the campaign (the gate does not repeat it)
    await waitFor(() => expect(within(g.closest('li')!).getByText('Running')).toBeInTheDocument(), T)
    expect(within(g.closest('li')!).queryByText('Draft')).not.toBeInTheDocument()
    await user.click(within(g).getByRole('button', { name: 'Mark as finished' }))
    await waitFor(() => expect(g).toHaveAttribute('data-stage', 'after'), T)
    expect(draft.status).toBe('closed')
  })

  it('the campaign that already runs in the sample is cleared, so nothing about the existing flow changes for it', async () => {
    renderWithProviders(<CloseTheLoop />, { role: 'cxmgr', route: '/close-the-loop' })
    const g = await gate(mock.MOCK_AI_CAMPAIGNS[0].id)
    expect(g).toHaveAttribute('data-clearance', 'cleared')
    expect(g).toHaveAttribute('data-stage', 'running')
    expect(within(g).queryByRole('button', { name: 'Start campaign' })).not.toBeInTheDocument()
    expect(within(g).getByRole('button', { name: 'Mark as finished' })).toBeInTheDocument()
  })

  it('creating a campaign in the dialog still works, and the new campaign appears waiting for clearance', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CloseTheLoop />, { role: 'cxmgr', route: '/close-the-loop' })
    await gate('camp-ai-gate')
    await user.click(await screen.findByRole('button', { name: /Create campaign/ }, T))
    const dialog = await screen.findByRole('dialog', {}, T)
    await user.type(within(dialog).getByLabelText('Name'), 'Made in the dialog')
    await user.type(within(dialog).getByLabelText('Segment'), 'Medium detractors')
    await user.type(within(dialog).getByLabelText('Script (English)'), 'Hello, a short call about your experience.')
    await user.type(within(dialog).getByLabelText('Script (Arabic)'), 'مرحباً، مكالمة قصيرة عن تجربتك.')
    const boxes = within(dialog).getAllByRole('checkbox')
    await user.click(boxes[0])
    await user.click(within(dialog).getByRole('button', { name: 'Create campaign' }))
    // the repository call takes a moment before the campaign exists
    await waitFor(() => expect(mock.MOCK_AI_CAMPAIGNS.some((c) => c.name.en === 'Made in the dialog')).toBe(true), T)
    const created = mock.MOCK_AI_CAMPAIGNS.find((c) => c.name.en === 'Made in the dialog')
    try {
      expect(created!.status).toBe('draft')
      const g = await gate(created!.id)
      await waitFor(() => expect(g).toHaveAttribute('data-clearance', 'waiting'), T)
      expect(startButton(g)).toHaveAttribute('aria-disabled', 'true')
    } finally {
      if (created) mock.MOCK_AI_CAMPAIGNS.splice(mock.MOCK_AI_CAMPAIGNS.indexOf(created), 1)
    }
  })

  it('speaks Arabic', async () => {
    renderWithProviders(<CloseTheLoop />, { role: 'cxmgr', lang: 'ar', route: '/close-the-loop' })
    const g = await gate('camp-ai-gate')
    expect(within(g).getByText('تنتظر الإجازة')).toBeInTheDocument()
    expect(within(g).getByTestId('campaign-gate-reason-camp-ai-gate')).toHaveTextContent('لم تُجَز بعد: لا يمكن أن تبدأ.')
    expect(within(g).getByRole('button', { name: 'ابدأ الحملة' })).toHaveAttribute('aria-disabled', 'true')
    expect(within(g).getByRole('link', { name: /تدقيق الحملات/ })).toBeInTheDocument()
  })
})

describe('the gate on Personas: the persona campaign recommendation (v42.1 F33)', () => {
  const personaGate = (index: number) => gate(mock.MOCK_PERSONAS[index].id)

  it('shows every ranked campaign with where it stands: two running, two waiting, two finished', async () => {
    renderWithProviders(<Personas />, { role: 'marketing', route: '/personas' })
    const states: string[] = []
    for (let i = 0; i < 6; i++) states.push((await personaGate(i)).getAttribute('data-stage')!)
    expect(states).toEqual(['running', 'running', 'before', 'before', 'after', 'after'])
    expect(screen.getByRole('columnheader', { name: 'Campaign audit' })).toBeInTheDocument()
  })

  it('a campaign not cleared says so and the Marketing manager cannot start it', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Personas />, { role: 'marketing', route: '/personas' })
    const g = await personaGate(2)
    expect(g).toHaveAttribute('data-clearance', 'waiting')
    expect(within(g).getByTestId(`campaign-gate-reason-${mock.MOCK_PERSONAS[2].id}`)).toHaveTextContent('Not cleared yet: it cannot start.')
    expect(startButton(g)).toHaveAttribute('aria-disabled', 'true')
    await user.click(startButton(g))
    expect(campaignAuditStore.list().find((c) => c.id === 'MC-103')!.stage).toBe('before')
  })

  it('a cleared campaign starts for the Marketing manager, and pressing Start does not jump the table to the persona', async () => {
    const user = userEvent.setup()
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    clear('MC-103')
    renderWithProviders(<Personas />, { role: 'marketing', route: '/personas' })
    const g = await personaGate(2)
    expect(g).toHaveAttribute('data-clearance', 'cleared')
    await user.click(startButton(g))
    await waitFor(() => expect(g).toHaveAttribute('data-stage', 'running'), T)
    expect(campaignAuditStore.list().find((c) => c.id === 'MC-103')!.stage).toBe('running')
    expect(scroll).not.toHaveBeenCalled()
    await user.click(within(g).getByRole('button', { name: 'Mark as finished' }))
    await waitFor(() => expect(g).toHaveAttribute('data-stage', 'after'), T)
    expect(scroll).not.toHaveBeenCalled()
  })

  it('the Internal Audit and Marketing Lead and Executive see where a campaign stands but have no Start button: the audit role audits, never runs', async () => {
    for (const role of ['auditmkt', 'exec'] as RoleId[]) {
      const { unmount } = renderWithProviders(<Personas />, { role, route: '/personas' })
      const g = await personaGate(2)
      expect(within(g).getByText('Waiting for clearance'), role).toBeInTheDocument()
      expect(within(g).queryByRole('button'), role).not.toBeInTheDocument()
      unmount()
    }
  })

  it('the CX manager can start a cleared persona campaign too', async () => {
    clear('MC-104', 'cxmgr')
    renderWithProviders(<Personas />, { role: 'cxmgr', route: '/personas' })
    const g = await personaGate(3)
    expect(startButton(g)).not.toHaveAttribute('aria-disabled')
  })

  it('speaks Arabic', async () => {
    renderWithProviders(<Personas />, { role: 'marketing', lang: 'ar', route: '/personas' })
    const g = await personaGate(2)
    expect(within(g).getByText('تنتظر الإجازة')).toBeInTheDocument()
    expect(within(g).getByRole('button', { name: 'ابدأ الحملة' })).toHaveAttribute('aria-disabled', 'true')
  })
})
