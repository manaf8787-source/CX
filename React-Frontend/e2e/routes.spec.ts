import { expect, test } from '@playwright/test'
import { ROUTES, collectErrors, expectPageReady, signInAs } from './helpers.ts'

// One test per route and language (70 short tests) instead of one test that walks all 35 routes: the walk took about 66 s on a quiet machine
// and ran past its own timeout with tracing on a busy one. Short tests also spread over the workers and name the route that failed.
for (const lang of ['en', 'ar'] as const) {
  test.describe(`every route renders (${lang})`, () => {
    for (const route of ROUTES) {
      test(`${route}: no console errors, dir=${lang === 'ar' ? 'rtl' : 'ltr'}, no sideways scroll`, async ({ page }) => {
        await signInAs(page, 'cxmgr', lang)
        const errors = collectErrors(page)
        await page.goto(route)
        await expectPageReady(page)
        await expect(page.locator('html')).toHaveAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr')
        await expect(page.locator('html')).toHaveAttribute('lang', lang)
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(overflow, `${route} scrolls sideways`).toBeLessThanOrEqual(1)
        expect(errors, `${route}: ${errors.join(' | ')}`).toEqual([])
      })
    }
  })
}

test('switching language flips direction live', async ({ page }) => {
  await signInAs(page, 'cxmgr', 'en')
  await page.goto('/home')
  await expectPageReady(page)
  // the language is a two-key switch (19 Nov): both languages show, the one in use is checked
  const language = page.getByRole('radiogroup', { name: 'Language' })
  await expect(language.getByRole('radio', { name: 'English' })).toBeChecked()
  await language.getByRole('radio', { name: 'العربية' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('radiogroup', { name: 'اللغة' }).getByRole('radio', { name: 'العربية' })).toBeChecked()
})

// On a phone every route must stay inside the viewport (a table may scroll inside its card, the page never scrolls sideways).
for (const route of ['/home', '/actions/signals', '/settings/ai-insights-access', '/close-the-loop', '/inbox', '/personas', '/customers']) {
  test(`mobile width has no sideways scroll: ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await signInAs(page, 'cxmgr', 'ar')
    await page.goto(route)
    await expectPageReady(page)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, route).toBeLessThanOrEqual(1)
  })
}
