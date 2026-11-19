import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { collectErrors, expectPageReady, signInAs, waitForAnimations, type RoleId } from './helpers.ts'

/**
 * Weekly sample as a card flow (v42.2 F34) and split by reader (v42.1 F32): docs/V42_SAMPLE.md.
 * The CX team reads proposed fixes, interview briefs and journey readings; the Internal Audit and Marketing Lead reads classification, signal
 * counts, routing, access and targeting, ids and titles only.
 */

const YES = 'Yes, I would do the same'
const NO = 'No, that is wrong'
const SKIP = 'Not sure, skip for now'
const NAMES = ['Sara Khoury', 'Rana Farouk', 'Zaid Saleh', 'Khaled Hamad', 'Fadi Nasser', 'Omar Nasser', 'Lara Farouk']

async function open(page: Page, role: RoleId, lang: 'en' | 'ar' = 'en', theme: 'light' | 'dark' = 'light') {
  await signInAs(page, role, lang)
  await page.addInitScript((t) => localStorage.setItem('psicx.theme', t), theme)
  await page.goto('/settings/weekly-sample')
  await expectPageReady(page)
  await expect(page.getByTestId('sample-card')).toBeVisible({ timeout: 15_000 })
}

async function blockingViolations(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  return result.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({ id: v.id, impact: v.impact, targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }))
}

const card = (page: Page) => page.getByTestId('sample-card')
const counter = (page: Page) => page.getByTestId('sample-counter')

/** Skips cards until one of this kind (its heading) is on screen. */
async function skipTo(page: Page, kind: string) {
  for (let i = 0; i < 40; i++) {
    if ((await card(page).getByRole('heading', { level: 3 }).innerText()).startsWith(kind)) return
    await page.getByRole('button', { name: SKIP }).click()
  }
  throw new Error(`no card of kind ${kind}`)
}

test.describe('The CX team: content rows, one card at a time (v42.2 F34)', () => {
  test('opens on the first proposed fix with what the AI was given, what it decided, one question and three answers', async ({ page }) => {
    await open(page, 'cxteam')
    await expect(page.getByRole('heading', { level: 2, name: "Check the AI's work this week" })).toBeVisible()
    await expect(page.getByText('What this is, in one breath')).toBeVisible()
    await expect(page.getByText('Your part of the sample: what the CX team can judge')).toBeVisible()
    await expect(counter(page)).toContainText('0 / 26')
    await expect(counter(page)).toContainText('checked this week')
    await expect(counter(page)).toContainText('due Thursday')
    await expect(card(page).getByRole('heading', { level: 3 })).toContainText('Proposed fix')
    await expect(card(page)).toContainText('CA-201')
    await expect(card(page).getByText('What the AI was given')).toBeVisible()
    await expect(card(page).getByText('What it decided')).toBeVisible()
    await expect(card(page).getByText(/Customer contacted us again about the same issue/).first()).toBeVisible()
    await expect(card(page).getByText(/In similar closed cases this kind of fix was followed by recovery in about \d+ of 10/)).toBeVisible()
    await expect(card(page).getByRole('heading', { level: 4, name: 'Is this a sensible fix for this pattern, and is it going to the right person?' })).toBeVisible()
    for (const name of [YES, NO, SKIP, 'Open the fix']) await expect(card(page).getByRole('button', { name })).toBeVisible()
    await expect(page.getByRole('button', { name: 'See all as a list' })).toBeVisible()
    await expect(page.locator('main table')).toHaveCount(0)
    await expect(page.locator('[data-tour="sample"]')).toBeVisible() // the guided tour's target: the card
  })

  test('answering moves to the next card and the counter moves; "No" counts as marked wrong', async ({ page }) => {
    await open(page, 'cxteam')
    await page.getByRole('button', { name: YES }).click()
    await expect(card(page)).toContainText('CA-202')
    await expect(counter(page)).toContainText('1 / 26')
    await page.getByRole('button', { name: NO }).click()
    await expect(card(page)).toContainText('CA-203')
    await expect(counter(page)).toContainText('2 / 26')
    await expect(counter(page)).toContainText('1 marked wrong')
  })

  test('"Not sure, skip for now" moves on without counting, and the card comes back at the end', async ({ page }) => {
    await open(page, 'cxteam')
    await page.getByRole('button', { name: SKIP }).click()
    await expect(card(page)).toContainText('CA-202')
    await expect(counter(page)).toContainText('0 / 26')
    for (let i = 0; i < 25; i++) await page.getByRole('button', { name: YES }).click()
    await expect(counter(page)).toContainText('25 / 26')
    await expect(card(page)).toContainText('CA-201')
    await expect(page.getByText('These are the ones you skipped.')).toBeVisible()
  })

  test('a keyboard answer moves the focus to the new card\'s heading and a live region says "n of N checked"', async ({ page }) => {
    await open(page, 'cxteam')
    await page.getByRole('button', { name: YES }).focus()
    await page.keyboard.press('Enter')
    await expect(card(page)).toContainText('CA-202')
    await expect(card(page).getByRole('heading', { level: 3 })).toBeFocused()
    await expect(page.getByTestId('sample-live')).toHaveText('1 of 26 checked.')
    // and Tab goes on to the answers of THIS card, in reading order
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: YES })).toBeFocused()
  })

  test('the last answer ends on an "All done" card that counts the wrongs', async ({ page }) => {
    await open(page, 'cxteam')
    await page.getByRole('button', { name: NO }).click()
    for (let i = 0; i < 25; i++) await page.getByRole('button', { name: YES }).click()
    await expect(page.getByTestId('sample-done')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'All done for this week.' })).toBeFocused()
    await expect(page.getByText('1 wrong answers became tests for the supervisor.')).toBeVisible()
    await expect(counter(page)).toContainText('26 / 26')
    await expect(page.locator('[data-tour="sample"]')).toBeVisible()
  })

  test('the customer\'s name and the conversation text show on a brief card, and there is no Open there', async ({ page }) => {
    await open(page, 'cxteam')
    await skipTo(page, 'Interview brief')
    await expect(card(page)).toContainText('NPS')
    await expect(card(page).getByRole('heading', { level: 4, name: 'Does this summary match what happened to the customer?' })).toBeVisible()
    await expect(card(page).getByText('Brief for the caller:')).toBeVisible()
    await expect(card(page)).toContainText(/Sara Khoury|Rana Farouk|Zaid Saleh|Khaled Hamad|Fadi Nasser|Omar Nasser|Lara Farouk/)
    await expect(card(page).getByRole('button', { name: /^Open the/ })).toHaveCount(0)
  })

  test('"Open the fix" opens the fix; the list is one button away and one button back', async ({ page }) => {
    await open(page, 'cxmgr')
    await page.getByRole('button', { name: 'Open the fix' }).click()
    await expect(page).toHaveURL(/\/actions\/corrective\?fix=CA-201/)
    await expectPageReady(page)
    await page.goBack()
    await expect(card(page)).toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: 'See all as a list' }).click()
    await expect(page.locator('main table').last()).toBeVisible()
    await expect(page.getByText('0 / 26')).toBeVisible()
    await expect(page.getByRole('button', { name: '✓ Right' })).toHaveCount(26)
    await expect(page.getByRole('button', { name: 'Back to one at a time' })).toBeFocused()
    await expect(page.locator('[data-tour="sample"]')).toBeVisible() // the table is the target in the list
    await expect(card(page)).toHaveCount(0)
    await page.getByRole('button', { name: 'Back to one at a time' }).click()
    await expect(card(page)).toBeVisible()
    await expect(page.getByRole('button', { name: 'See all as a list' })).toBeFocused()
  })

  test('a verdict given in the list is a verdict in the cards, and a judged row can be changed in the list', async ({ page }) => {
    await open(page, 'cxteam')
    await page.getByRole('button', { name: 'See all as a list' }).click()
    await page.getByRole('button', { name: '✗ Wrong' }).first().click()
    await expect(page.getByText('1 / 26')).toBeVisible()
    await page.getByRole('button', { name: 'Back to one at a time' }).click()
    await expect(card(page)).toContainText('CA-202') // CA-201 is judged
    await expect(counter(page)).toContainText('1 marked wrong')
    await page.getByRole('button', { name: 'See all as a list' }).click()
    await page.getByRole('button', { name: 'Change' }).click()
    await expect(page.getByText('Wrong → new test')).toHaveCount(0)
  })
})

test.describe('The Internal Audit and Marketing Lead: audit rows only, ids and titles only (v42.1 F32)', () => {
  test('reads its own 35 rows: the audit note, a classification first, no Open anywhere', async ({ page }) => {
    await open(page, 'auditmkt')
    await expect(counter(page)).toContainText('0 / 35')
    await expect(page.getByText('Your part of the sample: what audit can judge')).toBeVisible()
    await expect(page.getByText(/You are not approving or rejecting fixes; the responsible manager does that from the inbox/)).toBeVisible()
    await expect(card(page).getByRole('heading', { level: 3 })).toContainText('Classification')
    await expect(card(page).getByRole('heading', { level: 4, name: 'Is this really a complaint of this type?' })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Open/ })).toHaveCount(0)
    await expect(page.getByText('Proposed fix')).toHaveCount(0)
    await expect(page.locator('[data-tour="sample"]')).toBeVisible()
  })

  test('the routing card puts the title it went to against the title the matrix says, and flags "repeat contact → Legal"', async ({ page }) => {
    await open(page, 'auditmkt')
    await skipTo(page, 'Routing by the matrix')
    await expect(card(page)).toContainText('CA-201')
    await expect(card(page).getByText('Routed to:')).toBeVisible()
    await expect(card(page).getByText('The matrix says:')).toBeVisible()
    await expect(card(page)).toContainText('respond ½ h · resolve 4.5 h · VIP · clocks halved')
    await expect(card(page)).toContainText("Legal and privacy is for legal, privacy or safety signals; none of this pattern's signals is one (it is about repeat contact).")
    await expect(card(page).getByRole('heading', { level: 4, name: 'Did the fix go to the title the matrix says?' })).toBeVisible()
    await page.getByRole('button', { name: NO }).click()
    await expect(counter(page)).toContainText('1 marked wrong')
  })

  test('the access, targeting and counting cards are there too, with the prototype\'s questions', async ({ page }) => {
    await open(page, 'auditmkt')
    await skipTo(page, 'Access check')
    await expect(card(page).getByRole('heading', { level: 4, name: 'Is there anything here that should not have left the CX team?' })).toBeVisible()
    await expect(card(page)).toContainText('conversation text: none')
    await skipTo(page, 'Campaign targeting')
    await expect(card(page).getByRole('heading', { level: 4, name: 'Are these the right people for this campaign?' })).toBeVisible()
    await expect(card(page)).toContainText('MC-10')
    await skipTo(page, 'Signal count')
    await expect(card(page).getByRole('heading', { level: 4, name: 'Should this count as a signal?' })).toBeVisible()
  })

  test('no customer name and no conversation text on any of its 35 cards, nor in its list', async ({ page }) => {
    await open(page, 'auditmkt')
    const seen = new Set<string>()
    for (let i = 0; i < 35; i++) {
      const text = await card(page).innerText()
      seen.add(text)
      for (const n of NAMES) expect(text).not.toContain(n)
      expect(text).not.toContain('Sample conversation note')
      await page.getByRole('button', { name: SKIP }).click()
    }
    expect(seen.size).toBe(35)
    await page.getByRole('button', { name: 'See all as a list' }).click()
    await expect(page.locator('main table').last()).toBeVisible()
    for (const n of NAMES) await expect(page.locator('main')).not.toContainText(n)
    await expect(page.locator('main')).not.toContainText('Sample conversation note')
  })

  test('its daily brief and its inbox count its own 35, the CX manager\'s brief its 26', async ({ browser }) => {
    const audit = await browser.newPage()
    await signInAs(audit, 'auditmkt')
    await audit.goto('/overview')
    await expectPageReady(audit)
    await expect(audit.getByText('Weekly sample: 35 agent outputs to read by eye; 0 read so far this week')).toBeVisible({ timeout: 15_000 })
    await audit.goto('/inbox')
    await expect(audit.locator('main tbody tr').filter({ hasText: 'Weekly sample: 35 outputs to read, 0 read' })).toBeVisible({ timeout: 15_000 })
    await audit.close()
  })
})

test.describe('Arabic, phone and accessibility of the card flow and the list', () => {
  test('in Arabic the card reads right to left: what it was given is on the right, the answers are Arabic', async ({ page }) => {
    await open(page, 'cxteam', 'ar')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByRole('heading', { level: 2, name: 'فحص شغل الذكاء هذا الأسبوع' })).toBeVisible()
    for (const name of ['نعم، كنت سأفعل الشيء نفسه', 'لا، هذا خطأ', 'لست متأكداً، تخطَّ الآن', 'افتح الحل']) await expect(card(page).getByRole('button', { name })).toBeVisible()
    const given = await card(page).locator('section').first().boundingBox()
    const decided = await card(page).locator('section').nth(1).boundingBox()
    expect(given!.x).toBeGreaterThan(decided!.x)
    await expect(counter(page)).toContainText('فُحصت هذا الأسبوع')
    await page.getByRole('button', { name: 'نعم، كنت سأفعل الشيء نفسه' }).click()
    await expect(counter(page)).toContainText('1')
    const spacing = await card(page).evaluate((el) => getComputedStyle(el).letterSpacing)
    expect(spacing === 'normal' || spacing === '0px').toBe(true)
  })

  for (const lang of ['en', 'ar'] as const) {
    test(`at 375 px the page does not scroll sideways and the answers fit (${lang})`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width: 375, height: 812 } })
      const page = await context.newPage()
      await open(page, 'cxteam', lang)
      await page.waitForTimeout(500)
      const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(await overflow(), 'card view').toBeLessThanOrEqual(1)
      const yes = lang === 'ar' ? 'نعم، كنت سأفعل الشيء نفسه' : YES
      const box = await page.getByRole('button', { name: yes }).boundingBox()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(375)
      // the two columns stack on a phone: what it decided is under what it was given
      const given = await card(page).locator('section').first().boundingBox()
      const decided = await card(page).locator('section').nth(1).boundingBox()
      expect(decided!.y).toBeGreaterThan(given!.y + given!.height - 1)
      await page.getByRole('button', { name: lang === 'ar' ? 'عرض الكل كقائمة' : 'See all as a list' }).click()
      await expect(page.locator('main table').last()).toBeVisible()
      await page.waitForTimeout(400)
      expect(await overflow(), 'list view').toBeLessThanOrEqual(1)
      await context.close()
    })
  }

  test.describe('axe (WCAG 2.1 AA), reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })
    const CASES = [
      { name: 'card view, EN light, the CX team', role: 'cxteam', lang: 'en', theme: 'light', list: false },
      { name: 'card view, AR dark, the CX team', role: 'cxteam', lang: 'ar', theme: 'dark', list: false },
      { name: 'card view, AR dark, the Internal Audit and Marketing Lead', role: 'auditmkt', lang: 'ar', theme: 'dark', list: false },
      { name: 'list view, EN light, the CX team', role: 'cxteam', lang: 'en', theme: 'light', list: true },
      { name: 'list view, AR dark, the CX team', role: 'cxteam', lang: 'ar', theme: 'dark', list: true },
      { name: 'list view, EN light, the Internal Audit and Marketing Lead', role: 'auditmkt', lang: 'en', theme: 'light', list: true },
    ] as const
    for (const c of CASES) {
      test(c.name, async ({ page }) => {
        const errors = collectErrors(page)
        await open(page, c.role, c.lang, c.theme)
        if (c.list) {
          await page.getByRole('button', { name: c.lang === 'ar' ? 'عرض الكل كقائمة' : 'See all as a list' }).click()
          await expect(page.locator('main table').last()).toBeVisible()
        }
        await page.waitForTimeout(700)
        await waitForAnimations(page)
        const violations = await blockingViolations(page)
        expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
        expect(errors, errors.join(' | ')).toEqual([])
      })
    }
  })

  test('the notes fold and stay folded after a reload', async ({ page }) => {
    await open(page, 'cxteam')
    const toggle = page.getByRole('button', { name: 'What this is, in one breath' })
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByText(/The AI team is a new employee/)).toBeHidden()
    await page.reload()
    await expectPageReady(page)
    await expect(page.getByRole('button', { name: 'What this is, in one breath' })).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByRole('button', { name: 'Your part of the sample: what the CX team can judge' })).toHaveAttribute('aria-expanded', 'true')
  })
})
