/**
 * The property sitemap must list every listing. It once walked only the
 * default search mode (sale), silently leaving rentals out.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('emdash', () => ({ getEmDashCollection: vi.fn() }))

import { getEmDashCollection } from 'emdash'
import { GET } from './sitemap-properties.xml'

afterEach(() => vi.unstubAllEnvs())

describe('GET /sitemap-properties.xml', () => {
  it('lists sale and rental listings once each', async () => {
    vi.stubEnv('PWB_API_URL', '') // native listings
    vi.mocked(getEmDashCollection).mockResolvedValue({
      entries: [
        { id: 'for-sale', data: { title: 'A', for_sale: true } },
        { id: 'to-let', data: { title: 'B', for_sale: false, for_rent: true } },
        { id: 'both', data: { title: 'C', for_sale: true, for_rent: true } },
      ],
      cacheHint: {},
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
    vi.mocked(getEmDashCollection).mockRejectedValue(new Error('db down'))

    const res = await GET({ url: new URL('https://agency.test/sitemap-properties.xml') } as never)
    expect(res.status).toBe(200)
    expect(await res.text()).not.toContain('<loc>')
  })
})
