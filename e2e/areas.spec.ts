/**
 * E2E: area & lifestyle landing pages (EmDash `areas` collection).
 *
 * Runs in the mocked suite (`pnpm test:visual`) against the seeded entries
 * "east-brunswick" (area) and "first-homes" (lifestyle).
 */

import { test, expect } from '@playwright/test'

test.describe('Area & lifestyle pages', () => {
  test('index groups entries by kind and links to each page', async ({ page }) => {
    const response = await page.goto('/areas')
    expect(response?.status()).toBe(200)
    await expect(page.locator('h1')).toHaveText('Areas & lifestyle')
    await expect(page.locator('.areas-index__group-title')).toHaveText(['Area guide', 'Lifestyle'])
    await expect(page.locator('a.areas-index__card[href="/areas/east-brunswick"]')).toBeVisible()
    await expect(page.locator('a.areas-index__card[href="/areas/first-homes"]')).toBeVisible()
  })

  test('area page assembles every section from the entry', async ({ page }) => {
    const response = await page.goto('/areas/east-brunswick')
    expect(response?.status()).toBe(200)

    await expect(page.locator('h1')).toHaveText('Living in East Brunswick')
    await expect(page.locator('.area-hero__eyebrow')).toHaveText('Area guide')
    await expect(page.locator('.area-highlights__item')).toHaveCount(4)
    // Curated listings reuse the listingCollection block (mock PWB fixture).
    await expect(page.locator('.area-listings .listing-collection__card').first()).toHaveAttribute(
      'href',
      '/properties/beautiful-villa-marbella',
    )
    await expect(page.locator('.area-testimonials__card')).toHaveCount(3)
    await expect(page.locator('.area-faqs__item')).toHaveCount(2)
    await expect(page.locator('.area-cta__button')).toHaveAttribute('href', '/pages/contact')

    const faqJsonLd = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(faqJsonLd.some((json) => json.includes('"FAQPage"'))).toBe(true)
  })

  test('an untranslated area falls back to English inside the localized site', async ({ page }) => {
    const response = await page.goto('/es/areas/east-brunswick')
    expect(response?.status()).toBe(200)
    await expect(page.locator('html')).toHaveAttribute('lang', 'es')
    await expect(page.locator('h1')).toHaveText('Living in East Brunswick')
    await expect(page.locator('.area-page__notice')).toBeVisible()
    await expect(page.locator('.area-cta__button')).toHaveAttribute('href', '/es/pages/contact')
    // Canonical points at the English original, not a duplicate.
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/areas\/east-brunswick$/)
  })

  test('an unknown area renders the styled 404 page', async ({ page }) => {
    const response = await page.goto('/areas/no-such-area')
    expect(response?.status()).toBe(404)
    await expect(page.locator('h1')).toHaveText('404')
  })
})
