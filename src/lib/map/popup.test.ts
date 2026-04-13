import { describe, it, expect } from 'vitest'
import { buildMarkerPopupHtml } from './popup'

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
