import type { PwbClient } from './pwb/client'
import { formatPropertyCard, type PropertyCardData } from './pwb/formatters'
import type { SearchParams, SearchResults } from './pwb/types'

export const HOMEPAGE_COLLECTION_MODES = [
  'split_featured',
  'featured_any',
  'newest_any',
  'newest_sale',
  'newest_rental',
  'property_type_any',
  'property_type_sale',
  'property_type_rental',
] as const

export type HomepageCollectionMode = typeof HOMEPAGE_COLLECTION_MODES[number]

export interface HomepageMerchandisingConfig {
  sectionHeading: string
  mode: HomepageCollectionMode
  limit: number
  propertyType?: string
}

export interface HomepageListingGroupPlan {
  id: string
  eyebrow: string
  title: string
  href: string
  params: SearchParams
  fallbackParams?: SearchParams
}

export interface HomepageListingGroup {
  id: string
  eyebrow: string
  title: string
  href: string
  cards: PropertyCardData[]
  usedFallback: boolean
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function sanitizeLimit(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return Math.min(value, 12)
  }
  return 3
}

export function sanitizeHomepageCollectionMode(value: unknown): HomepageCollectionMode {
  return typeof value === 'string' && HOMEPAGE_COLLECTION_MODES.includes(value as HomepageCollectionMode)
    ? (value as HomepageCollectionMode)
    : 'split_featured'
}

export function readHomepageMerchandisingConfig(homepageData: Record<string, unknown> | undefined): HomepageMerchandisingConfig {
  return {
    sectionHeading: hasText(homepageData?.featured_section_heading)
      ? homepageData?.featured_section_heading.trim()
      : 'Featured homes',
    mode: sanitizeHomepageCollectionMode(homepageData?.featured_collection_mode),
    limit: sanitizeLimit(homepageData?.featured_item_limit),
    propertyType: hasText(homepageData?.featured_property_type) ? homepageData?.featured_property_type.trim() : undefined,
  }
}

function buildSearchHref(params: SearchParams): string {
  const search = new URLSearchParams()

  if (params.sale_or_rental === 'rental') {
    search.set('mode', 'rental')
  }
  if (params.property_type) {
    search.set('type', params.property_type)
  }

  const query = search.toString()
  return query ? `/properties?${query}` : '/properties'
}

export function buildHomepageListingPlan(config: HomepageMerchandisingConfig): HomepageListingGroupPlan[] {
  const limit = config.limit

  switch (config.mode) {
    case 'featured_any':
      return [
        {
          id: 'featured',
          eyebrow: 'Highlighted now',
          title: config.sectionHeading,
          href: '/properties',
          params: { featured: 'true', per_page: limit },
          fallbackParams: { per_page: limit },
        },
      ]

    case 'newest_any':
      return [
        {
          id: 'newest',
          eyebrow: 'Latest listings',
          title: config.sectionHeading,
          href: '/properties',
          params: { per_page: limit },
        },
      ]

    case 'newest_sale':
      return [
        {
          id: 'sale',
          eyebrow: 'For sale',
          title: 'Latest homes for sale',
          href: buildSearchHref({ sale_or_rental: 'sale' }),
          params: { sale_or_rental: 'sale', per_page: limit },
        },
      ]

    case 'newest_rental':
      return [
        {
          id: 'rental',
          eyebrow: 'For rent',
          title: 'Latest homes for rent',
          href: buildSearchHref({ sale_or_rental: 'rental' }),
          params: { sale_or_rental: 'rental', per_page: limit },
        },
      ]

    case 'property_type_any': {
      const propertyType = config.propertyType
      return [
        {
          id: 'property-type',
          eyebrow: propertyType ? 'Property type focus' : 'Latest listings',
          title: propertyType ? `Featured ${propertyType}` : config.sectionHeading,
          href: buildSearchHref({ property_type: propertyType }),
          params: { property_type: propertyType, per_page: limit },
          fallbackParams: { per_page: limit },
        },
      ]
    }

    case 'property_type_sale': {
      const propertyType = config.propertyType
      return [
        {
          id: 'property-type-sale',
          eyebrow: 'For sale',
          title: propertyType ? `${propertyType} for sale` : 'Homes for sale',
          href: buildSearchHref({ sale_or_rental: 'sale', property_type: propertyType }),
          params: { sale_or_rental: 'sale', property_type: propertyType, per_page: limit },
          fallbackParams: { sale_or_rental: 'sale', per_page: limit },
        },
      ]
    }

    case 'property_type_rental': {
      const propertyType = config.propertyType
      return [
        {
          id: 'property-type-rental',
          eyebrow: 'For rent',
          title: propertyType ? `${propertyType} for rent` : 'Homes for rent',
          href: buildSearchHref({ sale_or_rental: 'rental', property_type: propertyType }),
          params: { sale_or_rental: 'rental', property_type: propertyType, per_page: limit },
          fallbackParams: { sale_or_rental: 'rental', per_page: limit },
        },
      ]
    }

    case 'split_featured':
    default:
      return [
        {
          id: 'sale',
          eyebrow: 'For sale',
          title: 'Move-in ready opportunities',
          href: buildSearchHref({ sale_or_rental: 'sale' }),
          params: { featured: 'true', sale_or_rental: 'sale', per_page: limit },
          fallbackParams: { sale_or_rental: 'sale', per_page: limit },
        },
        {
          id: 'rental',
          eyebrow: 'For rent',
          title: 'Flexible lets with strong locations',
          href: buildSearchHref({ sale_or_rental: 'rental' }),
          params: { featured: 'true', sale_or_rental: 'rental', per_page: limit },
          fallbackParams: { sale_or_rental: 'rental', per_page: limit },
        },
      ]
  }
}

function mergeResults(primary: SearchResults, fallback: SearchResults | null, limit: number): { data: SearchResults['data']; usedFallback: boolean } {
  if (!fallback) {
    return { data: primary.data.slice(0, limit), usedFallback: false }
  }

  const combined = [...primary.data]
  const ids = new Set(primary.data.map((item) => item.id))

  for (const item of fallback.data) {
    if (ids.has(item.id)) continue
    combined.push(item)
    ids.add(item.id)
    if (combined.length >= limit) break
  }

  return { data: combined.slice(0, limit), usedFallback: combined.length > primary.data.length }
}

async function loadGroup(client: PwbClient, group: HomepageListingGroupPlan, limit: number): Promise<HomepageListingGroup> {
  const primary = await client.searchProperties(group.params)
  const minPrimaryItems = Math.min(2, limit)
  let fallback: SearchResults | null = null

  if (group.fallbackParams && primary.data.length < minPrimaryItems) {
    fallback = await client.searchProperties(group.fallbackParams)
  }

  const merged = mergeResults(primary, fallback, limit)

  return {
    id: group.id,
    eyebrow: group.eyebrow,
    title: group.title,
    href: group.href,
    cards: merged.data.map(formatPropertyCard),
    usedFallback: merged.usedFallback,
  }
}

export async function loadHomepageListingGroups(
  client: PwbClient,
  config: HomepageMerchandisingConfig,
): Promise<HomepageListingGroup[]> {
  const plan = buildHomepageListingPlan(config)
  const groups = await Promise.all(plan.map((group) => loadGroup(client, group, config.limit)))
  return groups.filter((group) => group.cards.length > 0)
}
