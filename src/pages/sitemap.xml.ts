import type { APIRoute } from 'astro'

export const prerender = false

export const GET: APIRoute = ({ url }) => {
  const origin = url.origin
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `  <sitemap><loc>${origin}/sitemap-properties.xml</loc></sitemap>`,
    `  <sitemap><loc>${origin}/_emdash/api/sitemap/posts.xml</loc></sitemap>`,
    '</sitemapindex>',
  ].join('\n')

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
