import type { SiteDetails } from './types'

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
    title?: string
    description?: string
    canonical?: string
  } = {}
): PageMeta {
  const siteName = site.company_display_name ?? site.title
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
