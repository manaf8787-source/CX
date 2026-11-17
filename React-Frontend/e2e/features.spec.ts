import { expect, test } from '@playwright/test'
import { collectErrors, expectPageReady, signInAs } from './helpers.ts'

test('conversation text is shown to the CX manager and hidden from the executive', async ({ browser }) => {
  const cx = await browser.newPage()
  await signInAs(cx, 'cxmgr')
  let personWithText: string | null = null
  for (let i = 1; i <= 30 && !personWithText; i++) {
    const id = `p-${String(i).padStart(3, '0')}`
    await cx.goto(`/customers/${id}`)
    await expectPageReady(cx)
    if ((await cx.locator('main blockquote').count()) > 0) personWithText = id
  }
  expect(personWithText, 'sample data has at least one person with conversation text').not.toBeNull()
  await cx.close()

  const exec = await browser.newPage()
  await signInAs(exec, 'exec')
  await exec.goto(`/customers/${personWithText}`)
  await expectPageReady(exec)
  await expect(exec.locator('main blockquote')).toHaveCount(0)
  await exec.close()
})

test('the assistant answers a question', async ({ page }) => {
  await signInAs(page, 'cxmgr')
  const errors = collectErrors(page)
  await page.goto('/home')
  await expectPageReady(page)
  await page.getByRole('button', { name: 'Ask the assistant' }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('AI assistant')).toBeVisible()
  const log = dialog.getByRole('log')
  const before = await log.locator(':scope > *').count()
  await dialog.getByRole('textbox', { name: 'Ask the assistant' }).fill('How many open corrective actions?')
  await dialog.getByRole('button', { name: 'Send' }).click()
  await expect.poll(async () => log.locator(':scope > *').count(), { timeout: 10_000 }).toBeGreaterThanOrEqual(before + 2)
  await expect(log).toContainText(/\d/)
  expect(errors).toEqual([])
})

test('the assistant button is hidden for roles that may not use it', async ({ page }) => {
  await signInAs(page, 'teamlead')
  await page.goto('/home')
  await expectPageReady(page)
  await expect(page.getByRole('button', { name: 'Ask the assistant' })).toHaveCount(0)
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })
  test('no transform animations run while navigating', async ({ page }) => {
    await signInAs(page, 'cxmgr')
    await page.goto('/home')
    await expectPageReady(page)
    await page.getByRole('link', { name: /signals/i }).first().click()
    await page.waitForTimeout(100)
    const moving = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => a.playState === 'running')
        .filter((a) => {
          const effect = a.effect as KeyframeEffect | null
          return !!effect?.getKeyframes().some((k) => 'transform' in k || 'translate' in k || 'scale' in k)
        }).length,
    )
    expect(moving).toBe(0)
  })
})
