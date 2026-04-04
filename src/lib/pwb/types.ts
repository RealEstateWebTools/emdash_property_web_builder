// ─── Property ────────────────────────────────────────────────────────────────

export interface PropPhoto {
  id: number
  url: string
  alt: string | null
  position: number
  variants: {
    thumbnail?: string
    small?: string
    medium?: string
    large?: string
  }
}

export interface PropertySummary {
  id: number
  slug: string
  reference: string | null
  title: string
  price_sale_current_cents: number | null
  price_rental_monthly_current_cents: number | null
  formatted_price: string | null
  currency: string | null
  count_bedrooms: number | null
  count_bathrooms: number | null
  count_garages: number | null
  constructed_area: number | null
  area_unit: string | null
  highlighted: boolean
  for_sale: boolean
  for_rent: boolean
  primary_image_url: string | null
  prop_photos: PropPhoto[]
}

export interface Property extends PropertySummary {
  description: string | null
  address: string | null
  city: string | null
  region: string | null
  country_code: string | null
  latitude: number | null
  longitude: number | null
  prop_type_key: string | null
  plot_area: number | null
  created_at: string
  updated_at: string
  page_contents: PageContent[]
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface MapMarker {
  id: number
  slug: string
  lat: number
  lng: number
  title: string
  price: string | null
  image: string | null
  url: string
}

export interface SearchMeta {
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface SearchResults {
  data: PropertySummary[]
  map_markers: MapMarker[]
  meta: SearchMeta
}

export interface SearchParams {
  sale_or_rental?: 'sale' | 'rental'
  currency?: string
  for_sale_price_from?: string
  for_sale_price_till?: string
  for_rent_price_from?: string
  for_rent_price_till?: string
  bedrooms_from?: string
  bathrooms_from?: string
  property_type?: string
  page?: number
  per_page?: number
  sort_by?: string
  featured?: 'true' | 'false'
  locale?: string
}

// ─── Facets ───────────────────────────────────────────────────────────────────

export interface PriceRange {
  label: string
  count: number
  min: number
  max: number | null
}

export interface SearchFacets {
  total_count: number
  property_types: Record<string, number>
  zones: Record<string, number>
  localities: Record<string, number>
  bedrooms: Record<string, number>
  bathrooms: Record<string, number>
  price_ranges: PriceRange[]
}

// ─── Search Config ────────────────────────────────────────────────────────────

export interface PropertyType {
  key: string
  label: string
  count: number
}

export interface Feature {
  key: string
  label: string
}

export interface SortOption {
  value: string
  label: string
}

export interface SearchConfig {
  property_types: PropertyType[]
  price_options: {
    sale: { from: number[]; to: number[] }
    rent: { from: number[]; to: number[] }
  }
  features: Feature[]
  bedrooms: number[]
  bathrooms: number[]
  sort_options: SortOption[]
  area_unit: string
  currency: string
}

// ─── Site Details ─────────────────────────────────────────────────────────────

export interface SiteDetails {
  id: number
  title: string
  meta_description: string | null
  company_display_name: string | null
  logo_url: string | null
  default_currency: string | null
  default_area_unit: string | null
  ga4_measurement_id: string | null
  gtm_container_id: string | null
  og: Record<string, string>
  twitter: Record<string, string>
  json_ld: Record<string, unknown>
  analytics: {
    posthog_key?: string
    posthog_host?: string
    ga4_id?: string
    gtm_id?: string
  } | null
}

// ─── Pages ────────────────────────────────────────────────────────────────────

export interface PageContent {
  id: number
  page_part_key: string
  sort_order: number
  visible: boolean
  is_rails_part: boolean
  rendered_html: string | null
  label: string | null
  // For summary_listings parts:
  summ_listings?: PropertySummary[]
}

export interface Page {
  id: number
  slug: string
  title: string
  meta_description: string | null
  page_contents: PageContent[]
}

// ─── Enquiry ──────────────────────────────────────────────────────────────────

export interface EnquiryInput {
  name: string
  email: string
  phone?: string
  message: string
  property_id?: string | number
}

export interface EnquiryResponse {
  success: boolean
  message?: string
  errors?: string[]
  data?: { contact_id: number; message_id: number }
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

export interface Testimonial {
  id: number
  quote: string
  author_name: string
  author_role: string | null
  author_photo: string | null
  rating: number | null
  position: number
}
