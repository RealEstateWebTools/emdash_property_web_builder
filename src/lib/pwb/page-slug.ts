const RESERVED_FIRST_SEGMENTS = new Set([
  'api',
  'assets',
  'category',
  'pages',
  'posts',
  'properties',
  'search',
  'tag',
  'valuation',
  'wp-admin',
  'wp-content',
  'wp-includes',
])

const RESERVED_EXACT_SLUGS = new Set([
  'admin',
  'favicon.ico',
  'robots.txt',
  'rss.xml',
  'sitemap.xml',
  'sitemap-properties.xml',
  'wp-login.php',
  'wp-json',
])

const ASSET_EXTENSION_RE = /\.[a-z0-9]{1,8}$/i
const VALID_SEGMENT_RE = /^[a-z0-9][a-z0-9_-]*$/i

export function shouldQueryPwbPageSlug(slug: string): boolean {
  const normalized = slug.trim().replace(/^\/+|\/+$/g, '')
  if (!normalized || normalized.length > 240) return false
  if (RESERVED_EXACT_SLUGS.has(normalized.toLowerCase())) return false

  const segments = normalized.split('/')
  if (segments.length > 8) return false

  const firstSegment = segments[0]?.toLowerCase()
  if (!firstSegment || firstSegment.startsWith('_') || RESERVED_FIRST_SEGMENTS.has(firstSegment)) {
    return false
  }

  return segments.every((segment) => {
    if (!segment || segment === '.' || segment === '..') return false
    if (segment.startsWith('_') || segment.startsWith('.')) return false
    if (ASSET_EXTENSION_RE.test(segment)) return false
    return VALID_SEGMENT_RE.test(segment)
  })
}
