/**
 * `/[lang]` and `/[lang]/[...slug]` outrank the root `[...slug]` catch-all in
 * Astro's routing, so default-locale PWB pages (`/about-us`) reach the
 * localized routes. These tests pin down how those routes split a path into
 * locale + page slug — previously every such page returned an empty 404.
 */
import { describe, expect, it } from 'vitest'
import { resolveLocalizedLocale, resolvePwbPageRoute } from './route-locale'

describe('resolvePwbPageRoute', () => {
  it('keeps a supported locale prefix and forwards the rest as the slug', () => {
    expect(resolvePwbPageRoute({ lang: 'es', slug: 'about-us' })).toEqual({
      locale: 'es',
      slug: 'about-us',
      isDefaultLocale: false,
    })
  })

  it('treats a bare supported locale as that locale with no slug', () => {
    expect(resolvePwbPageRoute({ lang: 'fr' })).toEqual({ locale: 'fr', slug: undefined, isDefaultLocale: false })
  })

  it('treats a single non-locale segment as a default-locale page slug', () => {
    expect(resolvePwbPageRoute({ lang: 'about-us' })).toEqual({
      locale: 'en',
      slug: 'about-us',
      isDefaultLocale: true,
    })
  })

  it('joins a non-locale first segment back onto a nested slug', () => {
    expect(resolvePwbPageRoute({ lang: 'about-us', slug: 'team/leadership' })).toEqual({
      locale: 'en',
      slug: 'about-us/team/leadership',
      isDefaultLocale: true,
    })
  })

  it('does not treat the default locale as a prefix (prefixDefaultLocale is false)', () => {
    expect(resolvePwbPageRoute({ lang: 'en', slug: 'about-us' })).toEqual({
      locale: 'en',
      slug: 'en/about-us',
      isDefaultLocale: true,
    })
  })
})

describe('resolveLocalizedLocale', () => {
  it('404s an unsupported locale for routes that are locale-only', () => {
    const ctx = { params: { lang: 'about-us' }, response: {} as { status?: number } }
    expect(resolveLocalizedLocale(ctx)).toBeNull()
    expect(ctx.response.status).toBe(404)
  })
})
