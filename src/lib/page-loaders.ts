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
