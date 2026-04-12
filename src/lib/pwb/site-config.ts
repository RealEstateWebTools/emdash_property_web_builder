import type { SiteDetails } from './types'
import { translateBrand } from '../locale'

export interface PageMeta {
  title: string
  description: string
  canonical: string | null
  og: Record<string, string>
  twitter: Record<string, string>
  jsonLd: Record<string, unknown>
}

export function buildPageMeta(
  site: SiteDetails,
  overrides: {
    locale?: string
    title?: string
    description?: string
    canonical?: string
    /** Override the site name used in page titles (e.g. "My Blog" for blog pages). */
    siteTitle?: string
  } = {}
): PageMeta {
  const siteName = overrides.siteTitle ?? translateBrand(overrides.locale ?? 'en', site.company_display_name ?? site.title)
  const title = overrides.title ? `${overrides.title} | ${siteName}` : siteName
  const description = overrides.description ?? site.meta_description ?? ''

  return {
    title,
    description,
    canonical: overrides.canonical ?? null,
    og: {
      ...site.og,
      'og:title': title,
      ...(description ? { 'og:description': description } : {}),
    },
    twitter: { ...site.twitter },
    jsonLd: site.json_ld,
  }
}
