/**
 * E2E: lead & CTA reporting (lead-reports plugin).
 *
 * Runs in the mocked suite (`pnpm test:visual`): the mock PWB API accepts
 * enquiries, and events land in the plugin's storage on the test database.
 */

import { test, expect, type Request } from '@playwright/test'

const TRACK = '/_emdash/api/plugins/lead-reports/track'

function isTrack(request: Request) {
  return request.url().endsWith(TRACK) && request.method() === 'POST'
}

test.describe('Lead & CTA reporting', () => {
  test('a click on a tagged CTA is recorded', async ({ page }) => {
    await page.goto('/')
    const tracked = page.waitForRequest(isTrack)
    // Keep the click from navigating so the assertion sees the request.
    await page.locator('[data-cta="header_contact"]').evaluate((el) =>
      el.addEventListener('click', (event) => event.preventDefault()),
    )
    await page.locator('[data-cta="header_contact"]').click()

    const request = await tracked
    expect(request.postDataJSON()).toEqual({ kind: 'cta_click', cta: 'header_contact', pagePath: '/', pageType: 'home' })
    expect((await request.response())?.status()).toBe(200)
  })

  test('a successful enquiry is recorded with its attribution', async ({ page }) => {
    await page.goto('/pages/contact')
    const form = page.locator('form.contact-form, form[data-page-type]').first()
    await form.locator('[name="name"]').fill('Test Buyer')
    await form.locator('[name="email"]').fill('buyer@example.com')
    await form.locator('[name="message"]').fill('Please send me details of homes in East Brunswick.')

    const tracked = page.waitForRequest(isTrack)
    await form.locator('button[type="submit"]').click()

    const request = await tracked
    expect(request.postDataJSON()).toMatchObject({ kind: 'enquiry', pageType: 'contact', pagePath: '/pages/contact' })
    // No personal data leaves the form for reporting.
    expect(request.postData()).not.toContain('buyer@example.com')
  })

  test('the admin report counts recorded activity', async ({ page, request }) => {
    // Record one of each, then read the Block Kit report as an admin.
    for (const event of [
      { kind: 'cta_click', cta: 'area_cta', pagePath: '/areas/east-brunswick', pageType: 'area' },
      { kind: 'enquiry', cta: 'area_cta', pagePath: '/areas/east-brunswick', pageType: 'area' },
    ]) {
      const res = await request.post(TRACK, { data: event, headers: { 'X-EmDash-Request': '1' } })
      expect(res.status()).toBe(200)
    }

    await page.goto('/_emdash/api/setup/dev-bypass?redirect=/')
    const report = await page.request.post('/_emdash/api/plugins/lead-reports/admin', {
      data: { type: 'page_load', page: '/' },
      headers: { 'X-EmDash-Request': '1' },
    })
    expect(report.status()).toBe(200)
    const { data } = await report.json()
    const tables = data.blocks.filter((b: { type: string }) => b.type === 'table')
    const ctaRow = tables[0].rows.find((r: { key: string }) => r.key === 'area_cta')
    expect(ctaRow.enquiries).toBeGreaterThanOrEqual(1)
    expect(ctaRow.clicks).toBeGreaterThanOrEqual(1)
  })

  test('the track route rejects malformed events', async ({ request }) => {
    const res = await request.post(TRACK, { data: { kind: 'pageview', pagePath: '/' }, headers: { 'X-EmDash-Request': '1' } })
    expect(res.status()).toBe(400)
  })
})
