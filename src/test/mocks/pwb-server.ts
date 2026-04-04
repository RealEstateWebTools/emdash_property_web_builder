import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import siteDetails from '../fixtures/site-details.json'
import property from '../fixtures/property.json'
import searchResults from '../fixtures/search-results.json'
import searchFacets from '../fixtures/search-facets.json'
import searchConfig from '../fixtures/search-config.json'
import page from '../fixtures/page.json'

const BASE = 'http://localhost:3001/api_public/v1'

export const handlers = [
  http.get(`${BASE}/site_details`, () => HttpResponse.json(siteDetails)),

  http.get(`${BASE}/properties/search`, () => HttpResponse.json(searchResults)),

  http.get(`${BASE}/properties/:slug`, ({ params }) => {
    if (params.slug === property.slug) return HttpResponse.json(property)
    return HttpResponse.json({ error: 'Not Found' }, { status: 404 })
  }),

  http.get(`${BASE}/search/facets`, () => HttpResponse.json(searchFacets)),

  http.get(`${BASE}/search/config`, () => HttpResponse.json(searchConfig)),

  http.get(`${BASE}/pages`, ({ request }) => {
    const url = new URL(request.url)
    const slug = url.searchParams.get('slug')
    if (slug === 'about') return HttpResponse.json(page)
    return HttpResponse.json({ error: 'Not Found' }, { status: 404 })
  }),

  http.post(`${BASE}/enquiries`, async ({ request }) => {
    const body = await request.json() as { enquiry: { email?: string } }
    if (!body.enquiry?.email) {
      return HttpResponse.json(
        { success: false, errors: ['Email is required'] },
        { status: 422 }
      )
    }
    return HttpResponse.json(
      { success: true, message: 'Enquiry sent', data: { contact_id: 1, message_id: 1 } },
      { status: 201 }
    )
  }),
]

export const server = setupServer(...handlers)
