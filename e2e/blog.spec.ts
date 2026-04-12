/**
 * E2E: Blog listing → post detail golden path.
 *
 * Requires a running dev server: npx emdash dev
 */

import { test, expect } from '@playwright/test'

test.describe('Blog listing → post flow', () => {
  test('blog listing page renders without error', async ({ page }) => {
    await page.goto('/posts')
    await expect(page).not.toHaveTitle(/error/i)
  })

  test('blog listing shows post cards', async ({ page }) => {
    await page.goto('/posts')

    const postCards = page.locator('a[href*="/posts/"]')
    const count = await postCards.count()
    // Seeds include 7+ published posts
    expect(count).toBeGreaterThan(0)
  })

  test('clicking a post card navigates to the post detail', async ({ page }) => {
    await page.goto('/posts')

    const firstCard = page.locator('a[href*="/posts/"]').first()
    if (await firstCard.count() === 0) {
      test.skip()
      return
    }

    const href = await firstCard.getAttribute('href')
    await firstCard.click()
    await expect(page).toHaveURL(new RegExp(href!))
    await expect(page).not.toHaveTitle(/error/i)
  })

  test('post detail page shows title in h1', async ({ page }) => {
    await page.goto('/posts')

    const firstCard = page.locator('a[href*="/posts/"]').first()
    if (await firstCard.count() === 0) {
      test.skip()
      return
    }

    const cardTitle = await firstCard.textContent()
    await firstCard.click()

    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible()
    const text = await h1.textContent()
    expect(text!.trim().length).toBeGreaterThan(0)
  })

  test('post detail page title includes My Blog', async ({ page }) => {
    await page.goto('/posts')

    const firstCard = page.locator('a[href*="/posts/"]').first()
    if (await firstCard.count() === 0) {
      test.skip()
      return
    }

    await firstCard.click()

    // Page title should follow "Post Title — My Blog" pattern (from Base.astro convention)
    const title = await page.title()
    expect(title).toMatch(/My Blog|Mi Blog|Mon Blog/)
  })

  test('non-existent post slug returns 404', async ({ page }) => {
    const response = await page.goto('/posts/this-post-does-not-exist-xyz')
    expect(response?.status()).toBe(404)
  })

  test('localized blog listing renders in Spanish', async ({ page }) => {
    await page.goto('/es/posts')
    await expect(page).not.toHaveTitle(/error/i)
    // URL should still be /es/posts
    expect(page.url()).toContain('/es/posts')
  })

  test('RSS feed responds with XML content type', async ({ page }) => {
    const response = await page.goto('/rss.xml')
    expect(response?.headers()['content-type']).toContain('application/rss+xml')
  })
})
