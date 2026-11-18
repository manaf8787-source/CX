import { useSyncExternalStore } from 'react'

/**
 * The skill's three shell widths (references/responsive-design.md, measured breakpoints): phone <= 809, tablet 810 to 1199, desktop >= 1200.
 * Desktop shows the 220px sidebar (collapsible to a 56px rail), tablet the 56px rail with an overlay drawer, phone no sidebar and a
 * full-screen menu sheet. Server snapshot and tests (no matchMedia match) read as desktop.
 */
export type ViewportMode = 'phone' | 'tablet' | 'desktop'

const PHONE = '(max-width: 809.98px)'
const TABLET = '(max-width: 1199.98px)'

function subscribe(onChange: () => void) {
  const queries = [window.matchMedia(PHONE), window.matchMedia(TABLET)]
  queries.forEach((q) => q.addEventListener('change', onChange))
  return () => queries.forEach((q) => q.removeEventListener('change', onChange))
}

function snapshot(): ViewportMode {
  if (window.matchMedia(PHONE).matches) return 'phone'
  if (window.matchMedia(TABLET).matches) return 'tablet'
  return 'desktop'
}

export function useViewportMode(): ViewportMode {
  return useSyncExternalStore(subscribe, snapshot, () => 'desktop')
}
