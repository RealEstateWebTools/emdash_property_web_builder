import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(process.cwd())

function readSource(relativePath: string) {
  return readFileSync(resolve(ROOT, relativePath), 'utf8')
}

function readRouteAndSharedPageSource(relativePath: string) {
  const routeSource = readSource(relativePath)
  const sharedPageImport = routeSource.match(/from ['"](.+components\/pages\/.+\.astro)['"]/)?.[1]
  if (!sharedPageImport) return routeSource

  const sharedPagePath = resolve(ROOT, dirname(relativePath), sharedPageImport)
  const sharedPageSource = readFileSync(sharedPagePath, 'utf8')
  return `${routeSource}\n${sharedPageSource}`
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
		const source = readRouteAndSharedPageSource(route)

      expect(source, `${route} should not redirect to /404`).not.toMatch(/Astro\.redirect\((['"])\/404\1\)/)
    }
  })

  it('marks missing content with a status set in route frontmatter', () => {
    // Astro 7 fixes the Response status once the page frontmatter finishes,
    // so the status must be applied in the route itself (via a page loader),
    // never inside a shared component.
    for (const route of directNotFoundRoutes) {
      const source = readSource(route)

      expect(source, `${route} should load data via a page loader`).toMatch(/from '.*\/lib\/page-loaders'/)
      expect(source, `${route} should apply the loader status in frontmatter`).toContain(
        'if (load.status) Astro.response.status = load.status',
      )
    }
  })

  it('never sets a response status inside shared page components', () => {
    // Component-level Astro.response.status assignments are silently ignored
    // under Astro 7 streaming — the header has already been flushed. This
    // regressed 404s to 200s after the Astro 6→7 upgrade; keep status logic
    // in route frontmatter / page loaders only.
    for (const route of directNotFoundRoutes) {
      const routeSource = readSource(route)
      const sharedPageImport = routeSource.match(/from ['"](.+components\/pages\/.+\.astro)['"]/)?.[1]
      expect(sharedPageImport, `${route} should render a shared page component`).toBeTruthy()

      const componentPath = resolve(ROOT, dirname(route), sharedPageImport!)
      const componentSource = readFileSync(componentPath, 'utf8')
      expect(
        componentSource,
        `${sharedPageImport} must not set Astro.response.status (ignored during streaming)`,
      ).not.toContain('Astro.response.status')
    }
  })

  it('keeps the dedicated 404 page independent of the PWB backend', () => {
    const source = readSource('src/pages/404.astro')

    expect(source).not.toContain('createPwbClient')
    expect(source).toContain('fallbackSite')
  })
})