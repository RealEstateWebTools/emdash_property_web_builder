import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('emdash', () => ({ getEmDashCollection: vi.fn() }))

import { getEmDashCollection } from 'emdash'
import { isPwbNotFoundError } from '../pwb/errors'
import {
  buildFacets,
  buildSearchConfig,
  createNativeListingSource,
  entryToProperty,
  formatPrice,
  imageUrl,
  propertyTypeKey,
  propertyTypeLabel,
  searchListings,
} from './native-source'

const mockedCollection = vi.mocked(getEmDashCollection)

function entry(slug: string, data: Record<string, unknown>) {
  return { id: slug, data: { id: `ulid-${slug}`, title: slug, createdAt: '2026-01-01T00:00:00Z', ...data } }
}

const villa = entry('villa', {
  for_sale: true,
  highlighted: true,
  price_sale: 450000,
  currency: 'EUR',
  property_type: 'types.villa',
  bedrooms: 4,
  bathrooms: 3,
  city: 'Marbella',
  region: 'Malaga',
  latitude: 36.5,
  longitude: -4.9,
  createdAt: '2026-03-01T00:00:00Z',
  photos: [
    { image: { id: 'm1', alt: 'Pool', meta: { storageKey: 'm1.jpg' } }, caption: '' },
    { image: { id: 'm2', meta: { storageKey: 'm2.jpg' } }, caption: 'Terrace' },
  ],
  description: [{ _type: 'block', style: 'normal', children: [{ _type: 'span', text: 'Sea views' }] }],
})
const flat = entry('flat', { for_sale: true, price_sale: 200000, property_type: 'types.flat', bedrooms: 2, createdAt: '2026-02-01T00:00:00Z' })
const rental = entry('rental', { for_sale: false, for_rent: true, price_rent_monthly: 1200, property_type: 'types.flat', bedrooms: 1 })
const unpriced = entry('unpriced', { for_sale: true, property_type: 'types.plot' })

const all = [villa, flat, rental, unpriced].map((e) => entryToProperty(e, 'en'))

describe('entryToProperty', () => {
  it('maps a native entry onto the PWB property shape', () => {
    expect(all[0]).toMatchObject({
      id: 'ulid-villa',
      slug: 'villa',
      title: 'villa',
      price_sale_current_cents: 45000000,
      formatted_price: '€450,000',
      highlighted: true,
      for_sale: true,
      for_rent: false,
      count_bedrooms: 4,
      prop_type_key: 'types.villa',
      primary_image_url: '/_emdash/api/media/file/m1.jpg',
      description: '<p>Sea views</p>',
      latitude: 36.5,
    })
    expect(all[0].prop_photos.map((p) => [p.url, p.alt])).toEqual([
      ['/_emdash/api/media/file/m1.jpg', 'Pool'],
      ['/_emdash/api/media/file/m2.jpg', 'Terrace'],
    ])
  })

  it('formats the rent for rental-only listings', () => {
    expect(all[2].formatted_price).toBe('€1,200')
  })

  // The admin omits toggles the editor never touched (EmDash doesn't apply
  // defaults to optional fields), so for_sale is often missing.
  it('treats a missing for_sale as for sale unless the listing is for rent', () => {
    const adminSale = entryToProperty(entry('admin-sale', { price_sale: 300000 }), 'en')
    const adminRental = entryToProperty(entry('admin-rental', { for_rent: true, price_rent_monthly: 900 }), 'en')
    expect([adminSale.for_sale, adminSale.for_rent]).toEqual([true, false])
    expect([adminRental.for_sale, adminRental.for_rent]).toEqual([false, true])
    expect(adminRental.formatted_price).toBe('€900')
    expect(searchListings([adminSale, adminRental], {}).data.map((p) => p.slug)).toEqual(['admin-sale'])
  })

  it('keeps an explicit for_sale alongside for_rent', () => {
    const both = entryToProperty(entry('both', { for_sale: true, for_rent: true }), 'en')
    expect([both.for_sale, both.for_rent]).toEqual([true, true])
  })
})

describe('searchListings', () => {
  it('filters by sale/rent mode, defaulting to sale', () => {
    expect(searchListings(all, {}).data.map((p) => p.slug)).toEqual(['villa', 'flat', 'unpriced'])
    expect(searchListings(all, { sale_or_rental: 'rental' }).data.map((p) => p.slug)).toEqual(['rental'])
  })

  it('applies featured, type, bedroom and price filters', () => {
    expect(searchListings(all, { featured: 'true' }).data.map((p) => p.slug)).toEqual(['villa'])
    expect(searchListings(all, { property_type: 'types.flat' }).data.map((p) => p.slug)).toEqual(['flat'])
    expect(searchListings(all, { bedrooms_from: '3' }).data.map((p) => p.slug)).toEqual(['villa'])
    expect(searchListings(all, { for_sale_price_from: '250000' }).data.map((p) => p.slug)).toEqual(['villa'])
    expect(searchListings(all, { for_sale_price_till: '250000' }).data.map((p) => p.slug)).toEqual(['flat'])
  })

  it('sorts by price with unpriced listings last, and by newest by default', () => {
    expect(searchListings(all, { sort_by: 'price_asc' }).data.map((p) => p.slug)).toEqual(['flat', 'villa', 'unpriced'])
    expect(searchListings(all, { sort_by: 'price_desc' }).data.map((p) => p.slug)).toEqual(['villa', 'flat', 'unpriced'])
  })

  it('paginates and reports totals', () => {
    const page2 = searchListings(all, { per_page: 2, page: 2 })
    expect(page2.data.map((p) => p.slug)).toEqual(['unpriced'])
    expect(page2.meta).toEqual({ total: 3, page: 2, per_page: 2, total_pages: 2 })
  })

  it('returns map markers for listings with coordinates', () => {
    expect(searchListings(all, {}).map_markers).toEqual([
      expect.objectContaining({ slug: 'villa', lat: 36.5, lng: -4.9, url: '/properties/villa' }),
    ])
  })
})

describe('facets and search config', () => {
  it('counts facets per mode', () => {
    expect(buildFacets(all, 'sale')).toMatchObject({
      total_count: 3,
      property_types: { 'types.villa': 1, 'types.flat': 1, 'types.plot': 1 },
      localities: { Marbella: 1 },
      zones: { Malaga: 1 },
    })
    expect(buildFacets(all, 'rental').property_types).toEqual({ 'types.flat': 1 })
  })

  it('merges property types typed differently in the admin', () => {
    const typed = [
      entry('a', { property_type: 'Country House' }),
      entry('b', { property_type: 'country house' }),
      entry('c', { property_type: 'types.country_house' }),
    ].map((e) => entryToProperty(e, 'en'))
    expect(buildSearchConfig(typed).property_types).toEqual([
      { key: 'types.country_house', label: 'Country house', count: 3 },
    ])
    expect(searchListings(typed, { property_type: 'Country house' }).meta.total).toBe(3)
  })

  it('derives property types and currency from the listings', () => {
    const config = buildSearchConfig(all)
    expect(config.property_types).toEqual([
      { key: 'types.flat', label: 'Flat', count: 2 },
      { key: 'types.plot', label: 'Plot', count: 1 },
      { key: 'types.villa', label: 'Villa', count: 1 },
    ])
    expect(config.currency).toBe('EUR')
    expect(config.sort_options.length).toBeGreaterThan(0)
  })
})

describe('helpers', () => {
  it('builds media URLs from stored image values', () => {
    expect(imageUrl({ meta: { storageKey: 'a.jpg' } })).toBe('/_emdash/api/media/file/a.jpg')
    expect(imageUrl({ src: 'https://cdn.test/a.jpg' })).toBe('https://cdn.test/a.jpg')
    expect(imageUrl(null)).toBeNull()
  })

  it('formats prices and type labels', () => {
    expect(formatPrice(325000, 'USD', 'en')).toBe('$325,000')
    expect(formatPrice(0, 'USD', 'en')).toBeNull()
    expect(formatPrice(10, 'NOTACURRENCY', 'en')).toBe('10 NOTACURRENCY')
    expect(propertyTypeLabel('types.country_house')).toBe('Country house')
    expect(propertyTypeKey(' Ático dúplex ')).toBe('types.ático_dúplex')
    expect(propertyTypeKey('TYPES.Villa')).toBe('types.villa')
    expect(propertyTypeKey(' - ')).toBeNull()
  })
})

describe('createNativeListingSource', () => {
  beforeEach(() => mockedCollection.mockReset())

  it('queries published properties once per source and serves search + detail', async () => {
    mockedCollection.mockResolvedValue({ entries: [villa, flat], cacheHint: {} } as never)
    const source = createNativeListingSource('en')

    expect((await source.searchProperties({})).meta.total).toBe(2)
    expect((await source.getProperty('flat')).title).toBe('flat')
    expect(mockedCollection).toHaveBeenCalledTimes(1)
    expect(mockedCollection).toHaveBeenCalledWith('properties', { locale: 'en', limit: 1000 })
  })

  it('throws a not-found error for unknown slugs', async () => {
    mockedCollection.mockResolvedValue({ entries: [villa], cacheHint: {} } as never)
    await expect(createNativeListingSource('en').getProperty('nope')).rejects.toSatisfy(isPwbNotFoundError)
  })

  it('falls back to default-locale listings when the locale has none', async () => {
    mockedCollection
      .mockResolvedValueOnce({ entries: [], cacheHint: {} } as never)
      .mockResolvedValueOnce({ entries: [villa], cacheHint: {} } as never)
    expect((await createNativeListingSource('es').searchProperties({})).meta.total).toBe(1)
    expect(mockedCollection).toHaveBeenLastCalledWith('properties', { locale: 'en', limit: 1000 })
  })
})
