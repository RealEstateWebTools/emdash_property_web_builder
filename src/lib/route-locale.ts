import { DEFAULT_LOCALE, type SupportedLocale, validateLocale } from './locale'

interface LocalizedRouteContextLike {
  params: { lang?: string }
  response: { status?: number }
}

export function resolveLocalizedLocale(ctx: LocalizedRouteContextLike): SupportedLocale | null {
  const locale = validateLocale(ctx.params.lang)
  if (!locale) {
    ctx.response.status = 404
    return null
  }
  return locale
}

export function resolveDefaultLocale(currentLocale: string | undefined): string {
  return currentLocale ?? DEFAULT_LOCALE
}

/**
 * Resolves `/[lang]` and `/[lang]/[...slug]` for PWB pages.
 *
 * Astro ranks a named param above a rest param, so these routes match before
 * the root `[...slug]` catch-all: a default-locale page like `/about-us`
 * arrives here as `lang = "about-us"`. When `lang` is not a supported locale,
 * the whole path is a default-locale page slug rather than a 404.
 */
export function resolvePwbPageRoute(params: { lang?: string; slug?: string }): {
  locale: string
  slug: string | undefined
  isDefaultLocale: boolean
} {
  const locale = validateLocale(params.lang)
  if (locale) return { locale, slug: params.slug, isDefaultLocale: false }

  const slug = [params.lang, params.slug].filter(Boolean).join('/') || undefined
  return { locale: DEFAULT_LOCALE, slug, isDefaultLocale: true }
}
