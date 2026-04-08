import { DEFAULT_LOCALE, entrySlug, localePath, translateBrand, type Locale } from './locale'

interface RssPostEntry {
  id: string
  data: {
    publishedAt?: Date | null
    title?: string | null
    excerpt?: string | null
  }
}

interface RssFeedMeta {
  title: string
  description: string
  language: string
}

interface BuildRssXmlInput {
  locale: Locale
  siteUrl: string
  selfPath: string
  posts: RssPostEntry[]
}

const FEED_DESCRIPTIONS: Record<Locale, string> = {
  en: 'A blog about software, design, and the occasional stray thought.',
  es: 'Un blog sobre software, diseno y alguna que otra idea suelta.',
  fr: 'Un blog sur le logiciel, le design et quelques pensees au passage.',
}

const FEED_LANGUAGES: Record<Locale, string> = {
  en: 'en-us',
  es: 'es-es',
  fr: 'fr-fr',
}

const XML_ESCAPE_PATTERNS = [
  [/&/g, '&amp;'],
  [/</g, '&lt;'],
  [/>/g, '&gt;'],
  [/"/g, '&quot;'],
  [/'/g, '&apos;'],
] as const

export function getRssFeedMeta(locale: Locale): RssFeedMeta {
  return {
    title: translateBrand(locale, 'My Blog'),
    description: FEED_DESCRIPTIONS[locale] ?? FEED_DESCRIPTIONS[DEFAULT_LOCALE],
    language: FEED_LANGUAGES[locale] ?? FEED_LANGUAGES[DEFAULT_LOCALE],
  }
}

export function buildRssXml({ locale, siteUrl, selfPath, posts }: BuildRssXmlInput): string {
  const meta = getRssFeedMeta(locale)
  const homepageUrl = new URL(localePath(locale, '/'), siteUrl).href
  const feedUrl = new URL(selfPath, siteUrl).href

  const items = posts
    .map((post) => {
      if (!post.data.publishedAt) return null

      const postUrl = new URL(localePath(locale, `/posts/${entrySlug(post.id)}`), siteUrl).href
      const title = escapeXml(post.data.title || 'Untitled')
      const description = escapeXml(post.data.excerpt || '')
      const pubDate = post.data.publishedAt.toUTCString()

      return `    <item>
      <title>${title}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
    </item>`
    })
    .filter(Boolean)
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(meta.title)}</title>
    <description>${escapeXml(meta.description)}</description>
    <link>${homepageUrl}</link>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>
    <language>${meta.language}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`
}

function escapeXml(str: string): string {
  let result = str
  for (const [pattern, replacement] of XML_ESCAPE_PATTERNS) {
    result = result.replace(pattern, replacement)
  }
  return result
}