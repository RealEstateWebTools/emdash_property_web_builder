import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { PWB_API_PREFIX, resolvePwbFixture } from './pwb-fixture-routes.mjs'

const ORIGIN = 'http://localhost:3001'
const BASE = `${ORIGIN}${PWB_API_PREFIX}`

// Routes live in pwb-fixture-routes.mjs so the visual-regression mock server
// (scripts/mock-pwb-server.mjs) serves exactly the same data. Returning
// undefined lets unmatched requests fall through to onUnhandledRequest.
async function fromFixtures({ request }: { request: Request }) {
  const pathname = new URL(request.url).pathname.slice(PWB_API_PREFIX.length)
  const body = request.method === 'POST' ? await request.clone().json().catch(() => null) : null
  const result = resolvePwbFixture(request.method, pathname, body)
  return result ? HttpResponse.json(result.body, { status: result.status }) : undefined
}

export const handlers = [http.get(`${BASE}/*`, fromFixtures), http.post(`${BASE}/*`, fromFixtures)]

export const server = setupServer(...handlers)
