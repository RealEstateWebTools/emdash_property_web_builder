import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(process.cwd())

function readSource(relativePath: string) {
  return readFileSync(resolve(ROOT, relativePath), 'utf8')
}

describe('not-found route conventions', () => {
  const directNotFoundRoutes = [
    'src/pages/[...slug].astro',
    'src/pages/pages/[slug].astro',
    'src/pages/properties/[slug].astro',
    'src/pages/posts/[slug].astro',
    'src/pages/category/[slug].astro',
    'src/pages/tag/[slug].astro',
  ]

  it('does not redirect missing content to /404 from dynamic routes', () => {
    for (const route of directNotFoundRoutes) {
      const source = readSource(route)

      expect(source, `${route} should not redirect to /404`).not.toMatch(/Astro\.redirect\((['"])\/404\1\)/)
    }
  })

  it('marks missing content with a direct 404 response', () => {
    for (const route of directNotFoundRoutes) {
      const source = readSource(route)

      expect(source, `${route} should set a 404 response status`).toContain('Astro.response.status = 404')
    }
  })

  it('keeps the dedicated 404 page independent of the PWB backend', () => {
    const source = readSource('src/pages/404.astro')

    expect(source).not.toContain('createPwbClient')
    expect(source).toContain('fallbackSite')
  })
})