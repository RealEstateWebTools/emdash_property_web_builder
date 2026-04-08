/**
 * Regression tests for the emdash OAuth patch (Astro v6 compatibility).
 *
 * Astro v6 removed `Astro.locals.runtime.env`. The emdash OAuth routes used
 * that API to read Cloudflare environment bindings (OAuth client ID/secret).
 * Accessing it now throws instead of returning undefined, breaking GitHub/Google
 * login in production.
 *
 * The patch in patches/emdash@0.1.0.patch replaces the locals.runtime access
 * with a dynamic `import("cloudflare:workers")` that falls back to
 * `import.meta.env` for local dev (Node.js).
 *
 * These tests verify:
 *   1. The patch file contains the fix (persisted in git, survives reinstalls).
 *   2. The installed source files reflect the fix (patch was applied correctly).
 *
 * If either group fails after a package update, re-apply the patch — see
 * docs/troubleshooting.md → "OAuth login fails with locals.runtime.env removed".
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

const ROOT = resolve(process.cwd())

const PATCH_FILE = resolve(ROOT, 'patches/emdash@0.1.0.patch')
const PROVIDER_ROUTE = resolve(
  ROOT,
  'node_modules/emdash/src/astro/routes/api/auth/oauth/[provider].ts',
)
const CALLBACK_ROUTE = resolve(
  ROOT,
  'node_modules/emdash/src/astro/routes/api/auth/oauth/[provider]/callback.ts',
)

describe('emdash OAuth patch — patch file', () => {
  it('patch adds cloudflare:workers import to both OAuth routes', () => {
    const patch = readFileSync(PATCH_FILE, 'utf-8')
    // Four occurrences: one added line per file (provider + callback) × 2 files
    const hits = (patch.match(/cloudflare:workers/g) ?? []).length
    expect(hits, 'patch must add cloudflare:workers import to both OAuth route files').toBeGreaterThanOrEqual(2)
  })

  it('patch removes the locals.runtime?.env pattern from both OAuth routes', () => {
    const patch = readFileSync(PATCH_FILE, 'utf-8')
    // The removed lines start with "-" and contain the old runtime access
    expect(patch).toContain('-\t\tconst runtimeLocals = locals as unknown as')
  })

  it('patch covers both the provider initiation route and the callback route', () => {
    const patch = readFileSync(PATCH_FILE, 'utf-8')
    expect(patch).toContain('src/astro/routes/api/auth/oauth/[provider].ts')
    expect(patch).toContain('src/astro/routes/api/auth/oauth/[provider]/callback.ts')
  })
})

describe('emdash OAuth patch — installed files', () => {
  it('OAuth provider route does not use locals.runtime?.env (Astro v6 removed it)', () => {
    const source = readFileSync(PROVIDER_ROUTE, 'utf-8')
    expect(
      source,
      'locals.runtime?.env was removed in Astro v6 and must not appear in the installed route — re-apply patches/emdash@0.1.0.patch',
    ).not.toContain('runtimeLocals.runtime?.env')
  })

  it('OAuth provider route uses cloudflare:workers with import.meta.env fallback', () => {
    const source = readFileSync(PROVIDER_ROUTE, 'utf-8')
    expect(source).toContain('cloudflare:workers')
    expect(source).toContain('import.meta.env')
  })

  it('OAuth callback route does not use locals.runtime?.env (Astro v6 removed it)', () => {
    const source = readFileSync(CALLBACK_ROUTE, 'utf-8')
    expect(
      source,
      'locals.runtime?.env was removed in Astro v6 and must not appear in the installed route — re-apply patches/emdash@0.1.0.patch',
    ).not.toContain('runtimeLocals.runtime?.env')
  })

  it('OAuth callback route uses cloudflare:workers with import.meta.env fallback', () => {
    const source = readFileSync(CALLBACK_ROUTE, 'utf-8')
    expect(source).toContain('cloudflare:workers')
    expect(source).toContain('import.meta.env')
  })
})
