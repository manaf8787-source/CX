import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { expectPageReady, signInAs, waitForAnimations, type RoleId } from './helpers.ts'

/**
 * The v39/v40 integration pass (docs/IMPLEMENTATION_REPORT.md section 14): the Daily brief on the landing pages of the roles that land
 * outside Home, the fix cards that fold their details, the matrix cells (set 19 Nov: nothing left to confirm), the CRM mapping "Confirm", the owner titles in
 * Arabic, an AI campaign row's hand-over after 2 no-answers, and the timeline anchor that takes focus.
 */

async function open(page: Page, role: RoleId, route: string, lang: 'en' | 'ar' = 'en') {
  await signInAs(page, role, lang)
  await page.goto(route)
  await expectPageReady(page)
  await waitForAnimations(page)
}

async function blocking(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  return result.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({ id: v.id, impact: v.impact, targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }))
}

test.describe('the Daily brief on the landing page of a role that does not land on Home (F09)', () => {
  for (const [role, route, line] of [
    ['ld', '/settings/ld', /training-gap fix(es)? (is|are) with L&D right now/],
    ['hrmgr', '/settings/hr-team', /NPS/],
    ['auditmkt', '/overview', /Weekly sample/],
    ['hrspec', '/actions', /conduct note/],
  ] as const) {
    test(`${role} lands on ${route} with the brief at the top`, async ({ page }) => {
      await open(page, role, route)
      const lines = page.getByRole('list', { name: 'Daily brief lines' })
      await expect(lines.getByText(line).first()).toBeVisible({ timeout: 15_000 })
      for (const href of await lines.getByRole('link').evaluateAll((els) => els.map((e) => e.getAttribute('href') as string))) {
        expect(href.startsWith('/')).toBe(true)
      }
      expect(await blocking(page)).toEqual([])
    })
  }

  test('the HR manager reads the NPS line as plain text (no Overview for this role)', async ({ page }) => {
    await open(page, 'hrmgr', '/settings/hr-team')
    const lines = page.getByRole('list', { name: 'Daily brief lines' })
    await expect(lines.getByText(/NPS/).first()).toBeVisible({ timeout: 15_000 })
    await expect(lines.getByRole('link')).toHaveCount(0)
  })

  test('the CX manager has no second brief on the L&D page', async ({ page }) => {
    await open(page, 'cxmgr', '/settings/ld')
    await expect(page.getByRole('list', { name: 'Daily brief lines' })).toHaveCount(0)
  })
})

test.describe('the fix cards fold their details', () => {
  test('the first fix is open, the others folded; Enter opens one; Expand all and Collapse all', async ({ page }) => {
    await open(page, 'cxmgr', '/actions/corrective')
    const toggles = page.getByRole('button', { name: /^Details/ })
    await expect(toggles.first()).toHaveAttribute('aria-expanded', 'true', { timeout: 15_000 })
    const n = await toggles.count()
    expect(n).toBeGreaterThanOrEqual(4)
    for (let i = 1; i < n; i++) await expect(toggles.nth(i)).toHaveAttribute('aria-expanded', 'false')
    await toggles.nth(1).focus()
    await page.keyboard.press('Enter')
    await expect(toggles.nth(1)).toHaveAttribute('aria-expanded', 'true')
    await page.getByRole('button', { name: 'Expand all' }).click()
    for (let i = 0; i < n; i++) await expect(toggles.nth(i)).toHaveAttribute('aria-expanded', 'true')
    await page.getByRole('button', { name: 'Collapse all' }).click()
    for (let i = 0; i < n; i++) await expect(toggles.nth(i)).toHaveAttribute('aria-expanded', 'false')
  })

  test('a fix named by ?fix= is open as well as the first', async ({ page }) => {
    await open(page, 'cxmgr', '/actions/corrective?fix=CA-204')
    await expect(page.locator('li[data-fix="CA-204"]').getByRole('button', { name: /^Details/ })).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('li[data-fix="CA-203"]').getByRole('button', { name: /^Details/ })).toHaveAttribute('aria-expanded', 'false')
  })

  test('no axe violations with the fixes folded (Arabic, dark)', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('psicx.theme', 'dark'))
    await open(page, 'cxmgr', '/actions/corrective', 'ar')
    await expect(page.getByRole('button', { name: 'فتح الكل' })).toBeVisible({ timeout: 15_000 })
    await waitForAnimations(page)
    expect(await blocking(page)).toEqual([])
  })

  test('the owner reads in Arabic in an Arabic session (a title, not a name)', async ({ page }) => {
    await open(page, 'cxmgr', '/actions/corrective', 'ar')
    const card = page.locator('li[data-fix="CA-201"]')
    await expect(card).toContainText('المالك', { timeout: 15_000 })
    await expect(card.getByText(/المالك:.*[؀-ۿ]/).first()).toBeVisible()
  })
})

test.describe('confirm what is still a default', () => {
  test('the escalation matrix is decided (set 19 Nov): no [Proposed], no "Confirm default" button, for the CX manager and for a role that only reads', async ({ page }) => {
    await open(page, 'cxmgr', '/settings/escalation-matrix')
    await expect(page.getByRole('table').getByRole('row')).toHaveCount(13, { timeout: 15_000 })
    await expect(page.getByText('[Proposed]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Confirm default/ })).toHaveCount(0)
    await expect(page.getByRole('textbox', { name: 'Legal and privacy · First receiver' })).toHaveValue('Legal')
    await expect(page.getByTestId('matrix-set-note')).toContainText('Set 19 Nov · titles adjustable until 28 Nov')
    const reader = await page.context().newPage()
    await open(reader, 'cxteam', '/settings/escalation-matrix')
    await expect(reader.getByRole('table').getByRole('row')).toHaveCount(13, { timeout: 15_000 })
    await expect(reader.getByText('[Proposed]')).toHaveCount(0)
    await expect(reader.getByRole('button', { name: /Confirm default/ })).toHaveCount(0)
  })

  test('the CRM mapping: "Confirm" clears one row’s [Proposed]', async ({ page }) => {
    await open(page, 'cxmgr', '/settings/crm-mapping')
    const table = page.getByRole('table')
    await expect(table.getByText('[Proposed]')).toHaveCount(13, { timeout: 15_000 })
    await table.getByRole('button', { name: 'Confirm the mapping of Youngsters' }).click()
    await expect(table.getByText('[Proposed]')).toHaveCount(12)
    await expect(table.locator('tr', { hasText: 'Youngsters' })).toContainText('Confirmed')
  })
})

test.describe('close the loop: an AI campaign hands over after its 2 no-answers', () => {
  test('the second no-answer of a campaign row hands the call to a person', async ({ page }) => {
    await open(page, 'cxmgr', '/close-the-loop')
    const row = page.locator('main tbody tr', { hasText: 'attempt 2 of 2' }).first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.getByRole('button', { name: 'No answer' }).click()
    await expect(page.getByText(/the campaign hands this call to a person/)).toBeVisible()
  })
})

test.describe('the timeline anchor', () => {
  test('?ev= focuses the event row (a visible focus ring) and says so to a screen reader', async ({ page }) => {
    await open(page, 'cxmgr', '/customers/p-005')
    const first = page.locator('li[data-ev]').first()
    const ev = (await first.getAttribute('data-ev')) as string
    await page.goto(`/customers/p-005?ev=${ev}`)
    await expectPageReady(page)
    const row = page.locator(`li[data-ev="${ev}"]`)
    await expect(row).toBeFocused({ timeout: 15_000 })
    await expect(row).toHaveAttribute('id', ev)
    await expect(page.getByTestId('timeline-live')).toContainText(`${ev} is highlighted in the timeline`)
  })
})
