/**
 * E2E: the public plugin routes throttle per client — `pnpm test:native`.
 *
 * Runs against the real plugin storage and EmDash's client-IP resolution.
 * Off Cloudflare the client address comes from the trusted x-pwb-client-ip
 * header (astro.config.ts), so each test uses a fresh documentation-range
 * address (2001:db8::/32) and doesn't use up the allowance of other tests or
 * earlier runs against the same server. Payloads are
 * invalid on purpose: the throttle runs before validation, so nothing is
 * stored and no email is sent.
 */

import { test, expect, type APIRequestContext } from '@playwright/test'

/** A random address in the IPv6 documentation range. */
function testClient(): string {
  const part = () => Math.floor(Math.random() * 0xffff).toString(16)
  return `2001:db8::${part()}:${part()}`
}

async function statuses(request: APIRequestContext, path: string, ip: string, count: number) {
  const result: number[] = []
  for (let i = 0; i < count; i++) {
    const response = await request.post(path, { headers: { 'x-pwb-client-ip': ip }, data: {} })
    result.push(response.status())
  }
  return result
}

test('the public enquiries route allows 5 per client, then answers 429', async ({ request }) => {
  const path = '/_emdash/api/plugins/lead-reports/enquiries'
  expect(await statuses(request, path, testClient(), 6)).toEqual([400, 400, 400, 400, 400, 429])
  // Another client is unaffected.
  expect(await statuses(request, path, testClient(), 1)).toEqual([400])
})

test('the public valuation route allows 5 per client, then answers 429', async ({ request }) => {
  const path = '/_emdash/api/plugins/pwb-valuation/submit'
  expect(await statuses(request, path, testClient(), 6)).toEqual([422, 422, 422, 422, 422, 429])
})
