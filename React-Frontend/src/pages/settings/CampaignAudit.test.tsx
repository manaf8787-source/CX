import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import { ROLE_DEFS } from '@/data/roles'
import { AUDIT_CHECKS } from '@/data/campaignAudit'
import { AccessGuard } from '@/components/layout/AccessGuard'
import { campaignAuditStore } from '@/services/campaignAuditQueries'
import type { RoleId } from '@/types'
import CampaignAudit from './CampaignAudit'

vi.setConfig({ testTimeout: 20_000 })

const T = { timeout: 8000 }

beforeAll(() => preferReducedMotion())
beforeEach(() => campaignAuditStore.reset())
afterEach(() => campaignAuditStore.reset())

/** Renders the page and waits for the campaign card. */
async function page(role: RoleId = 'auditmkt', { lang = 'en', route = '/settings/campaign-audit' }: { lang?: 'en' | 'ar'; route?: string } = {}) {
  const utils = renderWithProviders(<CampaignAudit />, { role, lang, route })
  await screen.findByTestId('campaign-card', {}, T)
  return { ...utils, card: () => screen.getByTestId('campaign-card') }
}

const checkRow = (id: string) => document.querySelector<HTMLElement>(`[data-check="${id}"]`)!
const pick = (id: string) => screen.getByRole('button', { name: new RegExp(`^${id}`) })
const kpi = (label: string) => [...document.querySelectorAll<HTMLElement>('.surface-card')].find((el) => el.textContent?.startsWith(label))!
const clearButton = () => screen.getByRole('button', { name: 'Cleared to run' })
const backButton = () => screen.getByRole('button', { name: 'Send back to Marketing with the failed checks' })

async function mark(user: ReturnType<typeof userEvent.setup>, check: string, value: 'Pass' | 'Fail') {
  const title = AUDIT_CHECKS.find((c) => c.id === check)!.title.en
  await user.click(within(checkRow(check)).getByRole('button', { name: `${title}: ${value}` }))
}

describe('Campaign audit page: the Internal Audit and Marketing Lead (v42.1 F33)', () => {
  it('lists every campaign in a segmented control: one per persona and the AI campaigns, with where each stands', async () => {
    await page()
    const group = screen.getByRole('group', { name: 'Campaigns' })
    const names = within(group).getAllByRole('button').map((b) => b.textContent)
    expect(names).toEqual(['MC-101 · Cleared', 'MC-102 · Cleared', 'MC-103 · Waiting for clearance', 'MC-104 · Waiting for clearance', 'MC-105 · Cleared', 'MC-106 · Cleared', 'camp-ai-1 · Cleared'])
  })

  it('opens on the first campaign waiting for clearance and shows it as before the run, with the heading, the owner and the state', async () => {
    const { card } = await page()
    expect(screen.getByRole('heading', { level: 2, name: 'Campaign audit' })).toBeInTheDocument()
    expect(pick('MC-103')).toHaveAttribute('aria-pressed', 'true')
    expect(card()).toHaveAttribute('data-campaign', 'MC-103')
    expect(card()).toHaveAttribute('data-stage', 'before')
    expect(card()).toHaveTextContent('MC-103 · Marketing campaign from a persona · owner: Marketing manager · waiting for clearance')
    expect(within(card()).getByText('Before')).toBeInTheDocument()
    // nothing ran yet: no results card
    expect(screen.queryByText('After it ran')).not.toBeInTheDocument()
  })

  it('shows the five checks, each with its rule text and what the campaign says, and a ✓ and a ✗ to answer', async () => {
    await page()
    const list = screen.getByRole('list', { name: 'The five checks' })
    const rows = within(list).getAllByRole('listitem')
    expect(rows).toHaveLength(5)
    AUDIT_CHECKS.forEach((q, i) => {
      expect(within(rows[i]).getByRole('heading', { level: 3, name: q.title.en })).toBeInTheDocument()
      expect(within(rows[i]).getByText(q.rule.en)).toBeInTheDocument()
      expect(within(rows[i]).getByRole('button', { name: `${q.title.en}: Pass` })).toHaveAttribute('aria-pressed', 'false')
      expect(within(rows[i]).getByRole('button', { name: `${q.title.en}: Fail` })).toHaveAttribute('aria-pressed', 'false')
    })
    // what the campaign says: people, projects, channel, message with its "what not to do" line, the money
    expect(rows[0]).toHaveTextContent(/Local family renter · .* · \d+ people/)
    expect(rows[1]).toHaveTextContent('Al Reeman II, Saadiyat Lagoons (Aldar, Bloom)')
    expect(rows[2]).toHaveTextContent('App message first, then a call from the leasing manager')
    expect(rows[3]).toHaveTextContent('not: No renewal letter before the request is closed')
    expect(rows[4]).toHaveTextContent(/Budget AED [\d,]+ · AED \d+ per contact · \d+ expected responses · AED [\d,]+ per expected lead/)
  })

  it('"Cleared to run" waits for all five ✓: until then it is aria-disabled and the line under it says why, and pressing it does nothing', async () => {
    const user = userEvent.setup()
    const { card } = await page()
    expect(clearButton()).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText(/Mark all five checks ✓ to clear it/)).toBeInTheDocument()
    await mark(user, 'people', 'Pass')
    await user.click(clearButton())
    expect(card()).toHaveAttribute('data-clearance', 'waiting')
    expect(card()).not.toHaveTextContent('Cleared on')
  })

  it('marks ✓ and ✗, and a second press takes the mark back', async () => {
    const user = userEvent.setup()
    await page()
    await mark(user, 'proj', 'Pass')
    await waitFor(() => expect(checkRow('proj')).toHaveAttribute('data-mark', 'pass'))
    expect(within(checkRow('proj')).getByRole('button', { name: 'Right projects and developers: Pass' })).toHaveAttribute('aria-pressed', 'true')
    await mark(user, 'proj', 'Fail')
    await waitFor(() => expect(checkRow('proj')).toHaveAttribute('data-mark', 'fail'))
    await mark(user, 'proj', 'Fail')
    await waitFor(() => expect(checkRow('proj')).toHaveAttribute('data-mark', 'none'))
  })

  it('clears a campaign once all five pass: the verdict reads cleared, the waiting count and the inbox rows follow', async () => {
    const user = userEvent.setup()
    const { card } = await page()
    expect(kpi('Waiting for clearance')).toHaveTextContent(/^Waiting for clearance2/)
    for (const q of AUDIT_CHECKS) await mark(user, q.id, 'Pass')
    await waitFor(() => expect(clearButton()).not.toHaveAttribute('aria-disabled'))
    await user.click(clearButton())
    await waitFor(() => expect(card()).toHaveAttribute('data-clearance', 'cleared'))
    expect(within(screen.getByTestId('campaign-verdict')).getByText(/Cleared on .* It can start; nothing was sent before this\./)).toBeInTheDocument()
    expect(within(card()).getByText('Cleared')).toBeInTheDocument()
    await waitFor(() => expect(kpi('Waiting for clearance')).toHaveTextContent(/^Waiting for clearance1/))
    expect(pick('MC-103')).toHaveTextContent('Cleared')
    // the register keeps it
    expect(campaignAuditStore.list().find((c) => c.id === 'MC-103')).toMatchObject({ clearance: 'cleared', decidedBy: 'auditmkt', stage: 'before' })
  })

  it('sends a campaign back with the failed checks listed, and the campaign says it cannot start', async () => {
    const user = userEvent.setup()
    const { card } = await page()
    expect(backButton()).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText(/Mark at least one check ✗ to send it back/)).toBeInTheDocument()
    await mark(user, 'people', 'Pass')
    await mark(user, 'msg', 'Fail')
    await mark(user, 'money', 'Fail')
    await waitFor(() => expect(backButton()).not.toHaveAttribute('aria-disabled'))
    await user.click(backButton())
    await waitFor(() => expect(card()).toHaveAttribute('data-clearance', 'sent_back'))
    const verdict = screen.getByTestId('campaign-verdict')
    expect(within(verdict).getByText('Sent back with the failed checks')).toBeInTheDocument()
    expect(verdict).toHaveTextContent('Failed: Right message, The money. It cannot start until it is cleared.')
    const failed = within(card()).getByRole('list', { name: 'Failed checks' })
    expect(within(failed).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Right message', 'The money'])
    expect(within(card()).getByText('Sent back')).toBeInTheDocument()
    // a sent-back campaign no longer waits on the audit lead
    await waitFor(() => expect(kpi('Waiting for clearance')).toHaveTextContent(/^Waiting for clearance1.*1 sent back, with Marketing/))
  })

  it('changing a check after the verdict withdraws it: the campaign waits for clearance again', async () => {
    const user = userEvent.setup()
    const { card } = await page()
    await mark(user, 'chan', 'Fail')
    await waitFor(() => expect(backButton()).not.toHaveAttribute('aria-disabled'))
    await user.click(backButton())
    await waitFor(() => expect(card()).toHaveAttribute('data-clearance', 'sent_back'))
    await mark(user, 'chan', 'Pass')
    await waitFor(() => expect(card()).toHaveAttribute('data-clearance', 'waiting'))
    expect(within(screen.getByTestId('campaign-verdict')).getByText(/Waiting for clearance\. Nothing is sent to a customer until it is cleared\./)).toBeInTheDocument()
  })

  it('opens the campaign named in the link', async () => {
    const { card } = await page('auditmkt', { route: '/settings/campaign-audit?campaign=MC-104' })
    expect(card()).toHaveAttribute('data-campaign', 'MC-104')
    expect(pick('MC-104')).toHaveAttribute('aria-pressed', 'true')
  })

  it('moves between campaigns and keeps the choice in the address', async () => {
    const user = userEvent.setup()
    const { card } = await page()
    await user.click(pick('MC-105'))
    await waitFor(() => expect(card()).toHaveAttribute('data-campaign', 'MC-105'))
    expect(pick('MC-105')).toHaveAttribute('aria-pressed', 'true')
    expect(pick('MC-103')).toHaveAttribute('aria-pressed', 'false')
  })

  it('the CX manager marks checks and decides as well', async () => {
    const user = userEvent.setup()
    await page('cxmgr')
    expect(screen.queryByText(/^View only:/)).not.toBeInTheDocument()
    await mark(user, 'people', 'Pass')
    await waitFor(() => expect(checkRow('people')).toHaveAttribute('data-mark', 'pass'))
    expect(clearButton()).toBeInTheDocument()
  })
})

describe('Campaign audit page: after the run (v42.1 F33)', () => {
  it('a running campaign shows its numbers so far, its closed checks and the targeting signal under 80%', async () => {
    const user = userEvent.setup()
    const { card } = await page()
    await user.click(pick('MC-101'))
    await waitFor(() => expect(card()).toHaveAttribute('data-campaign', 'MC-101'))
    expect(card()).toHaveAttribute('data-stage', 'running')
    expect(screen.getByText('After it ran')).toBeInTheDocument()
    expect(screen.getByText('so far')).toBeInTheDocument()
    const results = screen.getByTestId('campaign-results')
    expect(results).toHaveTextContent('Reached the right people')
    expect(results).toHaveTextContent(/71\s*%/)
    expect(results).toHaveTextContent(/14\s*%/)
    expect(results).toHaveTextContent('Leads or recoveries')
    expect(within(results).getByText('AED 778')).toBeInTheDocument() // 7,000 over 9 leads
    expect(screen.getByText(/Reached the right people: share of recipients who match the persona definition on the record\. Below 80% is a targeting finding and goes to Marketing as a signal\./)).toBeInTheDocument()
    const signal = screen.getByTestId('targeting-signal')
    expect(signal).toHaveTextContent('Targeting signal raised to Marketing')
    expect(signal).toHaveTextContent('71% of the recipients match the persona on the record, below the 80% line.')
    // the checks are closed once it runs: marks as text, no ✓ or ✗ buttons, no verdict buttons
    expect(within(card()).queryByRole('button', { name: /: Pass$/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cleared to run' })).not.toBeInTheDocument()
    expect(screen.getByTestId('campaign-verdict')).toHaveTextContent(/Cleared on .*, before anything was sent\. The checks are closed: the campaign is running\./)
  })

  it('a finished campaign at 86% raises no signal; one at 78% does', async () => {
    const user = userEvent.setup()
    const { card } = await page()
    await user.click(pick('MC-105'))
    await waitFor(() => expect(card()).toHaveAttribute('data-campaign', 'MC-105'))
    expect(card()).toHaveAttribute('data-stage', 'after')
    expect(screen.getByTestId('campaign-results')).toHaveTextContent(/86\s*%/)
    expect(screen.queryByTestId('targeting-signal')).not.toBeInTheDocument()
    expect(screen.getByTestId('targeting-ok')).toHaveTextContent('86% match the persona on the record: at or above the 80% line, no signal.')
    expect(screen.queryByText('so far')).not.toBeInTheDocument()
    await user.click(pick('MC-106'))
    await waitFor(() => expect(card()).toHaveAttribute('data-campaign', 'MC-106'))
    expect(screen.getByTestId('targeting-signal')).toHaveTextContent('78% of the recipients match the persona on the record, below the 80% line.')
  })

  it('counts the signals on the page: four runs reached under 80% in the sample', async () => {
    await page()
    expect(kpi('Targeting signals')).toHaveTextContent(/^Targeting signals4/)
    expect(kpi('Finished')).toHaveTextContent(/^Finished2/)
    expect(kpi('Running')).toHaveTextContent(/^Running3/)
  })

  it('the AI interview campaign is one of the list, run by the CX team', async () => {
    const user = userEvent.setup()
    const { card } = await page()
    await user.click(pick('camp-ai-1'))
    await waitFor(() => expect(card()).toHaveAttribute('data-campaign', 'camp-ai-1'))
    expect(card()).toHaveTextContent('AI interview campaign (Close the loop) · owner: CX team · running')
    expect(card()).toHaveTextContent('AI call then WhatsApp')
  })
})

describe('Campaign audit page: readers (v42.1 F33)', () => {
  it.each(['marketing', 'exec', 'cxteam'] as RoleId[])('%s reads the marks and the verdict: a view-only note, no buttons to mark or decide', async (role) => {
    await page(role)
    expect(screen.getAllByRole('note').map((n) => n.textContent)).toContain('View only: the Internal Audit and Marketing Lead and the CX manager clear or send back campaigns.')
    expect(screen.queryByRole('button', { name: /: (Pass|Fail)$/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cleared to run' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Send back to Marketing/ })).not.toBeInTheDocument()
    // a reader opens on the first campaign of the list, and sees the marks as words
    expect(screen.getByTestId('campaign-card')).toHaveAttribute('data-campaign', 'MC-101')
    expect(within(screen.getByTestId('campaign-card')).getAllByText('Pass')).toHaveLength(5)
  })

  it('a reader sees a campaign still waiting with "Not checked yet" on each check', async () => {
    const user = userEvent.setup()
    await page('marketing')
    await user.click(pick('MC-103'))
    await waitFor(() => expect(screen.getByTestId('campaign-card')).toHaveAttribute('data-campaign', 'MC-103'))
    expect(within(screen.getByTestId('campaign-card')).getAllByText('Not checked yet')).toHaveLength(5)
    expect(screen.getByTestId('campaign-verdict')).toHaveTextContent('Waiting for clearance. Nothing is sent to a customer until it is cleared.')
  })

  it('a reader sees the failed checks of a campaign that was sent back', async () => {
    campaignAuditStore.setCheck({ id: 'MC-103', check: 'money', value: false, by: 'auditmkt' })
    campaignAuditStore.setVerdict({ id: 'MC-103', verdict: 'back', by: 'auditmkt' })
    await page('marketing', { route: '/settings/campaign-audit?campaign=MC-103' })
    const failed = within(screen.getByTestId('campaign-card')).getByRole('list', { name: 'Failed checks' })
    expect(within(failed).getByText('The money')).toBeInTheDocument()
    expect(within(screen.getByTestId('campaign-card')).getAllByText('Fail')).toHaveLength(1)
  })
})

describe('Campaign audit page: access and Arabic (v42.1 F33)', () => {
  it.each(['envmgmt', 'teamlead', 'aslead', 'ld', 'hrspec', 'hrmgr', 'shopper'] as RoleId[])('%s cannot open it: the access guard sends the role to its own home', async (role) => {
    const home = ROLE_DEFS.find((r) => r.id === role)!.home
    renderWithProviders(
      <AccessGuard>
        <CampaignAudit />
      </AccessGuard>,
      { role, route: '/settings/campaign-audit', routes: [{ path: home, element: <p>role home</p> }] },
    )
    expect(await screen.findByText('role home', {}, T)).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent(home)
    expect(screen.queryByTestId('campaign-card')).not.toBeInTheDocument()
  })

  it.each(['cxmgr', 'cxteam', 'marketing', 'auditmkt', 'exec'] as RoleId[])('%s can open it through the access guard', async (role) => {
    renderWithProviders(
      <AccessGuard>
        <CampaignAudit />
      </AccessGuard>,
      { role, route: '/settings/campaign-audit' },
    )
    expect(await screen.findByTestId('campaign-card', {}, T)).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/settings/campaign-audit')
  })

  it('speaks Arabic, right to left: the title, the five rule texts, the buttons, the verdict', async () => {
    const user = userEvent.setup()
    await page('auditmkt', { lang: 'ar' })
    expect(document.documentElement.dir).toBe('rtl')
    expect(screen.getByRole('heading', { level: 2, name: 'تدقيق الحملات' })).toBeInTheDocument()
    expect(screen.getByText(/مسؤول التدقيق الداخلي والتسويق يجيزها أو يعيدها؛ التسويق يشغّلها/)).toBeInTheDocument()
    for (const q of AUDIT_CHECKS) {
      expect(within(checkRow(q.id)).getByRole('heading', { level: 3, name: q.title.ar })).toBeInTheDocument()
      expect(within(checkRow(q.id)).getByText(q.rule.ar)).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'مُجازة للتشغيل' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إعادة للتسويق مع الفحوصات الفاشلة' })).toBeInTheDocument()
    await user.click(within(checkRow('people')).getByRole('button', { name: 'الأشخاص الصحيحون: غير مطابق' }))
    await waitFor(() => expect(checkRow('people')).toHaveAttribute('data-mark', 'fail'))
    await user.click(screen.getByRole('button', { name: 'إعادة للتسويق مع الفحوصات الفاشلة' }))
    const failed = await screen.findByRole('list', { name: 'الفحوصات الفاشلة' }, T)
    expect(within(failed).getByText('الأشخاص الصحيحون')).toBeInTheDocument()
    expect(screen.getByTestId('campaign-verdict')).toHaveTextContent('أُعيدت مع الفحوصات الفاشلة')
  })

  it('shows the sample numbers in Arabic', async () => {
    await page('marketing', { lang: 'ar' })
    expect(screen.getByText('للعرض فقط: يجيز الحملات أو يعيدها مسؤول التدقيق الداخلي والتسويق ومدير تجربة العملاء.')).toBeInTheDocument()
    expect(screen.getByText('بعد التشغيل')).toBeInTheDocument()
    expect(screen.getByText('وصلت للأشخاص الصحيحين')).toBeInTheDocument()
    expect(screen.getByTestId('targeting-signal')).toHaveTextContent('إشارة استهداف رُفعت للتسويق')
  })
})
