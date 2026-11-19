import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import { useRole } from '@/auth/RoleContext'
import { tourStepsFor } from '@/data/tours'
import type { RoleId } from '@/types'
import { TourHost } from './TourHost'
import { TourProvider } from './TourProvider'
import { useTour } from './tourContext'
import { TOUR_STORAGE_KEY, readTourDone } from './tourStorage'

const realMatchMedia = window.matchMedia
const realScrollBy = window.scrollBy
afterEach(() => {
  window.matchMedia = realMatchMedia
  window.scrollBy = realScrollBy
  delete (Element.prototype as unknown as { scrollIntoView?: () => void }).scrollIntoView
  vi.restoreAllMocks()
})

/** What each page of the fake app offers to the tour: the same `data-tour` names the real pages carry. */
const PAGES: Record<string, string[]> = {
  '/home': ['steps', 'brief', 'indicator-card'],
  '/inbox': ['inbox-row'],
  '/actions/corrective': ['nextbox', 'fix-open', 'fix-decide', 'trace', 'fix-card'],
  '/close-the-loop': ['loop-call'],
  '/customers': ['customers-search', 'tab-personas'],
  '/overview': ['overview-card', 'brief'],
  '/settings/ld': ['brief'],
}

function FakePage() {
  const { pathname } = useLocation()
  return (
    <main>
      <h1>{pathname}</h1>
      {(PAGES[pathname] ?? []).map((name) =>
        name === 'fix-open' ? (
          <button key={name} data-tour={name} aria-expanded="true">
            Details
          </button>
        ) : (
          <div key={name} data-tour={name}>
            {name}
          </div>
        ),
      )}
    </main>
  )
}

/** Stands in for the shell: the menu link the tour clicks, the role switch, the replay control, and a probe of the location. */
function Frame() {
  const { role, setRole } = useRole()
  const tour = useTour()
  const loc = useLocation()
  return (
    <>
      {/* sticky, like the real sidebar: the tour does not scroll the page to an element that lives in it */}
      <nav style={{ position: 'sticky', top: 0 }}>
        <Link to="/inbox" data-tour="nav-inbox">
          My inbox
        </Link>
        <button onClick={() => setRole('marketing')}>Switch to marketing</button>
        <button onClick={() => setRole('shopper')}>Switch to shopper</button>
        <button onClick={tour.start}>Replay</button>
        <span data-testid="role">{role.id}</span>
        <span data-testid="available">{String(tour.available)}</span>
        <span data-testid="where">{`${loc.pathname}${loc.search}`}</span>
      </nav>
      <Routes>
        <Route path="*" element={<FakePage />} />
      </Routes>
    </>
  )
}

interface Options {
  role?: RoleId
  lang?: 'en' | 'ar'
  /** Leave the role's tour not done, so it starts by itself. */
  fresh?: boolean
  waitMs?: number
}

function renderTour({ role = 'cxmgr', lang = 'en', fresh = true, waitMs = 40 }: Options = {}) {
  if (fresh) localStorage.removeItem(TOUR_STORAGE_KEY)
  return renderWithProviders(
    <TourProvider startDelayMs={0}>
      <Frame />
      <TourHost waitMs={waitMs} />
    </TourProvider>,
    { role, lang, route: '/home' },
  )
}

const card = () => screen.findByRole('dialog')
const next = async () => userEvent.click(within(await card()).getByRole('button', { name: /^(Next|Do it and continue|Done)$/ }))
const counter = async () => (await within(await card()).findByText(/Tour/)).textContent?.replace(/\s+/g, ' ')

describe('the guided tour', () => {
  it('starts by itself the first time a role is used, on step 1 of 13 for the CX manager, with a named, described card', async () => {
    renderTour()
    const dialog = await card()
    expect(dialog).toHaveAccessibleName('One line, six steps')
    expect(dialog).toHaveAccessibleDescription(/Everything in the portal is one of these/)
    expect(dialog).toHaveAttribute('aria-modal', 'false')
    expect(await counter()).toBe('Tour 1 / 13')
    // the progress is also read out by a polite status (the visible counter is in a card that is new each step)
    expect(screen.getByRole('status')).toHaveTextContent('Tour 1 of 13')
    expect(within(dialog).queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Skip' })).toBeInTheDocument()
  })

  it('does not start again once it is done, and starts for another role that has not done theirs', async () => {
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify({ done: { cxmgr: true } }))
    const { unmount } = renderTour({ fresh: false })
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/home'))
    await new Promise((r) => setTimeout(r, 120))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    unmount()
    renderTour({ role: 'marketing', fresh: false })
    expect(await card()).toHaveAccessibleName('One line, six steps')
  })

  it('has no tour, and no replay, for the mystery shopper', async () => {
    renderTour({ role: 'shopper' })
    await waitFor(() => expect(screen.getByTestId('available')).toHaveTextContent('false'))
    await new Promise((r) => setTimeout(r, 120))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Replay' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('moves with Next and Back, and Back is not offered on the first step', async () => {
    renderTour()
    await next()
    await waitFor(async () => expect(await counter()).toBe('Tour 2 / 13'))
    expect(within(await card()).getByRole('heading', { name: 'Your daily brief' })).toBeInTheDocument()
    await userEvent.click(within(await card()).getByRole('button', { name: 'Back' }))
    await waitFor(async () => expect(await counter()).toBe('Tour 1 / 13'))
    expect(within(await card()).queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
  })

  it('"Do it and continue" runs the real action and the next card appears on the page that opened', async () => {
    renderTour()
    for (let i = 1; i < 4; i++) await next()
    await waitFor(async () => expect(await counter()).toBe('Tour 4 / 13'))
    const dialog = await card()
    expect(within(dialog).getByRole('heading', { name: 'Start your day here' })).toBeInTheDocument()
    // the primary button says what it does
    await userEvent.click(within(dialog).getByRole('button', { name: 'Do it and continue' }))
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/inbox'))
    expect(await within(await card()).findByRole('heading', { name: 'One row, one thing to do' })).toBeInTheDocument()
  })

  it('goes to each step’s page and query, then the steps after "Open a fix" keep the filtered view', async () => {
    renderTour()
    const go = async (n: number) => {
      for (let i = 0; i < n; i++) await next()
    }
    await go(5)
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^\/actions\/corrective$/))
    await go(1)
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/actions/corrective?status=proposed'))
    expect(await within(await card()).findByRole('heading', { name: 'Open a fix' })).toBeInTheDocument()
    // the Details toggle is already open here, so "Do it" does not close it
    await go(1)
    expect(screen.getByRole('button', { name: 'Details' })).toHaveAttribute('aria-expanded', 'true')
    expect(await within(await card()).findByRole('heading', { name: 'Your decision' })).toBeInTheDocument()
    expect(screen.getByTestId('where')).toHaveTextContent('/actions/corrective?status=proposed')
    // Back to "where you are" drops the filter again (a step names its query exactly)
    await userEvent.click(within(await card()).getByRole('button', { name: 'Back' }))
    await userEvent.click(within(await card()).getByRole('button', { name: 'Back' }))
    expect(await within(await card()).findByRole('heading', { name: 'Where you are, what happens next' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^\/actions\/corrective$/))
  })

  it('Skip ends the tour, stores completion for that role, and says where to replay it', async () => {
    renderTour()
    await userEvent.click(within(await card()).getByRole('button', { name: 'Skip' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Tour finished. Replay it any time from the bottom of the menu.')).toBeInTheDocument()
    expect(readTourDone()).toEqual({ cxmgr: true })
    expect(JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY)!)).toEqual({ done: { cxmgr: true } })
  })

  it('the last card says Done, and Done also stores completion', async () => {
    renderTour({ role: 'ld' })
    // ld: brief, fix, end
    await next()
    await next()
    expect(await counter()).toBe('Tour 3 / 3')
    await userEvent.click(within(await card()).getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(readTourDone()).toEqual({ ld: true })
  })

  it('can be replayed any time, from the first step, and keeps its completion', async () => {
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify({ done: { cxmgr: true } }))
    renderTour({ fresh: false })
    await userEvent.click(screen.getByRole('button', { name: 'Replay' }))
    expect(await counter()).toBe('Tour 1 / 13')
    await userEvent.click(within(await card()).getByRole('button', { name: 'Skip' }))
    expect(readTourDone()).toEqual({ cxmgr: true })
  })

  it('a role switch resets the running tour and starts the new role’s tour from its first step', async () => {
    renderTour()
    await next()
    await next()
    expect(await counter()).toBe('Tour 3 / 13')
    await userEvent.click(screen.getByRole('button', { name: 'Switch to marketing' }))
    await waitFor(async () => expect(await counter()).toBe('Tour 1 / 6'))
    expect(screen.getByTestId('role')).toHaveTextContent('marketing')
    expect(within(await card()).getByRole('heading', { name: 'One line, six steps' })).toBeInTheDocument()
    // the CX manager's tour was not marked done by being cut short
    expect(readTourDone().cxmgr).toBeUndefined()
  })

  it('a role switch to a role without a tour just ends the running one', async () => {
    renderTour()
    await next()
    await userEvent.click(screen.getByRole('button', { name: 'Switch to shopper' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByTestId('available')).toHaveTextContent('false')
  })

  it('the closing card has no element: centred, nothing lit, a full dim, and it still moves on', async () => {
    renderTour({ role: 'ld', waitMs: 30 })
    // /settings/ld has the brief: lit
    expect(await screen.findByTestId('tour-ring')).toBeInTheDocument()
    await next()
    // /actions/corrective has a fix card: lit as well
    await waitFor(async () => expect(await counter()).toBe('Tour 2 / 3'))
    await next()
    const dialog = await card()
    await waitFor(() => expect(dialog).toHaveAttribute('data-placement', 'centre'))
    expect(screen.queryByTestId('tour-ring')).not.toBeInTheDocument()
    expect(screen.getByTestId('tour-dim')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('a target that is not on the page centres the card after the wait, and Next still works', async () => {
    renderTour({ role: 'auditmkt', waitMs: 30 })
    // /overview: the brief is there
    await next()
    // /settings/feeds is not in the fake app: no `feeds` element
    await waitFor(async () => expect(await counter()).toBe('Tour 2 / 5'))
    await waitFor(() => expect(screen.getByTestId('tour-card')).toHaveAttribute('data-placement', 'centre'))
    expect(screen.queryByTestId('tour-ring')).not.toBeInTheDocument()
    await next()
    await waitFor(async () => expect(await counter()).toBe('Tour 3 / 5'))
  })

  it('lights the element: a frame round its box, 6px outside it, and the card below it', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const box = this.dataset.tour === 'steps' ? { top: 100, left: 200, width: 600, height: 80 } : { top: 0, left: 0, width: 0, height: 0 }
      return { ...box, right: box.left + box.width, bottom: box.top + box.height, x: box.left, y: box.top, toJSON: () => ({}) } as DOMRect
    })
    renderTour()
    const ring = await screen.findByTestId('tour-ring')
    await waitFor(() => expect(ring).toHaveStyle({ top: '94px', left: '194px', width: '612px', height: '92px' }))
    const dialog = await card()
    await waitFor(() => expect(dialog).toHaveAttribute('data-placement', 'below'))
    expect(dialog).toHaveStyle({ top: '194px', left: '200px' })
  })

  it('an element taller than the screen is shown by its first part: scrolled to the top, framed down to half the screen, the card under it', async () => {
    const scroll = vi.fn()
    const scrollBy = vi.fn()
    ;(Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView = scroll
    window.scrollBy = scrollBy as unknown as typeof window.scrollBy
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const box = this.dataset.tour === 'steps' ? { top: 150, left: 200, width: 600, height: 4000 } : { top: 0, left: 0, width: 0, height: 0 }
      return { ...box, right: box.left + box.width, bottom: box.top + box.height, x: box.left, y: box.top, toJSON: () => ({}) } as DOMRect
    })
    renderTour()
    const ring = await screen.findByTestId('tour-ring')
    // jsdom's screen is 768px high: half of it, plus the 6px either side
    await waitFor(() => expect(ring).toHaveStyle({ top: '144px', height: '396px' }))
    expect(scroll).toHaveBeenCalledWith({ block: 'start', inline: 'nearest', behavior: 'instant' })
    expect(scrollBy).toHaveBeenCalledWith({ top: -96, behavior: 'instant' })
    await waitFor(() => expect(screen.getByTestId('tour-card')).toHaveAttribute('data-placement', 'below'))
  })

  it('the card is where the clicks go: the overlay and the frame let every click through', async () => {
    renderTour()
    const dialog = await card()
    expect(screen.getByTestId('tour-host')).toHaveClass('pointer-events-none')
    expect(dialog).toHaveClass('pointer-events-auto')
    expect(screen.getByTestId('tour-ring')).not.toHaveClass('pointer-events-auto')
    // the page underneath answers a click while the tour is open
    await userEvent.click(screen.getByRole('button', { name: 'Switch to marketing' }))
    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('marketing'))
  })

  it('moves focus to the primary button when a step appears and gives it back when the tour ends', async () => {
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify({ done: { cxmgr: true } }))
    renderTour({ fresh: false })
    const replay = screen.getByRole('button', { name: 'Replay' })
    replay.focus()
    await userEvent.click(replay)
    const dialog = await card()
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Next' })).toHaveFocus())
    await userEvent.click(within(dialog).getByRole('button', { name: 'Next' }))
    await waitFor(async () => expect(within(await card()).getByRole('button', { name: 'Next' })).toHaveFocus())
    await userEvent.click(within(await card()).getByRole('button', { name: 'Skip' }))
    await waitFor(() => expect(replay).toHaveFocus())
  })

  it('Escape skips the tour, unless a dialog is open (it closes that first)', async () => {
    renderTour()
    await card()
    // an open Radix dialog owns Escape
    const other = document.createElement('div')
    other.setAttribute('role', 'dialog')
    other.setAttribute('data-state', 'open')
    document.body.appendChild(other)
    await userEvent.keyboard('{Escape}')
    expect(screen.getAllByRole('dialog')).toHaveLength(2)
    expect(readTourDone().cxmgr).toBeUndefined()
    other.remove()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(readTourDone()).toEqual({ cxmgr: true })
  })

  it('Escape that something else already handled does not skip', async () => {
    renderTour()
    await card()
    act(() => {
      const e = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      e.preventDefault()
      document.dispatchEvent(e)
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('speaks Arabic and mirrors: the card is right to left, with the prototype’s words', async () => {
    renderTour({ lang: 'ar' })
    const dialog = await card()
    expect(dialog).toHaveAttribute('dir', 'rtl')
    expect(dialog).toHaveAccessibleName('خط واحد، ست خطوات')
    expect(within(dialog).getByRole('button', { name: 'تخطَّ' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'التالي' })).toBeInTheDocument()
    expect(dialog).toHaveTextContent('جولة')
    expect(dialog.querySelector('bdi')).toHaveTextContent('1 / 13')
    expect(screen.getByRole('status')).toHaveTextContent('جولة 1 من 13')
    await userEvent.click(within(dialog).getByRole('button', { name: 'تخطَّ' }))
    expect(await screen.findByText('انتهت الجولة. أعدها متى شئت من أسفل القائمة.')).toBeInTheDocument()
  })

  it('has no motion of its own under prefers-reduced-motion', async () => {
    preferReducedMotion()
    renderTour()
    const dialog = await card()
    expect(screen.getByTestId('tour-host')).toHaveAttribute('data-motion', 'reduced')
    expect(screen.getByTestId('tour-host').className).not.toMatch(/animate-/)
    expect(dialog.className).not.toMatch(/animate-/)
    expect((await screen.findByTestId('tour-ring')).className).not.toMatch(/animate-/)
  })

  it('has its entrance when motion is allowed', async () => {
    renderTour()
    const dialog = await card()
    expect(screen.getByTestId('tour-host')).not.toHaveAttribute('data-motion')
    expect(dialog.className).toMatch(/animate-/)
  })

  it('brings each element to the centre once, but does not scroll the page to one that lives in a sticky or fixed container', async () => {
    const scroll = vi.fn()
    ;(Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView = scroll
    renderTour()
    await screen.findByTestId('tour-ring')
    await waitFor(() => expect(scroll).toHaveBeenCalledTimes(1))
    expect(scroll).toHaveBeenCalledWith({ block: 'center', inline: 'nearest', behavior: 'instant' })
    // steps 2 and 3 are in the page; step 4's element (the menu link) is in the sticky bar: no scroll
    for (let i = 0; i < 3; i++) await next()
    await waitFor(async () => expect(await counter()).toBe('Tour 4 / 13'))
    await screen.findByTestId('tour-ring')
    expect(scroll).toHaveBeenCalledTimes(3)
  })

  it('the longest tour can be walked to its 13th card, and Done stores completion', async () => {
    expect(tourStepsFor('cxmgr')).toHaveLength(13)
    renderTour()
    for (let i = 0; i < 12; i++) await next()
    await waitFor(async () => expect(await counter()).toBe('Tour 13 / 13'))
    await userEvent.click(within(await card()).getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(readTourDone().cxmgr).toBe(true)
  })
})

describe('the tour outside the shell', () => {
  it('is simply not there without a provider (a page rendered on its own): no tour, nothing to start', () => {
    const { result } = renderHook(() => useTour())
    expect(result.current).toMatchObject({ available: false, running: false, steps: [] })
    expect(() => result.current.start()).not.toThrow()
  })
})
