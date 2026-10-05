import type { SearchConfig, SearchFacets, SearchParams, SearchResults } from '../pwb/types'

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
