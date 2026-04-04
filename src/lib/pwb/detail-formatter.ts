import type { Property, PropPhoto } from './types'

export interface PropertyDetailData {
  id: number
  slug: string
  title: string
  description: string | null
  price: string | null
  bedrooms: number | null
  bathrooms: number | null
  garages: number | null
  area: string | null
  propertyTypeLabel: string
  city: string | null
  region: string | null
  fullAddress: string
  coordinates: { lat: number; lng: number } | null
  photos: PropPhoto[]
  featured: boolean
  forSale: boolean
  forRent: boolean
  currency: string | null
}

export function formatPropertyDetail(p: Property): PropertyDetailData {
  const addressParts = [p.address, p.city, p.region, p.country_code].filter(Boolean)
  const propTypeLabel = p.prop_type_key
    ? p.prop_type_key.split('.').pop()?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? p.prop_type_key
    : 'Property'

  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    price: p.formatted_price,
    bedrooms: p.count_bedrooms,
    bathrooms: p.count_bathrooms,
    garages: p.count_garages,
    area: p.constructed_area != null ? `${p.constructed_area} ${p.area_unit ?? ''}`.trim() : null,
    propertyTypeLabel: propTypeLabel,
    city: p.city,
    region: p.region,
    fullAddress: addressParts.join(', '),
    coordinates: p.latitude != null && p.longitude != null
      ? { lat: p.latitude, lng: p.longitude }
      : null,
    photos: p.prop_photos,
    featured: p.highlighted,
    forSale: p.for_sale,
    forRent: p.for_rent,
    currency: p.currency,
  }
}
