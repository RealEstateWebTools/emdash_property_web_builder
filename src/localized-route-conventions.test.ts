import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(process.cwd())

function readSource(relativePath: string) {
  return readFileSync(resolve(ROOT, relativePath), 'utf8')
}

describe('localized route conventions', () => {
  const localizedRouteWrappers = [
    'src/pages/[lang]/index.astro',
    'src/pages/[lang]/search.astro',
    'src/pages/[lang]/[...slug].astro',
    'src/pages/[lang]/pages/[slug].astro',
    'src/pages/[lang]/posts/index.astro',
    'src/pages/[lang]/posts/[slug].astro',
    'src/pages/[lang]/properties/index.astro',
    'src/pages/[lang]/properties/[slug].astro',
    'src/pages/[lang]/category/[slug].astro',
    'src/pages/[lang]/tag/[slug].astro',
  ]

  it('guards every localized route wrapper with shared locale bootstrap helper', () => {
    for (const route of localizedRouteWrappers) {
      const source = readSource(route)

      expect(source, `${route} should use shared locale bootstrap helper`).toContain('resolveLocalizedLocale(Astro)')
    }

    const helper = readSource('src/lib/route-locale.ts')
    expect(helper).toContain('validateLocale(ctx.params.lang)')
    expect(helper).toContain('ctx.response.status = 404')
  })

  it('keeps root and localized index wrappers aligned on the same page component', () => {
    const root = readSource('src/pages/index.astro')
    const localized = readSource('src/pages/[lang]/index.astro')

    expect(root).toContain('IndexPage')
    expect(localized).toContain('IndexPage')
    expect(root).toContain('<IndexPage locale={locale} />')
    expect(localized).toContain('<IndexPage locale={locale} />')
  })

  it('keeps root and localized CMS slug wrappers aligned on locale + slug forwarding', () => {
    const root = readSource('src/pages/pages/[slug].astro')
    const localized = readSource('src/pages/[lang]/pages/[slug].astro')

    expect(root).toContain('<CmsPage locale={locale} slug={slug} />')
    expect(localized).toContain('<CmsPage locale={locale} slug={slug} />')
  })

  it('keeps localized UI text centralized in the locale helper', () => {
    const source = readSource('src/lib/locale.ts')

    expect(source).toContain("'Property Search': 'Buscador de Propiedades'")
    expect(source).toContain("'Property Search': 'Recherche Immobiliere'")
    expect(source).toContain("'Search': 'Buscar'")
    expect(source).toContain("'Search': 'Recherche'")
  })

  it('uses translated brand names in shared shells instead of hard-coded locale copies', () => {
    const baseLayout = readSource('src/layouts/BaseLayout.astro')
    const siteHeader = readSource('src/components/SiteHeader.astro')
    const siteFooter = readSource('src/components/SiteFooter.astro')
    const blogBase = readSource('src/layouts/Base.astro')

    expect(baseLayout).toContain('translateBrand(currentLocale, site.company_display_name ?? site.title)')
    expect(siteHeader).toContain('const localizedBrand = translateBrand(currentLocale, site.company_display_name ?? site.title)')
    expect(siteFooter).toContain('const localizedSiteTitle = translateBrand(currentLocale, siteTitle)')
    expect(blogBase).toContain('const siteTitle = translateBrand(currentLocale, "My Blog")')
    expect(readSource('src/components/pages/PostPage.astro')).toContain('siteTitle: translateBrand(locale, "My Blog")')
  })

  it('renders visible translation links for translated content pages and mirrors alternates in the page shell', () => {
    const baseLayout = readSource('src/layouts/BaseLayout.astro')
    const postPage = readSource('src/components/pages/PostPage.astro')
    const cmsPage = readSource('src/components/pages/CmsPage.astro')

    expect(baseLayout).toContain('alternateLinks?: Array<{ locale: string; href: string }>')
    expect(baseLayout).toContain('<link rel="alternate" hreflang={locale} href={href} />')
    expect(postPage).toContain('import TranslationLinks from "../TranslationLinks.astro";')
    expect(postPage).toContain('<TranslationLinks links={alternateLinks} />')
    expect(cmsPage).toContain("...(await getTranslations('pages', page.data.id)).translations.map")
    expect(cmsPage).toContain('<TranslationLinks links={alternateLinks} />')
  })

  it('defines both default and localized RSS feeds', () => {
    const defaultFeed = readSource('src/pages/rss.xml.ts')
    const localizedFeed = readSource('src/pages/[lang]/rss.xml.ts')

    expect(defaultFeed).toContain("selfPath: '/rss.xml'")
    expect(localizedFeed).toContain('validateLocale(params.lang)')
    expect(localizedFeed).toContain("selfPath: localePath(locale, '/rss.xml')")
  })
})