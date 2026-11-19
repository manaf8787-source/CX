import { expect, test } from '@playwright/test'
import { expectPageReady, signInAs } from './helpers.ts'

// Meo-inspired restyle (docs/MEO_DESIGN_SYSTEM.md): the pieces that only a real browser can check.

test.describe('phone composition (390px)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  for (const route of ['/close-the-loop', '/inbox', '/personas']) {
    test(`${route}: rows are stacked, details sit behind a toggle, nothing scrolls sideways`, async ({ page }) => {
      await signInAs(page, 'cxmgr', 'en')
      await page.goto(route)
      await expectPageReady(page)
      const rows = page.locator('[data-slot=stacked-rows]').first()
      await expect(rows).toBeVisible()
      const toggle = rows.getByRole('button', { name: 'Details' }).first()
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await toggle.click()
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(1)
    })
  }

  test('Close the loop keeps the Call button on every row (the action is not behind the toggle)', async ({ page }) => {
    await signInAs(page, 'cxmgr', 'en')
    await page.goto('/close-the-loop')
    await expectPageReady(page)
    await expect(page.locator('[data-slot=stacked-rows]').first().getByRole('button', { name: 'Call' }).first()).toBeVisible()
  })

  test('Arabic: the stacked rows mirror and stay inside the viewport', async ({ page }) => {
    await signInAs(page, 'cxmgr', 'ar')
    await page.goto('/inbox')
    await expectPageReady(page)
    await expect(page.locator('[data-slot=stacked-rows]').first()).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })
})

test.describe('desktop (1440px)', () => {
  test('Close the loop is a table with its action column pinned to the end edge', async ({ page }) => {
    await signInAs(page, 'cxmgr', 'en')
    await page.goto('/close-the-loop')
    await expectPageReady(page)
    await expect(page.locator('[data-slot=stacked-rows]')).toHaveCount(0)
    const position = await page.locator('table').first().locator('th').filter({ hasText: 'Actions' }).evaluate((el) => getComputedStyle(el).position)
    expect(position).toBe('sticky')
  })

  test('a table follows the page density: comfortable rows on a comfortable page, dense on a dense one', async ({ page }) => {
    await signInAs(page, 'cxmgr', 'en')
    await page.goto('/settings/ld')
    await expectPageReady(page)
    const comfortable = await page.locator('main tbody tr').first().evaluate((el) => el.getBoundingClientRect().height)
    await page.goto('/customers')
    await expectPageReady(page)
    const dense = await page.locator('main tbody tr').first().evaluate((el) => el.getBoundingClientRect().height)
    expect(comfortable).toBeGreaterThan(dense + 6)
  })

  test('the pressed filter is a group of buttons whose dark pill follows aria-pressed', async ({ page }) => {
    await signInAs(page, 'cxmgr', 'en')
    await page.goto('/settings/public-mentions')
    await expectPageReady(page)
    const group = page.getByRole('group', { name: 'Filter by reply status' })
    const buttons = group.getByRole('button')
    await buttons.nth(1).click()
    await expect(buttons.nth(1)).toHaveAttribute('aria-pressed', 'true')
    const pill = group.locator('[data-slot=segmented-indicator]')
    await expect(pill).toHaveCount(1)
    await expect.poll(async () => {
      const [p, b] = await Promise.all([pill.boundingBox(), buttons.nth(1).boundingBox()])
      return p && b ? Math.abs(p.x - b.x) < 2 && Math.abs(p.width - b.width) < 2 : false
    }).toBe(true)
  })

  test('the focus ring shows on a label-wrapped radio (sign-in role rows)', async ({ page }) => {
    await page.goto('/login')
    // the role rows' own inputs (the language and theme switches above the card are radio groups too)
    const first = page.locator('input[type="radio"]').first()
    await first.focus()
    await page.keyboard.press('ArrowDown')
    const shadow = await page.locator('label:has(input:focus-visible)').first().evaluate((el) => getComputedStyle(el).boxShadow)
    expect(shadow).not.toBe('none')
    expect(shadow).toContain('rgb(10, 10, 10)')
  })
})
