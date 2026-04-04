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
})
