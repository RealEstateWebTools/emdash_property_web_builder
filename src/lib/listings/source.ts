/**
 * Where listings come from. Pages and loaders depend on this interface, not on
 * PWB, so a site can run on PWB or on listings stored in EmDash.
 *
 * Selection (see getListingSource):
 *   - PWB_API_URL set → PWB (the existing Rails backend)
 *   - otherwise       → native EmDash listings (`properties` collection, native-source.ts)
 */
import { isPwbConfigured } from '../backend'
import { createPwbClient } from '../pwb/client'
import { ListingSourceError } from '../pwb/errors'
import type { Property, SearchConfig, SearchFacets, SearchParams, SearchResults } from '../pwb/types'
import { DEFAULT_SEARCH_CONFIG, emptySearchFacets, emptySearchResults } from './defaults'
import { createNativeListingSource } from './native-source'

export { DEFAULT_SEARCH_CONFIG, emptySearchFacets, emptySearchResults }

export interface ListingSource {
  readonly kind: 'pwb' | 'native'
  searchProperties(params: SearchParams): Promise<SearchResults>
  /** Throws ListingSourceError with status 404 when the listing doesn't exist. */
  getProperty(slug: string): Promise<Property>
  getSearchFacets(saleOrRental?: 'sale' | 'rental'): Promise<SearchFacets>
  getSearchConfig(): Promise<SearchConfig>
}

/** A source with no listings (tests, and callers that need a no-op source). */
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
  return createNativeListingSource(locale)
}
