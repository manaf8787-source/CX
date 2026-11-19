import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { collectErrors, expectPageReady, signInAs, waitForAnimations, type RoleId } from './helpers.ts'

/** v42.3 and v42.4 F35: PSI Wallet survey moments, on its product page and under Survey questions (docs/V42_WALLET.md). */

const WALLET = '/products/wl'
const QUESTIONS = '/settings/survey-questions'

const SET_NAMES = ['CES after the wallet is created', 'CSAT after the call with the advisor', 'CES after a property is added', 'NPS on the Dashboard, 30 days after']
const SET_NAMES_AR = ['CES بعد إنشاء المحفظة', 'CSAT بعد المكالمة مع المستشار', 'CES بعد إضافة عقار', 'NPS على لوحة المعلومات بعد 30 يوماً']

async function open(page: Page, role: RoleId, path: string, lang: 'en' | 'ar' = 'en', theme?: 'light' | 'dark') {
  if (theme) await page.addInitScript((t) => localStorage.setItem('psicx.theme', t), theme)
  await signInAs(page, role, lang)
  await page.goto(path)
  await expectPageReady(page)
}

/** The card with this title. */
const card = (page: Page, title: string) => page.locator('[data-slot="card"]').filter({ has: page.locator('[data-slot="card-title"]', { hasText: title }) })
const menu = (page: Page) => page.getByRole('navigation', { name: 'Main navigation' })
const sets = (page: Page, lang: 'en' | 'ar' = 'en') => page.getByRole('list', { name: lang === 'ar' ? 'مجموعات الأسئلة' : 'Question sets' })
const preview = (page: Page, lang: 'en' | 'ar' = 'en') => page.getByRole('figure', { name: lang === 'ar' ? 'معاينة الاستبيان على هاتف' : 'Preview of the survey on a phone' })
const sideways = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

async function openWalletSets(page: Page, lang: 'en' | 'ar' = 'en', theme?: 'light' | 'dark') {
  await open(page, 'cxmgr', QUESTIONS, lang, theme)
  await expect(sets(page, lang)).toBeVisible({ timeout: 15_000 })
  await page.getByRole('tab', { name: lang === 'ar' ? 'محفظة بي إس آي' : 'PSI Wallet' }).click()
  await expect(sets(page, lang).getByRole('listitem')).toHaveCount(4)
}

async function blocking(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  return result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => ({ id: v.id, impact: v.impact, targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }))
}

test.describe('PSI Wallet: hidden until launch, then its page (F35)', () => {
  test('not launched: in no menu; switched live in Settings, Home opens its page, which shows both blocks', async ({ page }) => {
    const errors = collectErrors(page)
    await open(page, 'cxmgr', '/settings/admin')
    await expect(menu(page).getByRole('link', { name: 'PSI Real Estate' })).toBeVisible()
    await expect(menu(page).getByRole('link', { name: 'PSI Wallet' })).toHaveCount(0)

    // Settings, Product launch: the switch of the Wallet
    const launch = page.getByRole('switch', { name: 'PSI Wallet: show in the portal' })
    await expect(launch).toHaveAttribute('aria-checked', 'false', { timeout: 15_000 })
    await launch.click()
    await expect(launch).toHaveAttribute('aria-checked', 'true')

    // The sample lives in memory, so the page is reached inside the app (a reload would hide the product again): Home now has the
    // Wallet's indicator card, and its link opens the product page. (The sidebar's own list is a known gap, see docs/V42_WALLET.md.)
    await menu(page).getByRole('link', { name: 'Home', exact: true }).click()
    await expect(page).toHaveURL(/\/home$/)
    await page.locator('[data-product="wl"]').getByRole('link', { name: /Open PSI Wallet/ }).click()
    await expect(page).toHaveURL(/\/products\/wl$/)
    await expectPageReady(page)
    await expect(page.getByRole('heading', { level: 1, name: 'PSI Wallet' })).toBeVisible()
    await expect(page.getByText('Live', { exact: true })).toBeVisible()

    const asks = card(page, 'When this product asks')
    await expect(asks).toContainText('Wallet created (screens 12 to 13), a call with the advisor (48), a property added (51)')
    await expect(asks.getByRole('term')).toHaveText(['NPS', 'CSAT', 'CES', '"What stopped you?"'])
    await expect(asks.getByRole('definition')).toHaveText([
      'On the Dashboard (13) about 30 days after the wallet was created, then yearly; never at a touchpoint',
      'After the call with the advisor (48): "How satisfied were you with your call with your advisor?" 1 to 5',
      'After the wallet is created (13): "The wallet was easy to set up" 1 to 7. After a property is added (51): "Adding my property was easy" 1 to 7, tagged single or bulk',
      'One rating and one optional comment per touchpoint, never two questions. CES 4 or less, CSAT 3 or less: a short "What went wrong?" opens; a low call score also notifies the advisor team. High scores: "Thanks" only.',
    ])

    const signals = card(page, 'Signals, no survey')
    await expect(signals).toContainText('From the approved design (85 screens). Each becomes a signal in the portal; nothing is asked of the investor.')
    await expect(signals.getByRole('columnheader')).toHaveText(['Moment (screen)', 'Signal'])
    await expect(signals.locator('tbody tr')).toHaveCount(7)
    await expect(signals.locator('tbody tr').first()).toContainText('Wallet started, not opened after 7 days (05 to 11)')
    await expect(signals.locator('tbody tr').first()).toContainText('One "What stopped you?" once, then abandoned onboarding with the step reached')
    await expect(signals.locator('tbody tr').last()).toContainText('Hand-off to the Real Estate journey with the PSI Wallet source badge; the signed deal takes the Real Estate NPS')
    // it is the last block of the page, after "When this product asks"
    expect((await signals.boundingBox())!.y).toBeGreaterThan((await asks.boundingBox())!.y)
    expect(errors, errors.join(' | ')).toEqual([])
  })

  test('not launched: the CX team still opens the page for planning, with both blocks', async ({ page }) => {
    await open(page, 'cxteam', WALLET)
    await expect(page.getByText('Not launched — shown to CX for planning')).toBeVisible()
    await expect(card(page, 'When this product asks')).toBeVisible()
    await expect(card(page, 'Signals, no survey').locator('tbody tr')).toHaveCount(7)
    await expect(menu(page).getByRole('link', { name: 'PSI Wallet' })).toHaveCount(0)
  })

  for (const role of ['envmgmt', 'aslead', 'exec', 'marketing'] as const) {
    test(`not launched: ${role} has no Wallet in the menu and cannot open its page`, async ({ page }) => {
      await signInAs(page, role)
      await page.goto(WALLET)
      await expect(page).toHaveURL(/\/home$/)
      await expectPageReady(page)
      await expect(menu(page).getByRole('link', { name: 'PSI Wallet' })).toHaveCount(0)
      await expect(page.getByText('Signals, no survey')).toHaveCount(0)
    })
  }

  for (const [path, name] of [
    ['/products/re', 'PSI Real Estate'],
    ['/products/af', 'After-Sales'],
    ['/products/cl', 'PSI Club'],
  ] as const) {
    test(`the signals card is on the Wallet page only: not on ${name}`, async ({ page }) => {
      await open(page, 'cxmgr', path)
      await expect(card(page, 'When this product asks')).toBeVisible()
      await expect(page.getByText('Signals, no survey')).toHaveCount(0)
      await expect(page.getByText('Moment (screen)')).toHaveCount(0)
    })
  }

  test('Surveys and triggers: the Wallet line says one question per touchpoint, and no longer "No NPS"', async ({ page }) => {
    await open(page, 'cxmgr', '/settings/surveys')
    const line = page.locator('.well').filter({ hasText: 'One question per touchpoint: CES after the wallet is created' })
    await expect(line).toContainText('NPS only on the Dashboard about 30 days after, then yearly.')
    await expect(line).toContainText('Hidden until launch')
    await expect(line).not.toContainText('No NPS for this product')
    // PSI Events is still the one product without an NPS
    await expect(page.getByText('No NPS for this product')).toHaveCount(1)
  })
})

test.describe('Survey questions: the four Wallet sets (F35)', () => {
  test('one set per touchpoint, none [Proposed], with the customer-view preview in both languages', async ({ page }) => {
    const errors = collectErrors(page)
    await openWalletSets(page)
    await expect(sets(page).getByRole('listitem')).toHaveText(SET_NAMES.map((n) => new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)))
    await expect(sets(page).getByText('[Proposed]')).toHaveCount(0)
    await expect(page.getByText('No question set for this product yet.')).toHaveCount(0)
    await expect(page.getByText('4 sets, one per moment')).toBeVisible()

    // the first set: when it fires, and the rating, the optional comment and the follow-up a low score opens
    await expect(sets(page).getByRole('button').first()).toHaveAttribute('aria-pressed', 'true')
    await expect(sets(page).getByRole('listitem').first()).toContainText('Screen 12 to 13, once. Onboarding is a seven-step task: effort matters, satisfaction tells less · 3 questions')
    await expect(preview(page).getByRole('listitem')).toHaveText([
      /The wallet was easy to set up\. \(1 strongly disagree to 7 strongly agree\)/,
      /Optional: anything you would like to add\?/,
      /If 4 or less: What went wrong\? \(short text\)/,
    ])

    // the advisor call: fired by the advisor's "call done" in the CRM; a low score notifies the advisor team
    await sets(page).getByRole('button', { name: /CSAT after the call with the advisor/ }).click()
    await expect(sets(page).getByRole('listitem').nth(1)).toContainText("Fires when the advisor marks the call done in the CRM (not on the app's Request a call button), within 2 hours.")
    await expect(preview(page)).toContainText('How satisfied were you with your call with your advisor? (1 to 5)')
    await expect(preview(page)).toContainText('If 3 or less: What went wrong? (short text), and the advisor team is notified')
    await page.getByRole('button', { name: 'العربية', exact: true }).click()
    await expect(preview(page)).toHaveAttribute('dir', 'rtl')
    await expect(preview(page)).toContainText('ما مدى رضاك عن مكالمتك مع مستشارك؟ (1 إلى 5)')
    const both = card(page, 'Both languages')
    await expect(both.locator('tbody tr')).toHaveCount(3)
    await expect(both).toContainText('إذا كانت 3 أو أقل: ما الذي حدث؟ (نص قصير)، ويُبلَّغ فريق المستشارين')

    // adding a property (tagged single or bulk, with the number of properties) and the NPS on the Dashboard
    await expect(sets(page).getByRole('listitem').nth(2)).toContainText('the answer is tagged single or bulk and carries the number of properties')
    await sets(page).getByRole('button', { name: /NPS on the Dashboard, 30 days after/ }).click()
    await expect(sets(page).getByRole('listitem').nth(3)).toContainText('only if it holds at least one property, then yearly. Never at a touchpoint; shares the 90-day cap with the Real Estate NPS · 2 questions')
    await expect(preview(page).getByRole('listitem')).toHaveCount(2)
    expect(errors, errors.join(' | ')).toEqual([])
  })

  test('the keyboard reaches the Wallet tab and chooses a set', async ({ page }) => {
    await open(page, 'cxmgr', QUESTIONS)
    const tabs = page.getByRole('tab')
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true', { timeout: 15_000 })
    await tabs.first().focus()
    await page.keyboard.press('End')
    const walletTab = page.getByRole('tab', { name: 'PSI Wallet' })
    await expect(walletTab).toBeFocused()
    await expect(walletTab).toHaveAttribute('aria-selected', 'true')
    await expect(sets(page).getByRole('listitem')).toHaveCount(4)
    // into the list: the first set, then the second, chosen with Enter
    await sets(page).getByRole('button').first().focus()
    await page.keyboard.press('Tab')
    const second = sets(page).getByRole('button').nth(1)
    await expect(second).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(second).toHaveAttribute('aria-pressed', 'true')
    await expect(preview(page)).toContainText('How satisfied were you with your call with your advisor? (1 to 5)')
  })
})

test.describe('PSI Wallet: Arabic, RTL and the phone (F35)', () => {
  test('the Wallet page in Arabic is right to left, with the prototype strings', async ({ page }) => {
    await open(page, 'cxmgr', WALLET, 'ar')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    const asks = card(page, 'متى يسأل هذا المنتج')
    await expect(asks).toContainText('إنشاء المحفظة (الشاشتان 12 إلى 13)، مكالمة مع المستشار (48)، إضافة عقار (51)')
    await expect(asks).toContainText('تقييم واحد وتعليق اختياري واحد لكل نقطة تماس، لا سؤالان أبداً.')
    const signals = card(page, 'إشارات بلا استبيان')
    await expect(signals).toContainText('من التصميم المعتمد (85 شاشة). كل واحدة تصبح إشارة في البورتال؛ لا يُسأل المستثمر شيئاً.')
    await expect(signals.getByRole('columnheader')).toHaveText(['اللحظة (الشاشة)', 'الإشارة'])
    await expect(signals.locator('tbody tr')).toHaveCount(7)
    await expect(signals.locator('tbody tr').nth(4)).toContainText('إشارة منتج لمالك منتج المحفظة، ويُبلَّغ أمن المعلومات')
    // the first column is at the reading start: on the right
    const moment = (await signals.getByRole('columnheader').first().boundingBox())!
    const signal = (await signals.getByRole('columnheader').last().boundingBox())!
    expect(moment.x).toBeGreaterThan(signal.x)
    // Arabic never carries tracking
    expect(await page.locator('main').evaluate((el) => getComputedStyle(el).letterSpacing)).toMatch(/^(normal|0px)$/)
  })

  test('the Wallet sets in Arabic', async ({ page }) => {
    await openWalletSets(page, 'ar')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    for (const [i, name] of SET_NAMES_AR.entries()) await expect(sets(page, 'ar').getByRole('listitem').nth(i)).toContainText(name)
    await expect(sets(page, 'ar').getByText('[مقترح]')).toHaveCount(0)
    await expect(preview(page, 'ar')).toHaveAttribute('dir', 'rtl')
    await expect(preview(page, 'ar')).toContainText('كان إعداد المحفظة سهلاً. (1 لا أوافق بشدة إلى 7 أوافق بشدة)')
  })

  for (const lang of ['en', 'ar'] as const) {
    for (const width of [320, 375, 390]) {
      test(`${width}px (${lang}): the Wallet page has no sideways scroll, and the signals table fits its card`, async ({ page }) => {
        await page.setViewportSize({ width, height: 812 })
        await open(page, 'cxmgr', WALLET, lang)
        const signals = card(page, lang === 'ar' ? 'إشارات بلا استبيان' : 'Signals, no survey')
        await expect(signals.locator('tbody tr')).toHaveCount(7)
        await signals.scrollIntoViewIfNeeded()
        expect(await sideways(page), 'page-level sideways scroll').toBeLessThanOrEqual(1)
        // the two columns wrap: the table does not scroll inside its card either, and nothing runs past the screen edge
        const table = signals.locator('[data-slot="table-container"]')
        expect(await table.evaluate((el) => el.scrollWidth - el.clientWidth), 'table wider than its card').toBeLessThanOrEqual(1)
        const past = await signals.locator('*').evaluateAll((els, w) => els.filter((e) => e.getBoundingClientRect().right > (w as number) + 1 || e.getBoundingClientRect().left < -1).length, width)
        expect(past, 'elements past the viewport edge').toBe(0)
        // "When this product asks" stacks its four boxes
        const boxes = card(page, lang === 'ar' ? 'متى يسأل هذا المنتج' : 'When this product asks').getByRole('term')
        expect((await boxes.nth(1).boundingBox())!.y).toBeGreaterThan((await boxes.nth(0).boundingBox())!.y)
      })
    }

    test(`375px (${lang}): the Wallet sets under Survey questions have no page-level sideways scroll`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await openWalletSets(page, lang)
      expect(await sideways(page)).toBeLessThanOrEqual(1)
      // the longest "when" line (the NPS) wraps inside its row
      const last = sets(page, lang).getByRole('listitem').last()
      await last.scrollIntoViewIfNeeded()
      const box = (await last.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(376)
      expect(await sideways(page)).toBeLessThanOrEqual(1)
    })
  }
})

test.describe('PSI Wallet: accessibility (axe WCAG 2.1 AA)', () => {
  test.use({ reducedMotion: 'reduce' })

  for (const [lang, theme] of [
    ['en', 'light'],
    ['ar', 'dark'],
  ] as const) {
    test(`the Wallet page, ${lang} ${theme}: no serious or critical violations`, async ({ page }) => {
      await open(page, 'cxmgr', WALLET, lang, theme)
      await expect(card(page, lang === 'ar' ? 'إشارات بلا استبيان' : 'Signals, no survey').locator('tbody tr')).toHaveCount(7)
      await waitForAnimations(page)
      const violations = await blocking(page)
      expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
    })

    test(`the Wallet sets, ${lang} ${theme}: no serious or critical violations, first set and the call set`, async ({ page }) => {
      await openWalletSets(page, lang, theme)
      await waitForAnimations(page)
      const first = await blocking(page)
      expect(first, `first set: ${JSON.stringify(first, null, 2)}`).toEqual([])
      await sets(page, lang).getByRole('button').nth(1).click()
      await waitForAnimations(page)
      const call = await blocking(page)
      expect(call, `call set: ${JSON.stringify(call, null, 2)}`).toEqual([])
    })
  }

  test('the Wallet page on a phone, Arabic dark', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await open(page, 'cxmgr', WALLET, 'ar', 'dark')
    await expect(card(page, 'إشارات بلا استبيان').locator('tbody tr')).toHaveCount(7)
    await waitForAnimations(page)
    const violations = await blocking(page)
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
  })
})
