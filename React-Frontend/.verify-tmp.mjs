import { chromium } from 'playwright'

const BASE = 'http://localhost:5190'
const consoleErrors = []

const browser = await chromium.launch()

async function checkPage(path, { lang, theme } = {}) {
  const page = await browser.newContext().then((c) => c.newPage())
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`[${path} lang=${lang} theme=${theme}] ${msg.text()}`)
  })
  page.on('pageerror', (err) => consoleErrors.push(`[${path} lang=${lang} theme=${theme}] pageerror: ${err.message}`))
  await page.goto(BASE + path, { waitUntil: 'networkidle' })
  return page
}

// 1. Home -> open assistant, ask a question, check reply + nav button
{
  const page = await checkPage('/home')
  await page.click('button:has-text("Ask the assistant")')
  await page.fill('input[placeholder*="question"]', 'open actions')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  const bodyText = await page.textContent('.slideover')
  console.log('ASSISTANT REPLY (open actions):', bodyText.includes('open corrective action') ? 'OK - found expected phrase' : 'MISSING phrase: ' + bodyText)

  await page.fill('input[placeholder*="question"]', 'Sara')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  const hasJourneyBtn = await page.$('button:has-text("View their journey")')
  console.log('PERSON MATCH NAV BUTTON:', hasJourneyBtn ? 'OK - present' : 'MISSING')
  if (hasJourneyBtn) {
    await hasJourneyBtn.click()
    await page.waitForTimeout(300)
    console.log('URL AFTER NAV:', page.url())
  }
  await page.close()
}

// 2. Actions page -> open assistant from a DIFFERENT page (confirms global reach)
{
  const page = await checkPage('/actions/corrective')
  const assistantBtn = await page.$('button:has-text("Ask the assistant")')
  console.log('ASSISTANT BUTTON ON ACTIONS PAGE:', assistantBtn ? 'OK - present' : 'MISSING')
  if (assistantBtn) {
    await assistantBtn.click()
    await page.fill('input[placeholder*="question"]', 'critical shopper cases')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)
    const bodyText = await page.textContent('.slideover')
    console.log('ASSISTANT REPLY (critical shopper):', bodyText.includes('critical mystery-shopper case') ? 'OK' : 'MISSING phrase: ' + bodyText)
  }
  await page.close()
}

// 3. Intelligent CX team page, EN/light
{
  const page = await checkPage('/intelligent-cx-team')
  const title = await page.textContent('h1')
  console.log('ICX TITLE:', title)
  const agentCards = await page.$$('.grid-3 .card')
  console.log('AGENT/ENVELOPE CARDS COUNT:', agentCards.length)
  const detailsBtn = await page.$('button:has-text("Details")')
  if (detailsBtn) {
    await detailsBtn.click()
    await page.waitForTimeout(100)
    console.log('DETAILS EXPAND: OK')
  }
  const routingRows = await page.$$('table tbody tr')
  console.log('TABLE ROWS TOTAL (routing+activity combined query, approx):', routingRows.length)
  await page.close()
}

// 4. Intelligent CX team page, AR / RTL + dark theme
{
  const page = await checkPage('/intelligent-cx-team')
  await page.evaluate(() => {
    localStorage.setItem('psicx.lang', 'ar')
    localStorage.setItem('psicx.theme', 'dark')
  })
  await page.reload({ waitUntil: 'networkidle' })
  const dir = await page.evaluate(() => document.documentElement.dir)
  const themeAttr = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  console.log('DIR AFTER AR:', dir)
  console.log('THEME ATTR:', themeAttr)
  const title = await page.textContent('h1')
  console.log('ICX TITLE (ar):', title)
  await page.close()
}

// 5. Assistant panel in AR + dark, from Customers page
{
  const page = await checkPage('/customers')
  await page.evaluate(() => {
    localStorage.setItem('psicx.lang', 'ar')
    localStorage.setItem('psicx.theme', 'dark')
  })
  await page.reload({ waitUntil: 'networkidle' })
  const assistantBtn = await page.$('button:has-text("اسأل المساعد")')
  console.log('ASSISTANT BTN (ar) ON CUSTOMERS PAGE:', assistantBtn ? 'OK' : 'MISSING')
  if (assistantBtn) {
    await assistantBtn.click()
    await page.waitForTimeout(200)
    const slideover = await page.$('.slideover')
    console.log('SLIDEOVER OPEN (ar/dark):', slideover ? 'OK' : 'MISSING')
    if (slideover) {
      const bubbleBg = await page.evaluate(() => {
        const el = document.querySelector('.slideover .card')
        return el ? getComputedStyle(el).backgroundColor : null
      })
      console.log('FIRST BUBBLE BG (should be a theme color, not transparent):', bubbleBg)
    }
  }
  await page.close()
}

await browser.close()

console.log('\n=== CONSOLE/PAGE ERRORS ===')
if (consoleErrors.length === 0) console.log('NONE')
else consoleErrors.forEach((e) => console.log(e))
