import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { ROLE_DEFS } from '@/data/roles'
import { TOUR_STORAGE_KEY } from '@/components/tour/tourStorage'

// findBy and waitFor wait up to 5 s (the default 1 s is too tight when many workers run at once).
configure({ asyncUtilTimeout: 5000 })

// The guided tour starts by itself the first time a role is used. Every test begins with all tours marked done, so a test that renders the
// shell never meets one; a tour test opts in with `localStorage.removeItem(TOUR_STORAGE_KEY)` before it renders (docs/V41_TOUR.md).
beforeEach(() => {
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify({ done: Object.fromEntries(ROLE_DEFS.map((r) => [r.id, true])) }))
  } catch {
    /* ignore */
  }
})

afterEach(() => {
  cleanup()
  try {
    localStorage.clear()
  } catch {
    /* ignore */
  }
})

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
globalThis.ResizeObserver ??= NoopObserver as unknown as typeof ResizeObserver
globalThis.IntersectionObserver ??= NoopObserver as unknown as typeof IntersectionObserver
