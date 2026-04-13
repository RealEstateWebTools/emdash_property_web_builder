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
