import AxeBuilder from '@axe-core/playwright'
import { test } from '@playwright/test'
import { ROUTES, expectPageReady, signInAs, waitForAnimations } from './helpers.ts'
test.use({ reducedMotion: 'reduce' })
for (const [lang, theme] of [['en','light'],['ar','dark'],['en','dark'],['ar','light']] as const) {
  test(`diag ${lang} ${theme}`, async ({ page }) => {
    test.setTimeout(300_000)
    await page.addInitScript((t) => localStorage.setItem('psicx.theme', t), theme)
    await signInAs(page, 'cxmgr', lang)
    const out: string[] = []
    for (const route of ROUTES) {
      await page.goto(route); await expectPageReady(page); await waitForAnimations(page)
      const r = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()
      for (const v of r.violations) for (const n of v.nodes) out.push(`${route}\t${v.id}\t${n.html.slice(0,220).replace(/\s+/g,' ')}\t${(n.any[0]?.message ?? '').slice(0,160)}`)
    }
    console.log(`DIAG-${lang}-${theme}\n` + out.join('\n'))
  })
}
