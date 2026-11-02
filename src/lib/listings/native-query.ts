/**
 * SQLite/D1 native search. ec_properties is EmDash's collection table (1.3).
 * Only published, non-trashed rows participate. No schema writes on requests.
 * Keep this adapter isolated: table names and column storage are upstream details.
 */
import { getEmDashEntry, type CacheHint } from 'emdash'
import { sql, type Kysely, type RawBuilder } from 'kysely'
import { DEFAULT_LOCALE } from '../locale'
import { ListingSourceError } from '../pwb/errors'
import type { Property, SearchParams, SearchFacets } from '../pwb/types'
import { DEFAULT_SEARCH_CONFIG } from './defaults'
import { entryToProperty, propertyTypeKey, propertyTypeLabel } from './native-property'
import type { ListingSource } from './source'

export type OnListingCacheHint = (hint: CacheHint) => void
// The queries use fixed identifiers and bound values, shared by SQLite and D1.
export type ListingDatabase = Kysely<Record<string, Record<string, unknown>>>
type Row = Record<string, unknown>
const publicRows = sql`status = 'published' AND deleted_at IS NULL`
const forSale = sql`(for_sale = 1 OR (for_sale IS NULL AND coalesce(for_rent, 0) <> 1))`
const forRent = sql`for_rent = 1`

function numeric(value: unknown): number | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function pageNumber(value: number | undefined, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  return value != null && Number.isSafeInteger(value) ? Math.max(1, Math.min(value, max)) : fallback
}

/** Minimal row conversion for map summaries, without loading descriptions/media for every match. */
function markerProperty(row: Row, locale: string): Property {
  let photos: unknown = []
  if (typeof row.photos === 'string') {
    try { photos = JSON.parse(row.photos) } catch { /* malformed optional photo data */ }
  } else if (Array.isArray(row.photos)) photos = row.photos
  return entryToProperty({ id: String(row.slug), data: {
    ...row, photos, for_sale: row.for_sale == null ? null : row.for_sale === 1,
    for_rent: row.for_rent === 1,
  } }, locale)
}

export function createNativeListingSource(
  locale: string,
  onCacheHint?: OnListingCacheHint,
  database?: ListingDatabase,
): ListingSource {
  let dbPromise: Promise<ListingDatabase> | undefined
  const db = () => dbPromise ??= database ? Promise.resolve(database) : import('emdash/runtime').then(async ({ getDb }) =>
    await getDb() as unknown as ListingDatabase)
  let localePromise: Promise<string> | undefined
  // Fallback is inventory-wide, not per property or per filtered search.
  const inventoryLocale = () => localePromise ??= (async () => {
    onCacheHint?.({ tags: ['properties'] })
    if (locale === DEFAULT_LOCALE) return locale
    const result = await sql`SELECT 1 FROM ec_properties WHERE ${publicRows} AND locale = ${locale} LIMIT 1`.execute(await db())
    return result.rows.length ? locale : DEFAULT_LOCALE
  })()
  const base = async () => sql`${publicRows} AND locale = ${await inventoryLocale()}`

  let typesPromise: Promise<{ raw: string; key: string; count: number }[]> | undefined
  const types = () => typesPromise ??= (async () => {
    const result = await sql<{ value: string | null; count: number }>`SELECT property_type AS value, count(*) AS count
      FROM ec_properties WHERE ${await base()} GROUP BY property_type`.execute(await db())
    return result.rows.flatMap(({ value, count }) => {
      const key = propertyTypeKey(value)
      return key && value != null ? [{ raw: value, key, count: Number(count) }] : []
    })
  })()

  async function publishedEntry(slug: string): Promise<Property | null> {
    const selectedLocale = await inventoryLocale()
    const result = await getEmDashEntry<'properties', Record<string, unknown>>('properties', slug, { locale: selectedLocale })
    if (result.error) throw result.error
    onCacheHint?.(result.cacheHint ?? { tags: ['properties'] })
    const entry = result.entry
    // Entry API can resolve database IDs, locale fallbacks and editor previews.
    // This listing source exposes exact published slugs in the selected inventory only.
    if (!entry || (entry.id !== slug && entry.id !== `${selectedLocale}/${slug}`) || entry.data.status !== 'published' ||
      entry.data.locale !== selectedLocale || result.fallbackLocale) return null
    return entryToProperty({ id: slug, data: entry.data }, locale)
  }

  async function filter(params: SearchParams): Promise<RawBuilder<unknown>> {
    const rental = params.sale_or_rental === 'rental'
    const parts: RawBuilder<unknown>[] = [await base(), rental ? forRent : forSale]
    if (params.featured === 'true') parts.push(sql`highlighted = 1`)
    const type = propertyTypeKey(params.property_type)
    if (type) {
      const variants = (await types()).filter((t) => t.key === type).map((t) => t.raw)
      parts.push(variants.length ? sql`property_type IN (${sql.join(variants)})` : sql`0 = 1`)
    }
    for (const [column, value] of [['bedrooms', params.bedrooms_from], ['bathrooms', params.bathrooms_from]] as const) {
      const minimum = numeric(value)
      if (minimum != null) parts.push(sql`coalesce(${sql.ref(column)}, 0) >= ${minimum}`)
    }
    const price = sql.ref(rental ? 'price_rent_monthly' : 'price_sale')
    const minimum = numeric(rental ? params.for_rent_price_from : params.for_sale_price_from)
    const maximum = numeric(rental ? params.for_rent_price_till : params.for_sale_price_till)
    if (minimum != null && minimum > 0) parts.push(sql`${price} >= ${minimum}`)
    if (maximum != null && maximum > 0) parts.push(sql`${price} <= ${maximum}`)
    return sql.join(parts.map((part) => sql`(${part})`), sql` AND `)
  }

  return {
    kind: 'native',
    async getProperty(slug) {
      const property = await publishedEntry(slug)
      if (!property) throw new ListingSourceError(`Property not found: ${slug}`, { status: 404 })
      return property
    },
    async searchProperties(params) {
      const connection = await db()
      const where = await filter(params)
      const perPage = pageNumber(params.per_page, 12, 100)
      const page = pageNumber(params.page, 1, Math.floor(Number.MAX_SAFE_INTEGER / perPage))
      const price = sql.ref(params.sale_or_rental === 'rental' ? 'price_rent_monthly' : 'price_sale')
      const order = params.sort_by === 'price_asc' ? sql`${price} IS NULL, ${price} ASC, slug ASC, id ASC`
        : params.sort_by === 'price_desc' ? sql`${price} IS NULL, ${price} DESC, slug ASC, id ASC`
        : sql`created_at DESC, slug ASC, id ASC`
      const [count, pageRows, markerRows] = await Promise.all([
        sql<{ total: number }>`SELECT count(*) AS total FROM ec_properties WHERE ${where}`.execute(connection),
        sql<{ slug: string }>`SELECT slug FROM ec_properties WHERE ${where} ORDER BY ${order}
          LIMIT ${perPage} OFFSET ${(page - 1) * perPage}`.execute(connection),
        // Preserve all-match markers, independently of numbered result pages.
        sql<Row>`SELECT id, slug, title, for_sale, for_rent, currency, price_sale, price_rent_monthly,
          latitude, longitude, photos FROM ec_properties WHERE ${where}
          AND latitude IS NOT NULL AND longitude IS NOT NULL ORDER BY ${order}`.execute(connection),
      ])
      const properties = await Promise.all(pageRows.rows.map(({ slug }) => publishedEntry(slug)))
      const total = Number(count.rows[0].total)
      return {
        data: properties.filter((p): p is Property => p !== null),
        map_markers: markerRows.rows.flatMap((row) => {
          const p = markerProperty(row, locale)
          if (p.latitude == null || p.longitude == null) return []
          return [{ id: p.id, slug: p.slug, title: p.title, lat: p.latitude, lng: p.longitude,
            price: p.formatted_price, image: p.primary_image_url, url: `/properties/${p.slug}` }]
        }),
        meta: { total, page, per_page: perPage, total_pages: Math.ceil(total / perPage) },
      }
    },
    async getSearchFacets(mode = 'sale') {
      const where = sql`(${await base()}) AND (${mode === 'rental' ? forRent : forSale})`
      const connection = await db()
      const columns = ['property_type', 'region', 'city', 'bedrooms', 'bathrooms'] as const
      const [count, ...groups] = await Promise.all([
        sql<{ value: unknown; count: number }>`SELECT NULL AS value, count(*) AS count FROM ec_properties WHERE ${where}`.execute(connection),
        ...columns.map((column) => sql<{ value: unknown; count: number }>`SELECT ${sql.ref(column)} AS value, count(*) AS count
          FROM ec_properties WHERE ${where} GROUP BY ${sql.ref(column)}`.execute(connection)),
      ])
      const counts = groups.map((group, i) => {
        const result: Record<string, number> = {}
        for (const { value, count } of group.rows) {
          const key = i === 0 ? propertyTypeKey(value) : typeof value === 'string' ? value.trim() : value
          if (key == null || key === '') continue
          result[String(key)] = (result[String(key)] ?? 0) + Number(count)
        }
        return result
      })
      return { total_count: Number(count.rows[0].count), property_types: counts[0], zones: counts[1],
        localities: counts[2], bedrooms: counts[3], bathrooms: counts[4], price_ranges: [] } satisfies SearchFacets
    },
    async getSearchConfig() {
      const typeCounts: Record<string, number> = {}
      for (const t of await types()) typeCounts[t.key] = (typeCounts[t.key] ?? 0) + t.count
      const first = await sql<{ currency: string | null; area_unit: string | null }>`SELECT
        (SELECT currency FROM ec_properties WHERE ${await base()} AND trim(coalesce(currency, '')) <> '' ORDER BY created_at DESC, slug ASC LIMIT 1) AS currency,
        (SELECT area_unit FROM ec_properties WHERE ${await base()} AND trim(coalesce(area_unit, '')) <> '' ORDER BY created_at DESC, slug ASC LIMIT 1) AS area_unit`.execute(await db())
      return { ...DEFAULT_SEARCH_CONFIG,
        property_types: Object.keys(typeCounts).sort().map((key) => ({ key, label: propertyTypeLabel(key), count: typeCounts[key] })),
        currency: first.rows[0]?.currency?.trim() || DEFAULT_SEARCH_CONFIG.currency,
        area_unit: first.rows[0]?.area_unit?.trim() || DEFAULT_SEARCH_CONFIG.area_unit,
      }
    },
  }
}
