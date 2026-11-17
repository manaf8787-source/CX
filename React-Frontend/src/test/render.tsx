import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { I18nProvider, type Lang } from '@/i18n'
import { ThemeProvider } from '@/theme/ThemeContext'
import { RoleProvider } from '@/auth/RoleContext'
import { AuthProvider } from '@/auth/AuthContext'
import { UiProviders } from '@/components/layout/UiProviders'
import type { RoleId } from '@/types'

export function LocationProbe() {
  const loc = useLocation()
  return <div data-testid="location">{loc.pathname}</div>
}

interface Options {
  role?: RoleId
  lang?: Lang
  route?: string
  /** Extra routes rendered beside the main element (e.g. a landing page after a redirect). */
  routes?: { path: string; element: ReactNode }[]
  path?: string
}

/** Renders `ui` inside the same provider stack as `App.tsx`. */
export function renderWithProviders(ui: ReactNode, { role = 'cxmgr', lang = 'en', route = '/', routes = [], path = '*' }: Options = {}) {
  localStorage.setItem('psicx.role', role)
  localStorage.setItem('psicx.lang', lang)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <ThemeProvider>
          <UiProviders>
            <RoleProvider>
              <MemoryRouter initialEntries={[route]}>
                <AuthProvider>
                  <Routes>
                    {routes.map((r) => (
                      <Route key={r.path} path={r.path} element={r.element} />
                    ))}
                    <Route path={path} element={ui} />
                  </Routes>
                  <LocationProbe />
                </AuthProvider>
              </MemoryRouter>
            </RoleProvider>
          </UiProviders>
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>,
  )
}

/** Makes `prefers-reduced-motion: reduce` match, so count-ups and motion finish instantly. */
export function preferReducedMotion() {
  window.matchMedia = ((query: string) =>
    ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList) as typeof window.matchMedia
}
