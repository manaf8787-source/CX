import { chromium } from '../../frontend/node_modules/playwright/index.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
await p.goto('http://localhost:5179/');
await p.evaluate(() => localStorage.setItem('psicx.role', 'cxteam'));
for (const r of ['/', '/overview','/voc','/insights','/real-estate','/after-sales','/after-sales/desk','/incidents','/survey-engine','/mystery-shopper','/call-center','/report']) {
  if (r === '/') { await p.evaluate(() => localStorage.removeItem('psicx.role')); }
  await p.goto('http://localhost:5179' + r); await p.waitForTimeout(800);
  await p.screenshot({ path: 's' + r.replaceAll('/', '_') + '.png', fullPage: true });
  if (r === '/') await p.evaluate(() => localStorage.setItem('psicx.role', 'cxteam'));
}
await b.close();
