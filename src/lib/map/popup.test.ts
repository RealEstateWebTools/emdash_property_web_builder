import { describe, it, expect } from 'vitest'
import { buildMarkerPopupHtml, localizeMarkerUrls } from './popup'

describe('localizeMarkerUrls', () => {
  // Map popups on /es/properties used to link to the English listing page.
  const markers = [
    { url: '/properties/villa', title: 'Villa' },
    { url: 'https://pwb.example/properties/flat', title: 'Flat' },
  ]

  it('prefixes relative marker URLs with a non-default locale', () => {
    expect(localizeMarkerUrls(markers, 'es').map((m) => m.url)).toEqual([
      '/es/properties/villa',
      'https://pwb.example/properties/flat',
    ])
  })

  it('leaves default-locale URLs unchanged and keeps other fields', () => {
    expect(localizeMarkerUrls(markers, 'en')).toEqual(markers)
  })
})

describe('buildMarkerPopupHtml', () => {
  it('escapes marker title and price content', () => {
    const html = buildMarkerPopupHtml({
      url: '/properties/test',
      title: '<img src=x onerror=alert(1)>',
      price: '1000 <script>alert(1)</script>',
    })

    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('<script>')
  })
})
