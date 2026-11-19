import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { collectErrors, expectPageReady, signInAs, waitForAnimations, type RoleId } from './helpers.ts'

/**
 * v40.1: the 60-day check closed from the fix card (docs/V401_VERDICT.md). A person in CX records the verdict (effective, partial, failed);
 * after a partial or failed one, decision 3: a second step (a new linked fix), an investigation first, or accept as is. The sample's
 * seeded fixes: CA-201 partial, CA-202 proposed, CA-203 in progress, CA-204 in its 60-day check. Client-side navigation keeps the
 * in-memory sample data inside one test; a full page load resets it.
 */

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
async function blockingViolations(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  return result.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({ id: v.id, impact: v.impact, help: v.help, targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }))
}

async function open(page: Page, route: string, { role = 'cxmgr', lang = 'en', theme }: { role?: RoleId; lang?: 'en' | 'ar'; theme?: 'light' | 'dark' } = {}) {
  await signInAs(page, role, lang)
  if (theme) await page.addInitScript((t) => localStorage.setItem('psicx.theme', t), theme)
  await page.goto(route)
  await expectPageReady(page)
}

const fixCard = (page: Page, ca: string) => page.locator(`li[data-fix="${ca}"]`)
/** The display id of the one fix card that has this button (the sample's statuses are seeded; find the fix by what it offers, not by number). */
async function fixOffering(page: Page, button: string | RegExp): Promise<string> {
  const card = page.locator('li[data-fix]').filter({ has: page.getByRole('button', { name: button }) }).first()
  await expect(card).toBeVisible({ timeout: 15_000 })
  return (await card.getAttribute('data-fix'))!
}
async function openFix(card: Locator) {
  const toggle = card.getByRole('button', { name: /^(Details|التفاصيل)/ })
  await expect(toggle).toBeVisible({ timeout: 15_000 })
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
}
const noPageScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

const PARTIAL = 'Dropped under half: partial'
const FAILED = 'No drop: back to root cause'
const EFFECTIVE = 'Signals dropped: effective'

test.describe('the 60-day check: the CX manager records the verdict', () => {
  test('in progress, done, then partial: the bar appears; a second step is a new proposed fix linked both ways and selected', async ({ page }) => {
    const errors = collectErrors(page)
    await open(page, '/actions/corrective')
    const ca = await fixOffering(page, 'Done, start the 60-day check')
    const card = fixCard(page, ca)
    await openFix(card)
    await card.getByRole('button', { name: 'Done, start the 60-day check' }).click()
    // the 60-day check has started: the three verdict buttons, the readout stays as the evidence
    const verdict = card.getByRole('group', { name: 'Record the verdict' })
    await expect(verdict).toBeVisible()
    await expect(verdict.getByRole('button')).toHaveText([EFFECTIVE, PARTIAL, FAILED])
    await expect(card).toContainText('60-day check')
    await expect(card.getByTestId('fix-second-step-bar')).toHaveCount(0)

    await verdict.getByRole('button', { name: PARTIAL }).click()
    await expect(page.getByText('Verdict recorded: partial. Decide the second step.')).toBeVisible()
    const bar = card.getByTestId('fix-second-step-bar')
    await expect(bar).toBeVisible()
    await expect(bar).toContainText('Partial: the signals dropped by less than half.')
    await expect(bar).toContainText('Decision 3: ask the owner for a second step, or investigate first if the cause is unclear.')
    await expect(bar.getByRole('button')).toHaveText(['Ask for a second step', 'Investigate first (5 interviews)', 'Accept as is'])
    await expect(card).toContainText('Partial: second step needed')
    await expect(card).toContainText('The owner proposes a second step; the CX manager approves it as a new fix on the same pattern')
    await expect(card).toContainText('within 5 working days')
    await expect(verdict).toHaveCount(0)
    const audit = card.getByTestId('audit-trail')
    await expect(audit.getByRole('row').nth(1)).toContainText('Verdict: partial')

    // ask for a second step: a NEW fix, proposed, linked to this one and selected
    const fixesBefore = await page.locator('li[data-fix]').count()
    await bar.getByRole('button', { name: 'Ask for a second step' }).click()
    await expect(page).toHaveURL(/\/actions\/corrective\?fix=CA-2\d\d$/)
    const childId = new URL(page.url()).searchParams.get('fix')!
    expect(childId).not.toBe(ca)
    await expect(page.getByText(`${childId} proposed on the same pattern; the owner has 5 working days.`)).toBeVisible()
    const child = fixCard(page, childId)
    await expect(child).toHaveAttribute('data-selected', 'true', { timeout: 15_000 })
    await expect(page.locator('li[data-fix]')).toHaveCount(fixesBefore + 1)
    await expect(child.getByRole('heading', { level: 2 })).toContainText(`Second step on ${ca}: `)
    await expect(child.getByTestId('fix-parent')).toHaveText(`Second step after ${ca} (Partial: second step needed)`)
    await expect(child).toContainText('Proposed by CX manager, after a partial result')
    await expect(child).toContainText('The responsible manager approves, changes, rejects, or asks for an investigation')
    await expect(child).toContainText('within 5 working days')
    await expect(child.getByRole('button', { name: 'Decide' })).toBeVisible()
    // the original shows the child as a trace id and cannot be asked again while it is open
    await expect(card.getByTestId('fix-children')).toHaveText(`Second step: ${childId}`)
    await expect(card.getByRole('button', { name: 'Ask for a second step' })).toHaveAttribute('aria-disabled', 'true')
    // audit lines on both
    await openFix(child)
    await expect(child.getByTestId('audit-trail').getByRole('row').nth(1)).toContainText(`Second step requested after ${ca}`)
    await expect(audit.getByRole('row').nth(1)).toContainText(`Second step requested: ${childId}`)
    // the link walks to the original
    await child.getByTestId('fix-parent').getByRole('button', { name: `Open ${ca}` }).click()
    await expect(page).toHaveURL(new RegExp(`fix=${ca}$`))
    await expect(fixCard(page, ca)).toHaveAttribute('data-selected', 'true')
    expect(errors).toEqual([])
  })

  test('a failed verdict, then "Investigate first" opens the Investigations page with the new investigation; "Accept as is" ends effective', async ({ page }) => {
    const errors = collectErrors(page)
    await open(page, '/actions/corrective')
    const ca = await fixOffering(page, FAILED)
    const card = fixCard(page, ca)
    await openFix(card)
    await card.getByRole('button', { name: FAILED }).click()
    await expect(page.getByText('Verdict recorded: failed. The signal reopens for a person.')).toBeVisible()
    const bar = card.getByTestId('fix-second-step-bar')
    await expect(bar).toContainText('Failed: the signals did not drop, or came back.')
    await expect(card.getByText('Failed', { exact: true }).first()).toBeVisible()
    await expect(card).toContainText('The signal reopens and a new fix is proposed')

    await bar.getByRole('button', { name: 'Investigate first (5 interviews)' }).click()
    await expect(page).toHaveURL(/\/actions\/investigations\?inv=INV-\d+$/)
    await expectPageReady(page)
    const invId = new URL(page.url()).searchParams.get('inv')!
    await expect(page.getByText('Investigation opened under Signals and fixes → Investigations.')).toBeVisible()
    const inv = page.locator(`li[data-inv="${invId}"]`)
    await expect(inv).toBeVisible({ timeout: 15_000 })
    await expect(inv).toHaveAttribute('data-selected', 'true')
    await expect(inv).toContainText('Customer interviews')
    await expect(inv).toContainText('5 interviews')
    await expect(inv).toContainText('In progress')
    await expect(inv.getByTestId('inv-note')).toHaveText(`Requested from ${ca} after a failed result.`)
    await expect(inv.getByRole('button', { name: 'Record the result' })).toBeVisible()

    // back on the fixes: the audit line is there, and accepting the result as it is ends the fix effective
    await page.getByRole('link', { name: 'Corrective actions' }).click()
    await expect(page).toHaveURL(/\/actions\/corrective/)
    const back = fixCard(page, ca)
    await openFix(back)
    await expect(back.getByTestId('audit-trail').getByRole('row').nth(1)).toContainText(`Investigation requested: 5 interviews (${invId})`)
    await back.getByTestId('fix-second-step-bar').getByRole('button', { name: 'Accept as is' }).click()
    await expect(page.getByText('Accepted as is; the fix is marked effective.')).toBeVisible()
    await expect(back.getByTestId('fix-second-step-bar')).toHaveCount(0)
    await expect(back).toContainText('Nothing. It worked; it stays in the report as a fix that worked')
    await expect(back.getByTestId('audit-trail').getByRole('row').nth(1)).toContainText('Accepted as is after a failed result')
    await expect(back.getByText('Effective', { exact: true }).first()).toBeVisible()
    expect(errors).toEqual([])
  })

  test('with the register filtered to "Partial: second step needed", asking for a second step still shows the new proposed fix, selected', async ({ page }) => {
    await open(page, '/actions/corrective')
    await page.getByRole('combobox', { name: 'Status' }).click()
    await page.getByRole('option', { name: 'Partial: second step needed' }).click()
    await expect(page.locator('li[data-fix]')).toHaveCount(1)
    const ca = (await page.locator('li[data-fix]').first().getAttribute('data-fix'))!
    await fixCard(page, ca).getByRole('button', { name: 'Ask for a second step' }).click()
    await expect(page).toHaveURL(/\/actions\/corrective\?fix=CA-2\d\d$/)
    const childId = new URL(page.url()).searchParams.get('fix')!
    // the filter that would have hidden the proposed fix is dropped, so the new fix is on the page, selected
    await expect(fixCard(page, childId)).toHaveAttribute('data-selected', 'true', { timeout: 15_000 })
    await expect(page.getByRole('combobox', { name: 'Status' })).toContainText('All')
  })

  test('effective ends the fix with the verdict in the audit trail', async ({ page }) => {
    await open(page, '/actions/corrective')
    const ca = await fixOffering(page, EFFECTIVE)
    const card = fixCard(page, ca)
    await openFix(card)
    await card.getByRole('button', { name: EFFECTIVE }).click()
    await expect(page.getByText('Verdict recorded: effective')).toBeVisible()
    await expect(card.getByRole('group', { name: 'Record the verdict' })).toHaveCount(0)
    await expect(card.getByTestId('fix-second-step-bar')).toHaveCount(0)
    await expect(card.getByTestId('audit-trail').getByRole('row').nth(1)).toContainText('Verdict: effective')
    await expect(card).toContainText('Nothing. It worked')
  })

  test('the verdict buttons work from the keyboard', async ({ page }) => {
    await open(page, '/actions/corrective')
    const ca = await fixOffering(page, PARTIAL)
    const card = fixCard(page, ca)
    const partial = card.getByRole('button', { name: PARTIAL })
    await partial.focus()
    await expect(partial).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(card.getByTestId('fix-second-step-bar')).toBeVisible()
    const ask = card.getByRole('button', { name: 'Ask for a second step' })
    await ask.focus()
    await expect(ask).toBeFocused()
    await page.keyboard.press('Space')
    await expect(page).toHaveURL(/\/actions\/corrective\?fix=CA-2\d\d$/)
  })
})

test.describe('who sees the buttons', () => {
  test('the CX team does, like the CX manager', async ({ page }) => {
    await open(page, '/actions/corrective', { role: 'cxteam' })
    const ca = await fixOffering(page, PARTIAL)
    await expect(fixCard(page, ca).getByRole('group', { name: 'Record the verdict' })).toBeVisible()
    await expect(fixCard(page, 'CA-201').getByTestId('fix-second-step-bar')).toBeVisible()
  })

  for (const role of ['hrspec', 'envmgmt', 'teamlead'] as const) {
    test(`${role} reads the 60-day check and the partial result and sees none of the six buttons`, async ({ page }) => {
      await open(page, '/actions/corrective', { role })
      const check = page.locator('li[data-fix="CA-204"]')
      await expect(check).toBeVisible({ timeout: 15_000 })
      await expect(check).toContainText('Agent 6 counts the same signals again')
      await expect(page.getByRole('button', { name: new RegExp(`^(${EFFECTIVE}|${PARTIAL}|${FAILED}|Ask for a second step|Investigate first.*|Accept as is)$`) })).toHaveCount(0)
      await expect(page.getByTestId('fix-verdict')).toHaveCount(0)
      await expect(page.getByTestId('fix-second-step-bar')).toHaveCount(0)
      if (role !== 'envmgmt') {
        // the partial fix is read, with its status and the next step, but nothing to press
        const partial = page.locator('li[data-fix="CA-201"]')
        await expect(partial).toContainText('Partial: second step needed')
        await expect(partial).toContainText('The owner proposes a second step')
      }
    })
  }
})

test.describe('Arabic, RTL, phone, dark', () => {
  test('Arabic: labels, the bar and the sentences, right to left', async ({ page }) => {
    await open(page, '/actions/corrective', { lang: 'ar' })
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    const card = fixCard(page, 'CA-204')
    const verdict = card.getByRole('group', { name: 'سجّل الحكم' })
    await expect(verdict.getByRole('button')).toHaveText(['انخفضت الإشارات: فعّال', 'انخفضت أقل من النصف: جزئي', 'لم تنخفض: العودة للسبب الجذري'])
    await expect(card).toContainText('فحص 60 يوماً')
    // the first button sits at the start edge, the right in RTL
    const [first, last] = await Promise.all([verdict.getByRole('button').first().boundingBox(), verdict.getByRole('button').last().boundingBox()])
    expect(first!.x).toBeGreaterThan(last!.x)
    await verdict.getByRole('button', { name: 'انخفضت أقل من النصف: جزئي' }).click()
    const bar = card.getByTestId('fix-second-step-bar')
    await expect(bar).toContainText('جزئي: انخفضت الإشارات أقل من النصف.')
    await expect(bar.getByRole('button')).toHaveText(['اطلب خطوة ثانية', 'حقّق أولاً (5 مقابلات)', 'اقبله كما هو'])
    await expect(card).toContainText('جزئي: خطوة ثانية مطلوبة')
    await expect(card).toContainText('المالك يقترح خطوة ثانية؛ مدير CX يعتمدها كحل جديد على النمط نفسه')
    await bar.getByRole('button', { name: 'اطلب خطوة ثانية' }).click()
    await expect(page).toHaveURL(/fix=CA-2\d\d$/)
    const childId = new URL(page.url()).searchParams.get('fix')!
    const child = fixCard(page, childId)
    await expect(child.getByTestId('fix-parent')).toContainText('خطوة ثانية بعد')
    await expect(child.getByTestId('fix-parent')).toContainText('CA-204')
    await expect(child.getByTestId('fix-parent')).toContainText('(جزئي: خطوة ثانية مطلوبة)')
    await expect(child).toContainText('اقترحه مدير تجربة العملاء، بعد نتيجة جزئية')
  })

  for (const [lang, theme, ca] of [['en', 'light', 'CA-204'], ['ar', 'dark', 'CA-201']] as const) {
    test(`375px, ${lang} ${theme}: the verdict controls fit; the page does not scroll sideways`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await open(page, `/actions/corrective?fix=${ca}`, { lang, theme })
      const card = fixCard(page, ca)
      const control = card.locator('[data-testid="fix-verdict"], [data-testid="fix-second-step-bar"]').first()
      await expect(control).toBeVisible({ timeout: 15_000 })
      expect(await noPageScroll(page)).toBeLessThanOrEqual(0)
      // every button is inside the card, none cut off at the screen edge
      for (const b of await control.getByRole('button').all()) {
        const box = await b.boundingBox()
        expect(box!.x).toBeGreaterThanOrEqual(0)
        expect(box!.x + box!.width).toBeLessThanOrEqual(375)
      }
    })
  }

  test('320px: the three long verdict labels wrap inside the card', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 })
    await open(page, '/actions/corrective?fix=CA-204')
    expect(await noPageScroll(page)).toBeLessThanOrEqual(0)
    const group = fixCard(page, 'CA-204').getByTestId('fix-verdict')
    await expect(group).toBeVisible()
    for (const b of await group.getByRole('button').all()) {
      const box = await b.boundingBox()
      expect(box!.x + box!.width).toBeLessThanOrEqual(320)
    }
  })
})

test.describe('accessibility (axe WCAG 2.1 AA)', () => {
  test('EN light: a fix in the 60-day check with the three buttons', async ({ page }) => {
    await open(page, '/actions/corrective?fix=CA-204', { theme: 'light' })
    await expect(fixCard(page, 'CA-204').getByTestId('fix-verdict')).toBeVisible()
    await waitForAnimations(page)
    expect(await blockingViolations(page)).toEqual([])
  })

  test('EN light: a fix in partial, with the bar', async ({ page }) => {
    await open(page, '/actions/corrective?fix=CA-201', { theme: 'light' })
    await expect(fixCard(page, 'CA-201').getByTestId('fix-second-step-bar')).toBeVisible()
    await waitForAnimations(page)
    expect(await blockingViolations(page)).toEqual([])
  })

  test('AR dark: a fix in partial, with the bar', async ({ page }) => {
    await open(page, '/actions/corrective?fix=CA-201', { lang: 'ar', theme: 'dark' })
    await expect(fixCard(page, 'CA-201').getByTestId('fix-second-step-bar')).toBeVisible()
    await waitForAnimations(page)
    expect(await blockingViolations(page)).toEqual([])
  })

  test('EN light: the second-step fix with its parent link, and the original with the child and the off button', async ({ page }) => {
    await open(page, '/actions/corrective?fix=CA-201', { theme: 'light' })
    await fixCard(page, 'CA-201').getByRole('button', { name: 'Ask for a second step' }).click()
    await expect(page).toHaveURL(/fix=CA-2\d\d$/)
    await expect(page.locator('li[data-selected="true"] [data-testid="fix-parent"]')).toBeVisible({ timeout: 15_000 })
    await expect(fixCard(page, 'CA-201').getByTestId('fix-children')).toBeVisible()
    await waitForAnimations(page)
    expect(await blockingViolations(page)).toEqual([])
  })

  test('AR dark: the second-step fix with its parent link', async ({ page }) => {
    await open(page, '/actions/corrective?fix=CA-201', { lang: 'ar', theme: 'dark' })
    await fixCard(page, 'CA-201').getByRole('button', { name: 'اطلب خطوة ثانية' }).click()
    await expect(page.locator('li[data-selected="true"] [data-testid="fix-parent"]')).toBeVisible({ timeout: 15_000 })
    await waitForAnimations(page)
    expect(await blockingViolations(page)).toEqual([])
  })

  test('the Investigations page with the investigation opened from a fix', async ({ page }) => {
    await open(page, '/actions/corrective?fix=CA-201', { theme: 'light' })
    await fixCard(page, 'CA-201').getByRole('button', { name: 'Investigate first (5 interviews)' }).click()
    await expect(page).toHaveURL(/\/actions\/investigations\?inv=INV-\d+$/)
    await expectPageReady(page)
    await expect(page.locator('li[data-inv][data-selected="true"] [data-testid="inv-note"]')).toBeVisible({ timeout: 15_000 })
    await waitForAnimations(page)
    expect(await blockingViolations(page)).toEqual([])
  })
})
