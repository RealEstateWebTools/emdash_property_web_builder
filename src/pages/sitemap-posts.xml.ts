import type { APIRoute } from 'astro'
import { getEmDashCollection } from 'emdash'
import { DEFAULT_LOCALE, entrySlug, localePath } from '../lib/locale'

export const prerender = false

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export const GET: APIRoute = async ({ url }) => {
  const siteUrl = url.origin
  const urls: string[] = []

  try {
    const { entries: posts } = await getEmDashCollection('posts', {
      locale: DEFAULT_LOCALE,
      orderBy: { published_at: 'desc' },
    })

    for (const post of posts) {
      const slug = entrySlug(post.id)
      const lastmod = post.data.publishedAt
        ? post.data.publishedAt.toISOString().split('T')[0]
        : undefined

      const loc = escapeXml(`${siteUrl}${localePath(DEFAULT_LOCALE, `/posts/${slug}`)}`)
      const lastmodTag = lastmod ? `<lastmod>${lastmod}</lastmod>` : ''
      urls.push(`  <url><loc>${loc}</loc>${lastmodTag}<priority>0.7</priority></url>`)
    }
  } catch {
    // Return empty sitemap if CMS is unavailable
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
  ].join('\n')

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
