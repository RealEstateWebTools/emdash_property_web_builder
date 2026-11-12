import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  ALL_LOCALES,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  entrySlug,
  hasTranslation,
  localePath,
  translateBrand,
  translateLabel,
  translateTermLabel,
  validateLocale,
} from './locale'

describe('locale helpers', () => {
  const requiredUiKeys = [
    'Properties',
    'Posts',
    'Bathrooms',
    'Area',
    'Contact Us',
    'Send Enquiry',
    'Your enquiry has been sent!',
    'Something went wrong. Please try again.',
    'Network error. Please try again.',
    // Category and tag archives
    'Category',
    'Tag',
    'post',
    'posts',
    '{term} posts',
    'All posts in {term}',
    'Posts tagged "{term}"',
    'All posts tagged with {term}',
    'No posts in this category yet.',
    'No posts with this tag yet.',
  ] as const

  it('fills {term} placeholders in translated archive labels', () => {
    expect(translateTermLabel('es', 'Posts tagged "{term}"', 'Playa')).toBe('Articulos con la etiqueta "Playa"')
    expect(translateTermLabel('en', '{term} posts', 'Guides')).toBe('Guides posts')
  })

  it('keeps locale constants aligned with the expected default and supported locales', () => {
    expect(DEFAULT_LOCALE).toBe('en')
    expect(SUPPORTED_LOCALES).toEqual(['es', 'fr'])
    expect(ALL_LOCALES).toEqual(['en', 'es', 'fr'])
  })

  it('validates only non-default locale route params', () => {
    expect(validateLocale('es')).toBe('es')
    expect(validateLocale('fr')).toBe('fr')
    expect(validateLocale('en')).toBeNull()
    expect(validateLocale('de')).toBeNull()
    expect(validateLocale(undefined)).toBeNull()
  })

  it('prefixes only non-default locale paths', () => {
    expect(localePath('en', '/posts/welcome')).toBe('/posts/welcome')
    expect(localePath('es', '/posts/bienvenido')).toBe('/es/posts/bienvenido')
    expect(localePath('fr', 'properties')).toBe('/fr/properties')
  })

  it('does not rewrite absolute or special-case URLs', () => {
    expect(localePath('es', 'https://example.com/foo')).toBe('https://example.com/foo')
    expect(localePath('es', 'mailto:test@example.com')).toBe('mailto:test@example.com')
    expect(localePath('es', '#hero')).toBe('#hero')
  })

  it('normalizes locale-prefixed collection ids into public slugs', () => {
    expect(entrySlug('es/guia-primer-comprador')).toBe('guia-primer-comprador')
    expect(entrySlug('/fr/mon-article')).toBe('mon-article')
    expect(entrySlug('welcome-post')).toBe('welcome-post')
  })

  it('translates shared UI labels when mappings exist', () => {
    expect(translateLabel('es', 'Search')).toBe('Buscar')
    expect(translateLabel('fr', 'Properties for Sale')).toBe('Biens a vendre')
    expect(translateLabel('en', 'Search')).toBe('Search')
    expect(translateLabel('es', 'Unmapped Label')).toBe('Unmapped Label')
  })

  it('translates site brand labels when mappings exist', () => {
    expect(translateBrand('es', 'Property Search')).toBe('Buscador de Propiedades')
    expect(translateBrand('fr', 'My Blog')).toBe('Mon Blog')
    expect(translateBrand('en', 'Property Search')).toBe('Property Search')
    expect(translateBrand('es', 'Custom Brand')).toBe('Custom Brand')
  })

  it('defines required UI keys for Spanish locale', () => {
    requiredUiKeys.forEach((key) => {
      expect(translateLabel('es', key)).not.toBe(key)
    })
  })

  it('defines required UI keys for French locale', () => {
    requiredUiKeys.forEach((key) => {
      expect(translateLabel('fr', key)).not.toBe(key)
    })
  })
})

/** Literal keys passed to translateLabel/translateTermLabel in site source. */
function literalLabelKeys(): Map<string, string> {
  const keys = new Map<string, string>()
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) return walk(path)
      return /\.(astro|ts)$/.test(entry.name) && !entry.name.includes('.test.') ? [path] : []
    })
  const call = /translate(?:Term)?Label\(\s*[\w.?]+\s*,\s*(['"])((?:\\.|(?!\1).)*)\1/g
  for (const file of walk('src')) {
    for (const match of readFileSync(file, 'utf8').matchAll(call)) {
      keys.set(match[2].replace(/\\(['"])/g, '$1'), file)
    }
  }
  return keys
}

describe('UI translations', () => {
  // About 60 labels used to render in English on /es/ and /fr/ pages, because
  // a missing key silently falls back to the English text.
  const keys = literalLabelKeys()

  it('finds the labels used across the site', () => {
    expect(keys.size).toBeGreaterThan(100)
    expect(keys.has('Browse Properties')).toBe(true)
  })

  for (const locale of SUPPORTED_LOCALES) {
    it(`translates every literal UI label into ${locale}`, () => {
      const missing = [...keys].filter(([key]) => !hasTranslation(locale, key)).map(([key, file]) => `${key} (${file})`)
      expect(missing).toEqual([])
    })
  }
})
