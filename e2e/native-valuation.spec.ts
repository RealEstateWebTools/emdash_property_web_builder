/**
 * E2E: the injected /valuation page on a site without PWB — `pnpm test:native`.
 * It used to call the PWB client unconditionally and fail with a 500.
 */

import { test, expect } from '@playwright/test'

test('the valuation page renders without PWB', async ({ page }) => {
  const response = await page.goto('/valuation')
  expect(response?.status()).toBe(200)
  await expect(page.locator('h1')).toContainText('Request a Property Valuation')
  await expect(page.locator('form button[type="submit"]')).toBeVisible()
})

// The page submits through the plugin route in-process (not a fetch to the
// site's own URL), and returns to the same localized page.
test('a valuation request submitted from /es/valuation is accepted', async ({ page }) => {
  await page.goto('/es/valuation')
  await page.fill('input[name="name"]', 'Ana Lopez')
  await page.fill('input[name="email"]', 'ana@example.com')
  await page.fill('input[name="address"]', '1 Calle Mayor, Madrid')
  await page.click('form button[type="submit"]')

  await expect(page).toHaveURL(/\/es\/valuation\?sent=1$/)
  await expect(page.locator('.valuation-success')).toBeVisible()
  await expect(page.locator('.valuation-error')).toHaveCount(0)
})
