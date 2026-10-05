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
   * PWB is optional. Pages get site details from loadSiteDetails (PWB when
   * configured, EmDash settings otherwise or when PWB fails) and listings from
   * getListingSource — never from a PWB client directly — so they render
   * with or without PWB.
   */
  // PropertyDetailPage and PwbPage receive `site` via props from
  // src/lib/page-loaders.ts, which uses the same loaders.
  const pwbBackedPages = [
    'src/components/pages/PropertyIndexPage.astro',
    'src/components/pages/PostPage.astro',
    'src/components/pages/PostsIndexPage.astro',
    'src/components/pages/SearchPage.astro',
    'src/components/pages/CategoryPage.astro',
    'src/components/pages/TagPage.astro',
    'src/components/pages/CmsPage.astro',
  ]

  it('loads site details through loadSiteDetails, not a PWB client', () => {
    for (const page of pwbBackedPages) {
      const source = readSource(page)
      expect(source, `${page} should use loadSiteDetails`).toContain('loadSiteDetails(locale')
      expect(source, `${page} must not call PWB directly`).not.toContain('createPwbClient')
    }
  })

  it('loadSiteDetails falls back to EmDash settings when PWB is missing or failing', () => {
    const source = readSource('src/lib/site-details.ts')
    expect(source).toContain('if (!isPwbConfigured()) return settingsSiteDetails()')
    expect(source).toMatch(/catch \(err\) \{[\s\S]*return settingsSiteDetails\(\)/)
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
   * Every page that queries EmDash content must pass cache hints to Astro.cache
   * when the runtime provides it, without crashing when it is absent locally.
   */
  const emdashContentPages = [
    'src/components/pages/IndexPage.astro',
    'src/components/pages/PostPage.astro',
    'src/components/pages/PostsIndexPage.astro',
    'src/components/pages/CmsPage.astro',
  ]

  it('applies guarded Astro cache hints for every EmDash content page', () => {
    for (const page of emdashContentPages) {
      const source = readSource(page)
      expect(source, `${page} should guard Astro.cache before setting cacheHint`).toContain('Astro.cache?.set(cacheHint)')
    }
  })
})

// ─── Property index conventions ───────────────────────────────────────────────

describe('property index page conventions', () => {
  it('builds search params from URL query string', () => {
    const source = readSource('src/components/pages/PropertyIndexPage.astro')
    expect(source).toContain('buildSearchParams(Astro.url.searchParams)')
  })

  it('gets listings from the configured listing source', () => {
    const source = readSource('src/components/pages/PropertyIndexPage.astro')
    expect(source).toContain('getListingSource(locale)')
    expect(source).not.toContain('createPwbClient')
  })

  it('fetches search config, results and facets in parallel', () => {
    const source = readSource('src/components/pages/PropertyIndexPage.astro')
    expect(source).toContain('Promise.all')
    expect(source).toContain('getSearchConfig()')
    expect(source).toContain('searchProperties(searchParams)')
  })
})

// ─── Property detail conventions ─────────────────────────────────────────────

describe('property detail page conventions', () => {
  // Data loading and status decisions live in the page loader (called from
  // route frontmatter, where Astro 7 still honours response status) — the
  // component only renders what it is given.
  it('gets the property from the configured listing source', () => {
    const source = readSource('src/lib/page-loaders.ts')
    expect(source).toContain('getListingSource(locale).getProperty(slug)')
  })

  it('fetches site details and property in parallel', () => {
    const source = readSource('src/lib/page-loaders.ts')
    expect(source).toContain('Promise.all')
    expect(source).toContain('getProperty(')
    expect(source).toContain('loadSiteDetails(locale')
  })

  it('sets 404 only for missing properties and uses 502 for upstream failures', () => {
    const source = readSource('src/lib/page-loaders.ts')
    expect(source).toContain('isPwbNotFoundError')
    expect(source).toContain("if (loadState === 'not_found') return 404")
    expect(source).toContain("if (loadState === 'unavailable') return 502")
    expect(source).toContain('logPwbUnexpectedError')
  })
})

// ─── Search page conventions ──────────────────────────────────────────────────

describe('search page conventions', () => {
  it('reads the search query from URL search params', () => {
    const source = readSource('src/components/pages/SearchPage.astro')
    expect(source).toContain('Astro.url.searchParams')
  })

  it('loads site details through loadSiteDetails (which owns the fallback)', () => {
    const source = readSource('src/components/pages/SearchPage.astro')
    expect(source).toContain('loadSiteDetails(locale')
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
