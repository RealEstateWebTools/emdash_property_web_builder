/**
 * Where listings come from. Pages and loaders depend on this interface, not on
 * PWB, so a site can run on PWB or on listings stored in EmDash.
 *
 * Selection (see getListingSource):
 *   - PWB_API_URL set → PWB (the existing Rails backend)
 *   - otherwise       → native EmDash listings (`properties` collection)
 */
import { isPwbConfigured } from '../backend'
import { createPwbClient } from '../pwb/client'
import { ListingSourceError } from '../pwb/errors'
import type { Property, SearchConfig, SearchFacets, SearchParams, SearchResults } from '../pwb/types'

export interface ListingSource {
  readonly kind: 'pwb' | 'native'
  searchProperties(params: SearchParams): Promise<SearchResults>
  /** Throws ListingSourceError with status 404 when the listing doesn't exist. */
  getProperty(slug: string): Promise<Property>
  getSearchFacets(saleOrRental?: 'sale' | 'rental'): Promise<SearchFacets>
  getSearchConfig(): Promise<SearchConfig>
}

export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  property_types: [],
  price_options: {
    sale: { from: [0, 100000, 250000, 500000, 1000000], to: [100000, 250000, 500000, 1000000, 2000000] },
    rent: { from: [0, 500, 1000, 2000, 3000], to: [500, 1000, 2000, 3000, 5000] },
  },
  features: [],
  bedrooms: [0, 1, 2, 3, 4, 5],
  bathrooms: [0, 1, 2, 3, 4],
  sort_options: [
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'newest', label: 'Newest First' },
  ],
  area_unit: 'sqm',
  currency: 'EUR',
}

export function emptySearchResults(params: SearchParams = {}): SearchResults {
  return { data: [], map_markers: [], meta: { total: 0, page: params.page ?? 1, per_page: params.per_page ?? 12, total_pages: 0 } }
}

export function emptySearchFacets(): SearchFacets {
  return { total_count: 0, property_types: {}, zones: {}, localities: {}, bedrooms: {}, bathrooms: {}, price_ranges: [] }
}

/** A source with no listings — stands in until native listings exist. */
export const emptyListingSource: ListingSource = {
  kind: 'native',
  async searchProperties(params) {
    return emptySearchResults(params)
  },
  async getProperty(slug) {
    throw new ListingSourceError(`Property not found: ${slug}`, { status: 404 })
  },
  async getSearchFacets() {
    return emptySearchFacets()
  },
  async getSearchConfig() {
    return DEFAULT_SEARCH_CONFIG
  },
}

export function getListingSource(locale: string): ListingSource {
  if (isPwbConfigured()) {
    const client = createPwbClient(locale)
    return {
      kind: 'pwb',
      searchProperties: (params) => client.searchProperties(params),
      getProperty: (slug) => client.getProperty(slug),
      getSearchFacets: (mode) => client.getSearchFacets(mode),
      getSearchConfig: () => client.getSearchConfig(),
    }
  }
  return emptyListingSource
}
