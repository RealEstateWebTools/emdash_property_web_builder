#!/usr/bin/env node
/**
 * Standalone mock of the PWB public API, serving the unit-test fixtures.
 *
 * Used by the visual regression suite so screenshots don't depend on live
 * PWB listings. Routes and data come from src/test/mocks/pwb-fixture-routes.mjs,
 * the same module behind the msw handlers in unit tests.
 *
 * Usage: node scripts/mock-pwb-server.mjs   (MOCK_PWB_PORT, default 3001)
 * Must be run from the project root.
 */

import http from 'node:http'
import { PWB_API_PREFIX, resolvePwbFixture } from '../src/test/mocks/pwb-fixture-routes.mjs'

export function createMockPwbServer() {
  return http.createServer(async (req, res) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost')

    if (pathname === '/health') {
      res.writeHead(200, { 'content-type': 'text/plain' })
      res.end('ok')
      return
    }

    let body = null
    if (req.method === 'POST') {
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      } catch {
        body = null
      }
    }

    const result = pathname.startsWith(PWB_API_PREFIX)
      ? resolvePwbFixture(req.method, pathname.slice(PWB_API_PREFIX.length), body)
      : null
    const { status, body: payload } = result ?? { status: 404, body: { error: 'Not Found' } }
    res.writeHead(status, { 'content-type': 'application/json' })
    res.end(JSON.stringify(payload))
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.MOCK_PWB_PORT ?? 3001)
  createMockPwbServer().listen(port, () => {
    console.log(`Mock PWB API listening on http://localhost:${port}${PWB_API_PREFIX}`)
  })
}
