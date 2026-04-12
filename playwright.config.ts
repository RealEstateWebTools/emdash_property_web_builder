import { defineConfig, devices } from '@playwright/test'

/**
 * E2E tests run against the dev server.
 * Start it with: npx emdash dev
 *
 * In CI, the server is started automatically via the `webServer` block below.
 * Locally, start the server first and run: npx playwright test
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.CI
    ? {
        command: 'npx emdash dev',
        url: 'http://localhost:4321',
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined,
})
