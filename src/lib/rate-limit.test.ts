import { describe, expect, it } from 'vitest'
import { consumeRateLimit, RATE_LIMITS, type RateLimitStore } from './rate-limit'
import { consumeRateLimit as consumeValuationRateLimit, VALUATION_RATE_LIMIT } from '../../packages/plugins/pwb-valuation/src/rate-limit.js'

/** In-memory stand-in with the same conditional-write semantics as plugin storage. */
function memoryStore() {
  const rows = new Map<string, { count: number; window: number }>()
  const store: RateLimitStore = {
    async compareAndSet(id, expected, data) {
      if (expected !== null || rows.has(id)) return { applied: false }
      rows.set(id, { ...data })
      return { applied: true }
    },
    async updateIf(id, { where, delta }) {
      const row = rows.get(id)
      const lt = (where.count as { lt: number }).lt
      if (!row || !(row.count < lt)) return { applied: false }
      row.count += delta.count.inc
      return { applied: true }
    },
    async query({ where, limit }) {
      const before = (where.window as { lt: number }).lt
      return { items: [...rows].filter(([, r]) => r.window < before).slice(0, limit).map(([id]) => ({ id })) }
    },
    async deleteMany(ids) {
      return ids.filter((id) => rows.delete(id)).length
    },
  }
  return { store, rows }
}

const rule = { endpoint: 'test', max: 3, windowSeconds: 600 }
const t0 = Date.UTC(2026, 10, 12, 10, 0, 0)

describe('consumeRateLimit', () => {
  it('allows max requests per window, then refuses', async () => {
    const { store } = memoryStore()
    const results = []
    for (let i = 0; i < 5; i++) results.push(await consumeRateLimit(store, '203.0.113.7', rule, { now: t0 + i }))
    expect(results).toEqual([true, true, true, false, false])
  })

  it('counts clients separately', async () => {
    const { store } = memoryStore()
    for (let i = 0; i < 3; i++) await consumeRateLimit(store, '203.0.113.7', rule, { now: t0 })
    expect(await consumeRateLimit(store, '203.0.113.7', rule, { now: t0 })).toBe(false)
    expect(await consumeRateLimit(store, '198.51.100.9', rule, { now: t0 })).toBe(true)
  })

  it('starts afresh in the next window', async () => {
    const { store } = memoryStore()
    for (let i = 0; i < 4; i++) await consumeRateLimit(store, '203.0.113.7', rule, { now: t0 })
    expect(await consumeRateLimit(store, '203.0.113.7', rule, { now: t0 + 600_000 })).toBe(true)
  })

  it('does not throttle when the client address is unknown', async () => {
    const { store, rows } = memoryStore()
    for (let i = 0; i < 10; i++) expect(await consumeRateLimit(store, null, rule, { now: t0 })).toBe(true)
    expect(rows.size).toBe(0)
  })

  it('stores a hash, never the address', async () => {
    const { store, rows } = memoryStore()
    await consumeRateLimit(store, '203.0.113.7', rule, { now: t0 })
    const [id] = [...rows.keys()]
    expect(id).toMatch(/^test:\d+:[0-9a-f]{32}$/)
    expect(id).not.toContain('203.0.113.7')
  })

  it('deletes windows older than the previous one when a new window starts', async () => {
    const { store, rows } = memoryStore()
    await consumeRateLimit(store, 'a', rule, { now: t0 })
    await consumeRateLimit(store, 'a', rule, { now: t0 + 600_000 })
    await consumeRateLimit(store, 'a', rule, { now: t0 + 1_200_000, random: () => 0 })
    expect([...rows.values()].map((r) => r.window).sort()).toEqual([t0 + 600_000, t0 + 1_200_000])
  })

  it('has limits for the public lead-reports routes', () => {
    expect(RATE_LIMITS.enquiries.max).toBeGreaterThan(0)
    expect(RATE_LIMITS.track.max).toBeGreaterThan(RATE_LIMITS.enquiries.max)
  })
})

describe('pwb-valuation consumeRateLimit (package copy)', () => {
  it('behaves like the host limiter', async () => {
    const { store } = memoryStore()
    const max = VALUATION_RATE_LIMIT.max
    const results = []
    for (let i = 0; i <= max; i++) results.push(await consumeValuationRateLimit(store, '203.0.113.7', VALUATION_RATE_LIMIT, { now: t0 }))
    expect(results).toEqual([...Array(max).fill(true), false])
    expect(await consumeValuationRateLimit(store, null, VALUATION_RATE_LIMIT, { now: t0 })).toBe(true)
  })
})
