/**
 * The property sitemap must list every listing. It once walked only the
 * default search mode (sale), silently leaving rentals out.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/listings/source', () => ({ getListingSource: vi.fn() }))

import { getListingSource } from '../lib/listings/source'
import type { SearchParams } from '../lib/pwb/types'
import { GET } from './sitemap-properties.xml'

afterEach(() => vi.unstubAllEnvs())

describe('GET /sitemap-properties.xml', () => {
  it('lists sale and rental listings once each', async () => {
    vi.stubEnv('PWB_API_URL', '') // native listings
    vi.mocked(getListingSource).mockReturnValue({
      searchProperties: async ({ sale_or_rental }: SearchParams) => ({
        data: (sale_or_rental === 'rental' ? ['to-let', 'both'] : ['for-sale', 'both']).map((slug) => ({ slug })),
        meta: { total_pages: 1 },
      }),
    } as never)

    const res = await GET({ url: new URL('https://agency.test/sitemap-properties.xml') } as never)
    const xml = await res.text()
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])

    expect(res.headers.get('Content-Type')).toContain('application/xml')
    expect(locs.sort()).toEqual([
      'https://agency.test/properties/both',
      'https://agency.test/properties/for-sale',
      'https://agency.test/properties/to-let',
    ])
  })

  it('returns an empty sitemap rather than an error when listings are unavailable', async () => {
    vi.stubEnv('PWB_API_URL', '')
    vi.mocked(getListingSource).mockReturnValue({ searchProperties: async () => { throw new Error('db down') } } as never)

    const res = await GET({ url: new URL('https://agency.test/sitemap-properties.xml') } as never)
    expect(res.status).toBe(200)
    expect(await res.text()).not.toContain('<loc>')
    // A transient outage must not be cached as the sitemap for an hour.
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('keeps every listing when one has an unparseable updated_at', async () => {
    // new Date('garbage').toISOString() throws; that used to empty the whole sitemap.
    vi.stubEnv('PWB_API_URL', '')
    vi.mocked(getListingSource).mockReturnValue({
      searchProperties: async ({ sale_or_rental }: SearchParams) => ({
        data: sale_or_rental === 'rental' ? [] : [
          { slug: 'bad-date', updated_at: 'not a date' },
          { slug: 'good-date', updated_at: '2026-10-05T12:00:00Z' },
        ],
        meta: { total_pages: 1 },
      }),
    } as never)

    const res = await GET({ url: new URL('https://agency.test/sitemap-properties.xml') } as never)
    const xml = await res.text()

    expect(xml).toContain('<loc>https://agency.test/properties/bad-date</loc><changefreq>')
    expect(xml).toContain('<loc>https://agency.test/properties/good-date</loc><lastmod>2026-10-05</lastmod>')
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=3600')
  })
})
