import { defineConfig, devices } from '@playwright/test'

// E2E_PORT lets several runs happen side by side: each gets its own build folder and report.
const PORT = Number(process.env.E2E_PORT ?? 4321)
const SUFFIX = PORT === 4321 ? '' : `-${PORT}`
const OUT_DIR = PORT === 4321 ? 'dist' : `dist-e2e-${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: `playwright-report${SUFFIX}` }]],
  outputDir: `test-results${SUFFIX}`,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: PORT === 4321 ? `npm run build && npx vite preview --port ${PORT} --strictPort` : `npx vite build --outDir ${OUT_DIR} && npx vite preview --outDir ${OUT_DIR} --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
