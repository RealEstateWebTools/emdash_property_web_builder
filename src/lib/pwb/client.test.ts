import { describe, it, expect } from 'vitest'
import { PwbClient } from './client'

const client = new PwbClient('http://localhost:3001')

describe('PwbClient.getSiteDetails', () => {
  it('returns site details', async () => {
    const result = await client.getSiteDetails()
    expect(result.title).toBe('Sunshine Realty')
    expect(result.default_currency).toBe('EUR')
  })

  it('includes og metadata', async () => {
    const result = await client.getSiteDetails()
    expect(result.og['og:title']).toBe('Sunshine Realty')
  })
})

describe('PwbClient.searchProperties', () => {
  it('returns paginated results', async () => {
    const result = await client.searchProperties({ sale_or_rental: 'sale' })
    expect(result.data).toHaveLength(1)
    expect(result.meta.total).toBe(1)
  })

  it('includes map markers', async () => {
    const result = await client.searchProperties({})
    expect(result.map_markers[0].lat).toBe(36.51)
    expect(result.map_markers[0].lng).toBe(-4.88)
  })

  it('returns empty data array when no results', async () => {
    const result = await client.searchProperties({ bedrooms_from: '99' })
    expect(Array.isArray(result.data)).toBe(true)
  })
})

describe('PwbClient.getProperty', () => {
  it('returns a single property by slug', async () => {
    const result = await client.getProperty('beautiful-villa-marbella')
    expect(result.title).toBe('Beautiful Villa in Marbella')
    expect(result.for_sale).toBe(true)
    expect(result.city).toBe('Marbella')
  })

  it('throws when property is not found', async () => {
    await expect(client.getProperty('nonexistent-slug')).rejects.toThrow('Property not found')
  })
})

describe('PwbClient.getSearchFacets', () => {
  it('returns facet counts', async () => {
    const result = await client.getSearchFacets('sale')
    expect(result.total_count).toBe(24)
    expect(result.property_types['villa']).toBe(10)
    expect(result.price_ranges).toHaveLength(2)
  })
})

describe('PwbClient.getSearchConfig', () => {
  it('returns filter configuration', async () => {
    const result = await client.getSearchConfig()
    expect(result.property_types).toHaveLength(2)
    expect(result.sort_options[0].value).toBe('price_asc')
    expect(result.area_unit).toBe('sqm')
  })
})

describe('PwbClient.submitEnquiry', () => {
  it('submits successfully with valid data', async () => {
    const result = await client.submitEnquiry({
      name: 'John Doe',
      email: 'john@example.com',
      message: 'I am interested in this property',
      property_id: 42,
    })
    expect(result.success).toBe(true)
    expect(result.data?.contact_id).toBe(1)
  })

  it('returns errors when email is missing', async () => {
    const result = await client.submitEnquiry({
      name: 'John Doe',
      email: '',
      message: 'hello',
    })
    expect(result.success).toBe(false)
    expect(result.errors).toContain('Email is required')
  })
})

describe('PwbClient.getPageBySlug', () => {
  it('returns page with rendered contents', async () => {
    const result = await client.getPageBySlug('about')
    expect(result.title).toBe('About Us')
    expect(result.page_contents).toHaveLength(1)
    expect(result.page_contents[0].rendered_html).toContain('Our Story')
  })

  it('throws when page not found', async () => {
    await expect(client.getPageBySlug('nonexistent')).rejects.toThrow()
  })
})

describe('PwbClient error handling', () => {
  it('includes the base URL without trailing slash', () => {
    const c = new PwbClient('http://example.com/')
    expect((c as unknown as { baseUrl: string }).baseUrl).toBe('http://example.com')
  })

  it('throws a descriptive error message on 404', async () => {
    await expect(client.getProperty('unknown-slug')).rejects.toThrow('Property not found')
  })
})
