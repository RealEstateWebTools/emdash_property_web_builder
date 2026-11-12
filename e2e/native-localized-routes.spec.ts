/**
 * E2E: localized routes answer for themselves — `pnpm test:native`.
 *
 * With Astro's i18n `fallback` configured, every 404 under /es/ or /fr/ was
 * turned into a 302 to the English URL, so localized pages could never be
 * "not found". Requests here don't follow redirects, so a 302 fails them.
 */

import { test, expect } from '@playwright/test'

const noRedirects = { maxRedirects: 0 }

test('a missing localized listing is a 404, not a redirect to English', async ({ request }) => {
  const response = await request.get('/es/properties/no-such-listing', noRedirects)
  expect(response.status()).toBe(404)
})

test('a missing localized post is a 404, not a redirect to English', async ({ request }) => {
  const response = await request.get('/fr/posts/no-such-post', noRedirects)
  expect(response.status()).toBe(404)
})

test('localized listing pages render in place', async ({ request }) => {
  for (const path of ['/es/properties', '/fr/properties/harbour-view-villa']) {
    const response = await request.get(path, noRedirects)
    expect(response.status(), path).toBe(200)
  }
})

test('the valuation page exists for each locale the site links to', async ({ request }) => {
  for (const path of ['/es/valuation', '/fr/valuation']) {
    const response = await request.get(path, noRedirects)
    expect(response.status(), path).toBe(200)
    expect(await response.text(), path).toContain('Request a Property Valuation')
  }
  // Not a site locale.
  expect((await request.get('/de/valuation', noRedirects)).status()).toBe(404)
})
