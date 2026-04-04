import type { PropertySummary } from './types'

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
