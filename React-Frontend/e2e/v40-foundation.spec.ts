import { expect, test, type Page } from '@playwright/test'
import { FOLDED_ROLES, LEGACY_ROUTES, MAIN_ROLES, ROLE_HOME, collectErrors, expectPageReady, signInAs, type RoleId } from './helpers.ts'

/** A URL regex for "ends with this path". */
const endsWith = (path: string) => new RegExp(`${path.replace(/[/.]/g, (c) => `\\${c}`)}$`)

/** The links of the sidebar's content (menu items), in order. */
const sidebarLinks = (page: Page) => page.locator('[data-sidebar="content"] a')

test.describe('v40 foundation: merged menu, roles, redirects, bars', () => {
  test('the CX manager sees the six main items in step order, then the products and Settings and reference', async ({ page }) => {
    await signInAs(page, 'cxmgr')
    await page.goto('/home')
    await expectPageReady(page)
    const labels = (await sidebarLinks(page).allInnerTexts()).map((s) => s.trim())
    expect(labels.slice(0, 6)).toEqual(['Home', '1 · Customers', 'My inbox', '2–4 · Signals and fixes', '5 · Close the loop', '6 · CX indicators'])
    expect(labels.at(-1)).toBe('Settings and reference')
    for (const gone of ['Runaway customers', 'Personas and campaigns', 'Surveys and triggers', 'Intelligent CX team']) expect(labels).not.toContain(gone)
  })

  test('the menu follows the language and the direction', async ({ page }) => {
    await signInAs(page, 'cxmgr', 'ar')
    await page.goto('/home')
    await expectPageReady(page)
    const labels = (await sidebarLinks(page).allInnerTexts()).map((s) => s.trim())
    expect(labels.slice(0, 6)).toEqual(['الرئيسية', '1 · العملاء', 'صندوقي', '2–4 · الإشارات والحلول', '5 · إغلاق الحلقة', '6 · مؤشرات تجربة العملاء'])
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })

  for (const [role, expected] of [
    ['marketing', ['Home', '1 · Customers', 'My inbox', 'Settings and reference']],
    ['auditmkt', ['1 · Customers', 'My inbox', '6 · CX indicators', 'Settings and reference']],
    ['teamlead', ['Home', '1 · Customers', 'My inbox', '2–4 · Signals and fixes']],
    ['ld', ['2–4 · Signals and fixes', 'Settings and reference']],
  ] as [RoleId, string[]][]) {
    test(`${role} sees only its own menu items`, async ({ page }) => {
      await signInAs(page, role)
      await page.goto('/')
      await page.waitForURL(/\/(home|overview|actions|settings)/)
      await expectPageReady(page)
      const labels = (await sidebarLinks(page).allInnerTexts()).map((s) => s.trim())
      for (const e of expected) expect(labels, `${role} should see "${e}"`).toContain(e)
      if (role !== 'cxmgr') expect(labels).not.toContain('5 · Close the loop')
      if (role === 'marketing' || role === 'teamlead' || role === 'ld') expect(labels).not.toContain('6 · CX indicators')
    })
  }

  for (const role of MAIN_ROLES) {
    test(`${role} lands on its home page (${ROLE_HOME[role]}) with a heading and no console errors`, async ({ page }) => {
      await signInAs(page, role)
      const errors = collectErrors(page)
      await page.goto('/')
      await expect(page).toHaveURL(endsWith(ROLE_HOME[role]), { timeout: 15_000 })
      await expectPageReady(page)
      expect(errors, `${role}: ${errors.join(' | ')}`).toEqual([])
    })
  }

  for (const [from, to] of Object.entries(LEGACY_ROUTES)) {
    test(`${from} still works and redirects to ${to}`, async ({ page }) => {
      await signInAs(page, 'cxmgr')
      await page.goto(from)
      await expect(page).toHaveURL(endsWith(to))
      await expectPageReady(page)
    })
  }

  test('the Internal Audit and Marketing Lead can still open the old Overview URL', async ({ page }) => {
    await signInAs(page, 'auditmkt')
    await page.goto('/settings/overview')
    await expect(page).toHaveURL(endsWith('/overview'))
    await expectPageReady(page)
  })

  // [role, path, where it ends up]: a page the role does not have sends it home; a page it has opens.
  for (const [role, path, lands] of [
    ['teamlead', '/settings/feeds', '/home'],
    ['ld', '/inbox', '/settings/ld'],
    ['marketing', '/overview', '/home'],
    ['exec', '/settings/crm-mapping', '/settings/crm-mapping'],
  ] as [RoleId, string, string][]) {
    test(`${role} opening ${path} ends on ${lands}`, async ({ page }) => {
      await signInAs(page, role)
      await page.goto(path)
      await expect(page).toHaveURL(endsWith(lands))
      await expectPageReady(page)
    })
  }
  test('the "Data as of" bar sits under the top bar and its switch narrows the people register', async ({ page }) => {
    await signInAs(page, 'cxmgr')
    await page.goto('/customers')
    await expectPageReady(page)
    const bar = page.getByRole('region', { name: 'Data freshness and environment' })
    await expect(bar).toBeVisible()
    await expect(bar.getByText(/Data as of/)).toBeVisible()
    await expect(bar.getByRole('link', { name: /1 feed late or missing/ })).toBeVisible({ timeout: 15_000 })
    const rows = page.locator('main tbody tr')
    await expect.poll(() => rows.count(), { timeout: 15_000 }).toBeGreaterThan(5)
    const all = await rows.count()
    await bar.getByRole('combobox').click()
    await page.getByRole('option', { name: 'PSI Assets (rental)' }).click()
    await expect.poll(() => rows.count(), { timeout: 15_000 }).toBeLessThan(all)
    // Only the environments of the sample exist: Dubai, Abu Dhabi, PSI Assets. Amman and Sharjah are gone.
    await bar.getByRole('combobox').click()
    await expect(page.getByRole('option')).toHaveText(['All environments', 'Dubai', 'Abu Dhabi', 'PSI Assets (rental)'])
    await expect(page.getByText(/Amman|Sharjah/)).toHaveCount(0)
  })

  test('environment management is fixed to its own environment: a chip, no select', async ({ page }) => {
    await signInAs(page, 'envmgmt')
    await page.goto('/home')
    await expectPageReady(page)
    const bar = page.getByRole('region', { name: 'Data freshness and environment' })
    await expect(bar.getByText('Dubai')).toBeVisible()
    await expect(bar.getByRole('combobox')).toHaveCount(0)
  })

  test('a signal opens from any page through ?sg= and closes with Escape', async ({ page }) => {
    await signInAs(page, 'cxmgr')
    await page.goto('/home?sg=SG-1')
    await expectPageReady(page)
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 15_000 })
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(page).not.toHaveURL(/sg=/)
  })

  test('the six-step primitives and My inbox render for a role with items', async ({ page }) => {
    await signInAs(page, 'cxmgr')
    await page.goto('/inbox')
    await expectPageReady(page)
    await expect(page.getByRole('heading', { level: 1, name: 'My inbox' })).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Approval window: 5 working days\. Verification at 60 days\./)).toBeVisible()
  })

  test('sign-in shows the six main roles and folds the others', async ({ page }) => {
    await page.goto('/login')
    for (const name of ['CX manager', 'CX team', 'Environment management', 'Marketing manager', 'L&D manager', 'Internal Audit and Marketing Lead']) {
      await expect(page.getByRole('radio', { name: new RegExp(`^${name}`, 'i') })).toBeAttached()
    }
    const details = page.locator('details', { hasText: 'Other roles used in the demo' })
    await expect(details).not.toHaveAttribute('open', '')
    for (const role of FOLDED_ROLES) expect(role).toBeTruthy()
  })
})
