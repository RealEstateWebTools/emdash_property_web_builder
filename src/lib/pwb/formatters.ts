import type { PropertySummary } from './types'

/**
 * Strips HTML tags from a string and truncates to `maxLength` characters.
 * Used to generate clean meta description text from HTML property descriptions.
 */
export function htmlToMetaDescription(html: string | null | undefined, maxLength = 160): string | null {
  if (!html) return null
  return html.replace(/<[^>]*>/g, '').slice(0, maxLength) || null
}

export interface PropertyCardData {
  id: number
  slug: string
  title: string
  price: string | null
  image: string | null
  href: string
  bedrooms: number | null
  bathrooms: number | null
  area: string | null
  featured: boolean
  forSale: boolean
  forRent: boolean
}

export function formatPropertyCard(p: PropertySummary): PropertyCardData {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    price: p.formatted_price,
    image: p.primary_image_url,
    href: `/properties/${p.slug}`,
    bedrooms: p.count_bedrooms,
    bathrooms: p.count_bathrooms,
    area: p.constructed_area != null ? `${p.constructed_area} ${p.area_unit ?? ''}`.trim() : null,
    featured: p.highlighted,
    forSale: p.for_sale,
    forRent: p.for_rent,
  }
}
