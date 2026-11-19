import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import * as mock from '@/services/mockData'
import { inEnvScope } from '@/data/environments'
import { ROLE_DEFS } from '@/data/roles'
import { AccessGuard } from '@/components/layout/AccessGuard'
import type { RoleId } from '@/types'
import WatchTeam from './WatchTeam'

vi.setConfig({ testTimeout: 20_000 })

const T = { timeout: 8000 }
const first = mock.MOCK_PERSONS[0]
const NINE = /The nine steps of one message|الخطوات التسع لرسالة واحدة/

beforeAll(() => {
  preferReducedMotion()
})

afterEach(() => {
  vi.useRealTimers()
})

/** Renders the page and waits for the replay list (the sample person loaded). */
async function page(role: RoleId = 'cxmgr', lang: 'en' | 'ar' = 'en') {
  const utils = renderWithProviders(<WatchTeam />, { role, lang })
  const list = await screen.findByRole('list', { name: NINE }, T)
  return { ...utils, list, items: () => within(list).getAllByRole('listitem') }
}

const stepOf = () => document.querySelector('[data-slot="watch-step-of"]')!
const live = () => document.querySelector('[aria-live="polite"]')!.textContent

describe('Watch the AI team work: the replay (v42 F31)', () => {
  it('shows nine steps as an ordered list with step 1 reached and expanded, the other eight dimmed to their title', async () => {
    const { list, items } = await page()
    expect(list.tagName).toBe('OL')
    expect(items()).toHaveLength(9)
    expect(items()[0]).toHaveAttribute('aria-current', 'step')
    expect(items().filter((li) => li.hasAttribute('aria-current'))).toHaveLength(1)
    // step 1 is expanded: description and output
    expect(within(items()[0]).getByText(/Still waiting for the callback you promised on Tuesday/)).toBeInTheDocument()
    expect(within(items()[0]).getByText('Raw event, no person yet')).toBeInTheDocument()
    // the others show a clock, a chip and a title only
    for (const li of items().slice(1)) {
      expect(within(li).queryByText(/^→/)).not.toBeInTheDocument()
      expect(li.querySelector('p')).toBeNull()
    }
    expect(within(items()[1]).getByText('Agent 1 matches it to one person')).toBeInTheDocument()
    expect(screen.queryByText(/Mobile matches the CRM contact/)).not.toBeInTheDocument()
    expect(stepOf()).toHaveTextContent('Step 1 / 9')
    // the clocks, left to right
    expect(within(items()[0]).getByText('09:14:02').closest('bdi')).toHaveAttribute('dir', 'ltr')
    expect(within(items()[8]).getByText('09:14:08')).toBeInTheDocument()
  })

  it('titles of steps not yet reached use the muted ink, never opacity', async () => {
    const { items } = await page()
    const title = within(items()[3]).getByText('Agent 3 counts it as a signal')
    expect(title.className).toMatch(/text-muted-foreground/)
    expect(items()[3].innerHTML).not.toMatch(/opacity/)
    const reached = within(items()[0]).getByText('A WhatsApp message arrives')
    expect(reached.className).not.toMatch(/text-muted-foreground/)
  })

  it('Source tags on the first and last steps, an agent chip on the agent steps and the supervisor chip on step 6', async () => {
    const { items } = await page()
    expect(within(items()[0]).getByText('Source')).toBeInTheDocument()
    expect(within(items()[8]).getByText('Source')).toBeInTheDocument()
    expect(within(items()[1]).getByText('Agent 1 · Intake and matching')).toBeInTheDocument()
    expect(within(items()[2]).getByText('Agent 2 · Classification')).toBeInTheDocument()
    expect(within(items()[3]).getByText('Agent 3 · Signals and patterns')).toBeInTheDocument()
    expect(within(items()[4]).getByText('Agent 5 · Corrective action and routing')).toBeInTheDocument()
    expect(within(items()[5]).getByText('CX Supervisor: 6 checks passed')).toBeInTheDocument()
    expect(within(items()[6]).getByText('Agent 8 · Close the loop with detractors')).toBeInTheDocument()
    expect(within(items()[7]).getByText('Agent 10 · Survey triggers and delivery')).toBeInTheDocument()
  })

  it('Next step walks one step at a time: the step reached expands, is current, and a polite live region announces it', async () => {
    const user = userEvent.setup()
    const { items } = await page()
    const next = screen.getByRole('button', { name: 'Next step' })
    const region = document.querySelector('[aria-live="polite"]')!
    expect(region).toHaveAttribute('aria-atomic', 'true')
    expect(region.className).toMatch(/sr-only/)
    expect(region).not.toHaveAttribute('role') // not role="status": the e2e readiness check treats that as a loading indicator
    expect(live()).toBe('Step 1 of 9: A WhatsApp message arrives')
    await user.click(next)
    expect(items()[1]).toHaveAttribute('aria-current', 'step')
    expect(items()[0]).not.toHaveAttribute('aria-current')
    expect(within(items()[1]).getByText(/Mobile matches the CRM contact and the lead record/)).toBeInTheDocument()
    expect(within(items()[0]).getByText(/Still waiting for the callback/)).toBeInTheDocument() // earlier steps stay open
    expect(stepOf()).toHaveTextContent('Step 2 / 9')
    expect(live()).toBe('Step 2 of 9: Agent 1 matches it to one person')
    await user.click(next)
    expect(live()).toBe('Step 3 of 9: Agent 2 classifies it')
  })

  it('Next step reaches step 9, with every output line and the five supervisor ticks, and stays there without losing focus', async () => {
    const user = userEvent.setup()
    const { items } = await page()
    const next = screen.getByRole('button', { name: 'Next step' })
    for (let i = 0; i < 8; i++) await user.click(next)
    expect(items()[8]).toHaveAttribute('aria-current', 'step')
    expect(stepOf()).toHaveTextContent('Step 9 / 9')
    expect(live()).toBe('Step 9 of 9: What people see')
    expect(within(items()[8]).getByText(/6 seconds from message to inbox; the decision is a person's/)).toBeInTheDocument()
    // five ticks: Agents 1, 2, 3, 5 and 8 (the supervisor step and Agent 10 carry none)
    expect(within(items()[1]).getByText('supervisor')).toBeInTheDocument()
    expect(within(items()[5]).queryByText('supervisor')).not.toBeInTheDocument()
    expect(within(items()[7]).queryByText('supervisor')).not.toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: NINE })).getAllByText('supervisor')).toHaveLength(5)
    // the supervisor step
    expect(within(items()[5]).getByText('6 of 6 passed')).toBeInTheDocument()
    expect(within(items()[5]).getByText(/Six checks, in code, on every output above/)).toBeInTheDocument()
    // Next is now inactive but still focusable and a no-op
    expect(next).toHaveAttribute('aria-disabled', 'true')
    next.focus()
    await user.click(next)
    expect(document.activeElement).toBe(next)
    expect(items()[8]).toHaveAttribute('aria-current', 'step')
    // the keyboard works too
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    await user.tab()
    expect(items()[0]).toHaveAttribute('aria-current', 'step')
  })

  it('Reset goes back to step 1 and collapses the later steps', async () => {
    const user = userEvent.setup()
    const { items } = await page()
    for (let i = 0; i < 5; i++) await user.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByText(/Six checks, in code/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(items()[0]).toHaveAttribute('aria-current', 'step')
    expect(screen.queryByText(/Six checks, in code/)).not.toBeInTheDocument()
    expect(stepOf()).toHaveTextContent('Step 1 / 9')
    expect(live()).toBe('Step 1 of 9: A WhatsApp message arrives')
  })

  it('Play starts at step 1, advances one step every 750 ms, stops at step 9 and can be pressed again', async () => {
    const { items } = await page()
    vi.useFakeTimers()
    const play = screen.getByRole('button', { name: 'Play (6 seconds)' })
    act(() => play.click())
    expect(items()[0]).toHaveAttribute('aria-current', 'step')
    act(() => void vi.advanceTimersByTime(750))
    expect(items()[1]).toHaveAttribute('aria-current', 'step')
    act(() => void vi.advanceTimersByTime(750 * 3))
    expect(items()[4]).toHaveAttribute('aria-current', 'step')
    expect(live()).toBe('Step 5 of 9: Agent 5 proposes one fix and routes it')
    // pressed again mid-run: starts over, one timer
    act(() => play.click())
    expect(items()[0]).toHaveAttribute('aria-current', 'step')
    expect(vi.getTimerCount()).toBe(1)
    act(() => void vi.advanceTimersByTime(750 * 8))
    expect(items()[8]).toHaveAttribute('aria-current', 'step')
    expect(stepOf()).toHaveTextContent('Step 9 / 9')
    expect(vi.getTimerCount()).toBe(0)
    act(() => void vi.advanceTimersByTime(5000))
    expect(items()[8]).toHaveAttribute('aria-current', 'step')
  })

  it('Play stops when the user leaves the page', async () => {
    const { unmount } = await page()
    vi.useFakeTimers()
    const started = vi.spyOn(window, 'setInterval')
    const cleared = vi.spyOn(window, 'clearInterval')
    act(() => screen.getByRole('button', { name: 'Play (6 seconds)' }).click())
    const id = started.mock.results.at(-1)!.value
    expect(started).toHaveBeenLastCalledWith(expect.any(Function), 750)
    unmount()
    expect(cleared).toHaveBeenCalledWith(id)
  })

  it('Play still advances under reduced motion, but nothing animates in; with motion allowed a reached step fades its text in', async () => {
    const user = userEvent.setup()
    const reduced = await page()
    await user.click(screen.getByRole('button', { name: 'Next step' }))
    expect(reduced.items()[1].innerHTML).not.toMatch(/animate-/)
    expect(reduced.items()[1]).toHaveAttribute('aria-current', 'step')
    reduced.unmount()

    const original = window.matchMedia
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false, onchange: null }) as MediaQueryList) as typeof window.matchMedia
    try {
      const motion = await page()
      await user.click(screen.getByRole('button', { name: 'Next step' }))
      expect(motion.items()[1].innerHTML).toMatch(/animate-\[cx-fade-in/)
      expect(motion.items()[0].innerHTML).not.toMatch(/animate-/) // the first step is there at first paint
    } finally {
      window.matchMedia = original
    }
  })
})

describe('Watch the AI team work: names (v42 F31)', () => {
  it('the CX manager reads the first sample person by name, and a masked mobile', async () => {
    const user = userEvent.setup()
    const { items } = await page('cxmgr')
    expect(within(items()[0]).getByText(/From \+9715•••\d\d on the official number/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next step' }))
    expect(within(items()[1]).getByText(`EV-9001 · ${first.name}`)).toBeInTheDocument()
    expect(within(items()[1]).getByText(/Environment: /)).toHaveTextContent(`Environment: ${first.environment}.`)
    for (let i = 0; i < 7; i++) await user.click(screen.getByRole('button', { name: 'Next step' }))
    expect(within(items()[8]).getByText(new RegExp(`Call ${first.name} · 2 working days`))).toBeInTheDocument()
    // never the full number
    expect(document.body.textContent).not.toContain(first.identity.mobile)
  })

  it('the Internal Audit and Marketing Lead reads the reference, never the name, and no mobile digits', async () => {
    const user = userEvent.setup()
    const { items } = await page('auditmkt')
    expect(within(items()[0]).getByText(/From \+971•••••••/)).toBeInTheDocument()
    for (let i = 0; i < 8; i++) await user.click(screen.getByRole('button', { name: 'Next step' }))
    expect(within(items()[1]).getByText('EV-9001 · P-001')).toBeInTheDocument()
    expect(within(items()[8]).getByText(/Call P-001 · 2 working days/)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain(first.name)
    expect(document.body.textContent).not.toContain(first.identity.mobile!.slice(0, 7))
  })

  it('environment management reads a name, from its own environment', async () => {
    const user = userEvent.setup()
    const { items } = await page('envmgmt')
    await user.click(screen.getByRole('button', { name: 'Next step' }))
    const dubai = mock.MOCK_PERSONS.find((p) => inEnvScope('dub', p.envId))!
    expect(within(items()[1]).getByText(`EV-9001 · ${dubai.name}`)).toBeInTheDocument()
    expect(within(items()[1]).getByText(/Environment: /)).toHaveTextContent('Environment: Dubai.')
  })
})

describe('Watch the AI team work: this week, by the same team (v42 F31)', () => {
  it('shows the eight counters from the sample data under a `sample` tag, and the fixed "what you will not see here" card', async () => {
    await page()
    const heading = screen.getByRole('heading', { name: /This week, by the same team/ })
    expect(within(heading).getByText('sample')).toBeInTheDocument()
    expect(screen.getByText(/What the ten agents did on the sample data/)).toBeInTheDocument()

    const value = (label: string) => screen.getByText(label).closest('.well')!.textContent!.replace(label, '').trim()
    expect(await screen.findByText('Events read')).toBeInTheDocument()
    for (const label of ['Events read', 'Signals counted', 'Patterns over the line', 'Fixes proposed', 'Waiting for a yes', 'Sent back by the supervisor', 'Handed to a person', 'Briefs written']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    await vi.waitFor(() => {
      expect(value('Events read')).toBe(String(mock.MOCK_INTERACTIONS.length + 16))
      expect(value('Signals counted')).toBe(String(mock.MOCK_SIGNALS.length))
      expect(value('Fixes proposed')).toBe(String(mock.MOCK_CORRECTIVE_ACTIONS.length))
      expect(value('Waiting for a yes')).toBe(String(mock.MOCK_CORRECTIVE_ACTIONS.filter((f) => f.status === 'proposed').length))
      expect(value('Briefs written')).toBe(String(mock.MOCK_DETRACTOR_CALL_ITEMS.length))
      expect(value('Sent back by the supervisor')).toBe('3')
      expect(value('Handed to a person')).toBe('2')
      expect(value('Patterns over the line')).toMatch(/^\d+$/)
    }, T)

    const notHere = screen.getByText('What you will not see here')
    expect(notHere).toBeInTheDocument()
    expect(screen.getByText(/Agreement of 9 in 10 is the gate to Limited; a critical miss in the weekly sample blocks Live/)).toBeInTheDocument()
  })

  it('has no [Proposed] badge: the page is the prototype as specified', async () => {
    await page()
    expect(screen.queryByText(/\[Proposed\]|\[مقترح\]/)).not.toBeInTheDocument()
  })
})

describe('Watch the AI team work: Arabic and access (v42 F31)', () => {
  it('speaks Arabic, right to left, with the prototype strings', async () => {
    const user = userEvent.setup()
    const { items } = await page('cxmgr', 'ar')
    expect(document.documentElement.dir).toBe('rtl')
    expect(screen.getByRole('heading', { name: 'شاهد فريق الذكاء يعمل' })).toBeInTheDocument()
    expect(screen.getByText(/رسالة واحدة، خطوة خطوة/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'شغّل (6 ثوانٍ)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'الخطوة التالية' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إعادة' })).toBeInTheDocument()
    expect(stepOf()).toHaveTextContent('خطوة 1 / 9')
    expect(within(items()[0]).getByText('المصدر')).toBeInTheDocument()
    expect(within(items()[0]).getByText(/لسه بستنى الاتصال اللي وعدتوني فيه يوم الثلاثاء/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'الخطوة التالية' }))
    expect(live()).toBe('الخطوة 2 من 9: الوكيل 1 يطابقها على شخص واحد')
    expect(within(items()[1]).getByText('الوكيل 1 · الاستقبال والمطابقة')).toBeInTheDocument()
    expect(within(items()[1]).getByText('السوبرفايزر')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /هذا الأسبوع، من الفريق نفسه/ })).toBeInTheDocument()
    expect(screen.getByText('عينة')).toBeInTheDocument()
    expect(screen.getByText('ما لن تراه هنا')).toBeInTheDocument()
    expect(screen.getByText('أحداث قُرئت')).toBeInTheDocument()
  })

  it.each(['hrmgr', 'shopper', 'ld', 'hrspec', 'teamlead', 'aslead'] as RoleId[])('%s cannot open it: the access guard sends the role to its own home', async (role) => {
    const home = ROLE_DEFS.find((r) => r.id === role)!.home
    renderWithProviders(
      <AccessGuard>
        <WatchTeam />
      </AccessGuard>,
      { role, route: '/settings/watch-ai-team', routes: [{ path: home, element: <p>role home</p> }] },
    )
    expect(await screen.findByText('role home', {}, T)).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent(home)
    expect(screen.queryByRole('button', { name: 'Play (6 seconds)' })).not.toBeInTheDocument()
  })

  it.each(['cxmgr', 'cxteam', 'envmgmt', 'marketing', 'auditmkt', 'exec'] as RoleId[])('%s can open it through the access guard', async (role) => {
    renderWithProviders(
      <AccessGuard>
        <WatchTeam />
      </AccessGuard>,
      { role, route: '/settings/watch-ai-team' },
    )
    expect(await screen.findByRole('button', { name: 'Play (6 seconds)' }, T)).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/settings/watch-ai-team')
  })
})
