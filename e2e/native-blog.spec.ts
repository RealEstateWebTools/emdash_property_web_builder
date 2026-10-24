import { test, expect } from '@playwright/test'

// Exercise the patched EmDash widget with the real locale-prefixed loader IDs.
for (const [prefix, slug] of [
  ['', 'making-an-offer'],
  ['/es', 'guia-primer-comprador'],
  ['/fr', 'guide-premier-achat'],
]) {
  test(`recent posts link to published articles in ${prefix || 'English'}`, async ({ page }) => {
    const response = await page.goto(`${prefix}/posts/${slug}`)
    expect(response?.status()).toBe(200)

    const links = page.locator('.widget-recent-posts__link')
    await expect(links.first()).toBeVisible()
    const hrefs = await links.evaluateAll((items) => items.map((item) => item.getAttribute('href')))
    expect(hrefs).toContain(`${prefix}/posts/${slug}`)
    for (const href of hrefs) {
      expect(href).toMatch(new RegExp(`^${prefix}/posts/[^/]+$`))
    }

    const target = links.first()
    const href = await target.getAttribute('href')
    const navigation = page.waitForResponse((result) => result.url() === new URL(href!, page.url()).href)
    await target.click()
    expect((await navigation).status()).toBe(200)
    await expect(page.locator('h1')).toBeVisible()
  })
}
