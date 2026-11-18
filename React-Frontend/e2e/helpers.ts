import { expect, type Page } from '@playwright/test'

export type RoleId = 'cxmgr' | 'cxteam' | 'envmgmt' | 'teamlead' | 'aslead' | 'ld' | 'hrspec' | 'hrmgr' | 'marketing' | 'auditmkt' | 'exec' | 'shopper'

/** The six roles on the sign-in screen (v40 F28); the rest are folded under "Other roles used in the demo". */
export const MAIN_ROLES = ['cxmgr', 'cxteam', 'envmgmt', 'marketing', 'ld', 'auditmkt'] as const satisfies readonly RoleId[]
export const FOLDED_ROLES = ['teamlead', 'aslead', 'hrspec', 'hrmgr', 'exec', 'shopper'] as const satisfies readonly RoleId[]

/** Where each role lands after sign-in (v40 F35: Marketing lands on Home, the Internal Audit and Marketing Lead on the Overview). */
export const ROLE_HOME: Record<RoleId, string> = {
  cxmgr: '/home',
  cxteam: '/home',
  envmgmt: '/home',
  teamlead: '/home',
  aslead: '/home',
  ld: '/settings/ld',
  hrspec: '/actions',
  hrmgr: '/settings/hr-team',
  marketing: '/home',
  auditmkt: '/overview',
  exec: '/home',
  shopper: '/settings/mystery-shopper',
}

/** Old URLs that still work and where they go (v40 F08, F18). */
export const LEGACY_ROUTES: Record<string, string> = {
  '/surveys': '/settings/surveys',
  '/settings/overview': '/overview',
}

/** Starts the page already signed in (sample session), skipping the login screen. */
export async function signInAs(page: Page, role: RoleId, lang: 'en' | 'ar' = 'en') {
  await page.addInitScript(
    ([r, l]) => {
      if (sessionStorage.getItem('e2e-seeded')) return
      sessionStorage.setItem('e2e-seeded', '1')
      localStorage.setItem('psicx.session', JSON.stringify({ displayName: 'E2E', signedInAt: new Date().toISOString() }))
      localStorage.setItem('psicx.role', r)
      localStorage.setItem('psicx.lang', l)
    },
    [role, lang] as const,
  )
}

/** Collects console errors and uncaught page errors for the life of the page. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(err.message))
  return errors
}

export async function expectPageReady(page: Page) {
  await expect(page.locator('main h1').first(), `no page heading at ${page.url()}`).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 10_000 })
}

export const ROUTES = [
  '/home',
  '/customers',
  '/runaway',
  '/actions/corrective',
  '/actions/signals',
  '/actions/ai-insights',
  '/actions/shopper-cases',
  '/actions/investigations',
  '/close-the-loop',
  '/personas',
  '/inbox',
  '/overview',
  '/intelligent-cx-team',
  '/products/re',
  '/settings/surveys',
  '/settings/feeds',
  '/settings/crm-mapping',
  '/settings/escalation-matrix',
  '/settings/survey-questions',
  '/settings/weekly-sample',
  '/settings/public-mentions',
  '/settings/monthly-pack',
  '/settings/mystery-shopper',
  '/settings/standards',
  '/settings/voc',
  '/settings/surveys-reference',
  '/settings/ld',
  '/settings/teams-structure',
  '/settings/hr-team',
  '/settings/admin',
  '/settings/rules',
  '/settings/ai-insights-access',
  '/settings/glossary',
]

/** Waits until finite animations (route fades, staggers, count-ups) have settled, so
 * checks such as colour contrast see the final state rather than a mid-fade frame. */
export async function waitForAnimations(page: Page) {
  await page.waitForFunction(
    () =>
      document.getAnimations().every((a) => {
        const iterations = a.effect?.getTiming().iterations
        return iterations === Infinity || a.playState !== 'running'
      }) &&
      // motion also drives some fades from JS via inline opacity; wait for those to land.
      [...document.querySelectorAll<HTMLElement>('main [style*="opacity"], [role="dialog"] [style*="opacity"]')].every((el) => {
        const o = Number.parseFloat(el.style.opacity)
        return Number.isNaN(o) || o === 0 || o === 1
      }),
    undefined,
    { timeout: 10_000 },
  )
  await page.waitForTimeout(150)
}
