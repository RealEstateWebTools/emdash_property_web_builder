import { describe, it, expect } from 'vitest'
import { formatPropertyCard, htmlToMetaDescription } from './formatters'
import type { PropertySummary } from './types'

const rawProperty: PropertySummary = {
  id: 42,
  slug: 'beautiful-villa-marbella',
  reference: 'REF-001',
  title: 'Beautiful Villa in Marbella',
  price_sale_current_cents: 45000000,
  price_rental_monthly_current_cents: null,
  formatted_price: '€450,000',
  currency: 'EUR',
  count_bedrooms: 4,
  count_bathrooms: 3,
  count_garages: 1,
  constructed_area: 280,
  area_unit: 'sqm',
  highlighted: true,
  for_sale: true,
  for_rent: false,
  primary_image_url: 'https://example.com/villa.jpg',
  prop_photos: [],
}

describe('formatPropertyCard', () => {
  it('extracts the display fields needed by PropertyCard', () => {
    const card = formatPropertyCard(rawProperty)
    expect(card.slug).toBe('beautiful-villa-marbella')
    expect(card.title).toBe('Beautiful Villa in Marbella')
    expect(card.price).toBe('€450,000')
  })

  it('builds the href to the detail page', () => {
    const card = formatPropertyCard(rawProperty)
    expect(card.href).toBe('/properties/beautiful-villa-marbella')
  })

  it('uses primary_image_url as image', () => {
    const card = formatPropertyCard(rawProperty)
    expect(card.image).toBe('https://example.com/villa.jpg')
  })

  it('returns null image when no photo', () => {
    const card = formatPropertyCard({ ...rawProperty, primary_image_url: null })
    expect(card.image).toBeNull()
  })

  it('formats area with unit', () => {
    const card = formatPropertyCard(rawProperty)
    expect(card.area).toBe('280 sqm')
  })

  it('returns null area when no constructed_area', () => {
    const card = formatPropertyCard({ ...rawProperty, constructed_area: null })
    expect(card.area).toBeNull()
  })

  it('marks highlighted properties', () => {
    const card = formatPropertyCard(rawProperty)
    expect(card.featured).toBe(true)
  })
})

describe('htmlToMetaDescription', () => {
  it('strips HTML tags', () => {
    expect(htmlToMetaDescription('<p>Hello <strong>world</strong></p>')).toBe('Hello world')
  })

  it('truncates to 160 chars by default', () => {
    const long = 'a'.repeat(200)
    expect(htmlToMetaDescription(long)).toHaveLength(160)
  })

  it('respects a custom maxLength', () => {
    expect(htmlToMetaDescription('Hello world', 5)).toBe('Hello')
  })

  it('returns null for null input', () => {
    expect(htmlToMetaDescription(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(htmlToMetaDescription(undefined)).toBeNull()
  })

  it('returns null for empty string after stripping', () => {
    expect(htmlToMetaDescription('<br/>')).toBeNull()
  })

  it('preserves plain text unchanged', () => {
    expect(htmlToMetaDescription('A sea-view apartment in Marbella.')).toBe(
      'A sea-view apartment in Marbella.',
    )
  })
})
