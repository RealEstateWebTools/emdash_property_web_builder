/**
 * Locale validation and path helpers.
 *
 * Must stay in sync with the i18n block in astro.config.mjs.
 * When adding a new locale:
 *   1. Add it to i18n.locales in astro.config.mjs
 *   2. Add it to SUPPORTED_LOCALES here
 *   3. Add a fallback in i18n.fallback if needed
 */

export const DEFAULT_LOCALE = 'en'

/** Non-default locales only — these appear as URL prefixes (/es/, /fr/). */
export const SUPPORTED_LOCALES = ['es', 'fr'] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

export const ALL_LOCALES = [DEFAULT_LOCALE, ...SUPPORTED_LOCALES] as const
export type Locale = typeof ALL_LOCALES[number]

const LOCALE_LABELS: Record<string, string> = { en: 'EN', es: 'ES', fr: 'FR' }
export function localeLabel(locale: string): string {
  return LOCALE_LABELS[locale] ?? locale.toUpperCase()
}

/**
 * Returns the locale if it is a valid non-default locale, null otherwise.
 * Used in [lang] pages to guard against arbitrary URL segments matching the route.
 */
export function validateLocale(lang: string | undefined): SupportedLocale | null {
  if (!lang) return null
  return (SUPPORTED_LOCALES as readonly string[]).includes(lang)
    ? (lang as SupportedLocale)
    : null
}

/**
 * Build a locale-prefixed path.
 * Default locale gets no prefix; non-default locales are prefixed with /<locale>.
 *
 * localePath('en', '/posts/my-post') → '/posts/my-post'
 * localePath('es', '/posts/mi-entrada') → '/es/posts/mi-entrada'
 */
export function localePath(locale: string, path: string): string {
	if (/^(?:[a-z]+:)?\/\//i.test(path) || /^(?:mailto:|tel:|#)/i.test(path)) {
		return path
	}
  if (locale === DEFAULT_LOCALE) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `/${locale}${normalized}`
}
