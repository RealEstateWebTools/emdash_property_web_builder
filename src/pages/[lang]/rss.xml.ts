import type { APIRoute } from 'astro'
import { getEmDashCollection } from 'emdash'

import { buildRssXml } from '../../lib/rss'
import { localePath, validateLocale } from '../../lib/locale'

export const GET: APIRoute = async ({ params, site, url }) => {
  const locale = validateLocale(params.lang)
  if (!locale) {
    return new Response('Not Found', { status: 404 })
  }

  const siteUrl = site?.toString() || url.origin
  const { entries: posts } = await getEmDashCollection('posts', {
    locale,
    orderBy: { published_at: 'desc' },
    limit: 20,
  })

  const rss = buildRssXml({
    locale,
    siteUrl,
    selfPath: localePath(locale, '/rss.xml'),
    posts,
  })

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}