/**
 * Native listing source: listings stored in the EmDash `properties` collection.
 *
 * Results are shaped exactly like the PWB API's, so templates don't care
 * which source served them. Production queries live in native-query.ts; the pure helpers here also
 * serve as a reference for search semantics.
 */
import type {
  MapMarker,
  Property,
  PropertySummary,
  SearchConfig,
  SearchFacets,
  SearchParams,
  SearchResults,
} from '../pwb/types'
import { DEFAULT_SEARCH_CONFIG } from './defaults'
import { propertyTypeKey, propertyTypeLabel } from './native-property'
export { entryToProperty, formatPrice, imageUrl, propertyTypeKey, propertyTypeLabel } from './native-property'
export { createNativeListingSource } from './native-query'

export const PROPERTIES_COLLECTION = 'properties'

function num(value: unknown): number | null {
  const n = typeof value === 'string' && value.trim() ? Number(value) : value
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

function priceFor(property: PropertySummary, mode: 'sale' | 'rental'): number | null {
  const cents = mode === 'rental' ? property.price_rental_monthly_current_cents : property.price_sale_current_cents
  return cents != null ? cents / 100 : null
}

/** Filter, sort and paginate like the PWB search API. Prices are in currency units. */
export function searchListings(properties: Property[], params: SearchParams): SearchResults {
  const mode = params.sale_or_rental === 'rental' ? 'rental' : 'sale'
  const priceFrom = num(mode === 'rental' ? params.for_rent_price_from : params.for_sale_price_from)
  const priceTo = num(mode === 'rental' ? params.for_rent_price_till : params.for_sale_price_till)
  const bedrooms = num(params.bedrooms_from)
  const bathrooms = num(params.bathrooms_from)
  const propertyType = propertyTypeKey(params.property_type)

  const matches = properties.filter((p) => {
    if (mode === 'rental' ? !p.for_rent : !p.for_sale) return false
    if (params.featured === 'true' && !p.highlighted) return false
    if (propertyType && p.prop_type_key !== propertyType) return false
    if (bedrooms != null && (p.count_bedrooms ?? 0) < bedrooms) return false
    if (bathrooms != null && (p.count_bathrooms ?? 0) < bathrooms) return false
    const price = priceFor(p, mode)
    if (priceFrom != null && priceFrom > 0 && (price == null || price < priceFrom)) return false
    if (priceTo != null && priceTo > 0 && (price == null || price > priceTo)) return false
    return true
  })

  // Listings without a price sort last in either direction.
  const byPrice = (direction: 1 | -1) => (a: Property, b: Property) => {
    const pa = priceFor(a, mode)
    const pb = priceFor(b, mode)
    if (pa == null || pb == null) return pa == null ? (pb == null ? 0 : 1) : -1
    return (pa - pb) * direction || a.slug.localeCompare(b.slug)
  }
  if (params.sort_by === 'price_asc') matches.sort(byPrice(1))
  else if (params.sort_by === 'price_desc') matches.sort(byPrice(-1))
  else matches.sort((a, b) => b.created_at.localeCompare(a.created_at) || a.slug.localeCompare(b.slug))

  const perPage = Math.max(1, Math.min(params.per_page ?? 12, 100))
  const totalPages = Math.ceil(matches.length / perPage)
  const page = Math.max(1, params.page ?? 1)
  const pageItems = matches.slice((page - 1) * perPage, page * perPage)

  const markers: MapMarker[] = matches
    .filter((p) => p.latitude != null && p.longitude != null)
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      lat: p.latitude as number,
      lng: p.longitude as number,
      title: p.title,
      price: p.formatted_price,
      image: p.primary_image_url,
      url: `/properties/${p.slug}`,
    }))

  return {
    data: pageItems,
    map_markers: markers,
    meta: { total: matches.length, page, per_page: perPage, total_pages: totalPages },
  }
}

function countBy(properties: Property[], keyOf: (p: Property) => string | number | null): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const p of properties) {
    const key = keyOf(p)
    if (key == null || key === '') continue
    counts[String(key)] = (counts[String(key)] ?? 0) + 1
  }
  return counts
}

export function buildFacets(properties: Property[], mode: 'sale' | 'rental'): SearchFacets {
  const inMode = properties.filter((p) => (mode === 'rental' ? p.for_rent : p.for_sale))
  return {
    total_count: inMode.length,
    property_types: countBy(inMode, (p) => p.prop_type_key),
    zones: countBy(inMode, (p) => p.region),
    localities: countBy(inMode, (p) => p.city),
    bedrooms: countBy(inMode, (p) => p.count_bedrooms),
    bathrooms: countBy(inMode, (p) => p.count_bathrooms),
    price_ranges: [],
  }
}

export function buildSearchConfig(properties: Property[]): SearchConfig {
  const types = countBy(properties, (p) => p.prop_type_key)
  const currency = properties.find((p) => p.currency)?.currency ?? DEFAULT_SEARCH_CONFIG.currency
  return {
    ...DEFAULT_SEARCH_CONFIG,
    property_types: Object.keys(types)
      .sort()
      .map((key) => ({ key, label: propertyTypeLabel(key), count: types[key] })),
    currency,
    area_unit: properties.find((p) => p.area_unit)?.area_unit ?? DEFAULT_SEARCH_CONFIG.area_unit,
  }
}
