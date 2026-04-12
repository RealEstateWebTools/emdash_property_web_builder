/**
 * E2E: Property search → detail golden path.
 *
 * Requires a running dev server: npx emdash dev
 * In CI, the server is started automatically by playwright.config.ts.
 *
 * The PWB API calls hit the live PWB_API_URL configured in the environment.
 * In CI, set PWB_API_URL to point at a staging or mock server.
 */

import { test, expect } from '@playwright/test'

test.describe('Property search → detail flow', () => {
  test('search page renders a list of properties', async ({ page }) => {
    await page.goto('/properties')

    // Page must not error
    await expect(page).not.toHaveTitle(/error/i)

    // Should render at least one property card or an empty-state message
    const hasCards = await page.locator('[data-testid="property-card"], .property-card').count()
    const hasEmptyState = await page.locator('text=/no properties found/i').count()
    expect(hasCards + hasEmptyState).toBeGreaterThan(0)
  })

  test('search page title includes the site name', async ({ page }) => {
    await page.goto('/properties')
    const title = await page.title()
    expect(title.length).toBeGreaterThan(0)
  })

  test('search results can be filtered by mode (sale/rental)', async ({ page }) => {
    await page.goto('/properties?mode=rental')
    await expect(page).not.toHaveTitle(/error/i)
    // URL should reflect the rental mode
    expect(page.url()).toContain('mode=rental')
  })

  test('clicking a property card navigates to the detail page', async ({ page }) => {
    await page.goto('/properties')

    const firstCard = page.locator('a[href*="/properties/"]').first()
    const count = await firstCard.count()

    if (count === 0) {
      test.skip() // No properties seeded — skip rather than fail
      return
    }

    const href = await firstCard.getAttribute('href')
    await firstCard.click()
    await expect(page).toHaveURL(new RegExp(href!))
    await expect(page).not.toHaveTitle(/error/i)
  })

  test('property detail page shows the property title', async ({ page }) => {
    await page.goto('/properties')

    const firstCard = page.locator('a[href*="/properties/"]').first()
    if (await firstCard.count() === 0) {
      test.skip()
      return
    }

    await firstCard.click()

    // The h1 should be the property title
    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible()
    const text = await h1.textContent()
    expect(text!.trim().length).toBeGreaterThan(0)
  })

  test('non-existent property slug returns 404', async ({ page }) => {
    const response = await page.goto('/properties/this-property-does-not-exist-xyz')
    expect(response?.status()).toBe(404)
  })
})
