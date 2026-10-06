import { defineConfig, devices } from '@playwright/test'

/**
 * Native-listings suite — run with `pnpm test:native`.
 *
 * The site with no PWB backend: listings from the EmDash `properties`
 * collection (seed/test/native-listings.json), site details from EmDash
 * settings, enquiries stored in EmDash. scripts/visual-test-server.mjs starts
 * it with LISTINGS=native on its own port and database.
 */
const PORT = Number(process.env.NATIVE_PORT ?? 4340)

export default defineConfig({
  testDir: './e2e',
  testMatch: 'native-*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never', outputFolder: 'playwright-report/native' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node scripts/visual-test-server.mjs',
    env: { LISTINGS: 'native', VISUAL_PORT: String(PORT) },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
