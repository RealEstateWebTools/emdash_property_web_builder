import { describe, expect, it } from 'vitest'
import fixture from '../../test/fixtures/property.json'
import type { Property } from '../pwb/types'
import { entryToProperty } from './native-source'
import { buildImportSeed, pwbPropertyToSeedEntry } from './pwb-import'

const property = {
  ...(fixture as unknown as Property),
  id: 42,
  price_rental_monthly_current_cents: null,
  prop_photos: [
    { id: 2, url: 'https://cdn.test/b.jpg', alt: null, position: 2, variants: {} },
    { id: 1, url: 'https://cdn.test/a.jpg?w=1', alt: 'Front', position: 1, variants: {} },
    { id: 3, url: '/relative-not-importable.jpg', alt: null, position: 3, variants: {} },
  ],
} as Property

describe('pwbPropertyToSeedEntry', () => {
  const entry = pwbPropertyToSeedEntry(property)

  it('keys the entry by PWB id and keeps the slug so URLs survive the move', () => {
    expect(entry).toMatchObject({ id: 'pwb-property-42', slug: property.slug, locale: 'en', status: 'published' })
    expect(entry.data.source_id).toBe('pwb:42')
  })

  it('converts cents to currency units and drops empty fields', () => {
    expect(entry.data.price_sale).toBe(450000)
    expect(entry.data).not.toHaveProperty('price_rent_monthly')
    expect(Object.values(entry.data)).not.toContain(null)
  })

  it('orders photos by position as $media references, skipping non-absolute URLs', () => {
    expect(entry.data.photos).toEqual([
      { image: { $media: { url: 'https://cdn.test/a.jpg?w=1', alt: 'Front', filename: 'a.jpg' } }, caption: 'Front' },
      { image: { $media: { url: 'https://cdn.test/b.jpg', alt: property.title, filename: 'b.jpg' } }, caption: '' },
    ])
  })

  it('converts the HTML description to Portable Text', () => {
    expect(entry.data.description).toEqual([
      expect.objectContaining({ _type: 'block', style: 'normal', children: [expect.objectContaining({ text: 'Stunning villa with sea views.' })] }),
    ])
  })

  it('round-trips through the native source into the same listing shape', () => {
    const native = entryToProperty({ id: entry.slug, data: { ...entry.data, photos: [] } }, 'en')
    expect(native).toMatchObject({
      slug: property.slug,
      title: property.title,
      price_sale_current_cents: property.price_sale_current_cents,
      count_bedrooms: property.count_bedrooms,
      for_sale: property.for_sale,
      description: property.description,
    })
  })
})

describe('buildImportSeed', () => {
  it('wraps entries in a seed file carrying the collection definition', () => {
    const seed = buildImportSeed([pwbPropertyToSeedEntry(property)], 'https://agency.test', { slug: 'properties' })
    expect(seed).toMatchObject({ version: '1', collections: [{ slug: 'properties' }] })
    expect(seed.content.properties).toHaveLength(1)
  })
})
