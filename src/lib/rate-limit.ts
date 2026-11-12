/**
 * Per-client throttle for the public form and tracking routes, kept in plugin
 * storage (fixed windows, atomic counters).
 *
 * The client is identified by EmDash's `routeCtx.requestMeta.ip`: on Cloudflare
 * that is the edge's `cf-connecting-ip`, which visitors cannot forge. Routes
 * the site calls in-process (`/api/enquiries` → lead-reports `enquiries`) pass
 * the visitor's address in CLIENT_IP_HEADER, which astro.config.ts lists in
 * EmDash's `trustedProxyHeaders`. EmDash only reads that header when the
 * Cloudflare headers are absent, so on Cloudflare it can't override the edge.
 *
 * Only a hash of the address is stored. Without an address (some local and
 * test setups) requests are not throttled.
 */

export const CLIENT_IP_HEADER = 'x-pwb-client-ip'

export interface RateLimitRule {
  /** Name used in storage ids, e.g. "enquiries". */
  endpoint: string
  /** Requests allowed per client per window. */
  max: number
  windowSeconds: number
}

export const RATE_LIMITS = {
  enquiries: { endpoint: 'enquiries', max: 5, windowSeconds: 600 },
  track: { endpoint: 'track', max: 60, windowSeconds: 600 },
} as const satisfies Record<string, RateLimitRule>

interface Counter {
  count: number
  /** Window start, epoch ms. */
  window: number
}

/**
 * The plugin storage operations the limiter uses. Declare the collection with
 * `indexes: ['count', 'window']` (the guard and cleanup query on them).
 */
export interface RateLimitStore {
  compareAndSet(id: string, expectedRevision: string | null, data: Counter): Promise<{ applied: boolean }>
  updateIf(id: string, args: { where: Record<string, unknown>; delta: { count: { inc: number } } }): Promise<{ applied: boolean }>
  query(options: { where: Record<string, unknown>; limit: number }): Promise<{ items: Array<{ id: string }> }>
  deleteMany(ids: string[]): Promise<number>
}

async function hashClient(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`pwb-rate-limit:${ip}`))
  return [...new Uint8Array(digest).slice(0, 16)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Count one request; returns false when the client is over the limit.
 * Expired windows are deleted now and then, when a new window starts.
 */
export async function consumeRateLimit(
  store: RateLimitStore,
  ip: string | null | undefined,
  rule: RateLimitRule,
  { now = Date.now(), random = Math.random }: { now?: number; random?: () => number } = {},
): Promise<boolean> {
  if (!ip) return true
  const windowMs = rule.windowSeconds * 1000
  const window = Math.floor(now / windowMs) * windowMs
  const id = `${rule.endpoint}:${window}:${await hashClient(ip)}`

  const created = await store.compareAndSet(id, null, { count: 1, window })
  if (created.applied) {
    if (random() < 0.05) await deleteExpired(store, window - windowMs)
    return rule.max >= 1
  }
  // Guard and increment in one statement, so concurrent requests can't overshoot.
  const counted = await store.updateIf(id, { where: { count: { lt: rule.max } }, delta: { count: { inc: 1 } } })
  return counted.applied
}

async function deleteExpired(store: RateLimitStore, before: number): Promise<void> {
  const expired = await store.query({ where: { window: { lt: before } }, limit: 100 })
  if (expired.items.length) await store.deleteMany(expired.items.map((item) => item.id))
}
