import { beforeAll, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import { RequireAuth } from '@/auth/AuthContext'
import { readSession } from '@/auth/session'
import { ROLE_DEFS, SIGN_IN_COPY } from '@/data/roles'
import Login from './Login'

beforeAll(() => preferReducedMotion())

const Protected = () => (
  <RequireAuth>
    <p>Protected page</p>
  </RequireAuth>
)

const MAIN = ['CX manager', 'CX team', 'Environment management', 'Marketing manager', 'L&D manager', 'Internal Audit and Marketing Lead']
const FOLDED = ['Sales team lead', 'After-Sales team lead', 'HR specialist', 'HR manager', 'Executive', 'Mystery shopper']
const radioStartingWith = (name: string) => screen.getByRole('radio', { name: (n) => n.toLowerCase().startsWith(name.toLowerCase()) })

describe('sample sign-in', () => {
  it('labels itself as a sample with no password field', () => {
    renderWithProviders(<Login />, { route: '/login', path: '/login' })
    expect(screen.getAllByText(/no real authentication/i).length).toBeGreaterThan(0)
    expect(document.querySelector('input[type="password"]')).toBeNull()
  })

  it('says it is the v40 prototype and that in the real platform the role comes from the directory (S12)', () => {
    renderWithProviders(<Login />, { route: '/login', path: '/login' })
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByText(SIGN_IN_COPY.note.en)).toBeInTheDocument()
    expect(screen.getAllByText(/Prototype v42/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/v38/)).not.toBeInTheDocument()
  })

  it('requires a role before signing in', async () => {
    renderWithProviders(<Login />, { route: '/login', path: '/login' })
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(await screen.findByText('Choose a role to continue.')).toBeInTheDocument()
    expect(readSession()).toBeNull()
  })

  it('shows the six main roles first and folds the rest under "Other roles used in the demo" (v40 F28)', () => {
    renderWithProviders(<Login />, { route: '/login', path: '/login' })
    const folded = document.querySelector('details')!
    expect(screen.getAllByRole('radio')).toHaveLength(12)
    expect(folded).not.toHaveAttribute('open')
    for (const name of MAIN) expect(folded.contains(radioStartingWith(name)), `${name} is a main role`).toBe(false)
    for (const name of FOLDED) expect(folded.contains(radioStartingWith(name)), `${name} is folded`).toBe(true)
    expect(screen.getByText(SIGN_IN_COPY.otherRoles.en)).toBeInTheDocument()
    const main = document.querySelector('[data-group="main-roles"]')!
    expect(within(main as HTMLElement).getAllByRole('radio')).toHaveLength(6)
  })

  it('shows each role card with its full description as the tooltip, and the full text again once it is chosen', async () => {
    renderWithProviders(<Login />, { route: '/login', path: '/login' })
    const auditor = ROLE_DEFS.find((r) => r.id === 'auditmkt')!
    const label = radioStartingWith('Internal Audit and Marketing Lead').closest('label')!
    expect(label.querySelector(`[title="${auditor.description.en}"]`)).not.toBeNull()
    await userEvent.click(radioStartingWith('Internal Audit and Marketing Lead'))
    expect(screen.getByText(auditor.description.en, { selector: 'p *, p' })).toBeInTheDocument()
  })

  it('opens the folded roles when one of them is chosen, and the sign-in button names the role', async () => {
    renderWithProviders(<Login />, { route: '/login', path: '/login' })
    const details = document.querySelector('details')!
    await userEvent.click(screen.getByText(SIGN_IN_COPY.otherRoles.en))
    expect(details).toHaveAttribute('open')
    await userEvent.click(radioStartingWith('Executive'))
    expect(screen.getByRole('button', { name: /sign in as executive/i })).toBeInTheDocument()
  })

  it('signs in with the chosen role and lands on that role’s home page', async () => {
    renderWithProviders(<Login />, { route: '/login', path: '/login', routes: [{ path: '/settings/mystery-shopper', element: <p>Shopper tasks</p> }] })
    await userEvent.click(screen.getByText(/Other roles used in the demo/))
    await userEvent.click(radioStartingWith('mystery shopper'))
    await userEvent.type(screen.getByRole('textbox'), '  Sample  ')
    await userEvent.click(screen.getByRole('button', { name: /sign in as/i }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/settings/mystery-shopper'), { timeout: 4000 })
    expect(readSession()?.displayName).toBe('Sample')
    expect(localStorage.getItem('psicx.role')).toBe('shopper')
  })

  it('Marketing lands on Home and the Internal Audit and Marketing Lead on the overview (F35)', async () => {
    const { unmount } = renderWithProviders(<Login />, { route: '/login', path: '/login', routes: [{ path: '/home', element: <p>Home page</p> }] })
    await userEvent.click(radioStartingWith('Marketing manager'))
    await userEvent.click(screen.getByRole('button', { name: /sign in as/i }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/home'), { timeout: 4000 })
    unmount()
    localStorage.clear()
    renderWithProviders(<Login />, { route: '/login', path: '/login', routes: [{ path: '/overview', element: <p>Overview page</p> }] })
    await userEvent.click(radioStartingWith('Internal Audit and Marketing Lead'))
    await userEvent.click(screen.getByRole('button', { name: /sign in as/i }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/overview'), { timeout: 4000 })
  })

  it('sends a signed-out visitor to /login and back to the page they wanted', async () => {
    renderWithProviders(<Protected />, {
      route: '/actions/signals',
      path: '/actions/signals',
      routes: [{ path: '/login', element: <Login /> }],
    })
    expect(screen.getByTestId('location')).toHaveTextContent('/login')
    await userEvent.click(radioStartingWith('cx manager'))
    await userEvent.click(screen.getByRole('button', { name: /sign in as/i }))
    expect(await screen.findByText('Protected page', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/actions/signals')
  })

  it('renders in Arabic with Arabic copy: the S12 note, the six roles, the folded summary', () => {
    renderWithProviders(<Login />, { route: '/login', path: '/login', lang: 'ar' })
    expect(document.documentElement.dir).toBe('rtl')
    expect(screen.getByRole('button', { name: 'تسجيل الدخول' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'تسجيل الدخول' })).toBeInTheDocument()
    expect(screen.getByText(SIGN_IN_COPY.note.ar)).toBeInTheDocument()
    expect(screen.getByText(SIGN_IN_COPY.otherRoles.ar)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: (n) => n.startsWith('مدير تجربة العملاء') })).toBeInTheDocument()
    expect(screen.getAllByText(/الإصدار 42/).length).toBeGreaterThan(0)
  })
})
