/**
 * Page-level data loaders for dynamic routes.
 *
 * Astro 7 creates the HTTP Response as soon as the page frontmatter
 * finishes; components render into the body stream afterwards, so
 * `Astro.response.status` assignments inside components are silently
 * ignored (they worked under Astro 6). Every dynamic route therefore
 * resolves its primary entity here, in a loader called from the route's
 * frontmatter, and applies the returned `status` before rendering:
 *
 *   const load = await loadPostEntry(locale, slug)
 *   if (load.status) Astro.response.status = load.status
 *
 * The loaded data is passed to the shared page component as props so
 * nothing is fetched twice (getEmDashEntry is not request-cached, and
 * the PWB calls are external HTTP requests).
 */
import { getEmDashEntry, getTerm } from 'emdash'
import { isPwbNotFoundError, logPwbUnexpectedError } from './pwb/errors'
import { fallbackSite } from './pwb/fallback-site'
import { shouldQueryPwbPageSlug } from './pwb/page-slug'
import { createPwbClient } from './pwb/client'
import type { Page, Property, SiteDetails } from './pwb/types'

export type PwbLoadState = 'ok' | 'not_found' | 'unavailable'

export function statusForLoadState(loadState: PwbLoadState): number | undefined {
  if (loadState === 'not_found') return 404
  if (loadState === 'unavailable') return 502
  return undefined
}

/** Blog post detail (EmDash `posts` collection). */
export async function loadPostEntry(locale: string | null, slug: string | undefined) {
  const { entry, cacheHint } =
    locale && slug
      ? await getEmDashEntry('posts', slug, { locale })
      : { entry: null, cacheHint: undefined }
  return { post: entry, cacheHint, status: entry ? undefined : 404 }
}

/** CMS page detail (EmDash `pages` collection). */
export async function loadCmsEntry(locale: string | null, slug: string | undefined) {
  const { entry, cacheHint } =
    locale && slug
      ? await getEmDashEntry('pages', slug, { locale })
      : { entry: null, cacheHint: undefined }
  return { page: entry, cacheHint, status: entry ? undefined : 404 }
}

/**
 * Area / lifestyle landing page (EmDash `areas` collection). EmDash itself
 * walks the i18n fallback chain (es/fr → en) when a translation is missing
 * and reports it as `fallbackLocale`; `isFallback` lets the page say so and
 * point its canonical at the original.
 */
export async function loadAreaEntry(locale: string | null, slug: string | undefined) {
  if (!locale || !slug) return { area: null, cacheHint: undefined, isFallback: false, status: 404 }

  const { entry, cacheHint, fallbackLocale } = await getEmDashEntry('areas', slug, { locale })
  return { area: entry, cacheHint, isFallback: Boolean(entry && fallbackLocale), status: entry ? undefined : 404 }
}

/**
 * Route loader for /areas/[slug]. The static `areas` route shadows any PWB
 * CMS page under `areas/…` that the [lang] catch-all used to serve, so when
 * no EmDash area exists, fall back to the PWB page `areas/<slug>` (or the
 * PWB-styled 404).
 */
export async function loadAreaRoute(locale: string | null, slug: string | undefined) {
  const area = await loadAreaEntry(locale, slug)
  if (area.area || !locale || !slug) return { area, pwb: null, status: area.status }

  // PwbPage also renders the styled 404 when neither exists.
  const pwb = await loadPwbPage(locale, `areas/${slug}`)
  return { area, pwb, status: pwb.status }
}

/** Taxonomy term listing (category/tag archive pages). */
export async function loadTaxonomyTerm(taxonomy: 'category' | 'tag', slug: string | undefined) {
  const term = slug ? await getTerm(taxonomy, slug) : null
  return { term, status: term ? undefined : 404 }
}

/** Property detail from the PWB backend. */
export async function loadPropertyDetail(locale: string | null, slug: string | undefined) {
  let property: Property | null = null
  let site: SiteDetails = fallbackSite
  let loadState: PwbLoadState = 'ok'

  if (locale && slug) {
    try {
      const client = createPwbClient(locale)
      ;[property, site] = await Promise.all([client.getProperty(slug), client.getSiteDetails()])
    } catch (err) {
      if (isPwbNotFoundError(err)) {
        loadState = 'not_found'
      } else {
        loadState = 'unavailable'
        logPwbUnexpectedError(`property slug=${slug}`, err)
      }
    }
  } else {
    loadState = 'not_found'
  }

  return { property, site, loadState, status: statusForLoadState(loadState) }
}

/** PWB-backed CMS page (catch-all routes; missing slug means the home page). */
export async function loadPwbPage(locale: string | null, slug: string | string[] | undefined) {
  const pageSlug = Array.isArray(slug) ? slug.join('/') : (slug ?? 'home')
  let page: Page | null = null
  let site: SiteDetails = fallbackSite
  let loadState: PwbLoadState = 'ok'

  if (!locale || !shouldQueryPwbPageSlug(pageSlug)) {
    loadState = 'not_found'
  } else {
    try {
      const client = createPwbClient(locale)
      ;[page, site] = await Promise.all([client.getPageBySlug(pageSlug), client.getSiteDetails()])
    } catch (err) {
      if (isPwbNotFoundError(err)) {
        loadState = 'not_found'
      } else {
        loadState = 'unavailable'
        logPwbUnexpectedError(`page slug=${pageSlug}`, err)
      }
    }
  }

  return { pageSlug, page, site, loadState, status: statusForLoadState(loadState) }
}
