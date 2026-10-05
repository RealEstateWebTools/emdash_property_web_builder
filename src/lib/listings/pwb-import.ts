/**
 * PWB → EmDash listing import (used by scripts/import-pwb-listings.mjs).
 *
 * Turns PWB API property records into a seed file for the `properties`
 * collection. Applying it with `emdash seed` downloads the photos into EmDash
 * media. Entries are keyed by the PWB id, so re-running never duplicates
 * listings: by default existing ones are skipped (no re-download), and
 * --update overwrites them.
 *
 * Plain TypeScript with explicit `.ts` imports so Node can run it with
 * --experimental-strip-types.
 */
import { htmlToPortableText } from './portable-text-html.ts'
import type { Property } from '../pwb/types'

export const IMPORT_SEED_PATH = 'seed/imports/pwb-listings.json'

export interface SeedPropertyEntry {
  id: string
  slug: string
  locale: string
  status: 'published'
  data: Record<string, unknown>
}

function cents(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && value > 0 ? value / 100 : undefined
}

function present<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined && value !== ''
}

function filenameFor(url: string, fallback: string): string {
  try {
    const name = new URL(url).pathname.split('/').pop()
    return name?.trim() || fallback
  } catch {
    return fallback
  }
}

/** Map one PWB property (detail endpoint shape) to a `properties` seed entry. */
export function pwbPropertyToSeedEntry(property: Property, locale = 'en'): SeedPropertyEntry {
  const photos = [...(property.prop_photos ?? [])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .filter((photo) => typeof photo.url === 'string' && /^https?:\/\//.test(photo.url))
    .map((photo, index) => ({
      image: {
        $media: {
          url: photo.url,
          alt: photo.alt || property.title,
          filename: filenameFor(photo.url, `${property.slug}-${index + 1}.jpg`),
        },
      },
      caption: photo.alt ?? '',
    }))

  const data: Record<string, unknown> = {
    title: property.title,
    reference: property.reference,
    for_sale: property.for_sale,
    for_rent: property.for_rent,
    highlighted: property.highlighted,
    price_sale: cents(property.price_sale_current_cents),
    price_rent_monthly: cents(property.price_rental_monthly_current_cents),
    currency: property.currency?.toUpperCase(),
    property_type: property.prop_type_key,
    bedrooms: property.count_bedrooms,
    bathrooms: property.count_bathrooms,
    garages: property.count_garages,
    constructed_area: property.constructed_area,
    plot_area: property.plot_area,
    area_unit: property.area_unit === 'sqft' ? 'sqft' : 'sqm',
    description: htmlToPortableText(property.description),
    photos,
    address: property.address,
    city: property.city,
    region: property.region,
    country_code: property.country_code,
    latitude: property.latitude,
    longitude: property.longitude,
    source_id: `pwb:${property.id}`,
  }

  return {
    id: `pwb-property-${property.id}`,
    slug: property.slug,
    locale,
    status: 'published',
    data: Object.fromEntries(Object.entries(data).filter(([, value]) => present(value))),
  }
}

/**
 * The import seed file. Includes the `properties` collection definition so it
 * can be applied to a database that doesn't have the collection yet.
 */
export function buildImportSeed(entries: SeedPropertyEntry[], sourceUrl: string, propertiesCollection?: unknown) {
  return {
    $schema: 'https://emdashcms.com/seed.schema.json',
    version: '1',
    meta: {
      name: 'PWB listings import',
      description: `Listings imported from ${sourceUrl}`,
      author: 'scripts/import-pwb-listings.mjs',
    },
    ...(propertiesCollection ? { collections: [propertiesCollection] } : {}),
    content: { properties: entries },
  }
}
