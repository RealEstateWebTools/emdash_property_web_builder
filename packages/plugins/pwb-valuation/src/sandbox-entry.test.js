import { describe, it, expect, vi, beforeEach } from 'vitest'
import plugin, { buildValuationRows, buildListBlocks } from './sandbox-entry.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockCtx(storedItems = []) {
  return {
    storage: {
      valuations: {
        put: vi.fn().mockResolvedValue(undefined),
        query: vi.fn().mockResolvedValue({ items: storedItems, hasMore: false }),
      },
    },
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  }
}

function makeRouteCtx(input) {
  return { input }
}

async function expectThrowsResponse(fn, expectedStatus) {
  try {
    await fn()
    expect.fail('Expected handler to throw a Response')
  } catch (err) {
    expect(err).toBeInstanceOf(Response)
    expect(err.status).toBe(expectedStatus)
    return err.json()
  }
}

// ---------------------------------------------------------------------------
// buildValuationRows
// ---------------------------------------------------------------------------

describe('buildValuationRows', () => {
  it('maps storage items to display fields', () => {
    const items = [
      {
        id: 'abc',
        data: {
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+1 555 000',
          address: '123 Main St',
          status: 'new',
          createdAt: '2024-01-01T00:00:00Z',
        },
      },
    ]
    const rows = buildValuationRows(items)
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('Jane Smith')
    expect(rows[0].email).toBe('jane@example.com')
    expect(rows[0].status).toBe('new')
  })

  it('falls back to em-dash for missing fields', () => {
    const rows = buildValuationRows([{ id: 'x', data: {} }])
    expect(rows[0].name).toBe('—')
    expect(rows[0].email).toBe('—')
    expect(rows[0].phone).toBe('—')
    expect(rows[0].address).toBe('—')
    expect(rows[0].status).toBe('new')
  })

  it('returns an empty array for empty input', () => {
    expect(buildValuationRows([])).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// buildListBlocks
// ---------------------------------------------------------------------------

describe('buildListBlocks', () => {
  it('returns empty-state message when there are no items', () => {
    const blocks = buildListBlocks({ items: [], hasMore: false })
    expect(blocks.some((b) => b.type === 'section')).toBe(true)
    const section = blocks.find((b) => b.type === 'section')
    expect(section.text).toMatch(/no valuation/i)
  })

  it('returns a table block when there are items', () => {
    const items = [
      {
        id: '1',
        data: {
          name: 'Alice',
          email: 'alice@example.com',
          phone: '',
          address: '1 High St',
          status: 'new',
          createdAt: '2024-06-01T00:00:00Z',
        },
      },
    ]
    const blocks = buildListBlocks({ items, hasMore: false })
    const table = blocks.find((b) => b.type === 'table')
    expect(table).toBeDefined()
    expect(table.rows).toHaveLength(1)
    expect(table.rows[0].name).toBe('Alice')
  })

  it('includes a stats block showing total and new counts', () => {
    const items = [
      { id: '1', data: { status: 'new', name: 'A', email: 'a@x.com', address: '1 St', createdAt: '' } },
      { id: '2', data: { status: 'reviewed', name: 'B', email: 'b@x.com', address: '2 St', createdAt: '' } },
    ]
    const blocks = buildListBlocks({ items, hasMore: false })
    const stats = blocks.find((b) => b.type === 'stats')
    expect(stats).toBeDefined()
    const total = stats.items.find((s) => s.label === 'Total')
    const newCount = stats.items.find((s) => s.label === 'New')
    expect(total.value).toBe('2')
    expect(newCount.value).toBe('1')
  })
})

// ---------------------------------------------------------------------------
// submit route
// ---------------------------------------------------------------------------

describe('submit route', () => {
  let ctx

  beforeEach(() => {
    ctx = makeMockCtx()
  })

  it('stores a valid submission and returns success', async () => {
    const routeCtx = makeRouteCtx({
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+1 555 000 0000',
      address: '123 Main St, Marbella',
      notes: 'Three bed preferred',
    })

    const result = await plugin.routes.submit.handler(routeCtx, ctx)

    expect(result.success).toBe(true)
    expect(typeof result.id).toBe('string')
    expect(result.id.length).toBeGreaterThan(0)

    expect(ctx.storage.valuations.put).toHaveBeenCalledOnce()
    const [, stored] = ctx.storage.valuations.put.mock.calls[0]
    expect(stored.name).toBe('Jane Smith')
    expect(stored.email).toBe('jane@example.com')
    expect(stored.status).toBe('new')
    expect(stored.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}/)
  })

  it('trims whitespace from all fields before storing', async () => {
    const routeCtx = makeRouteCtx({
      name: '  Jane Smith  ',
      email: '  jane@example.com  ',
      address: '  123 Main St  ',
    })

    await plugin.routes.submit.handler(routeCtx, ctx)

    const [, stored] = ctx.storage.valuations.put.mock.calls[0]
    expect(stored.name).toBe('Jane Smith')
    expect(stored.email).toBe('jane@example.com')
    expect(stored.address).toBe('123 Main St')
  })

  it('phone and notes are optional — accepts submission without them', async () => {
    const routeCtx = makeRouteCtx({
      name: 'Jane',
      email: 'jane@example.com',
      address: '123 Main St',
    })

    const result = await plugin.routes.submit.handler(routeCtx, ctx)
    expect(result.success).toBe(true)
  })

  it('rejects missing name with 422', async () => {
    const routeCtx = makeRouteCtx({ email: 'jane@example.com', address: '123 St' })
    const body = await expectThrowsResponse(
      () => plugin.routes.submit.handler(routeCtx, ctx),
      422,
    )
    expect(body.error).toMatch(/required/i)
  })

  it('rejects whitespace-only name with 422', async () => {
    const routeCtx = makeRouteCtx({ name: '   ', email: 'jane@example.com', address: '123 St' })
    const body = await expectThrowsResponse(
      () => plugin.routes.submit.handler(routeCtx, ctx),
      422,
    )
    expect(body.error).toMatch(/required/i)
  })

  it('rejects missing email with 422', async () => {
    const routeCtx = makeRouteCtx({ name: 'Jane', address: '123 St' })
    const body = await expectThrowsResponse(
      () => plugin.routes.submit.handler(routeCtx, ctx),
      422,
    )
    expect(body.error).toMatch(/required/i)
  })

  it('rejects missing address with 422', async () => {
    const routeCtx = makeRouteCtx({ name: 'Jane', email: 'jane@example.com' })
    const body = await expectThrowsResponse(
      () => plugin.routes.submit.handler(routeCtx, ctx),
      422,
    )
    expect(body.error).toMatch(/required/i)
  })

  it('handles non-string input gracefully (treats as empty)', async () => {
    const routeCtx = makeRouteCtx({ name: 42, email: null, address: undefined })
    const body = await expectThrowsResponse(
      () => plugin.routes.submit.handler(routeCtx, ctx),
      422,
    )
    expect(body.error).toMatch(/required/i)
  })

  it('handles missing input object gracefully', async () => {
    const routeCtx = makeRouteCtx(null)
    const body = await expectThrowsResponse(
      () => plugin.routes.submit.handler(routeCtx, ctx),
      422,
    )
    expect(body.error).toMatch(/required/i)
  })
})

// ---------------------------------------------------------------------------
// list route
// ---------------------------------------------------------------------------

describe('list route', () => {
  it('returns items with id spread into each record', async () => {
    const stored = [
      { id: 'abc123', data: { name: 'Jane', email: 'jane@x.com', status: 'new', createdAt: '' } },
    ]
    const ctx = makeMockCtx(stored)

    const result = await plugin.routes.list.handler(makeRouteCtx({}), ctx)

    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe('abc123')
    expect(result.items[0].name).toBe('Jane')
    expect(result.hasMore).toBe(false)
  })

  it('returns empty items array when storage is empty', async () => {
    const ctx = makeMockCtx([])
    const result = await plugin.routes.list.handler(makeRouteCtx({}), ctx)
    expect(result.items).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// admin route
// ---------------------------------------------------------------------------

describe('admin route', () => {
  it('returns a blocks array', async () => {
    const ctx = makeMockCtx([])
    const result = await plugin.routes.admin.handler(makeRouteCtx({}), ctx)
    expect(Array.isArray(result.blocks)).toBe(true)
  })

  it('queries storage ordered by createdAt desc with limit 50', async () => {
    const ctx = makeMockCtx([])
    await plugin.routes.admin.handler(makeRouteCtx({}), ctx)
    expect(ctx.storage.valuations.query).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      limit: 50,
    })
  })
})
