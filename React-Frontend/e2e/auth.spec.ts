import { expect, test } from '@playwright/test'
import { signInAs } from './helpers.ts'

/** The six main roles are on the card; the others sit under "Other roles used in the demo" (v40 F28). */
const FOLDED = ['Sales team lead', 'After-Sales team lead', 'HR specialist', 'HR manager', 'Executive', 'Mystery shopper']

const roleCard = async (page: import('@playwright/test').Page, title: string) => {
  if (FOLDED.includes(title)) await page.getByText(/Other roles used in the demo/).click()
  return page.getByRole('radio', { name: new RegExp(`^${title}`, 'i') })
}

test.describe('sample sign-in', () => {
  test('redirects to /login, returns to the deep link, survives reload, signs out', async ({ page }) => {
    await page.goto('/actions/signals')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByText(/no real authentication/i).first()).toBeVisible()
    await expect(page.locator('input[type="password"]')).toHaveCount(0)

    await (await roleCard(page, 'CX manager')).check({ force: true })
    await page.getByRole('button', { name: /sign in as/i }).click()
    await expect(page).toHaveURL(/\/actions\/signals$/)
    await expect(page.locator('main h1').first()).toBeVisible()

    await page.reload()
    await expect(page).toHaveURL(/\/actions\/signals$/)

    await page.getByRole('button', { name: /^Account:/ }).click()
    await page.getByRole('menuitem', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await page.goto('/home')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('requires a role before signing in', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /^sign in$/i }).click()
    await expect(page.getByText('Choose a role to continue.')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  for (const [title, home] of [
    ['Executive', '/home'],
    ['Mystery shopper', '/settings/mystery-shopper'],
  ] as const) {
    test(`signing in as ${title} lands on ${home}`, async ({ page }) => {
      await page.goto('/login')
      await (await roleCard(page, title)).check({ force: true })
      await page.getByRole('button', { name: /sign in as/i }).click()
      await expect(page).toHaveURL(new RegExp(`${home}$`))
    })
  }

  test('the mystery shopper cannot open pages outside its role', async ({ page }) => {
    await signInAs(page, 'shopper')
    await page.goto('/actions/corrective')
    await expect(page).not.toHaveURL(/\/actions\//)
    await expect(page.locator('main h1').first()).toBeVisible()
  })
})
