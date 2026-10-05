/**
 * E2E: the listingCollection Portable Text block (pwb-property-embeds).
 *
 * Runs in the mocked suite (`pnpm test:visual`): the seeded post
 * "choosing-the-right-neighbourhood" ends with a "newest for sale"
 * collection, and the mock PWB API serves the fixture listing.
 */

import { test, expect } from '@playwright/test'

test.describe('Listing collection block', () => {
  test('renders live listings inside a post with a view-all link', async ({ page }) => {
    const response = await page.goto('/posts/choosing-the-right-neighbourhood')
    expect(response?.status()).toBe(200)

    const collection = page.locator('.listing-collection')
    await expect(collection).toHaveCount(1)
    await expect(collection.locator('.listing-collection__heading')).toHaveText('Homes available now')

    const card = collection.locator('.listing-collection__card').first()
    await expect(card).toHaveAttribute('href', '/properties/beautiful-villa-marbella')
    await expect(card.locator('.listing-collection__title')).toHaveText('Beautiful Villa in Marbella')

    await expect(collection.locator('.listing-collection__view-all')).toHaveAttribute('href', '/properties')
  })

  test('cards are laid out as a grid, not as article list items', async ({ page }) => {
    // Post prose styles target ul/li/img/a; the block must not inherit them.
    await page.goto('/posts/choosing-the-right-neighbourhood')
    const grid = page.locator('.listing-collection__grid')
    await expect(grid).toHaveCSS('display', 'grid')
    await expect(grid).toHaveCSS('padding-left', '0px')
    await expect(page.locator('.listing-collection__card').first()).toHaveCSS('text-decoration-line', 'none')
  })
})
