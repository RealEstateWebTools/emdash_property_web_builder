import type { SearchParams } from './types'

/**
 * Map URL query string (from the browser/Astro.url.searchParams)
 * to the shape the PWB API expects.
 */
export function buildSearchParams(qs: URLSearchParams): SearchParams {
  const mode = (qs.get('mode') ?? 'sale') as 'sale' | 'rental'
  const isRent = mode === 'rental'

  return {
    sale_or_rental: mode,
    bedrooms_from: qs.get('bedrooms') ?? undefined,
    bathrooms_from: qs.get('bathrooms') ?? undefined,
    property_type: qs.get('type') ?? undefined,
    for_sale_price_from: isRent ? undefined : (qs.get('price_from') ?? undefined),
    for_sale_price_till: isRent ? undefined : (qs.get('price_to') ?? undefined),
    for_rent_price_from: isRent ? (qs.get('price_from') ?? undefined) : undefined,
    for_rent_price_till: isRent ? (qs.get('price_to') ?? undefined) : undefined,
    sort_by: qs.get('sort') ?? undefined,
    page: qs.get('page') ? Number(qs.get('page')) : 1,
    per_page: 12,
  }
}

/**
 * Serialise search params back to a URL query string for links and pagination.
 */
export function buildSearchUrl(params: Partial<SearchParams>): string {
  const qs = new URLSearchParams()
  if (params.sale_or_rental && params.sale_or_rental !== 'sale') qs.set('mode', params.sale_or_rental)
  if (params.bedrooms_from) qs.set('bedrooms', params.bedrooms_from)
  if (params.bathrooms_from) qs.set('bathrooms', params.bathrooms_from)
  if (params.property_type) qs.set('type', params.property_type)
  const priceFrom = params.for_sale_price_from ?? params.for_rent_price_from
  if (priceFrom) qs.set('price_from', priceFrom)
  const priceTo = params.for_sale_price_till ?? params.for_rent_price_till
  if (priceTo) qs.set('price_to', priceTo)
  if (params.sort_by) qs.set('sort', params.sort_by)
  if (params.page && params.page > 1) qs.set('page', String(params.page))
  const str = qs.toString()
  return str ? `/properties?${str}` : '/properties'
}
