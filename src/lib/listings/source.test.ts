import { afterEach, describe, expect, it, vi } from 'vitest'
import { isPwbNotFoundError } from '../pwb/errors'
import { emptyListingSource, getListingSource } from './source'

afterEach(() => vi.unstubAllEnvs())

describe('getListingSource', () => {
  it('uses PWB when PWB_API_URL is set', () => {
    vi.stubEnv('PWB_API_URL', 'http://localhost:3001')
    expect(getListingSource('en').kind).toBe('pwb')
  })

  it('treats a blank PWB_API_URL as not configured', () => {
    vi.stubEnv('PWB_API_URL', '  ')
    expect(getListingSource('en').kind).toBe('native')
  })

  it('serves PWB listings through the source interface', async () => {
    vi.stubEnv('PWB_API_URL', 'http://localhost:3001') // msw fixture server
    const results = await getListingSource('en').searchProperties({ per_page: 3 })
    expect(results.data[0].slug).toBe('beautiful-villa-marbella')
  })
})

describe('emptyListingSource', () => {
  it('returns empty, well-formed results', async () => {
    const results = await emptyListingSource.searchProperties({ page: 2, per_page: 6 })
    expect(results).toEqual({ data: [], map_markers: [], meta: { total: 0, page: 2, per_page: 6, total_pages: 0 } })
    expect((await emptyListingSource.getSearchFacets()).total_count).toBe(0)
    expect((await emptyListingSource.getSearchConfig()).sort_options.length).toBeGreaterThan(0)
  })

  it('reports missing properties as not-found, so detail pages 404', async () => {
    await expect(emptyListingSource.getProperty('x')).rejects.toSatisfy(isPwbNotFoundError)
  })
})
