import { expect, test, type Page } from '@playwright/test'
import { expectPageReady, signInAs, waitForAnimations } from './helpers.ts'

test.use({ reducedMotion: 'reduce' })

async function ready(page: Page, route: string) {
  await signInAs(page, 'cxmgr')
  await page.goto(route)
  await expectPageReady(page)
  await waitForAnimations(page)
}

async function tabUntil(page: Page, matches: () => Promise<boolean>, max = 60) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab')
    if (await matches()) return
  }
  throw new Error('focus never reached the target with Tab')
}

test('skip link jumps past the navigation to the page content', async ({ page }) => {
  await ready(page, '/home')
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: /skip to content/i })
  await expect(skip).toBeFocused()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Tab')
  const inMain = await page.evaluate(() => !!document.activeElement?.closest('main'))
  expect(inMain).toBe(true)
})

test('sidebar links are reachable and work with Enter', async ({ page }) => {
  await ready(page, '/home')
  const link = page.getByRole('link', { name: /^customers$/i }).first()
  await tabUntil(page, async () => link.evaluate((el) => el === document.activeElement))
  await expect(link).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/customers$/)
})

test('tabs move with arrow keys and show the matching panel', async ({ page }) => {
  await ready(page, '/settings/teams-structure')
  const tabs = page.getByRole('tab')
  await tabs.first().focus()
  await page.keyboard.press('ArrowRight')
  await expect(tabs.nth(1)).toBeFocused()
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel')).toBeVisible()
})

test('table headers sort with the keyboard and announce the order', async ({ page }) => {
  await ready(page, '/customers')
  const header = page.locator('thead th:has(button)').first()
  await header.getByRole('button').focus()
  await page.keyboard.press('Enter')
  await expect(header).toHaveAttribute('aria-sort', /ascending|descending/)
  const first = await header.getAttribute('aria-sort')
  await page.keyboard.press('Enter')
  await expect(header).not.toHaveAttribute('aria-sort', first!)
})

test('a form dialog traps focus, closes with Escape and returns focus', async ({ page }) => {
  await ready(page, '/close-the-loop')
  const trigger = page.getByRole('button', { name: /^call$/i }).first()
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('assistant opens from the keyboard, answers, and gives focus back', async ({ page }) => {
  await ready(page, '/home')
  const trigger = page.getByRole('button', { name: /ask the assistant/i })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const input = dialog.getByRole('textbox')
  await input.focus()
  await page.keyboard.type('How many open corrective actions?')
  await page.keyboard.press('Enter')
  await expect(dialog.getByText(/corrective action/i).last()).toBeVisible({ timeout: 10_000 })
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})
