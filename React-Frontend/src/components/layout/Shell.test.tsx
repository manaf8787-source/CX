import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { Gauge } from 'lucide-react'
import { renderWithProviders } from '@/test/render'
import { SidebarMenu, SidebarProvider } from '@/components/ui/sidebar'
import { Shell } from './Shell'
import { SidebarNavItem } from './Sidebar'

/** Makes the viewport read as a phone or a tablet for the shell's media queries (jsdom has no layout engine). */
function setViewport(mode: 'phone' | 'tablet' | 'desktop') {
  window.matchMedia = ((query: string) =>
    ({
      matches: mode === 'phone' ? query.includes('809') || query.includes('1199') : mode === 'tablet' ? query.includes('1199') : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList) as typeof window.matchMedia
}

afterEach(() => {
  vi.restoreAllMocks()
  setViewport('desktop')
})

function renderShell(options: Parameters<typeof renderWithProviders>[1] = {}) {
  return renderWithProviders(
    <Routes>
      <Route element={<Shell />}>
        <Route path="home" element={<h1>Page content</h1>} />
      </Route>
    </Routes>,
    { route: '/home', path: '/*', ...options },
  )
}

describe('Shell landmarks and skip link', () => {
  it('has one main, one banner (the top bar), one named navigation, and a skip link that targets main', async () => {
    setViewport('desktop')
    renderShell()
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
    expect(within(screen.getByRole('main')).getByRole('heading', { name: 'Page content' })).toBeInTheDocument()
    expect(screen.getAllByRole('banner')).toHaveLength(1)
    expect(screen.getAllByRole('navigation', { name: 'Main navigation' })).toHaveLength(1)
    // the top bar is not inside main, so it really is the banner landmark
    expect(within(screen.getByRole('main')).queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main')
  })

  it('the skip link is the first thing Tab reaches', async () => {
    renderShell()
    await userEvent.tab()
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveFocus()
  })

  it('marks the current page in the sidebar with aria-current', async () => {
    renderShell()
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    expect(await within(nav).findByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: '1 · Customers' })).not.toHaveAttribute('aria-current')
  })

  it('only offers the assistant to roles that have it, as one named button', () => {
    const { unmount } = renderShell({ role: 'cxmgr' })
    expect(screen.getAllByRole('button', { name: 'Ask the assistant' })).toHaveLength(1)
    unmount()
    renderShell({ role: 'teamlead' })
    expect(screen.queryByRole('button', { name: 'Ask the assistant' })).not.toBeInTheDocument()
  })

  it('speaks Arabic and mirrors the document direction', () => {
    renderShell({ lang: 'ar' })
    expect(screen.getByRole('navigation', { name: 'التنقل الرئيسي' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'انتقل إلى المحتوى' })).toBeInTheDocument()
    expect(document.documentElement.dir).toBe('rtl')
  })
})

describe('Sidebar brand and menu (owner\'s requests, 19 Nov)', () => {
  it('shows the CX logo and the name "CX Portal": no "PSI" and no version line', () => {
    renderShell()
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    const brand = within(nav).getByRole('link', { name: 'CX Portal' })
    expect(brand).toHaveAttribute('href', '/home')
    expect(brand.querySelector('[data-slot="brand-logo"]')).toHaveAttribute('data-animated', 'true')
    expect(nav).not.toHaveTextContent('PSI CX Portal')
    expect(nav).not.toHaveTextContent(/v\d+ · prototype/)
  })

  it('the menu scrolls without the system scrollbar and fades the edge that has more', () => {
    renderShell()
    const scroller = document.querySelector('[data-slot="sidebar-content"]')!
    expect(scroller).toHaveClass('no-scrollbar', 'scroll-fade-y')
  })

  it('the words of the menu carry their place in the opening sequence, top to bottom', () => {
    renderShell()
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    const order = [...nav.querySelectorAll<HTMLElement>('.nav-fade')].map((el) => el.style.getPropertyValue('--nav-i')).filter((v) => v !== '')
    expect(order.length).toBeGreaterThan(6)
    expect(order.map(Number)).toEqual([...order.map(Number)].sort((a, b) => a - b))
  })
})

describe('Sidebar rail', () => {
  it('collapses to the 56px rail, remembers it, and restores it on the next visit', async () => {
    const { unmount } = renderShell()
    const nav = () => screen.getByRole('navigation', { name: 'Main navigation' })
    expect(nav()).toHaveAttribute('data-collapsible', '')
    await userEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    // the state is immediate; the rail LAYOUT follows once the words have faded (the sidebar closes gradually)
    expect(nav()).toHaveAttribute('data-state', 'collapsed')
    expect(nav()).toHaveAttribute('data-phase', 'closing')
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false')
    expect(localStorage.getItem('psicx.sidebar')).toBe('collapsed')
    await waitFor(() => expect(nav()).toHaveAttribute('data-collapsible', 'icon'))
    await waitFor(() => expect(nav()).not.toHaveAttribute('data-phase'))
    // the rail keeps every item reachable by name (tooltips carry the label visually)
    expect(within(nav()).getByRole('link', { name: '1 · Customers' })).toBeInTheDocument()
    unmount()
    renderShell()
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toHaveAttribute('data-collapsible', 'icon')
    await userEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }))
    // opening: the expanded layout at once, revealed by the widening column while the words fade in
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toHaveAttribute('data-collapsible', '')
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toHaveAttribute('data-phase', 'opening')
    expect(localStorage.getItem('psicx.sidebar')).toBe('expanded')
  })

  it('works when storage is blocked (the state is simply not remembered)', async () => {
    renderShell()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    await userEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    await waitFor(() => expect(screen.getByRole('navigation', { name: 'Main navigation' })).toHaveAttribute('data-collapsible', 'icon'))
  })
})

describe('Menu sheet on a phone', () => {
  it('has no sidebar, opens the menu from the header button, closes with Esc and gives focus back', async () => {
    setViewport('phone')
    renderShell()
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument()
    const button = screen.getByRole('button', { name: 'Toggle navigation' })
    await userEvent.click(button)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: '1 · Customers' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(button).toHaveFocus())
  })

  it('closes the sheet when a link is followed', async () => {
    setViewport('phone')
    renderShell()
    await userEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('link', { name: '1 · Customers' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('Drawer on a tablet', () => {
  it('shows the rail and opens the full menu as a drawer from the rail toggle', async () => {
    setViewport('tablet')
    renderShell()
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toHaveAttribute('data-collapsible', 'icon')
    expect(screen.queryByRole('button', { name: 'Toggle navigation' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})

describe('Sidebar item', () => {
  it('shows nested items under the active parent (32px, a dot on the active child) and a count outside the link', () => {
    renderWithProviders(
      <SidebarProvider>
        <SidebarMenu>
          <SidebarNavItem
            node={{ path: '/settings', label: 'Settings', icon: Gauge, count: 3, children: [{ path: '/settings/rules', label: 'Rules' }, { path: '/settings/feeds', label: 'Feeds' }] }}
            pathname="/settings/rules"
            tooltip={false}
            tall={false}
          />
        </SidebarMenu>
      </SidebarProvider>,
      { route: '/settings/rules' },
    )
    const parent = screen.getByRole('link', { name: 'Settings' })
    expect(parent).toHaveAttribute('data-active', 'true')
    expect(screen.getByRole('link', { name: 'Rules' })).toHaveAttribute('data-active', 'true')
    expect(screen.getByRole('link', { name: 'Feeds' })).toHaveAttribute('data-active', 'false')
    // the count is a sibling of the link, so the link's name stays the label
    expect(within(parent).queryByText('3')).not.toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('hides the nested list while the parent is not the current page', () => {
    renderWithProviders(
      <SidebarProvider>
        <SidebarMenu>
          <SidebarNavItem node={{ path: '/settings', label: 'Settings', icon: Gauge, children: [{ path: '/settings/rules', label: 'Rules' }] }} pathname="/home" tooltip={false} tall={false} />
        </SidebarMenu>
      </SidebarProvider>,
    )
    expect(screen.queryByRole('link', { name: 'Rules' })).not.toBeInTheDocument()
  })
})

describe('"How do I use this?" replays the guided tour (v41 F28)', () => {
  /** The shell with a Home that carries the element step 1 lights, so the card appears at once. */
  function renderTourShell(options: Parameters<typeof renderWithProviders>[1] = {}) {
    return renderWithProviders(
      <Routes>
        <Route element={<Shell />}>
          <Route path="home" element={<h1 data-tour="steps">Page content</h1>} />
        </Route>
      </Routes>,
      { route: '/home', path: '/*', ...options },
    )
  }
  const replay = () => screen.getByRole('button', { name: 'How do I use this?' })

  it('is a pill at the bottom of the menu, above the role card, and starts the tour from step 1', async () => {
    renderTourShell()
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    const button = within(nav).getByRole('button', { name: 'How do I use this?' })
    expect(button).toHaveTextContent('How do I use this?')
    // above "Viewing as (demo)"
    expect(button.compareDocumentPosition(within(nav).getByText('Viewing as (demo)')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await userEvent.click(button)
    const card = await screen.findByRole('dialog', { name: 'One line, six steps' })
    expect(within(card).getByText(/Tour/)).toHaveTextContent('Tour 1 / 13')
  })

  it('is not offered to a role without a tour (the mystery shopper)', () => {
    renderTourShell({ role: 'shopper' })
    expect(screen.queryByRole('button', { name: 'How do I use this?' })).not.toBeInTheDocument()
  })

  it('has no tour of its own behind it: the shell mounts the tour but it stays closed until it is asked for', async () => {
    renderTourShell()
    await new Promise((r) => setTimeout(r, 500))
    expect(screen.queryByTestId('tour-host')).not.toBeInTheDocument()
  })

  it('is an icon with a name in the collapsed rail', async () => {
    renderTourShell()
    await userEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    await waitFor(() => expect(screen.getByRole('navigation', { name: 'Main navigation' })).toHaveAttribute('data-collapsible', 'icon'))
    const button = replay()
    expect(button).toHaveTextContent('')
    expect(button.querySelector('svg')).toBeInTheDocument()
    await userEvent.click(button)
    expect(await screen.findByRole('dialog', { name: 'One line, six steps' })).toBeInTheDocument()
  })

  it('speaks Arabic', () => {
    renderTourShell({ lang: 'ar' })
    expect(screen.getByRole('button', { name: 'كيف أستخدمه؟' })).toBeInTheDocument()
  })

  it('is in the phone menu too: the sheet closes, then the tour starts and takes focus', async () => {
    setViewport('phone')
    renderTourShell()
    await userEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }))
    const sheet = await screen.findByRole('dialog')
    await userEvent.click(within(sheet).getByRole('button', { name: 'How do I use this?' }))
    const card = await screen.findByRole('dialog', { name: 'One line, six steps' })
    await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(1))
    await waitFor(() => expect(within(card).getByRole('button', { name: 'Next' })).toHaveFocus())
  })
})
