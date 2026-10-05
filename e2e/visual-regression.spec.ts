/**
 * E2E: Visual regression screenshots per theme palette.
 *
 * Takes full-page screenshots of key pages for each palette so regressions
 * in theme CSS are caught as snapshot diffs.
 *
 * Run with `pnpm test:visual` (playwright.visual.config.ts). That config
 * starts its own server against a freshly seeded database and a mock PWB API
 * serving the unit-test fixtures, so content is identical on every run.
 *
 * To update snapshots after an intentional design change (on Linux — the
 * baselines are `-chromium-linux.png`):
 *   pnpm test:visual --update-snapshots
 *
 * Each palette is injected via a query param (?palette=<name>) that the
 * BaseLayout reads and applies in preference to the PUBLIC_PALETTE env var
 * or the admin-panel setting. This lets us test all palettes against a single
 * running server without restarting.
 */

import { test, expect } from '@playwright/test'

// All palettes that have a corresponding CSS file in public/styles/palettes/
const PALETTES = [
  'default',
  'luxury',
  'mediterranean',
  'coastal',
  'countryside',
  'urban',
  'nordic',
] as const

// Key pages to screenshot — covers the main consumer-facing surfaces
const KEY_PAGES = ['/', '/properties', '/posts'] as const

// 1x1 light-grey PNG used for every off-site image (fixture listings point at
// example.com), so screenshots don't depend on third-party hosts.
const PLACEHOLDER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN4+/7tfwAJagPXBCdF1wAAAABJRU5ErkJggg==',
  'base64',
)

test.beforeEach(async ({ page, baseURL }) => {
  const siteOrigin = new URL(baseURL ?? 'http://localhost').origin
  await page.route('**/*', (route) => {
    const request = route.request()
    if (request.resourceType() === 'image' && new URL(request.url()).origin !== siteOrigin) {
      return route.fulfill({ status: 200, contentType: 'image/png', body: PLACEHOLDER_PNG })
    }
    return route.continue()
  })
})

test.describe('Visual regression — theme palettes', () => {
  for (const palette of PALETTES) {
    for (const path of KEY_PAGES) {
      test(`${palette} palette — ${path}`, async ({ page }) => {
        const response = await page.goto(`${path}?palette=${palette}`)
        // The backend is mocked, so every key page must render.
        expect(response?.status()).toBe(200)

        // Load lazy images and fonts before capturing the full page.
        await page.evaluate(async () => {
          for (const img of Array.from(document.images)) img.loading = 'eager'
          const pending = Array.from(document.images)
            .filter((img) => !img.complete)
            .map(
              (img) =>
                new Promise((done) => {
                  img.addEventListener('load', done, { once: true })
                  img.addEventListener('error', done, { once: true })
                }),
            )
          await Promise.race([Promise.all(pending), new Promise((done) => setTimeout(done, 10_000))])
          await document.fonts.ready
        })
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {
          // networkidle can time out on pages with long-polling — continue anyway
        })

        await expect(page).toHaveScreenshot(`${palette}${path.replace(/\//g, '-')}.png`, {
          fullPage: true,
          // Dates are rendered relative to "now" by some components.
          mask: [page.locator('time')],
          // Allow a small pixel tolerance for sub-pixel font rendering differences
          maxDiffPixelRatio: 0.02,
        })
      })
    }
  }
})
