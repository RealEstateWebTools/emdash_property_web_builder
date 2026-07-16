/**
 * Unit tests for the page loaders that own route status codes.
 *
 * These exist because the previous pattern — components setting
 * `Astro.response.status` — silently stopped working under Astro 7
 * (headers flush before components render) and every missing-content
 * page regressed to HTTP 200. The wire status itself is covered by the
 * E2E specs (blog.spec.ts, property-search.spec.ts); these tests pin
 * down the loader status decisions and the fallback-site behaviour.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fallbackSite } from './pwb/fallback-site'

vi.mock('emdash', () => ({
  getEmDashEntry: vi.fn(),
  getTerm: vi.fn(),
}))

import { getEmDashEntry, getTerm } from 'emdash'
import {
  loadCmsEntry,
  loadPostEntry,
  loadPropertyDetail,
  loadPwbPage,
  loadTaxonomyTerm,
  statusForLoadState,
} from './page-loaders'

const mockedGetEntry = vi.mocked(getEmDashEntry)
const mockedGetTerm = vi.mocked(getTerm)

beforeEach(() => {
  vi.clearAllMocks()
  // The mocked PWB API served by msw (src/test/mocks/pwb-server.ts)
  vi.stubEnv('PWB_API_URL', 'http://localhost:3001')
})

describe('statusForLoadState', () => {
  it('maps load states to HTTP statuses', () => {
    expect(statusForLoadState('ok')).toBeUndefined()
    expect(statusForLoadState('not_found')).toBe(404)
    expect(statusForLoadState('unavailable')).toBe(502)
  })
})

describe('loadPostEntry', () => {
  it('returns the entry with no status when found', async () => {
    const entry = { id: 'hello', data: { title: 'Hello' } }
    mockedGetEntry.mockResolvedValue({ entry, cacheHint: { tags: [] } } as never)

    const load = await loadPostEntry('en', 'hello')
    expect(load.post).toBe(entry)
    expect(load.status).toBeUndefined()
    expect(mockedGetEntry).toHaveBeenCalledWith('posts', 'hello', { locale: 'en' })
  })

  it('returns 404 when the entry is missing', async () => {
    mockedGetEntry.mockResolvedValue({ entry: null, cacheHint: undefined } as never)

    const load = await loadPostEntry('en', 'no-such-post')
    expect(load.post).toBeNull()
    expect(load.status).toBe(404)
  })

  it('returns 404 without querying when slug or locale is missing', async () => {
    expect((await loadPostEntry('en', undefined)).status).toBe(404)
    expect((await loadPostEntry(null, 'hello')).status).toBe(404)
    expect(mockedGetEntry).not.toHaveBeenCalled()
  })
})

describe('loadCmsEntry', () => {
  it('queries the pages collection and returns 404 when missing', async () => {
    mockedGetEntry.mockResolvedValue({ entry: null, cacheHint: undefined } as never)

    const load = await loadCmsEntry('en', 'no-such-page')
    expect(load.page).toBeNull()
    expect(load.status).toBe(404)
    expect(mockedGetEntry).toHaveBeenCalledWith('pages', 'no-such-page', { locale: 'en' })
  })
})

describe('loadTaxonomyTerm', () => {
  it('returns the term with no status when found', async () => {
    const term = { slug: 'tips', label: 'Tips' }
    mockedGetTerm.mockResolvedValue(term as never)

    const load = await loadTaxonomyTerm('tag', 'tips')
    expect(load.term).toBe(term)
    expect(load.status).toBeUndefined()
    expect(mockedGetTerm).toHaveBeenCalledWith('tag', 'tips')
  })

  it('returns 404 when the term is missing', async () => {
    mockedGetTerm.mockResolvedValue(null as never)

    const load = await loadTaxonomyTerm('category', 'no-such-category')
    expect(load.term).toBeNull()
    expect(load.status).toBe(404)
  })
})

describe('loadPropertyDetail', () => {
  it('loads property and site together when the property exists', async () => {
    const load = await loadPropertyDetail('en', 'beautiful-villa-marbella')
    expect(load.loadState).toBe('ok')
    expect(load.status).toBeUndefined()
    expect(load.property?.slug).toBe('beautiful-villa-marbella')
    expect(load.site.title).toBe('Demo Realty')
  })

  it('returns not_found/404 with the fallback site for unknown slugs', async () => {
    const load = await loadPropertyDetail('en', 'no-such-property')
    expect(load.loadState).toBe('not_found')
    expect(load.status).toBe(404)
    expect(load.property).toBeNull()
    expect(load.site).toBe(fallbackSite)
  })

  it('returns unavailable/502 with the fallback site when the backend is unreachable', async () => {
    vi.stubEnv('PWB_API_URL', 'http://localhost:9')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      const load = await loadPropertyDetail('en', 'beautiful-villa-marbella')
      expect(load.loadState).toBe('unavailable')
      expect(load.status).toBe(502)
      expect(load.site).toBe(fallbackSite)
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('returns not_found/404 when slug is missing', async () => {
    const load = await loadPropertyDetail('en', undefined)
    expect(load.loadState).toBe('not_found')
    expect(load.status).toBe(404)
  })
})

describe('loadPwbPage', () => {
  it('loads an existing page with no status', async () => {
    const load = await loadPwbPage('en', 'about')
    expect(load.loadState).toBe('ok')
    expect(load.status).toBeUndefined()
    expect(load.page?.slug).toBe('about')
  })

  it('defaults a missing slug to the home page slug', async () => {
    const load = await loadPwbPage('en', undefined)
    expect(load.pageSlug).toBe('home')
  })

  it('joins catch-all slug segments', async () => {
    const load = await loadPwbPage('en', ['services', 'buying'])
    expect(load.pageSlug).toBe('services/buying')
  })

  it('returns not_found/404 for unknown slugs', async () => {
    const load = await loadPwbPage('en', 'no-such-page')
    expect(load.loadState).toBe('not_found')
    expect(load.status).toBe(404)
    expect(load.site).toBe(fallbackSite)
  })

  it('short-circuits reserved slugs without querying the backend', async () => {
    const load = await loadPwbPage('en', '_emdash/admin')
    expect(load.loadState).toBe('not_found')
    expect(load.status).toBe(404)
  })

  it('returns not_found/404 when locale is missing', async () => {
    const load = await loadPwbPage(null, 'about')
    expect(load.loadState).toBe('not_found')
    expect(load.status).toBe(404)
  })
})
