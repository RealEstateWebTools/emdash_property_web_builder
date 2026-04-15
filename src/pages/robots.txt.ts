import type { APIRoute } from 'astro'

export const prerender = false

export const GET: APIRoute = ({ url }) => {
  const origin = url.origin
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${origin}/sitemap-properties.xml`,
    `Sitemap: ${origin}/sitemap-posts.xml`,
  ].join('\n')

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
