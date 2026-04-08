import { describe, expect, it } from 'vitest'

import { buildRssXml, getRssFeedMeta } from './rss'

describe('rss helpers', () => {
  it('returns localized feed metadata', () => {
    expect(getRssFeedMeta('en')).toEqual({
      title: 'My Blog',
      description: 'A blog about software, design, and the occasional stray thought.',
      language: 'en-us',
    })

    expect(getRssFeedMeta('es')).toEqual({
      title: 'Mi Blog',
      description: 'Un blog sobre software, diseno y alguna que otra idea suelta.',
      language: 'es-es',
    })
  })

  it('builds locale-aware feed and post urls', () => {
    const xml = buildRssXml({
      locale: 'fr',
      siteUrl: 'https://example.com',
      selfPath: '/fr/rss.xml',
      posts: [
        {
          id: 'fr/mon-article',
          data: {
            title: 'Bonjour',
            excerpt: 'Resume',
            publishedAt: new Date('2026-04-08T12:00:00.000Z'),
          },
        },
      ],
    })

    expect(xml).toContain('<title>Mon Blog</title>')
    expect(xml).toContain('<link>https://example.com/fr/</link>')
    expect(xml).toContain('href="https://example.com/fr/rss.xml"')
    expect(xml).toContain('<link>https://example.com/fr/posts/mon-article</link>')
    expect(xml).toContain('<language>fr-fr</language>')
  })

  it('omits unpublished entries from feed items', () => {
    const xml = buildRssXml({
      locale: 'en',
      siteUrl: 'https://example.com',
      selfPath: '/rss.xml',
      posts: [
        {
          id: 'draft-post',
          data: {
            title: 'Draft',
            excerpt: 'Should not render',
            publishedAt: null,
          },
        },
      ],
    })

    expect(xml).not.toContain('<item>')
  })
})