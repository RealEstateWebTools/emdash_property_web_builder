/**
 * E2E: Visual regression screenshots per theme palette.
 *
 * Takes full-page screenshots of key pages for each palette so regressions
 * in theme CSS are caught as snapshot diffs.
 *
 * To update snapshots after an intentional design change:
 *   npx playwright test e2e/visual-regression.spec.ts --update-snapshots
 *
 * Requires a running dev server: npx emdash dev
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

// Pages that require network data from PWB. Skip them rather than fail if the
// backend is not available — the palette tokens still need to be tested on the
// static pages.
async function isPageAvailable(page: import('@playwright/test').Page, url: string): Promise<boolean> {
  try {
    const res = await page.goto(url, { timeout: 10_000 })
    return (res?.status() ?? 0) < 500
  } catch {
    return false
  }
}

test.describe('Visual regression — theme palettes', () => {
  for (const palette of PALETTES) {
    for (const path of KEY_PAGES) {
      test(`${palette} palette — ${path}`, async ({ page }) => {
        const url = `${path}?palette=${palette}`
        const available = await isPageAvailable(page, url)
        if (!available) {
          test.skip()
          return
        }

        // Wait for the layout to settle (fonts, lazy images)
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {
          // networkidle can time out on pages with long-polling — continue anyway
        })

        // Mask dynamic content (dates, prices from live API) so snapshots are stable
        await expect(page).toHaveScreenshot(`${palette}${path.replace(/\//g, '-')}.png`, {
          fullPage: true,
          mask: [
            // Live date/time strings rendered into the page
            page.locator('time'),
            // Price figures from the PWB backend (change when seeded differently)
            page.locator('.property-price, .prop-price, [data-price]'),
          ],
          // Allow a small pixel tolerance for sub-pixel font rendering differences
          maxDiffPixelRatio: 0.02,
        })
      })
    }
  }
})
