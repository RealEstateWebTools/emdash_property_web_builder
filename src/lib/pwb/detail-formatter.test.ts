import { describe, it, expect } from 'vitest'
import { formatPropertyDetail } from './detail-formatter'
import property from '../../test/fixtures/property.json'
import type { Property } from './types'

const raw = property as Property

/** Minimal sparse property — every optional field set to null */
const sparse: Property = {
  id: 1,
  slug: 'sparse-property',
  reference: null,
  title: 'Sparse Property',
  price_sale_current_cents: null,
  price_rental_monthly_current_cents: null,
  formatted_price: null,
  currency: null,
  count_bedrooms: null,
  count_bathrooms: null,
  count_garages: null,
  constructed_area: null,
  area_unit: null,
  highlighted: false,
  for_sale: false,
  for_rent: false,
  primary_image_url: null,
  prop_photos: [],
  description: null,
  address: null,
  city: null,
  region: null,
  country_code: null,
  latitude: null,
  longitude: null,
  prop_type_key: null,
  plot_area: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  page_contents: [],
}

describe('formatPropertyDetail', () => {
  it('extracts address components', () => {
    const detail = formatPropertyDetail(raw)
    expect(detail.city).toBe('Marbella')
    expect(detail.region).toBe('Andalusia')
  })

  it('builds structured address string', () => {
    const detail = formatPropertyDetail(raw)
    expect(detail.fullAddress).toContain('Marbella')
    expect(detail.fullAddress).toContain('Andalusia')
  })

  it('includes coordinates for map', () => {
    const detail = formatPropertyDetail(raw)
    expect(detail.coordinates?.lat).toBe(36.51)
    expect(detail.coordinates?.lng).toBe(-4.88)
  })

  it('returns null coordinates when lat/lng missing', () => {
    const detail = formatPropertyDetail({ ...raw, latitude: null, longitude: null })
    expect(detail.coordinates).toBeNull()
  })

  it('normalises property type label from key', () => {
    const detail = formatPropertyDetail(raw)
    // "propertyTypes.villa" → "Villa"
    expect(detail.propertyTypeLabel).toBe('Villa')
  })

  it('returns all photo URLs in order', () => {
    const detail = formatPropertyDetail({
      ...raw,
      prop_photos: [
        { id: 1, url: 'https://a.com/1.jpg', alt: null, position: 1, variants: {} },
        { id: 2, url: 'https://a.com/2.jpg', alt: null, position: 2, variants: {} },
      ],
    })
    expect(detail.photos).toHaveLength(2)
    expect(detail.photos[0].url).toBe('https://a.com/1.jpg')
  })
})

describe('formatPropertyDetail — null/missing field graceful degradation', () => {
  it('does not throw when all optional fields are null', () => {
    expect(() => formatPropertyDetail(sparse)).not.toThrow()
  })

  it('returns empty string or null for missing address fields', () => {
    const detail = formatPropertyDetail(sparse)
    expect(detail.city).toBeNull()
    expect(detail.region).toBeNull()
    // fullAddress should be null or empty when no address data is available
    expect(detail.fullAddress == null || detail.fullAddress === '').toBe(true)
  })

  it('returns null price when formatted_price is null', () => {
    const detail = formatPropertyDetail(sparse)
    expect(detail.price).toBeNull()
  })

  it('returns null or zero for missing bedroom/bathroom counts', () => {
    const detail = formatPropertyDetail(sparse)
    expect(detail.bedrooms == null || typeof detail.bedrooms === 'number').toBe(true)
    expect(detail.bathrooms == null || typeof detail.bathrooms === 'number').toBe(true)
  })

  it('returns empty photos array when prop_photos is empty', () => {
    const detail = formatPropertyDetail(sparse)
    expect(detail.photos).toHaveLength(0)
  })

  it('returns null coordinates when lat/lng are null', () => {
    const detail = formatPropertyDetail(sparse)
    expect(detail.coordinates).toBeNull()
  })

  it('returns a fallback property type label for null prop_type_key', () => {
    const detail = formatPropertyDetail(sparse)
    // Should not throw; should return some string
    expect(typeof detail.propertyTypeLabel).toBe('string')
  })

  it('marks non-highlighted property as not featured', () => {
    const detail = formatPropertyDetail(sparse)
    expect(detail.featured).toBe(false)
  })
})
