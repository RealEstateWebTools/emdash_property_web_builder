// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Sqlite from 'better-sqlite3'
import { Kysely, SqliteDialect, sql } from 'kysely'
import { getEmDashEntry } from 'emdash'
import { createNativeListingSource, type ListingDatabase } from './native-query'
import { buildFacets, buildSearchConfig, searchListings } from './native-source'
import { entryToProperty } from './native-property'
import { isPwbNotFoundError } from '../pwb/errors'

vi.mock('emdash', () => ({ getEmDashEntry: vi.fn() }))

let sqlite: InstanceType<typeof Sqlite>
let db: ListingDatabase
let statements: string[]

const columns = `id TEXT PRIMARY KEY, slug TEXT, status TEXT DEFAULT 'published', deleted_at TEXT,
  locale TEXT DEFAULT 'en', created_at TEXT DEFAULT '2026-01-01T00:00:00Z', updated_at TEXT,
  title TEXT, for_sale INTEGER, for_rent INTEGER, highlighted INTEGER, price_sale REAL,
  price_rent_monthly REAL, bedrooms INTEGER, bathrooms REAL, property_type TEXT, currency TEXT,
  area_unit TEXT, region TEXT, city TEXT, latitude REAL, longitude REAL, photos TEXT, description TEXT`

function insert(slug: string, values: Record<string, unknown> = {}) {
  const row = { id: `id-${slug}`, slug, title: slug, ...values }
  sqlite.prepare(`INSERT INTO ec_properties (${Object.keys(row).join(',')}) VALUES (${Object.keys(row).map(() => '?').join(',')})`).run(...Object.values(row))
}

function asEntry(row: Record<string, unknown>) {
  return { id: row.slug as string, data: { ...row,
    createdAt: row.created_at, updatedAt: row.updated_at,
    for_sale: row.for_sale == null ? null : row.for_sale === 1, for_rent: row.for_rent === 1,
    highlighted: row.highlighted === 1,
    photos: typeof row.photos === 'string' ? JSON.parse(row.photos) : [],
    description: typeof row.description === 'string' ? JSON.parse(row.description) : [],
  } }
}

beforeEach(() => {
  sqlite = new Sqlite(':memory:')
  sqlite.exec(`CREATE TABLE ec_properties (${columns});
    CREATE INDEX listings_visibility ON ec_properties(locale, status, deleted_at, created_at, slug)`)
  statements = []
  db = new Kysely({ dialect: new SqliteDialect({ database: sqlite }), log(event) {
    if (event.level === 'query') statements.push(event.query.sql)
  } })
  vi.mocked(getEmDashEntry).mockReset().mockImplementation(async (_type, slug, options) => {
    const row = sqlite.prepare("SELECT * FROM ec_properties WHERE slug = ? AND locale = ? AND deleted_at IS NULL AND status = 'published'").get(slug, options?.locale) as Record<string, unknown> | undefined
    return { entry: row ? asEntry(row) : null, cacheHint: { tags: ['properties', `properties:${slug}`] } } as never
  })
})
afterEach(async () => { await db.destroy() })

function source(locale = 'en', onCacheHint = vi.fn()) {
  return createNativeListingSource(locale, onCacheHint, db)
}

it('searches, counts, facets and maps inventory beyond 1,000 without hydrating every listing', async () => {
  sqlite.transaction(() => {
    for (let i = 0; i < 1205; i++) insert(`listing-${String(i).padStart(4, '0')}`, {
      price_sale: i, city: i < 1000 ? 'Town' : 'Beyond', property_type: 'Villa',
      latitude: 36, longitude: -4, photos: JSON.stringify([{ image: { src: '/photo.jpg' } }]),
    })
  })()
  const s = source()
  const results = await s.searchProperties({ page: 101, per_page: 12, sort_by: 'price_asc' })
  expect(results.meta).toEqual({ total: 1205, total_pages: 101, per_page: 12, page: 101 })
  expect(results.data.map((p) => p.slug)).toEqual([1200, 1201, 1202, 1203, 1204].map((i) => `listing-${i}`))
  expect(results.map_markers).toHaveLength(1205)
  expect(results.map_markers.at(-1)).toMatchObject({ slug: 'listing-1204', image: '/photo.jpg' })
  expect(getEmDashEntry).toHaveBeenCalledTimes(5)
  expect(await s.getSearchFacets()).toMatchObject({ total_count: 1205, localities: { Town: 1000, Beyond: 205 } })
  expect((await s.getSearchConfig()).property_types).toEqual([{ key: 'types.villa', label: 'Villa', count: 1205 }])
  expect(statements.some((s) => s.includes('count(*)'))).toBe(true)
  expect(statements.some((s) => s.includes('LIMIT ? OFFSET ?'))).toBe(true)
})

it('resolves an independent detail slug with no full collection scan', async () => {
  insert('beyond-old-cap')
  const onHint = vi.fn()
  expect((await source('en', onHint).getProperty('beyond-old-cap')).slug).toBe('beyond-old-cap')
  expect(getEmDashEntry).toHaveBeenCalledWith('properties', 'beyond-old-cap', { locale: 'en' })
  expect(statements).toEqual([])
  expect(onHint).toHaveBeenCalledWith({ tags: ['properties'] })
  expect(onHint).toHaveBeenCalledWith({ tags: ['properties', 'properties:beyond-old-cap'] })
})

describe('search parity', () => {
  beforeEach(() => {
    insert('villa', { price_sale: 450000, bedrooms: 4, bathrooms: 3, highlighted: 1, property_type: 'Villa', city: 'Marbella', region: 'Malaga', currency: 'EUR', latitude: 36, longitude: -4 })
    insert('flat', { price_sale: 200000, bedrooms: 2, property_type: 'types.flat', currency: 'EUR' })
    insert('country-a', { price_sale: 200000, property_type: 'Country House' })
    insert('country-b', { price_sale: 200000, property_type: 'types.country_house' })
    insert('rental', { for_rent: 1, price_rent_monthly: 1200, property_type: 'Flat' })
    insert('both', { for_sale: 1, for_rent: 1, price_sale: 100000, price_rent_monthly: 900 })
    insert('unpriced', { property_type: 'Plot' })
    insert('zero', { price_sale: 0 })
    insert('negative', { price_sale: -1 })
    insert('atico', { property_type: ' Ático dúplex ' })
  })
  const cases = [ {}, { sale_or_rental: 'rental' as const }, { featured: 'true' as const },
    { property_type: 'country house' }, { property_type: 'types.ático_dúplex' }, { property_type: "'; DROP TABLE ec_properties; --" },
    { bedrooms_from: '3', bathrooms_from: '2' }, { bedrooms_from: '0' },
    { for_sale_price_from: '200000', for_sale_price_till: '450000' },
    { for_sale_price_from: 'garbage', for_sale_price_till: '-1' },
    { sort_by: 'price_asc' }, { sort_by: 'price_desc' }, { page: 2, per_page: 2 },
    { sale_or_rental: 'rental' as const, for_rent_price_from: '1000', sort_by: 'price_desc' },
  ]
  it.each(cases)('matches existing semantics for %j', async (params) => {
    const all = sqlite.prepare('SELECT * FROM ec_properties ORDER BY slug ASC').all().map((row) => entryToProperty(asEntry(row as Record<string, unknown>), 'en'))
    const actual = await source().searchProperties(params)
    const expected = searchListings(all, params)
    expect(actual.meta).toEqual(expected.meta)
    expect(actual.data.map((p) => p.slug)).toEqual(expected.data.map((p) => p.slug))
    expect(actual.map_markers).toEqual(expected.map_markers)
    expect(await source().getSearchFacets()).toEqual(buildFacets(all, 'sale'))
    expect(await source().getSearchFacets('rental')).toEqual(buildFacets(all, 'rental'))
    expect(await source().getSearchConfig()).toEqual(buildSearchConfig(all))
  })
})

it('hides drafts, archived and deleted listings from every query', async () => {
  insert('visible')
  insert('draft', { status: 'draft', city: 'Secret' })
  insert('archived', { status: 'archived' })
  insert('deleted', { deleted_at: '2026-10-01' })
  const s = source()
  expect((await s.searchProperties({})).data.map((p) => p.slug)).toEqual(['visible'])
  expect((await s.getSearchFacets()).total_count).toBe(1)
  for (const slug of ['draft', 'archived', 'deleted', 'missing']) {
    await expect(s.getProperty(slug)).rejects.toSatisfy(isPwbNotFoundError)
  }
})

it('rejects preview drafts, mismatched slugs and implicit per-property locale fallbacks', async () => {
  insert('spanish', { locale: 'es' })
  for (const entry of [asEntry({ slug: 'other', status: 'published', locale: 'es' }),
    asEntry({ slug: 'wanted', status: 'draft', locale: 'es' }),
    asEntry({ slug: 'wanted', status: 'published', locale: 'en' })]) {
    vi.mocked(getEmDashEntry).mockResolvedValueOnce({ entry, cacheHint: {} } as never)
    await expect(source('es').getProperty('wanted')).rejects.toSatisfy(isPwbNotFoundError)
  }
})

it('falls back only when the whole requested published inventory is empty', async () => {
  insert('english')
  insert('spanish-draft', { locale: 'es', status: 'draft' })
  expect((await source('es').getProperty('english')).slug).toBe('english')
  expect((await source('es').searchProperties({})).meta.total).toBe(1)
  insert('spanish', { locale: 'es', price_sale: 100 })
  expect((await source('es').searchProperties({ for_sale_price_from: '1000' })).meta.total).toBe(0)
  await expect(source('es').getProperty('english')).rejects.toSatisfy(isPwbNotFoundError)
  expect((await source('es').getProperty('spanish')).title).toBe('spanish')
})

it('propagates database and entry errors rather than reporting missing inventory', async () => {
  vi.mocked(getEmDashEntry).mockResolvedValueOnce({ entry: null, error: new Error('offline'), cacheHint: {} } as never)
  await expect(source().getProperty('anything')).rejects.toThrow('offline')
  await sql`DROP TABLE ec_properties`.execute(db)
  await expect(source().searchProperties({})).rejects.toThrow()
})

it('normalises locale-prefixed EmDash IDs to the public property slug', async () => {
  insert('translated', { locale: 'es' })
  vi.mocked(getEmDashEntry).mockResolvedValueOnce({ entry: {
    id: 'es/translated', data: { status: 'published', locale: 'es', title: 'Traducido' },
  }, cacheHint: {} } as never)
  expect(await source('es').getProperty('translated')).toMatchObject({ slug: 'translated', title: 'Traducido' })
})

it('reflects publishing changes on the next request and tags collection-wide dependencies', async () => {
  insert('first')
  const onHint = vi.fn()
  expect((await source('en', onHint).searchProperties({})).meta.total).toBe(1)
  expect(onHint).toHaveBeenCalledWith({ tags: ['properties'] })
  sqlite.prepare("UPDATE ec_properties SET status = 'draft' WHERE slug = 'first'").run()
  insert('second', { city: 'New town' })
  const next = source()
  expect((await next.searchProperties({})).data.map((p) => p.slug)).toEqual(['second'])
  expect((await next.getSearchFacets()).localities).toEqual({ 'New town': 1 })
})

it('produces equivalent search, facet and configuration results through the D1 driver', async () => {
  // Exercise the same driver as EmDash's Cloudflare adapter, with Wrangler's
  // local workerd/D1 runtime. No remote database or credentials are used.
  const { createRequire } = await import('node:module')
  const require = createRequire(import.meta.url)
  const { Miniflare, convertV4MiniflareOptions } = createRequire(require.resolve('wrangler/package.json'))('miniflare')
  const { D1Dialect } = createRequire(require.resolve('@emdash-cms/cloudflare'))('kysely-d1')
  const { server } = await import('../../test/mocks/pwb-server')
  // MSW's API fixtures must not intercept Miniflare's local RPC transport.
  server.close()
  const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default { fetch() { return new Response("ok") } }',
    compatibilityDate: '2026-10-24', d1Databases: ['DB'] }))
  let d1: ListingDatabase | undefined
  try {
    const binding = await mf.getD1Database('DB')
    await binding.prepare(`CREATE TABLE ec_properties (${columns})`).run()
    sqlite.transaction(() => {
      for (let i = 0; i < 1010; i++) insert(`property-${i}`, { price_sale: i % 11 ? i : null,
        property_type: i % 2 ? 'Villa' : 'types.flat', bedrooms: i % 5,
        for_rent: i % 3 === 0 ? 1 : 0, for_sale: i % 4 === 0 ? 1 : null,
        price_rent_monthly: i, latitude: i % 100 === 0 ? 36 : null,
        longitude: -4, city: 'Town', currency: 'EUR',
      })
      insert('draft', { status: 'draft' })
      insert('deleted', { deleted_at: '2026-01-01' })
    })()
    const rows = sqlite.prepare('SELECT * FROM ec_properties').all() as Record<string, unknown>[]
    for (let offset = 0; offset < rows.length; offset += 50) {
      await binding.batch(rows.slice(offset, offset + 50).map((row) => binding.prepare(
        `INSERT INTO ec_properties (${Object.keys(row).join(',')}) VALUES (${Object.keys(row).map(() => '?').join(',')})`,
      ).bind(...Object.values(row))))
    }
    d1 = new Kysely({ dialect: new D1Dialect({ database: binding }) })
    const native = source()
    const cloudflare = createNativeListingSource('en', undefined, d1)
    for (const params of [{}, { page: 80, per_page: 12 }, { sort_by: 'price_asc' }, { sort_by: 'price_desc' },
      { sale_or_rental: 'rental' as const, for_rent_price_from: '900' }, { property_type: 'villa', bedrooms_from: '3' }]) {
      expect(await cloudflare.searchProperties(params)).toEqual(await native.searchProperties(params))
    }
    expect(await cloudflare.getSearchFacets()).toEqual(await native.getSearchFacets())
    expect(await cloudflare.getSearchConfig()).toEqual(await native.getSearchConfig())
    expect((await createNativeListingSource('es', undefined, d1).searchProperties({})).meta)
      .toEqual((await source('es').searchProperties({})).meta)
  } finally {
    await d1?.destroy()
    await mf.dispose()
    server.listen({ onUnhandledFrame: 'error' })
  }
}, 60000)
