import { beforeAll, describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { preferReducedMotion, renderWithProviders } from '@/test/render'
import { RequireAuth } from '@/auth/AuthContext'
import { readSession } from '@/auth/session'
import Login from './Login'

beforeAll(() => preferReducedMotion())

const Protected = () => (
  <RequireAuth>
    <p>Protected page</p>
  </RequireAuth>
)

describe('sample sign-in', () => {
  it('labels itself as a sample with no password field', () => {
    renderWithProviders(<Login />, { route: '/login', path: '/login' })
    expect(screen.getAllByText(/no real authentication/i).length).toBeGreaterThan(0)
    expect(document.querySelector('input[type="password"]')).toBeNull()
  })

  it('requires a role before signing in', async () => {
    renderWithProviders(<Login />, { route: '/login', path: '/login' })
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(await screen.findByText('Choose a role to continue.')).toBeInTheDocument()
    expect(readSession()).toBeNull()
  })

  it('signs in with the chosen role and lands on that role’s home page', async () => {
    renderWithProviders(<Login />, { route: '/login', path: '/login', routes: [{ path: '/settings/mystery-shopper', element: <p>Shopper tasks</p> }] })
    await userEvent.click(screen.getByRole('radio', { name: (n) => n.toLowerCase().startsWith('mystery shopper') }))
    await userEvent.type(screen.getByRole('textbox'), '  Sample  ')
    await userEvent.click(screen.getByRole('button', { name: /sign in as/i }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/settings/mystery-shopper'), { timeout: 4000 })
    expect(readSession()?.displayName).toBe('Sample')
    expect(localStorage.getItem('psicx.role')).toBe('shopper')
  })

  it('sends a signed-out visitor to /login and back to the page they wanted', async () => {
    renderWithProviders(<Protected />, {
      route: '/actions/signals',
      path: '/actions/signals',
      routes: [{ path: '/login', element: <Login /> }],
    })
    expect(screen.getByTestId('location')).toHaveTextContent('/login')
    await userEvent.click(screen.getByRole('radio', { name: (n) => n.toLowerCase().startsWith('cx manager') }))
    await userEvent.click(screen.getByRole('button', { name: /sign in as/i }))
    expect(await screen.findByText('Protected page', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/actions/signals')
  })

  it('renders in Arabic with Arabic copy', () => {
    renderWithProviders(<Login />, { route: '/login', path: '/login', lang: 'ar' })
    expect(document.documentElement.dir).toBe('rtl')
    expect(screen.getByRole('button', { name: 'تسجيل الدخول' })).toBeInTheDocument()
  })
})
