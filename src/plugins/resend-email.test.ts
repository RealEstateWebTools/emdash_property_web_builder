import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('emdash', () => ({
  definePlugin: (def: any) => def,
}))

import plugin from './resend-email.sandbox'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCtx(kvStore: Record<string, unknown> = {}) {
  const store = { ...kvStore }
  return {
    kv: {
      get: vi.fn(async (key: string) => store[key] ?? null),
      set: vi.fn(async (key: string, value: unknown) => {
        store[key] = value
      }),
    },
    http: {
      fetch: vi.fn(),
    },
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    _store: store,
  }
}

function makeOkResponse(body: unknown = { id: 'email_123' }) {
  return {
    ok: true,
    text: async () => JSON.stringify(body),
  }
}

function makeErrorResponse(status: number, body: string) {
  return {
    ok: false,
    status,
    text: async () => body,
  }
}

const deliverHandler = (plugin as any).hooks['email:deliver'].handler
const adminHandler = (plugin as any).routes.admin.handler

// ── email:deliver ─────────────────────────────────────────────────────────────

describe('email:deliver', () => {
  it('throws when API key is not configured', async () => {
    const ctx = makeCtx({ 'settings:from_address': 'no-reply@example.com' })
    await expect(
      deliverHandler({ message: { to: 'a@b.com', subject: 'Hi', text: 'Hello' } }, ctx),
    ).rejects.toThrow(/api key is not configured/i)
  })

  it('throws when from address is not configured', async () => {
    const ctx = makeCtx({ 'settings:api_key': 're_abc123' })
    await expect(
      deliverHandler({ message: { to: 'a@b.com', subject: 'Hi', text: 'Hello' } }, ctx),
    ).rejects.toThrow(/"from" address is not configured/i)
  })

  it('posts to api.resend.com/emails with correct shape', async () => {
    const ctx = makeCtx({
      'settings:api_key': 're_abc123',
      'settings:from_address': 'no-reply@example.com',
    })
    ctx.http.fetch.mockResolvedValue(makeOkResponse())

    await deliverHandler(
      { message: { to: 'buyer@example.com', subject: 'Enquiry received', text: 'Plain text' } },
      ctx,
    )

    expect(ctx.http.fetch).toHaveBeenCalledOnce()
    const [url, init] = ctx.http.fetch.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer re_abc123')
    expect(init.headers['Content-Type']).toBe('application/json')

    const body = JSON.parse(init.body)
    expect(body.from).toBe('no-reply@example.com')
    expect(body.to).toEqual(['buyer@example.com'])
    expect(body.subject).toBe('Enquiry received')
    expect(body.text).toBe('Plain text')
  })

  it('includes html field when message has html', async () => {
    const ctx = makeCtx({
      'settings:api_key': 're_abc123',
      'settings:from_address': 'no-reply@example.com',
    })
    ctx.http.fetch.mockResolvedValue(makeOkResponse())

    await deliverHandler(
      {
        message: {
          to: 'buyer@example.com',
          subject: 'Welcome',
          text: 'Plain',
          html: '<p>HTML</p>',
        },
      },
      ctx,
    )

    const body = JSON.parse(ctx.http.fetch.mock.calls[0][1].body)
    expect(body.html).toBe('<p>HTML</p>')
  })

  it('omits html field when message has no html', async () => {
    const ctx = makeCtx({
      'settings:api_key': 're_abc123',
      'settings:from_address': 'no-reply@example.com',
    })
    ctx.http.fetch.mockResolvedValue(makeOkResponse())

    await deliverHandler(
      { message: { to: 'buyer@example.com', subject: 'Hi', text: 'Plain' } },
      ctx,
    )

    const body = JSON.parse(ctx.http.fetch.mock.calls[0][1].body)
    expect(body).not.toHaveProperty('html')
  })

  it('throws with status code when Resend returns a non-ok response', async () => {
    const ctx = makeCtx({
      'settings:api_key': 're_abc123',
      'settings:from_address': 'no-reply@example.com',
    })
    ctx.http.fetch.mockResolvedValue(makeErrorResponse(422, '{"message":"Invalid from address"}'))

    await expect(
      deliverHandler({ message: { to: 'a@b.com', subject: 'Hi', text: 'Hello' } }, ctx),
    ).rejects.toThrow(/422/)
  })

  it('logs success after delivery', async () => {
    const ctx = makeCtx({
      'settings:api_key': 're_abc123',
      'settings:from_address': 'no-reply@example.com',
    })
    ctx.http.fetch.mockResolvedValue(makeOkResponse())

    await deliverHandler(
      { message: { to: 'buyer@example.com', subject: 'Hi', text: 'Hello' } },
      ctx,
    )

    expect(ctx.log.info).toHaveBeenCalledWith(expect.stringContaining('buyer@example.com'))
  })
})

// ── admin route ───────────────────────────────────────────────────────────────

describe('admin route', () => {
  it('returns settings blocks on initial page load', async () => {
    const ctx = makeCtx()
    const result = await adminHandler({ input: {} }, ctx)

    expect(result.blocks).toBeDefined()
    expect(result.blocks.length).toBeGreaterThan(0)
    const header = result.blocks.find((b: any) => b.type === 'header')
    expect(header?.text).toMatch(/resend/i)
  })

  it('shows unconfigured warning when no API key is saved', async () => {
    const ctx = makeCtx()
    const result = await adminHandler({ input: {} }, ctx)

    const context = result.blocks.find(
      (b: any) => b.type === 'context' && /no api key/i.test(b.text),
    )
    expect(context).toBeDefined()
  })

  it('shows configured confirmation when API key is saved', async () => {
    const ctx = makeCtx({ 'settings:api_key': 're_abc123' })
    const result = await adminHandler({ input: {} }, ctx)

    const context = result.blocks.find(
      (b: any) => b.type === 'context' && /configured/i.test(b.text),
    )
    expect(context).toBeDefined()
  })

  it('saves API key and from address on form submit', async () => {
    const ctx = makeCtx()
    await adminHandler(
      {
        input: {
          action_id: 'save_settings',
          values: { api_key: 're_newkey', from_address: 'hello@example.com' },
        },
      },
      ctx,
    )

    expect(ctx.kv.set).toHaveBeenCalledWith('settings:api_key', 're_newkey')
    expect(ctx.kv.set).toHaveBeenCalledWith('settings:from_address', 'hello@example.com')
  })

  it('does not overwrite existing API key when blank string submitted', async () => {
    const ctx = makeCtx({ 'settings:api_key': 're_existing' })
    await adminHandler(
      {
        input: {
          action_id: 'save_settings',
          values: { api_key: '', from_address: 'hello@example.com' },
        },
      },
      ctx,
    )

    const setCalls = ctx.kv.set.mock.calls.map((c: any[]) => c[0])
    expect(setCalls).not.toContain('settings:api_key')
  })

  it('returns a success toast after saving', async () => {
    const ctx = makeCtx()
    const result = await adminHandler(
      {
        input: {
          action_id: 'save_settings',
          values: { api_key: 're_abc', from_address: 'a@b.com' },
        },
      },
      ctx,
    )

    expect(result.toast?.type).toBe('success')
  })
})
