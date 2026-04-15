/**
 * E2E: Locale switching across key pages.
 *
 * Verifies that:
 *   - The site serves content at /es/ and /fr/ locale prefixes
 *   - Language switcher links are present and navigate correctly
 *   - No locale gives a 500 error
 *
 * Requires a running dev server: npx emdash dev
 */

import { test, expect } from '@playwright/test'

const KEY_PAGES = ['/', '/properties', '/posts'] as const

test.describe('Locale switching', () => {
  for (const path of KEY_PAGES) {
    test(`default (en) locale renders ${path} without error`, async ({ page }) => {
      await page.goto(path)
      await expect(page).not.toHaveTitle(/error/i)
      const status = await page.evaluate(() => document.readyState)
      expect(status).toBe('complete')
    })

    test(`Spanish /es${path} renders without error`, async ({ page }) => {
      const response = await page.goto(`/es${path}`)
      // A 404 is acceptable for /es/ if the page hasn't been seeded;
      // a 500 is not acceptable.
      const status = response?.status() ?? 200
      expect(status).not.toBe(500)
      await expect(page).not.toHaveTitle(/error/i)
    })

    test(`French /fr${path} renders without error`, async ({ page }) => {
      const response = await page.goto(`/fr${path}`)
      const status = response?.status() ?? 200
      expect(status).not.toBe(500)
      await expect(page).not.toHaveTitle(/error/i)
    })
  }

  test('language switcher links are present on the homepage', async ({ page }) => {
    await page.goto('/')

    // The topbar should include locale links (en, es, fr)
    const localeLinks = page.locator('.site-header__locale')
    await expect(localeLinks).toHaveCount(3)
  })

  test('navigating via locale link stays on the correct locale prefix', async ({ page }) => {
    await page.goto('/')

    const esLink = page.locator('.site-header__locale[href*="/es"]').first()
    if (await esLink.count() === 0) {
      test.skip()
      return
    }

    await esLink.click()
    expect(page.url()).toContain('/es')
    await expect(page).not.toHaveTitle(/error/i)
  })

  test('html lang attribute matches the current locale', async ({ page }) => {
    await page.goto('/es/')
    const lang = await page.locator('html').getAttribute('lang')
    expect(lang).toBe('es')
  })
})
