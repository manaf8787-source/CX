import { expect, test } from '@playwright/test'
import { ROUTES, collectErrors, expectPageReady, signInAs } from './helpers.ts'

for (const lang of ['en', 'ar'] as const) {
  test.describe(`every route renders (${lang})`, () => {
    test(`all ${ROUTES.length} routes, no console errors, dir=${lang === 'ar' ? 'rtl' : 'ltr'}`, async ({ page }) => {
      test.setTimeout(120_000)
      await signInAs(page, 'cxmgr', lang)
      const errors = collectErrors(page)
      for (const route of ROUTES) {
        await page.goto(route)
        await expectPageReady(page)
        await expect(page.locator('html')).toHaveAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr')
        await expect(page.locator('html')).toHaveAttribute('lang', lang)
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(overflow, `${route} scrolls sideways`).toBeLessThanOrEqual(1)
        expect(errors, `${route}: ${errors.join(' | ')}`).toEqual([])
      }
    })
  })
}

test('switching language flips direction live', async ({ page }) => {
  await signInAs(page, 'cxmgr', 'en')
  await page.goto('/home')
  await expectPageReady(page)
  await page.getByRole('button', { name: /arabic|العربية/i }).first().click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
})

test('mobile width has no sideways scroll on Home and Signals', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await signInAs(page, 'cxmgr', 'ar')
  for (const route of ['/home', '/actions/signals', '/settings/ai-insights-access']) {
    await page.goto(route)
    await expectPageReady(page)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, route).toBeLessThanOrEqual(1)
  }
})
