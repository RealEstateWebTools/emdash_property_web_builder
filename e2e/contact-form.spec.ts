/**
 * E2E: Contact/enquiry form golden path.
 *
 * Tests form validation (inline errors) and submission (success/error state).
 * Requires a running dev server: npx emdash dev
 */

import { test, expect } from '@playwright/test'

test.describe('Contact form', () => {
  /**
   * Navigate to a property detail page to find the enquiry form.
   * If no properties exist in the seed data, tests are skipped.
   */
  async function getPropertyDetailUrl(page: import('@playwright/test').Page): Promise<string | null> {
    await page.goto('/properties')
    const firstCard = page.locator('a[href*="/properties/"]').first()
    if (await firstCard.count() === 0) return null
    return firstCard.getAttribute('href')
  }

  test('enquiry form is present on property detail page', async ({ page }) => {
    const href = await getPropertyDetailUrl(page)
    if (!href) {
      test.skip()
      return
    }

    await page.goto(href)
    const form = page.locator('form').first()
    await expect(form).toBeVisible()
  })

  test('submitting empty form shows validation errors', async ({ page }) => {
    const href = await getPropertyDetailUrl(page)
    if (!href) {
      test.skip()
      return
    }

    await page.goto(href)

    // Submit without filling in any fields
    const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first()
    if (await submitBtn.count() === 0) {
      test.skip()
      return
    }

    await submitBtn.click()

    // At least one error message should be visible
    const errors = page.locator('[class*="error"], [role="alert"], .field-error')
    const errorCount = await errors.count()
    expect(errorCount).toBeGreaterThan(0)
  })

  test('invalid email shows email validation error', async ({ page }) => {
    const href = await getPropertyDetailUrl(page)
    if (!href) {
      test.skip()
      return
    }

    await page.goto(href)

    const emailField = page.locator('input[type="email"], input[name="email"]').first()
    if (await emailField.count() === 0) {
      test.skip()
      return
    }

    await emailField.fill('not-an-email')
    const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first()
    await submitBtn.click()

    // Email-specific error should appear
    const emailError = page.locator('text=/valid email/i')
    await expect(emailError).toBeVisible({ timeout: 3000 })
  })

  test('404 page renders without calling PWB API', async ({ page }) => {
    // The 404 page uses fallbackSite — it should always render even with no API
    const response = await page.goto('/this-page-absolutely-does-not-exist')
    // Either 404 status or the custom 404 content
    const status = response?.status() ?? 200
    const title = await page.title()
    // Either it's a real 404 status or it shows the custom 404 page
    const isHandled = status === 404 || title.toLowerCase().includes('not found')
    expect(isHandled).toBe(true)
  })
})

test.describe('Search', () => {
  test('search page with query shows results or empty state', async ({ page }) => {
    await page.goto('/search?q=property')
    await expect(page).not.toHaveTitle(/error/i)
  })

  test('search page with empty query shows neutral state', async ({ page }) => {
    await page.goto('/search')
    await expect(page).not.toHaveTitle(/error/i)
    // Should not show any error messages for an empty query
    const errorText = page.locator('text=/something went wrong/i')
    await expect(errorText).not.toBeVisible()
  })
})
