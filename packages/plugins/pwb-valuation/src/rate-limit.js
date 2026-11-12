/**
 * Per-client throttle for the public `submit` route, kept in plugin storage
 * (`rate_limits`, indexed on count and window). Same scheme as the host site's
 * src/lib/rate-limit.ts; this package can't import host code.
 *
 * `ip` is EmDash's `routeCtx.requestMeta.ip`: Cloudflare's client IP, or the
 * address the host's /valuation page passes in a trusted proxy header when it
 * calls the route in-process. Only a hash is stored; no address, no throttle.
 */

export const VALUATION_RATE_LIMIT = { endpoint: "valuation", max: 5, windowSeconds: 600 };

async function hashClient(ip) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`pwb-rate-limit:${ip}`));
  return [...new Uint8Array(digest).slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Count one request; resolves false when the client is over the limit. */
export async function consumeRateLimit(store, ip, rule, { now = Date.now(), random = Math.random } = {}) {
  if (!ip) return true;
  const windowMs = rule.windowSeconds * 1000;
  const window = Math.floor(now / windowMs) * windowMs;
  const id = `${rule.endpoint}:${window}:${await hashClient(ip)}`;

  const created = await store.compareAndSet(id, null, { count: 1, window });
  if (created.applied) {
    if (random() < 0.05) {
      const expired = await store.query({ where: { window: { lt: window - windowMs } }, limit: 100 });
      if (expired.items.length) await store.deleteMany(expired.items.map((item) => item.id));
    }
    return rule.max >= 1;
  }
  const counted = await store.updateIf(id, { where: { count: { lt: rule.max } }, delta: { count: { inc: 1 } } });
  return counted.applied;
}
