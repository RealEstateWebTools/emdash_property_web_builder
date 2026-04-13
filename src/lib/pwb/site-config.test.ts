import { describe, it, expect } from 'vitest'
import { buildPageMeta } from './site-config'
import siteDetails from '../../test/fixtures/site-details.json'
import type { SiteDetails } from './types'

describe('buildPageMeta', () => {
  const site = siteDetails as unknown as SiteDetails
  const propertySearchSite: SiteDetails = {
    ...site,
    title: 'Property Search',
    company_display_name: null,
  }

  it('uses the site title when no page title given', () => {
    const meta = buildPageMeta(site)
    expect(meta.title).toBe('Demo Realty')
  })

  it('appends site name to page title when given', () => {
    const meta = buildPageMeta(site, { title: 'Villas for Sale' })
    expect(meta.title).toBe('Villas for Sale | Demo Realty')
  })

  it('falls back to default meta description', () => {
    const meta = buildPageMeta(site)
    expect(meta.description).toBe('Find your dream property')
  })

  it('uses page-specific description when provided', () => {
    const meta = buildPageMeta(site, { description: 'Search our listings' })
    expect(meta.description).toBe('Search our listings')
  })

  it('includes canonical URL when provided', () => {
    const meta = buildPageMeta(site, { canonical: 'https://example.com/properties' })
    expect(meta.canonical).toBe('https://example.com/properties')
  })

  it('merges OG tags with page overrides', () => {
    const meta = buildPageMeta(site, { title: 'Villas' })
    expect(meta.og['og:title']).toBe('Villas | Demo Realty')
    expect(meta.og['og:type']).toBe('website')
  })

  it('localizes the site brand in page metadata for non-default locales', () => {
    const meta = buildPageMeta(propertySearchSite, { locale: 'es', title: 'Propiedades en venta' })
    expect(meta.title).toBe('Propiedades en venta | Buscador de Propiedades')
    expect(meta.og['og:title']).toBe('Propiedades en venta | Buscador de Propiedades')
  })
})
