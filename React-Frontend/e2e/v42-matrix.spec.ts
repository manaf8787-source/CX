import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { expectPageReady, signInAs, waitForAnimations, type RoleId } from './helpers.ts'

/**
 * v42 F30 (docs/V42_MATRIX.md): the escalation matrix cells set on 19 Nov 2026 for all six products, the two new rows (data exposure and the
 * VIP rule), "Three rules behind the cells" above the product tabs, the clock legend, and a VIP-related fix with its tag and its halved clocks.
 * Client-side navigation keeps the in-memory sample data; a full page load resets it.
 */

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
async function blockingViolations(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  return result.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({ id: v.id, impact: v.impact, help: v.help, targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }))
}

async function open(page: Page, route: string, role: RoleId = 'cxmgr', lang: 'en' | 'ar' = 'en', theme: 'light' | 'dark' = 'light') {
  await page.addInitScript((t) => localStorage.setItem('psicx.theme', t), theme)
  await signInAs(page, role, lang)
  await page.goto(route)
  await expectPageReady(page)
}

const MATRIX = '/settings/escalation-matrix'
const rows = (page: Page) => page.getByRole('table').getByRole('row')
const field = (page: Page, name: string) => page.getByRole('textbox', { name }).or(page.getByRole('spinbutton', { name }))

test.describe('the matrix page: header, three rules, legend', () => {
  test.use({ reducedMotion: 'reduce' })

  test('shows the new header text and "Three rules behind the cells" above the product tabs, with the clock legend', async ({ page }) => {
    await open(page, MATRIX)
    await expect(page.getByRole('heading', { name: 'Escalation matrix' })).toBeVisible()
    await expect(
      page.getByText('Cells set on 19 November by the CX manager; product owners may adjust a title with the Internal Audit and Marketing Lead before 28 November, the clocks stay.'),
    ).toBeVisible()
    const rules = page.getByTestId('matrix-rules')
    await expect(page.getByText('Three rules behind the cells')).toBeVisible()
    await expect(rules.getByRole('listitem')).toHaveCount(3)
    await expect(rules).toContainText('Every customer is treated as a VIP; a delay is a failure.')
    await expect(rules).toContainText('Information security sits beside Legal on anything that touches data.')
    await expect(rules).toContainText('The receiver is the one who can fix it; the customer hears from one person.')
    await expect(page.getByTestId('matrix-legend')).toContainText('1 h = the same hour; 4 h = the same half day; 9 h = one working day')
    await expect(page.getByTestId('matrix-legend')).toContainText('90 h = two weeks')
    // the card sits above the tabs, and the tabs above the table
    const y = async (loc: ReturnType<Page['locator']>) => (await loc.boundingBox())!.y
    const card = await y(page.getByText('Three rules behind the cells'))
    const tabs = await y(page.getByRole('group', { name: 'Product' }))
    const table = await y(page.getByRole('table'))
    expect(card).toBeLessThan(tabs)
    expect(tabs).toBeLessThan(table)
    // decided: nothing is [Proposed], and the set note says when
    await expect(page.getByText('[Proposed]')).toHaveCount(0)
    await expect(page.getByTestId('matrix-set-note')).toContainText('Set 19 Nov · titles adjustable until 28 Nov')
  })

  test('the VIP row is a rule: "½" in both clock cells, no input', async ({ page }) => {
    await open(page, MATRIX)
    await expect(rows(page)).toHaveCount(13, { timeout: 15_000 })
    const vip = rows(page).last()
    await expect(vip).toContainText('Any kind, VIP customer involved')
    await expect(vip).toContainText('Same receiver, clocks halved')
    await expect(vip).toContainText('Head of the environment at once')
    await expect(vip.getByTestId('matrix-vip-factor')).toHaveText(['½', '½'])
    await expect(vip.getByTestId('matrix-rule-tag')).toHaveText('Rule')
    await expect(page.getByTestId('matrix-vip-row-note')).toContainText('The last row is a rule, not a receiver')
    await expect(vip.getByRole('textbox')).toHaveCount(0)
    await expect(vip.getByRole('spinbutton')).toHaveCount(0)
  })

  test('the four shopper and legal-case clocks of Real Estate read in days and still hold hours', async ({ page }) => {
    await open(page, MATRIX)
    await expect(field(page, 'Shopper case · critical · Respond (h)')).toHaveValue('9', { timeout: 15_000 })
    await expect(field(page, 'Shopper case · critical · Resolve (h)')).toHaveValue('45')
    await expect(page.getByTestId('matrix-days')).toHaveText(['1 day', '5 days', '1 day', '5 days'])
    // a role that only reads sees the days as the document writes them
    const reader = await page.context().newPage()
    await open(reader, MATRIX, 'cxteam')
    await expect(rows(reader)).toHaveCount(13, { timeout: 15_000 })
    const shopper = rows(reader).filter({ hasText: 'Shopper case · critical' })
    await expect(shopper.getByRole('cell').nth(4)).toHaveText('1 day')
    await expect(shopper.getByRole('cell').nth(5)).toHaveText('5 days')
    await expect(rows(reader).filter({ hasText: 'Employee' }).getByRole('cell').nth(5)).toHaveText('–')
  })
})

test.describe('the six products: twelve rows each, the cells of the document', () => {
  test.use({ reducedMotion: 'reduce' })

  /** One cell per product, taken from ESCALATION-MATRIX-2026-11-19.md. */
  const SPOTS: { id: string; tab: string; checks: [string, string][] }[] = [
    { id: 're', tab: 'PSI Real Estate', checks: [['Process · First receiver', 'Sales operations lead'], ['Service and behaviour · Resolve (h)', '27'], ['Legal and privacy · Informed', 'Information Security lead · CX manager']] },
    { id: 'af', tab: 'After-Sales', checks: [['Environment · First receiver', 'Property or community manager (PSI Assets)'], ['Environment · Resolve (h)', '18'], ['Employee · Backup', 'Head of After-Sales']] },
    { id: 'cl', tab: 'PSI Club', checks: [['Legal and privacy · Informed', 'Information Security lead · CX manager · Head of PSI Club'], ['Legal and privacy · Backup', ''], ['Service and behaviour · Respond (h)', '2']] },
    { id: 'to', tab: 'Tour Estate', checks: [['Environment · First receiver', 'Fleet and guides supervisor'], ['Environment · Respond (h)', '1'], ['Environment · Resolve (h)', '9']] },
    { id: 'ev', tab: 'PSI Events', checks: [['Marketing · First receiver', 'Marketing manager'], ['Marketing · Informed', 'Internal Audit and Marketing Lead'], ['Service and behaviour · Resolve (h)', '9']] },
    { id: 'wl', tab: 'PSI Wallet', checks: [['Product and app · Informed', 'Information Security lead · IT lead'], ['Product and app · Respond (h)', '2'], ['Product and app · Resolve (h)', '18']] },
  ]

  test('each product tab shows twelve rows, the same two last rows, and a spot-checked cell from the document', async ({ page }) => {
    await open(page, MATRIX)
    const group = page.getByRole('group', { name: 'Product' })
    await expect(rows(page)).toHaveCount(13, { timeout: 15_000 })
    for (const s of SPOTS) {
      await group.getByRole('button', { name: s.tab, exact: true }).click()
      await expect(group.getByRole('button', { name: s.tab, exact: true })).toHaveAttribute('aria-pressed', 'true')
      await expect(page).toHaveURL(new RegExp(`product=${s.id}`))
      await expect(rows(page)).toHaveCount(13)
      for (const [name, value] of s.checks) await expect(field(page, name), `${s.id} ${name}`).toHaveValue(value)
      // data exposure and VIP are the same for every product
      await expect(field(page, 'Data exposure or system access incident · First receiver')).toHaveValue('Information Security lead (IT)')
      await expect(field(page, 'Data exposure or system access incident · Informed')).toHaveValue('Legal · CX manager')
      await expect(rows(page).last().getByTestId('matrix-vip-factor')).toHaveText(['½', '½'])
      await expect(page.getByText('[Proposed]')).toHaveCount(0)
    }
  })

  test('the employee row has no resolve clock in any product', async ({ page }) => {
    await open(page, MATRIX)
    const group = page.getByRole('group', { name: 'Product' })
    for (const s of SPOTS) {
      await group.getByRole('button', { name: s.tab, exact: true }).click()
      await expect(field(page, 'Employee · Resolve (h)')).toHaveValue('', { timeout: 15_000 })
      await expect(field(page, 'Employee · Respond (h)')).not.toHaveValue('')
    }
  })
})

test.describe('who edits', () => {
  test.use({ reducedMotion: 'reduce' })

  test('the CX manager edits a cell and it stays across the tab switch, marked Edited', async ({ page }) => {
    await open(page, MATRIX)
    const process = field(page, 'Process · First receiver')
    await expect(process).toHaveValue('Sales operations lead', { timeout: 15_000 })
    await expect(page.getByTestId('matrix-edited')).toHaveCount(0)
    await process.fill('Head of Process Excellence')
    await process.press('Enter')
    await expect(page.getByTestId('matrix-edited')).toHaveCount(1)
    await expect(page.getByTestId('matrix-edited')).toContainText('Edited')
    const group = page.getByRole('group', { name: 'Product' })
    await group.getByRole('button', { name: 'After-Sales', exact: true }).click()
    await expect(field(page, 'Process · First receiver')).toHaveValue('After-Sales operations lead')
    await expect(page.getByTestId('matrix-edited')).toHaveCount(0)
    await group.getByRole('button', { name: 'PSI Real Estate', exact: true }).click()
    await expect(field(page, 'Process · First receiver')).toHaveValue('Head of Process Excellence')
    await expect(page.getByTestId('matrix-edited')).toHaveCount(1)
    await expect(page.getByText('[Proposed]')).toHaveCount(0)
  })

  test('a clock cell takes working hours and the fix line of that product reads it', async ({ page }) => {
    await open(page, MATRIX)
    const resolve = field(page, 'Marketing · Resolve (h)')
    await expect(resolve).toHaveValue('45', { timeout: 15_000 })
    await resolve.fill('27')
    await resolve.press('Enter')
    await expect(page.getByTestId('matrix-edited')).toHaveCount(1)
    await page.getByRole('link', { name: '2–4 · Signals and fixes' }).click()
    await page.getByRole('link', { name: 'Corrective actions' }).click()
    await expectPageReady(page)
    // CA-202 is the Real Estate marketing fix: waiting for its yes, not VIP-related, so the preview is the whole Resolve
    await expect(page.locator('li[data-fix="CA-202"]')).toContainText('if approved today: matrix Resolve 27 h, in working hours', { timeout: 15_000 })
  })

  test('the Internal Audit and Marketing Lead may edit', async ({ page }) => {
    await open(page, `${MATRIX}?product=ev`, 'auditmkt')
    const informed = field(page, 'Marketing · Informed')
    await expect(informed).toBeEnabled({ timeout: 15_000 })
    await informed.fill('Head of Marketing Operations')
    await informed.press('Enter')
    await expect(page.getByTestId('matrix-edited')).toHaveCount(1)
    await expect(informed).toHaveValue('Head of Marketing Operations')
  })

  test('a role that only reads (Executive) sees the cells as text, a view-only note and no inputs', async ({ page }) => {
    await open(page, MATRIX, 'exec')
    await expect(page.getByRole('note')).toContainText('View only', { timeout: 15_000 })
    await expect(page.getByRole('textbox')).toHaveCount(0)
    await expect(page.getByRole('spinbutton')).toHaveCount(0)
    await expect(rows(page)).toHaveCount(13)
    await expect(page.getByRole('table')).toContainText('Sales operations lead')
    await expect(page.getByText('[Proposed]')).toHaveCount(0)
  })

  test('Marketing cannot edit it, as today: the page is not in its set, so it is sent to its own home', async ({ page }) => {
    await signInAs(page, 'marketing', 'en')
    await page.goto(MATRIX)
    await expect(page).not.toHaveURL(/escalation-matrix/, { timeout: 15_000 })
    await expect(page.getByRole('textbox', { name: /First receiver/ })).toHaveCount(0)
  })
})

test.describe('a VIP-related fix', () => {
  test.use({ reducedMotion: 'reduce' })

  test('shows "VIP · clocks halved" and reads the VIP version of its matrix row; a fix that is not VIP-related shows neither', async ({ page }) => {
    await open(page, '/actions/corrective')
    const vip = page.locator('li[data-fix="CA-201"]')
    await expect(vip.getByTestId('fix-vip-tag')).toContainText('VIP · clocks halved', { timeout: 15_000 })
    // the first card is open: its matrix line is the Wallet legal row with the rule applied (1 h and 9 h halved, the head informed at once, the CX manager backup)
    const line = vip.getByTestId('matrix-line')
    await expect(line).toContainText('From the matrix (PSI Wallet)')
    await expect(line).toContainText('informed Head of the environment · Information Security lead · CX manager · Head of Investor Relations')
    await expect(line).toContainText('backup CX manager')
    await expect(line).toContainText('respond ½ h')
    await expect(line).toContainText('resolve 4.5 h')
    await expect(line.getByTestId('matrix-vip-note')).toContainText('VIP rule applied')
    await expect(line).toContainText('Set 19 Nov · titles adjustable until 28 Nov')
    // CA-202 (Real Estate marketing) is not VIP-related: no tag, the row as it is
    const other = page.locator('li[data-fix="CA-202"]')
    await expect(other).toBeVisible()
    await expect(other.getByTestId('fix-vip-tag')).toHaveCount(0)
    await other.getByRole('button', { name: /^Details/ }).click()
    await expect(other.getByTestId('matrix-line')).toContainText('respond 9 h')
    await expect(other.getByTestId('matrix-line')).toContainText('resolve 45 h')
    await expect(other.getByTestId('matrix-line')).not.toHaveAttribute('data-vip', 'true')
    await expect(page.getByText('[Proposed]')).toHaveCount(0)
  })

  test('the employee fix has no resolve clock and shows it, while its respond clock is halved', async ({ page }) => {
    await open(page, '/actions/corrective?fix=CA-203')
    const card = page.locator('li[data-fix="CA-203"]')
    await expect(card.getByTestId('fix-vip-tag')).toBeVisible({ timeout: 15_000 })
    const line = card.getByTestId('matrix-line')
    await expect(line).toContainText('receiver Account manager lead (direct manager)')
    await expect(line).toContainText('respond 2 h')
    await expect(line).toContainText('resolve –')
  })

  test('in Arabic the tag and the added title read in Arabic', async ({ page }) => {
    await open(page, '/actions/corrective', 'cxmgr', 'ar')
    const vip = page.locator('li[data-fix="CA-201"]')
    await expect(vip.getByTestId('fix-vip-tag')).toContainText('VIP · المهل مُنصَّفة', { timeout: 15_000 })
    await expect(vip.getByTestId('matrix-line')).toContainText('رئيس البيئة · مسؤول أمن المعلومات')
  })
})

test.describe('Arabic, right to left', () => {
  test.use({ reducedMotion: 'reduce' })

  test('the matrix reads in Arabic: the rules card, the legend, the Arabic titles, "½", the note, right to left', async ({ page }) => {
    await open(page, MATRIX, 'cxmgr', 'ar')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByText('ثلاث قواعد خلف الخلايا')).toBeVisible()
    await expect(page.getByTestId('matrix-rules').getByRole('listitem')).toHaveCount(3)
    await expect(page.getByTestId('matrix-legend')).toContainText('المهل بساعات العمل')
    await expect(page.getByTestId('matrix-set-note')).toContainText('حُدّدت في 19 نوفمبر')
    await expect(page.getByRole('columnheader', { name: 'المستلم الأول' })).toBeVisible()
    await expect(rows(page)).toHaveCount(13)
    await expect(field(page, 'عملية · المستلم الأول')).toHaveValue('قائد عمليات المبيعات')
    await expect(rows(page).last().getByTestId('matrix-vip-factor')).toHaveText(['½', '½'])
    await expect(page.getByTestId('matrix-days')).toHaveCount(4)
    await expect(page.getByText('[مقترح]')).toHaveCount(0)
    await expect(page.getByRole('table')).toHaveCSS('direction', 'rtl')
  })
})

test.describe('the phone (375px): the tables scroll inside their card, the page does not', () => {
  test.use({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' })

  for (const lang of ['en', 'ar'] as const) {
    test(`no page-level sideways scroll in ${lang}, for the rules card and for the products with the longest cells`, async ({ page }) => {
      await open(page, MATRIX, 'cxmgr', lang)
      await expect(rows(page)).toHaveCount(13, { timeout: 15_000 })
      for (const product of ['re', 'cl', 'wl']) {
        await page.goto(`${MATRIX}?product=${product}`)
        await expectPageReady(page)
        await expect(rows(page)).toHaveCount(13, { timeout: 15_000 })
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(overflow, `${product} ${lang}`).toBeLessThanOrEqual(0)
      }
      // the table itself is wider than the card and scrolls there, reachable from the keyboard
      const container = page.locator('[data-slot="table-container"]').first()
      expect(await container.evaluate((el) => el.scrollWidth > el.clientWidth + 1)).toBe(true)
      await expect(container).toHaveAttribute('tabindex', '0')
      await expect(page.getByTestId('matrix-rules')).toBeVisible()
    })
  }

  test('a VIP fix card does not make the page scroll sideways', async ({ page }) => {
    await open(page, '/actions/corrective')
    await expect(page.locator('li[data-fix="CA-201"]').getByTestId('fix-vip-tag')).toBeVisible({ timeout: 15_000 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
  })
})

test.describe('axe WCAG 2.1 AA', () => {
  test.use({ reducedMotion: 'reduce' })

  test('the matrix page: English light and Arabic dark', async ({ page }) => {
    await open(page, MATRIX)
    await expect(rows(page)).toHaveCount(13, { timeout: 15_000 })
    await waitForAnimations(page)
    expect(await blockingViolations(page), 'en light').toEqual([])
    const ar = await page.context().newPage()
    await open(ar, MATRIX, 'cxmgr', 'ar', 'dark')
    await expect(rows(ar)).toHaveCount(13, { timeout: 15_000 })
    await waitForAnimations(ar)
    expect(await blockingViolations(ar), 'ar dark').toEqual([])
  })

  test('the matrix page read-only, and a product with day cells and edited cells', async ({ page }) => {
    await open(page, MATRIX, 'cxteam')
    await expect(rows(page)).toHaveCount(13, { timeout: 15_000 })
    await waitForAnimations(page)
    expect(await blockingViolations(page), 'cxteam').toEqual([])
    const edit = await page.context().newPage()
    await open(edit, `${MATRIX}?product=af`)
    const informed = field(edit, 'Marketing · Informed')
    await expect(informed).toBeVisible({ timeout: 15_000 })
    await informed.fill('Head of Digital Marketing')
    await informed.press('Enter')
    await expect(edit.getByTestId('matrix-edited')).toHaveCount(1)
    await waitForAnimations(edit)
    expect(await blockingViolations(edit), 'edited').toEqual([])
  })

  test('the VIP fix card: English light and Arabic dark', async ({ page }) => {
    await open(page, '/actions/corrective?fix=CA-201')
    await expect(page.locator('li[data-fix="CA-201"]').getByTestId('fix-vip-tag')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('li[data-fix="CA-201"]').getByTestId('matrix-vip-note')).toBeVisible()
    await waitForAnimations(page)
    expect(await blockingViolations(page), 'en light').toEqual([])
    const ar = await page.context().newPage()
    await open(ar, '/actions/corrective?fix=CA-201', 'cxmgr', 'ar', 'dark')
    await expect(ar.locator('li[data-fix="CA-201"]').getByTestId('fix-vip-tag')).toBeVisible({ timeout: 15_000 })
    await waitForAnimations(ar)
    expect(await blockingViolations(ar), 'ar dark').toEqual([])
  })
})
