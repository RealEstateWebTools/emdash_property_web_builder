/**
 * E2E: the site without PWB (native EmDash listings) — `pnpm test:native`.
 * Data: seed/test/native-listings.json (two sale listings, one rental).
 */

import { test, expect } from '@playwright/test'

test.describe('Native listings (no PWB)', () => {
  test('the sale search lists native sale listings only', async ({ page }) => {
    const response = await page.goto('/properties')
    expect(response?.status()).toBe(200)
    const hrefs = await page.locator('a[href^="/properties/"]').evaluateAll((links) =>
      [...new Set(links.map((a) => a.getAttribute('href')))].sort(),
    )
    expect(hrefs).toEqual(['/properties/harbour-view-villa', '/properties/old-town-flat'])
  })

  test('rentals, type and price filters work', async ({ page }) => {
    await page.goto('/properties?mode=rental')
    await expect(page.locator('a[href="/properties/garden-apartment-to-let"]').first()).toBeVisible()
    await expect(page.locator('a[href="/properties/harbour-view-villa"]')).toHaveCount(0)

    await page.goto('/properties?type=types.flat')
    await expect(page.locator('a[href="/properties/old-town-flat"]').first()).toBeVisible()
    await expect(page.locator('a[href="/properties/harbour-view-villa"]')).toHaveCount(0)

    await page.goto('/properties?price_from=500000')
    await expect(page.locator('a[href="/properties/harbour-view-villa"]').first()).toBeVisible()
    await expect(page.locator('a[href="/properties/old-town-flat"]')).toHaveCount(0)
  })

  test('a listing page renders title, price and description', async ({ page }) => {
    const response = await page.goto('/properties/harbour-view-villa')
    expect(response?.status()).toBe(200)
    await expect(page.locator('h1')).toContainText('Harbour View Villa')
    await expect(page.getByText('€875,000').first()).toBeVisible()
    await expect(page.getByText('A bright villa with sea views and a large garden.')).toBeVisible()
  })

  test('an unknown listing is a 404, not an upstream error', async ({ page }) => {
    const response = await page.goto('/properties/no-such-listing')
    expect(response?.status()).toBe(404)
  })

  test('the homepage features native listings and uses the EmDash site name', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Demo Realty/)
    await expect(page.locator('a[href="/properties/harbour-view-villa"]').first()).toBeVisible()
  })

  test('the property sitemap lists sale and rental listings', async ({ request }) => {
    const xml = await (await request.get('/sitemap-properties.xml')).text()
    for (const slug of ['harbour-view-villa', 'old-town-flat', 'garden-apartment-to-let']) {
      expect(xml).toContain(`/properties/${slug}</loc>`)
    }
  })

  test('PWB page routes are a styled 404 without PWB', async ({ page }) => {
    const response = await page.goto('/about-us')
    expect(response?.status()).toBe(404)
    await expect(page.locator('h1')).toHaveText('404')
  })

  test('an enquiry is stored as an unpublished EmDash entry', async ({ page, request }) => {
    const email = `buyer-${Date.now()}@example.com`
    const res = await request.post('/api/enquiries', {
      data: {
        name: 'Native Buyer',
        email,
        message: 'Please send me details of the Harbour View Villa.',
        page_type: 'property',
        property_slug: 'harbour-view-villa',
        cta_source: 'book_viewing',
      },
    })
    expect(res.status()).toBe(200)
    expect((await res.json()).success).toBe(true)

    await page.goto('/_emdash/api/setup/dev-bypass?redirect=/')
    const list = await page.request.get('/_emdash/api/content/enquiries?limit=50', {
      headers: { 'X-EmDash-Request': '1' },
    })
    const { data } = await list.json()
    const stored = data.items.find((item: { data: { email: string } }) => item.data.email === email)
    expect(stored).toMatchObject({
      status: 'draft',
      data: { name: 'Native Buyer', property_slug: 'harbour-view-villa', cta_source: 'book_viewing', lead_status: 'new' },
    })
  })
})
