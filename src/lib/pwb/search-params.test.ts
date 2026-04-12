import { describe, it, expect } from 'vitest'
import { buildSearchParams, buildSearchUrl } from './search-params'

describe('buildSearchParams', () => {
  it('defaults to sale when no mode given', () => {
    const params = buildSearchParams(new URLSearchParams())
    expect(params.sale_or_rental).toBe('sale')
  })

  it('passes rental mode', () => {
    const qs = new URLSearchParams({ mode: 'rental' })
    const params = buildSearchParams(qs)
    expect(params.sale_or_rental).toBe('rental')
  })

  it('maps bedrooms query param', () => {
    const qs = new URLSearchParams({ bedrooms: '3' })
    const params = buildSearchParams(qs)
    expect(params.bedrooms_from).toBe('3')
  })

  it('maps price_from query param', () => {
    const qs = new URLSearchParams({ price_from: '100000' })
    const params = buildSearchParams(qs)
    expect(params.for_sale_price_from).toBe('100000')
  })

  it('maps type query param to property_type', () => {
    const qs = new URLSearchParams({ type: 'villa' })
    const params = buildSearchParams(qs)
    expect(params.property_type).toBe('villa')
  })

  it('passes page number', () => {
    const qs = new URLSearchParams({ page: '3' })
    const params = buildSearchParams(qs)
    expect(params.page).toBe(3)
  })
})

describe('buildSearchUrl', () => {
  it('builds a URL with only non-default params', () => {
    const url = buildSearchUrl({ sale_or_rental: 'rental', bedrooms_from: '3' })
    expect(url).toContain('mode=rental')
    expect(url).toContain('bedrooms=3')
  })

  it('omits default values to keep URLs clean', () => {
    const url = buildSearchUrl({ sale_or_rental: 'sale' })
    expect(url).not.toContain('mode=')
  })

  it('returns /properties with no params when nothing set', () => {
    expect(buildSearchUrl({})).toBe('/properties')
  })

  it('includes page number when greater than 1', () => {
    const url = buildSearchUrl({ page: 3 })
    expect(url).toContain('page=3')
  })

  it('omits page param when page is 1', () => {
    const url = buildSearchUrl({ page: 1 })
    expect(url).not.toContain('page=')
  })

  it('includes price_to param', () => {
    const url = buildSearchUrl({ for_sale_price_till: '500000' })
    expect(url).toContain('price_to=500000')
  })

  it('includes bathrooms param', () => {
    const url = buildSearchUrl({ bathrooms_from: '2' })
    expect(url).toContain('bathrooms=2')
  })

  it('includes sort param', () => {
    const url = buildSearchUrl({ sort_by: 'price_desc' })
    expect(url).toContain('sort=price_desc')
  })

  it('uses for_rent_price_from for rental price', () => {
    const url = buildSearchUrl({ for_rent_price_from: '1000' })
    expect(url).toContain('price_from=1000')
  })
})

describe('buildSearchParams round-trip', () => {
  it('round-trips sale params through buildSearchUrl → buildSearchParams', () => {
    const original = buildSearchParams(
      new URLSearchParams({ bedrooms: '3', type: 'villa', price_from: '200000', page: '2' })
    )
    const url = buildSearchUrl(original)
    const qs = new URLSearchParams(url.replace('/properties?', ''))
    const roundTripped = buildSearchParams(qs)
    expect(roundTripped.bedrooms_from).toBe(original.bedrooms_from)
    expect(roundTripped.property_type).toBe(original.property_type)
    expect(roundTripped.for_sale_price_from).toBe(original.for_sale_price_from)
    expect(roundTripped.page).toBe(original.page)
  })

  it('round-trips rental params correctly', () => {
    const original = buildSearchParams(
      new URLSearchParams({ mode: 'rental', price_from: '800', price_to: '2000' })
    )
    const url = buildSearchUrl(original)
    const qs = new URLSearchParams(url.replace('/properties?', ''))
    const roundTripped = buildSearchParams(qs)
    expect(roundTripped.sale_or_rental).toBe('rental')
    expect(roundTripped.for_rent_price_from).toBe('800')
    expect(roundTripped.for_rent_price_till).toBe('2000')
    // Sale price fields must be absent in rental mode
    expect(roundTripped.for_sale_price_from).toBeUndefined()
  })
})

describe('buildSearchParams edge cases', () => {
  it('routes price_from to for_rent_price_from in rental mode', () => {
    const params = buildSearchParams(new URLSearchParams({ mode: 'rental', price_from: '1500' }))
    expect(params.for_rent_price_from).toBe('1500')
    expect(params.for_sale_price_from).toBeUndefined()
  })

  it('routes price_to to for_rent_price_till in rental mode', () => {
    const params = buildSearchParams(new URLSearchParams({ mode: 'rental', price_to: '3000' }))
    expect(params.for_rent_price_till).toBe('3000')
    expect(params.for_sale_price_till).toBeUndefined()
  })

  it('maps bathrooms query param', () => {
    const params = buildSearchParams(new URLSearchParams({ bathrooms: '2' }))
    expect(params.bathrooms_from).toBe('2')
  })

  it('maps sort query param', () => {
    const params = buildSearchParams(new URLSearchParams({ sort: 'price_desc' }))
    expect(params.sort_by).toBe('price_desc')
  })

  it('maps price_to query param for sale', () => {
    const params = buildSearchParams(new URLSearchParams({ price_to: '500000' }))
    expect(params.for_sale_price_till).toBe('500000')
  })

  it('defaults page to 1 when not provided', () => {
    const params = buildSearchParams(new URLSearchParams())
    expect(params.page).toBe(1)
  })
})
