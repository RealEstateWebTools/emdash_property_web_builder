/**
 * Area & lifestyle landing pages (EmDash `areas` collection).
 *
 * Every entry renders through one template (AreaPage.astro) in a fixed order —
 * hero, intro, local highlights, curated listings, more content, testimonials,
 * FAQs, CTA — so location-led pages need no per-page assembly. These helpers
 * turn the entry's fields into what each section needs.
 */
import { localePath } from './locale'

export const AREA_KINDS = ['area', 'lifestyle'] as const
export type AreaKind = (typeof AREA_KINDS)[number]

export interface AreaHighlight {
  label: string
  value: string
}

export interface AreaFaq {
  question: string
  answer: string
}

export interface AreaCta {
  heading: string
  text: string
  label: string
  href: string
}

type AreaData = Record<string, unknown>

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function readAreaKind(data: AreaData): AreaKind {
  return data.kind === 'lifestyle' ? 'lifestyle' : 'area'
}

/** Highlights with both a label and a value (half-filled rows are dropped). */
export function readAreaHighlights(data: AreaData): AreaHighlight[] {
  if (!Array.isArray(data.highlights)) return []
  return data.highlights
    .map((row) => ({ label: text(row?.label), value: text(row?.value) }))
    .filter((row) => row.label && row.value)
}

export function readAreaFaqs(data: AreaData): AreaFaq[] {
  if (!Array.isArray(data.faqs)) return []
  return data.faqs
    .map((row) => ({ question: text(row?.question), answer: text(row?.answer) }))
    .filter((row) => row.question && row.answer)
}

/**
 * The entry's listing settings as a `listingCollection` block node, so the
 * area template renders listings with the same component editors place in
 * Portable Text (pwb-property-embeds). Returns null when a hand-picked set
 * has no slugs, so the section is omitted rather than shown empty.
 */
export function buildAreaListingNode(data: AreaData): Record<string, string> | null {
  const source = text(data.listings_source) || 'featured'
  const slugs = text(data.listings_slugs)
  if (source === 'handpicked' && !slugs) return null

  const limit = typeof data.listings_limit === 'number' ? String(data.listings_limit) : ''
  return {
    _type: 'listingCollection',
    heading: text(data.listings_heading),
    source,
    slugs,
    saleOrRental: text(data.listings_sale_or_rental) || 'sale',
    propertyType: text(data.listings_property_type),
    limit,
  }
}

/** The closing call to action, defaulting to the contact page. */
export function readAreaCta(data: AreaData, locale: string, defaults: { heading: string; label: string }): AreaCta {
  const href = text(data.cta_href)
  return {
    heading: text(data.cta_heading) || defaults.heading,
    text: text(data.cta_text),
    label: text(data.cta_label) || defaults.label,
    // Site-relative links get the locale prefix; absolute URLs pass through.
    href: href ? (href.startsWith('/') ? localePath(locale, href) : href) : localePath(locale, '/pages/contact'),
  }
}

export function areaPath(locale: string, slug: string): string {
  return localePath(locale, `/areas/${slug}`)
}
