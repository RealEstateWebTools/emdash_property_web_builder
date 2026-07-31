/**
 * Regression tests for OAuth Cloudflare env access (Astro v6 compatibility).
 *
 * Astro v6 removed `Astro.locals.runtime.env`. The emdash OAuth routes used
 * that API to read Cloudflare environment bindings (OAuth client ID/secret).
 * Accessing it now throws instead of returning undefined, breaking GitHub/Google
 * login in production.
 *
 * This project carried a local patch (patches/emdash@0.29.0.patch) working
 * around the bug with a dynamic `import("cloudflare:workers")`. As of
 * emdash 0.31.0, upstream fixed the same bug directly via a build-time
 * virtual module (`virtual:emdash/env`), so the workaround was dropped from
 * patches/emdash@0.31.1.patch — see PR emdash-cms/emdash#1845.
 *
 * These tests verify the installed OAuth routes still use the safe env-access
 * pattern and never regress to the broken `locals.runtime?.env` API. If this
 * fails after a package update, check whether emdash reintroduced the bug or
 * changed its fix, and re-evaluate whether a local patch is needed again.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

const ROOT = resolve(process.cwd())

const PROVIDER_ROUTE = resolve(
  ROOT,
  'node_modules/emdash/src/astro/routes/api/auth/oauth/[provider].ts',
)
const CALLBACK_ROUTE = resolve(
  ROOT,
  'node_modules/emdash/src/astro/routes/api/auth/oauth/[provider]/callback.ts',
)

describe('emdash OAuth env access — installed files', () => {
  it('OAuth provider route does not use locals.runtime?.env (Astro v6 removed it)', () => {
    const source = readFileSync(PROVIDER_ROUTE, 'utf-8')
    expect(
      source,
      'locals.runtime?.env was removed in Astro v6 and must not appear in the installed route',
    ).not.toContain('runtimeLocals.runtime?.env')
  })

  it('OAuth provider route reads env via virtual:emdash/env with import.meta.env fallback', () => {
    const source = readFileSync(PROVIDER_ROUTE, 'utf-8')
    expect(source).toContain('virtual:emdash/env')
    expect(source).toContain('import.meta.env')
  })

  it('OAuth callback route does not use locals.runtime?.env (Astro v6 removed it)', () => {
    const source = readFileSync(CALLBACK_ROUTE, 'utf-8')
    expect(
      source,
      'locals.runtime?.env was removed in Astro v6 and must not appear in the installed route',
    ).not.toContain('runtimeLocals.runtime?.env')
  })

  it('OAuth callback route reads env via virtual:emdash/env with import.meta.env fallback', () => {
    const source = readFileSync(CALLBACK_ROUTE, 'utf-8')
    expect(source).toContain('virtual:emdash/env')
    expect(source).toContain('import.meta.env')
  })
})
