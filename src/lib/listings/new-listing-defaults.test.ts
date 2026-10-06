import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { NEW_LISTING_DEFAULTS, withNewListingDefaults } from './new-listing-defaults'

describe('withNewListingDefaults', () => {
  it('fills the defaults the admin leaves out of a new listing', () => {
    expect(withNewListingDefaults({ title: 'Seaside Cottage', price_sale: 325000 })).toEqual({
      title: 'Seaside Cottage',
      price_sale: 325000,
      for_sale: true,
      for_rent: false,
      highlighted: false,
      currency: 'EUR',
      area_unit: 'sqm',
    })
  })

  it('does not mark a rental for sale', () => {
    expect(withNewListingDefaults({ for_rent: true })).toMatchObject({ for_sale: false, for_rent: true })
  })

  it('keeps values the editor set', () => {
    expect(
      withNewListingDefaults({ for_sale: true, for_rent: true, highlighted: true, currency: 'GBP', area_unit: 'sqft' }),
    ).toMatchObject({ for_sale: true, for_rent: true, highlighted: true, currency: 'GBP', area_unit: 'sqft' })
    expect(withNewListingDefaults({ for_sale: false }).for_sale).toBe(false)
    expect(withNewListingDefaults({ currency: '  ' }).currency).toBe('EUR')
  })

  it('matches the field defaults in seed/seed.json', () => {
    const seed = JSON.parse(readFileSync('seed/seed.json', 'utf8'))
    const fields: { slug: string; defaultValue?: unknown }[] = seed.collections.find(
      (c: { slug: string }) => c.slug === 'properties',
    ).fields
    const seedDefaults = Object.fromEntries(
      fields.filter((f) => f.defaultValue !== undefined).map((f) => [f.slug, f.defaultValue]),
    )
    expect(seedDefaults).toEqual({ ...NEW_LISTING_DEFAULTS, for_sale: true })
  })
})
