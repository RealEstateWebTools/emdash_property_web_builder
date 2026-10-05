/**
 * Fixture-backed responses for the PWB public API.
 *
 * Shared by the msw handlers used in unit tests (pwb-server.ts) and the
 * standalone mock server used by the visual regression suite
 * (scripts/mock-pwb-server.mjs), so both serve identical data.
 *
 * Plain JS with readFileSync (no JSON import attributes) so it loads in
 * Node directly as well as under Vitest.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Resolved from the project root: under Vitest's DOM environments
// import.meta.url is not a file: URL. Both callers run from the root.
const FIXTURES_DIR = resolve(process.cwd(), 'src/test/fixtures')

function fixture(name) {
  return JSON.parse(readFileSync(resolve(FIXTURES_DIR, `${name}.json`), 'utf8'))
}

const siteDetails = fixture('site-details')
const property = fixture('property')
const searchResults = fixture('search-results')
const searchFacets = fixture('search-facets')
const searchConfig = fixture('search-config')
const page = fixture('page')

export const PWB_API_PREFIX = '/api_public/v1'

const notFound = { status: 404, body: { error: 'Not Found' } }

/**
 * Resolve a PWB API request to a fixture response.
 * `pathname` is the URL path after PWB_API_PREFIX, e.g. `/en/site_details`.
 * Returns `{ status, body }`, or `null` when no route matches.
 */
export function resolvePwbFixture(method, pathname, requestBody) {
  if (method === 'POST' && pathname === '/enquiries') {
    if (!requestBody?.enquiry?.email) {
      return { status: 422, body: { success: false, errors: ['Email is required'] } }
    }
    return {
      status: 201,
      body: { success: true, message: 'Enquiry sent', data: { contact_id: 1, message_id: 1 } },
    }
  }

  if (method !== 'GET') return null

  // Localized endpoints: /:locale/<resource>
  const match = pathname.match(/^\/([a-z]{2})(\/.*)$/)
  if (!match) return null
  const resource = match[2]

  if (resource === '/site_details') return { status: 200, body: siteDetails }
  if (resource === '/properties') return { status: 200, body: searchResults }
  if (resource === '/search/facets') return { status: 200, body: searchFacets }
  if (resource === '/search/config') return { status: 200, body: searchConfig }

  const propertyMatch = resource.match(/^\/properties\/([^/]+)$/)
  if (propertyMatch) {
    return decodeURIComponent(propertyMatch[1]) === property.slug ? { status: 200, body: property } : notFound
  }

  const pageMatch = resource.match(/^\/localized_page\/by_slug\/([^/]+)$/)
  if (pageMatch) {
    return decodeURIComponent(pageMatch[1]) === 'about' ? { status: 200, body: page } : notFound
  }

  return null
}
