/**
 * Native listing source: listings stored in the EmDash `properties` collection.
 *
 * Results are shaped exactly like the PWB API's, so templates don't care
 * which source served them. Search, filtering, facets and sorting run in
 * memory over the published listings (at most MAX_LISTINGS) — comfortable for
 * an agency's inventory, and EmDash request-caches the collection query.
 */
import { getEmDashCollection } from 'emdash'
import { DEFAULT_LOCALE } from '../locale'
import { ListingSourceError } from '../pwb/errors'
import type {
  MapMarker,
  PropPhoto,
  Property,
  PropertySummary,
  SearchConfig,
  SearchFacets,
  SearchParams,
  SearchResults,
} from '../pwb/types'
import { portableTextToHtml } from './portable-text-html'
import { DEFAULT_SEARCH_CONFIG } from './defaults'
import type { ListingSource } from './source'

export const PROPERTIES_COLLECTION = 'properties'
export const MAX_LISTINGS = 1000

type Data = Record<string, unknown>

/** A collection entry as returned by getEmDashCollection: `id` is the slug. */
export interface PropertyEntry {
  id: string
  data: Data
}

function num(value: unknown): number | null {
  const n = typeof value === 'string' && value.trim() ? Number(value) : value
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function dateString(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  return typeof value === 'string' ? value : new Date(0).toISOString()
}

/** Public URL for an EmDash image field value (served by EmDash's media route). */
export function imageUrl(image: unknown): string | null {
  if (!image || typeof image !== 'object') return null
  const value = image as { src?: unknown; url?: unknown; meta?: { storageKey?: unknown } }
  if (typeof value.meta?.storageKey === 'string') return `/_emdash/api/media/file/${value.meta.storageKey}`
  if (typeof value.src === 'string') return value.src
  return typeof value.url === 'string' ? value.url : null
}

export function formatPrice(amount: number | null, currency: string, locale: string): string | null {
  if (amount == null || amount <= 0) return null
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `${Math.round(amount).toLocaleString(locale)} ${currency}`
  }
}

/**
 * Canonical property type key. Types are free text in the admin, so "Villa",
 * "villa" and PWB's "types.villa" must be one type (one filter, one facet).
 */
export function propertyTypeKey(value: unknown): string | null {
  const raw = str(value)
  if (!raw) return null
  const slug = raw
    .replace(/^types\./i, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '')
  return slug ? `types.${slug}` : null
}

/** Human label for a property type key ("types.country_house" → "Country house"). */
export function propertyTypeLabel(key: string): string {
  const words = key.replace(/^types\./, '').replace(/[_-]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function entryToProperty(entry: PropertyEntry, locale: string): Property {
  const d = entry.data
  const forRent = d.for_rent === true
  // EmDash doesn't apply defaults to optional fields, so a listing created in
  // the admin has no for_sale unless the toggle was touched: unset means for
  // sale, unless it's a rental.
  const forSale = d.for_sale == null ? !forRent : d.for_sale !== false
  const currency = str(d.currency) ?? DEFAULT_SEARCH_CONFIG.currency
  const sale = num(d.price_sale)
  const rent = num(d.price_rent_monthly)

  const photos: PropPhoto[] = (Array.isArray(d.photos) ? d.photos : [])
    .map((row, index) => {
      const url = imageUrl((row as Data)?.image)
      const image = (row as Data)?.image as { alt?: unknown } | undefined
      return url
        ? { id: index, url, alt: str((row as Data)?.caption) ?? str(image?.alt), position: index, variants: {} }
        : null
    })
    .filter((photo): photo is PropPhoto => photo !== null)

  const address = [str(d.address), str(d.postal_code)].filter(Boolean).join(', ') || null

  return {
    id: String(d.id ?? entry.id),
    slug: entry.id,
    reference: str(d.reference),
    title: str(d.title) ?? entry.id,
    price_sale_current_cents: sale != null ? Math.round(sale * 100) : null,
    price_rental_monthly_current_cents: rent != null ? Math.round(rent * 100) : null,
    formatted_price: forSale ? formatPrice(sale, currency, locale) : formatPrice(rent, currency, locale),
    currency,
    count_bedrooms: num(d.bedrooms),
    count_bathrooms: num(d.bathrooms),
    count_garages: num(d.garages),
    constructed_area: num(d.constructed_area),
    area_unit: str(d.area_unit) ?? 'sqm',
    highlighted: d.highlighted === true,
    for_sale: forSale,
    for_rent: forRent,
    primary_image_url: photos[0]?.url ?? null,
    prop_photos: photos,
    description: portableTextToHtml(d.description) || null,
    address,
    city: str(d.city),
    region: str(d.region),
    country_code: str(d.country_code),
    latitude: num(d.latitude),
    longitude: num(d.longitude),
    prop_type_key: propertyTypeKey(d.property_type),
    plot_area: num(d.plot_area),
    created_at: dateString(d.createdAt),
    updated_at: dateString(d.updatedAt),
    page_contents: [],
  }
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
    return (pa - pb) * direction
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

/** Published listings for a locale, falling back to the default locale's when it has none. */
async function loadProperties(locale: string): Promise<Property[]> {
  let { entries } = await getEmDashCollection(PROPERTIES_COLLECTION, { locale, limit: MAX_LISTINGS })
  if (entries.length === 0 && locale !== DEFAULT_LOCALE) {
    ;({ entries } = await getEmDashCollection(PROPERTIES_COLLECTION, { locale: DEFAULT_LOCALE, limit: MAX_LISTINGS }))
  }
  return (entries as unknown as PropertyEntry[]).map((entry) => entryToProperty(entry, locale))
}

export function createNativeListingSource(locale: string): ListingSource {
  let cache: Promise<Property[]> | null = null
  const all = () => {
    cache ??= loadProperties(locale)
    return cache
  }
  return {
    kind: 'native',
    async searchProperties(params) {
      return searchListings(await all(), params)
    },
    async getProperty(slug) {
      const property = (await all()).find((p) => p.slug === slug)
      if (!property) throw new ListingSourceError(`Property not found: ${slug}`, { status: 404 })
      return property
    },
    async getSearchFacets(mode = 'sale') {
      return buildFacets(await all(), mode)
    },
    async getSearchConfig() {
      return buildSearchConfig(await all())
    },
  }
}
