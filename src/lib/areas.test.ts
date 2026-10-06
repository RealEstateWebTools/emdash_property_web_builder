import { describe, expect, it } from 'vitest'
import {
  areaPath,
  buildAreaListingNode,
  pickAreaTestimonials,
  readAreaCta,
  readAreaFaqs,
  readAreaHighlights,
  readAreaKind,
} from './areas'

const DEFAULTS = { heading: 'Thinking about a move here?', label: 'Talk to a local expert' }

describe('readAreaKind', () => {
  it('defaults anything other than lifestyle to area', () => {
    expect(readAreaKind({ kind: 'lifestyle' })).toBe('lifestyle')
    expect(readAreaKind({ kind: 'area' })).toBe('area')
    expect(readAreaKind({})).toBe('area')
  })
})

describe('readAreaHighlights / readAreaFaqs', () => {
  it('keeps only complete rows, trimmed', () => {
    expect(
      readAreaHighlights({ highlights: [{ label: ' Schools ', value: 'Good' }, { label: 'Empty', value: '' }, null] }),
    ).toEqual([{ label: 'Schools', value: 'Good' }])
    expect(readAreaFaqs({ faqs: [{ question: 'Q?', answer: 'A.' }, { question: 'Only a question' }] })).toEqual([
      { question: 'Q?', answer: 'A.' },
    ])
  })

  it('tolerates missing or malformed repeaters', () => {
    expect(readAreaHighlights({ highlights: 'nope' })).toEqual([])
    expect(readAreaFaqs({})).toEqual([])
  })
})

describe('buildAreaListingNode', () => {
  it('maps the entry fields onto a listingCollection block node', () => {
    expect(
      buildAreaListingNode({
        listings_heading: 'Homes nearby',
        listings_source: 'newest',
        listings_sale_or_rental: 'rental',
        listings_property_type: 'types.flat',
        listings_limit: 3,
      }),
    ).toEqual({
      _type: 'listingCollection',
      heading: 'Homes nearby',
      source: 'newest',
      slugs: '',
      saleOrRental: 'rental',
      propertyType: 'types.flat',
      limit: '3',
    })
  })

  it('defaults to featured listings for sale', () => {
    expect(buildAreaListingNode({})).toMatchObject({ source: 'featured', saleOrRental: 'sale' })
  })

  it('omits the section for a hand-picked set with no slugs', () => {
    expect(buildAreaListingNode({ listings_source: 'handpicked', listings_slugs: '  ' })).toBeNull()
    expect(buildAreaListingNode({ listings_source: 'handpicked', listings_slugs: 'villa-a' })).toMatchObject({
      slugs: 'villa-a',
    })
  })
})

describe('readAreaCta', () => {
  it('defaults to the localized contact page', () => {
    expect(readAreaCta({}, 'es', DEFAULTS)).toEqual({
      heading: DEFAULTS.heading,
      text: '',
      label: DEFAULTS.label,
      href: '/es/pages/contact',
    })
  })

  it('prefixes site-relative links with the locale and leaves absolute ones alone', () => {
    expect(readAreaCta({ cta_href: '/valuation' }, 'fr', DEFAULTS).href).toBe('/fr/valuation')
    expect(readAreaCta({ cta_href: 'https://calendly.com/x' }, 'fr', DEFAULTS).href).toBe('https://calendly.com/x')
  })
})

describe('areaPath', () => {
  it('builds locale-prefixed area URLs', () => {
    expect(areaPath('en', 'east-brunswick')).toBe('/areas/east-brunswick')
    expect(areaPath('es', 'east-brunswick')).toBe('/es/areas/east-brunswick')
  })
})

describe('pickAreaTestimonials', () => {
  const t = (name: string, featured?: boolean) => ({ name, quote: `Quote from ${name}`, role: 'Buyer', featured })

  // "Show on Homepage" is opt-in; a testimonial created in the admin has no
  // value until the toggle is touched.
  it('only shows testimonials explicitly marked to show', () => {
    expect(pickAreaTestimonials([t('Shown', true), t('Untouched'), t('Hidden', false)]).map((x) => x.name)).toEqual([
      'Shown',
    ])
  })

  it('needs a name and quote and caps at three', () => {
    const rows = [{ name: 'No quote', featured: true }, t('A', true), t('B', true), t('C', true), t('D', true)]
    expect(pickAreaTestimonials(rows).map((x) => x.name)).toEqual(['A', 'B', 'C'])
    expect(pickAreaTestimonials([{ name: 'Ann', quote: 'Great', featured: true }])).toEqual([
      { name: 'Ann', role: '', quote: 'Great' },
    ])
  })
})
