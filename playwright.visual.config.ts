import { defineConfig, devices } from '@playwright/test'

/**
 * Visual regression suite — run with `pnpm test:visual`.
 *
 * Unlike the main e2e suite (playwright.config.ts), this one starts its own
 * server via scripts/visual-test-server.mjs: a freshly seeded database plus a
 * fixture-backed mock PWB API, so screenshots only change when the UI does.
 *
 * Baselines are platform-specific (`-chromium-linux.png`). Generate them on
 * Linux — CI, or the Playwright Docker image — with:
 *   pnpm test:visual --update-snapshots
 */
const PORT = Number(process.env.VISUAL_PORT ?? 4330)

export default defineConfig({
  testDir: './e2e',
  testMatch: ['visual-regression.spec.ts', 'contrast.spec.ts', 'listing-collection.spec.ts', 'areas.spec.ts', 'lead-reports.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never', outputFolder: 'playwright-report/visual' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'node scripts/visual-test-server.mjs',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
