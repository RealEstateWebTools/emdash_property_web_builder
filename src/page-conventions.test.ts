/**
 * Page-level convention tests.
 *
 * These tests read source files and enforce architectural rules that
 * cannot be caught by TypeScript alone: resilience patterns, caching,
 * URL param handling, and content-type declarations.
 *
 * Follow the same pattern as localized-route-conventions.test.ts and
 * not-found-routes.test.ts — source-code checks are the right tool here
 * because Astro SSR pages cannot be instantiated in a unit test context.
 */

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(process.cwd())

function readSource(relativePath: string) {
  return readFileSync(resolve(ROOT, relativePath), 'utf8')
}


// ─── PWB resilience pattern ───────────────────────────────────────────────────

describe('PWB resilience pattern', () => {
  /**
   * Every page that calls the PWB API must:
   *   1. Initialise `site` to `fallbackSite` before any async call
   *   2. Reset to `fallbackSite` in the catch block
   * This ensures the page renders (with degraded branding) even when the
   * PWB backend is unreachable.
   */
  const pwbBackedPages = [
    'src/components/pages/PropertyDetailPage.astro',
    'src/components/pages/PropertyIndexPage.astro',
    'src/components/pages/PostPage.astro',
    'src/components/pages/PostsIndexPage.astro',
    'src/components/pages/SearchPage.astro',
    'src/components/pages/CategoryPage.astro',
    'src/components/pages/TagPage.astro',
    'src/components/pages/CmsPage.astro',
  ]

  it('initialises site to fallbackSite before any async PWB call', () => {
    for (const page of pwbBackedPages) {
      const source = readSource(page)
      expect(source, `${page} should import fallbackSite`).toContain('fallbackSite')
      expect(source, `${page} should use fallbackSite as the initial site value`).toMatch(
        /let site\s*=\s*fallbackSite/
      )
    }
  })

  it('404 page never calls the PWB backend', () => {
    const source = readSource('src/pages/404.astro')
    expect(source).not.toContain('createPwbClient')
    expect(source).toContain('fallbackSite')
  })
})

// ─── EmDash cache hints ───────────────────────────────────────────────────────

describe('EmDash cache hints', () => {
  /**
   * Every page that queries EmDash content must call Astro.cache.set(cacheHint)
   * so that the Cloudflare Worker can cache the response correctly.
   */
  const emdashContentPages = [
    'src/components/pages/IndexPage.astro',
    'src/components/pages/PostPage.astro',
    'src/components/pages/PostsIndexPage.astro',
    'src/components/pages/CmsPage.astro',
  ]

  it('calls Astro.cache.set for every EmDash content page', () => {
    for (const page of emdashContentPages) {
      const source = readSource(page)
      expect(source, `${page} should call Astro.cache.set(cacheHint)`).toContain('Astro.cache.set(cacheHint)')
    }
  })
})

// ─── Property index conventions ───────────────────────────────────────────────

describe('property index page conventions', () => {
  it('builds search params from URL query string', () => {
    const source = readSource('src/components/pages/PropertyIndexPage.astro')
    expect(source).toContain('buildSearchParams(Astro.url.searchParams)')
  })

  it('creates PWB client with locale', () => {
    const source = readSource('src/components/pages/PropertyIndexPage.astro')
    expect(source).toContain('createPwbClient(locale)')
  })

  it('fetches both site details and search config in parallel', () => {
    const source = readSource('src/components/pages/PropertyIndexPage.astro')
    expect(source).toContain('Promise.all')
    expect(source).toContain('getSiteDetails()')
    expect(source).toContain('getSearchConfig()')
  })
})

// ─── Property detail conventions ─────────────────────────────────────────────

describe('property detail page conventions', () => {
  it('creates PWB client with locale', () => {
    const source = readSource('src/components/pages/PropertyDetailPage.astro')
    expect(source).toContain('createPwbClient(locale)')
  })

  it('fetches site details and property in parallel', () => {
    const source = readSource('src/components/pages/PropertyDetailPage.astro')
    expect(source).toContain('Promise.all')
    expect(source).toContain('getProperty(')
    expect(source).toContain('getSiteDetails()')
  })

  it('sets 404 status on any error fetching the property', () => {
    const source = readSource('src/components/pages/PropertyDetailPage.astro')
    // Both the catch block and the null-slug case must set 404
    const count = (source.match(/Astro\.response\.status = 404/g) ?? []).length
    expect(count, 'should set 404 in both the catch block and the null-slug guard').toBeGreaterThanOrEqual(2)
  })
})

// ─── Search page conventions ──────────────────────────────────────────────────

describe('search page conventions', () => {
  it('reads the search query from URL search params', () => {
    const source = readSource('src/components/pages/SearchPage.astro')
    expect(source).toContain('Astro.url.searchParams')
  })

  it('gracefully falls back to fallbackSite on PWB error', () => {
    const source = readSource('src/components/pages/SearchPage.astro')
    expect(source).toMatch(/let site\s*=\s*fallbackSite/)
    // The catch block must also restore fallbackSite
    expect(source).toMatch(/catch[\s\S]{0,20}site\s*=\s*fallbackSite/)
  })
})

// ─── RSS feed conventions ─────────────────────────────────────────────────────

describe('RSS feed conventions', () => {
  it('default RSS feed returns application/rss+xml content type', () => {
    const source = readSource('src/pages/rss.xml.ts')
    expect(source).toContain('application/rss+xml')
  })

  it('localized RSS feed returns application/rss+xml content type', () => {
    const source = readSource('src/pages/[lang]/rss.xml.ts')
    expect(source).toContain('application/rss+xml')
  })

  it('both RSS feeds use buildRssXml from lib/rss', () => {
    expect(readSource('src/pages/rss.xml.ts')).toContain('buildRssXml')
    expect(readSource('src/pages/[lang]/rss.xml.ts')).toContain('buildRssXml')
    expect(readSource('src/pages/rss.xml.ts')).toContain('/lib/rss')
    expect(readSource('src/pages/[lang]/rss.xml.ts')).toContain('/lib/rss')
  })

  it('default RSS feed uses DEFAULT_LOCALE', () => {
    const source = readSource('src/pages/rss.xml.ts')
    expect(source).toContain('DEFAULT_LOCALE')
  })
})

// ─── prerender: false on interactive pages ────────────────────────────────────

describe('prerender: false on interactive pages', () => {
  /**
   * Pages that depend on per-request URL params (query string, user state)
   * must opt out of prerendering explicitly.
   */
  const dynamicPages = [
    'src/pages/search.astro',
    'src/pages/[lang]/search.astro',
  ]

  it('marks search pages as dynamic (prerender: false)', () => {
    for (const page of dynamicPages) {
      const source = readSource(page)
      expect(source, `${page} should have prerender = false`).toContain('prerender = false')
    }
  })
})
