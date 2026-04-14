import { describe, expect, it } from 'vitest'

import {
  buildHomepageListingPlan,
  readHomepageMerchandisingConfig,
  sanitizeHomepageCollectionMode,
} from './homepage-merchandising'

describe('homepage merchandising config', () => {
  it('falls back to split featured with a sane default limit', () => {
    expect(
      readHomepageMerchandisingConfig({
        featured_section_heading: 'Featured homes',
      }),
    ).toEqual({
      sectionHeading: 'Featured homes',
      mode: 'split_featured',
      limit: 3,
      propertyType: undefined,
    })
  })

  it('sanitizes unknown collection modes', () => {
    expect(sanitizeHomepageCollectionMode('something-else')).toBe('split_featured')
  })
})

describe('buildHomepageListingPlan', () => {
  it('builds two featured groups for the split featured default', () => {
    const plan = buildHomepageListingPlan({
      sectionHeading: 'Featured homes',
      mode: 'split_featured',
      limit: 3,
    })

    expect(plan).toHaveLength(2)
    expect(plan[0].params).toMatchObject({ featured: 'true', sale_or_rental: 'sale', per_page: 3 })
    expect(plan[1].params).toMatchObject({ featured: 'true', sale_or_rental: 'rental', per_page: 3 })
  })

  it('builds a property-type plan with the selected filter', () => {
    const plan = buildHomepageListingPlan({
      sectionHeading: 'Featured apartments',
      mode: 'property_type_sale',
      limit: 4,
      propertyType: 'apartment',
    })

    expect(plan).toHaveLength(1)
    expect(plan[0].title).toBe('apartment for sale')
    expect(plan[0].params).toMatchObject({ sale_or_rental: 'sale', property_type: 'apartment', per_page: 4 })
    expect(plan[0].fallbackParams).toMatchObject({ sale_or_rental: 'sale', per_page: 4 })
  })
})
