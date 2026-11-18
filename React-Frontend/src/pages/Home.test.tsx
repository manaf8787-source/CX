import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import { AssistantContext } from '@/components/ai/AssistantContext'
import { canUseAssistant } from '@/auth/access'
import type { RoleId } from '@/types'
import Home from './Home'

beforeAll(() => preferReducedMotion())
beforeEach(() => localStorage.clear())

/** Home inside the same assistant context the shell provides: only some roles have the assistant (KB §13). */
function renderHome({ role, lang }: { role: RoleId; lang?: 'en' | 'ar' }) {
  const ui: ReactNode = (
    <AssistantContext.Provider value={{ available: canUseAssistant(role), open: () => {} }}>
      <Home />
    </AssistantContext.Provider>
  )
  return renderWithProviders(ui, { role, lang })
}

const loaded = async (name = 'Daily brief lines') => {
  // The step counts and the brief arrive together once the registers have loaded.
  await screen.findByRole('list', { name }, { timeout: 8000 })
  await waitFor(() => expect(screen.queryAllByRole('status')).toHaveLength(0), { timeout: 8000 })
}

describe('Home (v40 F01)', () => {
  it('shows the header, the six steps with live counts, and each section in the v40 order', async () => {
    renderHome({ role: 'cxmgr' })
    expect(screen.getByRole('heading', { level: 1, name: 'What customers tell us, and what we fix' })).toBeInTheDocument()
    expect(screen.getByText('One line, six steps. Everything in the portal is one of them.')).toBeInTheDocument()
    expect(screen.getByText('Prototype, sample data')).toBeInTheDocument()
    await loaded()

    const nav = screen.getByRole('navigation', { name: 'The six steps, with live counts' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/customers', '/actions/signals', '/actions/signals#patterns', '/actions/corrective', '/close-the-loop', '/overview'])
    expect(within(nav).getByText('1 Listen')).toBeInTheDocument()
    expect(within(nav).getByText('6 Report')).toBeInTheDocument()
    // A live count under each step the role can open.
    expect(within(nav).getByText(/\d+ people? on record/)).toBeInTheDocument()
    expect(within(nav).getByText(/\d+ signals? in 30 days/)).toBeInTheDocument()
    expect(within(nav).getByText(/\d+ patterns? over the line/)).toBeInTheDocument()
    expect(within(nav).getByText(/\d+ fix(es)? waiting for a yes/)).toBeInTheDocument()
    expect(within(nav).getByText(/\d+ unhappy customers? to call/)).toBeInTheDocument()
    expect(within(nav).getByText('2 products, one line each')).toBeInTheDocument()

    const order = ['Daily brief', 'New here? Three things to know', 'How customers feel, per product', 'Your work today', 'Find a person, or ask']
    const html = document.body.textContent ?? ''
    const positions = order.map((s) => html.indexOf(s))
    expect(positions.every((p) => p >= 0), JSON.stringify(positions)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })

  it('shows the Daily brief by Agent 9 with its lines linked for the CX manager', async () => {
    renderHome({ role: 'cxmgr' })
    await loaded()
    expect(screen.getByText('Daily brief')).toBeInTheDocument()
    expect(screen.getByText(/Written at 07:00 by Agent 9/)).toBeInTheDocument()
    expect(screen.getByText('Agent 9 · Reporting')).toBeInTheDocument()
    expect(screen.getByText('[Proposed]')).toBeInTheDocument()
    const lines = within(screen.getByRole('list', { name: 'Daily brief lines' }))
    expect(lines.getByRole('link', { name: /PSI Real Estate NPS is/ })).toHaveAttribute('href', '/overview')
    expect(lines.getByRole('link', { name: /signals in the last 30 days/ })).toHaveAttribute('href', '/actions/signals')
    expect(lines.getByRole('link', { name: /still to call/ })).toHaveAttribute('href', '/close-the-loop')
  })

  it('shows one indicator card per live product with NPS, CSAT and CES, the plain sentences and a "?" on each', async () => {
    renderHome({ role: 'cxmgr' })
    await loaded()
    const heading = screen.getByRole('heading', { level: 2, name: 'How customers feel, per product' })
    const section = heading.closest('section')!
    const cards = section.querySelectorAll('[data-product]')
    expect([...cards].map((c) => c.getAttribute('data-product'))).toEqual(['re', 'af'])
    const re = within(cards[0] as HTMLElement)
    expect(re.getByRole('heading', { level: 3, name: 'PSI Real Estate' })).toBeInTheDocument()
    expect(re.getByText(/\d+ answers, 90 days/)).toBeInTheDocument()
    expect(re.getByText('would recommend us')).toBeInTheDocument()
    expect(re.getByText('happy with the last step')).toBeInTheDocument()
    expect(re.getByText('found it easy')).toBeInTheDocument()
    expect(re.getByRole('button', { name: /What NPS means/ })).toBeInTheDocument()
    expect(re.getByRole('button', { name: /What CSAT means/ })).toBeInTheDocument()
    expect(re.getByRole('button', { name: /What CES/ })).toBeInTheDocument()
    expect(re.getByRole('link', { name: /Open PSI Real Estate/ })).toHaveAttribute('href', '/products/re')
    expect(re.getByRole('link', { name: 'All numbers' })).toHaveAttribute('href', '/overview')
    // No group figure, and no hidden product.
    expect(section.textContent).not.toMatch(/PSI Club|Tour Estate|PSI Events|PSI Wallet/)
  })

  it('the "?" beside CES opens the v40 definition: 1 to 5, the share who answered 4 or 5', async () => {
    renderHome({ role: 'cxmgr' })
    await loaded()
    const cards = document.querySelectorAll('[data-product="re"]')
    await userEvent.click(within(cards[0] as HTMLElement).getByRole('button', { name: /What CES/ }))
    const pop = await screen.findByText(/1 to 5 scale/)
    expect(pop.textContent).toMatch(/4 or 5/)
    expect(pop.textContent).not.toMatch(/1 to 7/)
  })

  it('"New here? Three things to know" is open by default, has three items, and remembers it was closed', async () => {
    const { unmount } = renderHome({ role: 'cxmgr' })
    const trigger = screen.getByRole('button', { name: 'New here? Three things to know' })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/The portal does one thing/)).toBeInTheDocument()
    expect(screen.getByText(/Three numbers say how customers feel/)).toBeInTheDocument()
    expect(screen.getByText(/Every record shows where it is on the six steps/)).toBeInTheDocument()
    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(localStorage.getItem('psicx.home.startHere')).toBe('closed')
    unmount()
    renderHome({ role: 'cxmgr' })
    expect(screen.getByRole('button', { name: 'New here? Three things to know' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('"Your work today" counts the items on the role, shows at most four rows with day chips, and opens the inbox', async () => {
    renderHome({ role: 'cxmgr' })
    await loaded()
    expect(screen.getByText(/\d+ items on you, \d+ urgent\. Each has a day count\./)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open my inbox/ })).toHaveAttribute('href', '/inbox')
    const rows = within(screen.getByRole('list', { name: 'First rows of my inbox' })).getAllByRole('listitem')
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.length).toBeLessThanOrEqual(4)
    // The box says where the first row sits on the six steps and what happens next.
    expect(screen.getByRole('region', { name: 'Next step' })).toBeInTheDocument()
  })

  it('has the one search, with the example requests for a role that has the assistant', async () => {
    renderHome({ role: 'cxmgr' })
    expect(screen.getByRole('heading', { level: 2, name: 'Find a person, or ask' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/A name, a mobile, an ID, or a question: who left from Dubai this month\?/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument()
  })

  it('a team lead sees its own product only, plain text for pages it cannot open, and no counts for them', async () => {
    renderHome({ role: 'teamlead' })
    await loaded()
    const nav = screen.getByRole('navigation', { name: 'The six steps, with live counts' })
    // Sales team lead opens Customers and Actions, not Close the loop or the Overview.
    expect(within(nav).getAllByRole('link').map((l) => l.getAttribute('href'))).toEqual(['/customers', '/actions/signals', '/actions/signals#patterns', '/actions/corrective'])
    expect(within(nav).queryByText(/unhappy customers? to call/)).not.toBeInTheDocument()
    expect(within(nav).queryByText(/products?, one line each/)).not.toBeInTheDocument()
    const cards = document.querySelectorAll('[data-product]')
    expect([...cards].map((c) => c.getAttribute('data-product'))).toEqual(['re'])
    expect(screen.queryByRole('link', { name: 'All numbers' })).not.toBeInTheDocument()
    // The brief gives it no link to the Overview.
    const lines = within(screen.getByRole('list', { name: 'Daily brief lines' }))
    expect(lines.queryAllByRole('link').every((l) => l.getAttribute('href') !== '/overview')).toBe(true)
    expect(lines.getByText(/PSI Real Estate NPS is/)).toBeInTheDocument()
    expect(lines.queryByText(/After-Sales NPS/)).not.toBeInTheDocument()
    // No loop line for a role outside CX.
    expect(lines.queryByText(/still to call/)).not.toBeInTheDocument()
  })

  it('a role without the assistant gets the plain person search', async () => {
    renderHome({ role: 'teamlead' })
    expect(screen.getByRole('heading', { level: 2, name: 'Find a person' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('A name, a mobile or an ID')).toBeInTheDocument()
  })

  it('Marketing sees the people and public lines, with links only to pages it can open', async () => {
    renderHome({ role: 'marketing' })
    await loaded()
    const lines = within(screen.getByRole('list', { name: 'Daily brief lines' }))
    expect(lines.getByRole('link', { name: /of \d+ people on record/ })).toHaveAttribute('href', '/runaway')
    expect(lines.getByRole('link', { name: /public mentions/ })).toHaveAttribute('href', '/settings/public-mentions')
    expect(lines.queryByText(/signals in the last/)).not.toBeInTheDocument()
    expect(lines.queryAllByRole('link').some((l) => l.getAttribute('href') === '/overview')).toBe(false)
  })

  it('speaks Arabic with the Arabic strings of the prototype', async () => {
    renderHome({ role: 'cxmgr', lang: 'ar' })
    expect(document.documentElement.dir).toBe('rtl')
    expect(screen.getByRole('heading', { level: 1, name: 'ما يقوله الزبائن، وما نصلحه' })).toBeInTheDocument()
    expect(screen.getByText('خط واحد، ست خطوات. كل شيء في البورتال واحد منها.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'جديد هنا؟ ثلاثة أشياء تعرفها' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'كيف يشعر الزبائن، لكل منتج' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'ابحث عن شخص، أو اسأل' })).toBeInTheDocument()
    await loaded('أسطر الموجز اليومي')
    expect(screen.getByText('الموجز اليومي')).toBeInTheDocument()
    expect(screen.getByText('الوكيل 9 · التقارير')).toBeInTheDocument()
    expect(screen.getByText('شغلك اليوم')).toBeInTheDocument()
    expect(screen.getAllByText('يوصون بنا').length).toBeGreaterThan(0)
  })
})
