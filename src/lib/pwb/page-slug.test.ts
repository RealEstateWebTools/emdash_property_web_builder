import { describe, expect, it } from 'vitest'
import { shouldQueryPwbPageSlug } from './page-slug'

describe('shouldQueryPwbPageSlug', () => {
  it('allows normal PWB CMS slugs', () => {
    expect(shouldQueryPwbPageSlug('about')).toBe(true)
    expect(shouldQueryPwbPageSlug('areas/marbella')).toBe(true)
    expect(shouldQueryPwbPageSlug('sell-with-us')).toBe(true)
  })

  it('rejects asset-like and reserved exact paths', () => {
    expect(shouldQueryPwbPageSlug('favicon.ico')).toBe(false)
    expect(shouldQueryPwbPageSlug('sitemap.xml')).toBe(false)
    expect(shouldQueryPwbPageSlug('wp-login.php')).toBe(false)
    expect(shouldQueryPwbPageSlug('downloads/brochure.pdf')).toBe(false)
  })

  it('rejects paths owned by explicit app routes or internal prefixes', () => {
    expect(shouldQueryPwbPageSlug('api/enquiries')).toBe(false)
    expect(shouldQueryPwbPageSlug('properties/missing/extra')).toBe(false)
    expect(shouldQueryPwbPageSlug('posts/missing/extra')).toBe(false)
    expect(shouldQueryPwbPageSlug('_astro/client.js')).toBe(false)
    expect(shouldQueryPwbPageSlug('_emdash/admin')).toBe(false)
  })

  it('rejects malformed or suspicious path segments', () => {
    expect(shouldQueryPwbPageSlug('../admin')).toBe(false)
    expect(shouldQueryPwbPageSlug('about us')).toBe(false)
    expect(shouldQueryPwbPageSlug('areas//marbella')).toBe(false)
    expect(shouldQueryPwbPageSlug('x/'.repeat(9))).toBe(false)
  })
})
