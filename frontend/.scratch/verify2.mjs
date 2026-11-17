import { chromium } from 'playwright'

const shotDir = 'C:\\Users\\xele\\AppData\\Local\\Temp\\claude\\c--Users-xele-Desktop-CX\\bcf62d1f-f50a-4802-b308-497587d82fb2\\scratchpad'
const errors = []

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 1200 } })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console.error: ' + msg.text()) })

await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.click('text=CX manager (level 2)')
await page.waitForSelector('h1:has-text("Overview")')

const items = [
  ['Voice of Customer', '06-voc.png'],
  ['AI Insights', '07-insights.png'],
  ['Monthly CX pack', '08-report.png'],
  ['PSI Real Estate', '09-re.png'],
  ['PSI Club', '10-club.png'],
  ['Tour Estate', '11-tour.png'],
  ['PSI Events', '12-events.png'],
  ['Survey Engine', '13-survey.png'],
  ['Mystery Shopper', '14-shopper.png'],
  ['Call Center & IVR', '15-callcenter.png'],
  ['Settings', '16-settings.png'],
  ['Standards Library', '17-standards.png'],
  ['Suggestions log', '18-suggestions.png'],
  ['Build specification', '19-structure.png'],
  ['Glossary', '20-glossary.png'],
]

for (const [label, file] of items) {
  await page.click(`.rail >> text=${label}`)
  await page.waitForTimeout(250)
  await page.screenshot({ path: `${shotDir}\\${file}` })
}

// Exercise a few interactions.
await page.click('.rail >> text=Survey Engine')
await page.click('button:has-text("WhatsApp readiness")')
await page.waitForTimeout(200)
await page.screenshot({ path: `${shotDir}\\21-wa-checks.png` })

await page.click('.rail >> text=Settings')
await page.click('button:has-text("Product launch")')
await page.waitForTimeout(150)
const clubRow = page.locator('.item:has-text("PSI Club")')
await clubRow.locator('input[type=checkbox]').click()
await page.waitForTimeout(150)
await page.click('.rail >> text=Overview')
await page.waitForTimeout(200)
await page.screenshot({ path: `${shotDir}\\22-club-launched.png` })

await page.click('.rail >> text=AI Insights')
await page.click('button:has-text("Approve and send to a case")')
await page.waitForTimeout(150)
await page.screenshot({ path: `${shotDir}\\23-insight-approved.png` })

await page.click('.rail >> text=Mystery Shopper')
await page.click('button:has-text("Distribution")')
await page.waitForTimeout(150)
await page.screenshot({ path: `${shotDir}\\24-shopper-dist.png` })
await page.click('button:has-text("Review")')
await page.waitForTimeout(150)
await page.screenshot({ path: `${shotDir}\\25-shopper-review.png` })

await browser.close()
console.log(JSON.stringify({ errorCount: errors.length, errors: errors.slice(0, 30) }, null, 2))
