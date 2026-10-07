import type { APIRoute } from 'astro'

export const prerender = false

// Custom robots.txt (intentionally overrides emdash's built-in /robots.txt).
//
// EmDash 0.19 ships a native robots.txt + a native /sitemap.xml index, but the
// native index doesn't include the property listings, which come from the
// active listing source (PWB, or the EmDash properties collection) via the
// custom /sitemap-properties.xml route. The native robots.txt also only advertises a
// single Sitemap (/sitemap.xml). So we keep this small route to advertise BOTH
// sitemaps, using url.origin so it stays correct across every domain this Worker
// serves (matching sitemap-properties.xml.ts).
export const GET: APIRoute = ({ url }) => {
  const origin = url.origin
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    '# Disallow admin and API routes',
    'Disallow: /_emdash/',
    '',
    // Native emdash sitemap index (posts and other emdash collections, i18n-aware)
    `Sitemap: ${origin}/sitemap.xml`,
    // Property listings (PWB or native, see sitemap-properties.xml.ts)
    `Sitemap: ${origin}/sitemap-properties.xml`,
    '',
  ].join('\n')

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
