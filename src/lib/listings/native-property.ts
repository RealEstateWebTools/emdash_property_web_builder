/** Convert native EmDash entries to the common listing shape. */
import { DEFAULT_SEARCH_CONFIG } from './defaults'
import { portableTextToHtml } from './portable-text-html'
import type { PropPhoto, Property } from '../pwb/types'

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

