import { describe, expect, it } from 'vitest'
import { htmlToPortableText, portableTextToHtml } from './portable-text-html'

const strip = (blocks: unknown) => JSON.parse(JSON.stringify(blocks, (k, v) => (k === '_key' ? undefined : v)))

describe('htmlToPortableText', () => {
  it('converts paragraphs, headings, lists and inline marks', () => {
    const blocks = htmlToPortableText(
      '<h2>Views</h2><p>Stunning <strong>sea</strong> views &amp; <em>light</em>.</p><ul><li>Pool</li><li>Garden</li></ul><ol><li>One</li></ol>',
    )
    expect(strip(blocks)).toEqual([
      { _type: 'block', style: 'h2', children: [{ _type: 'span', text: 'Views', marks: [] }], markDefs: [] },
      {
        _type: 'block',
        style: 'normal',
        children: [
          { _type: 'span', text: 'Stunning ', marks: [] },
          { _type: 'span', text: 'sea', marks: ['strong'] },
          { _type: 'span', text: ' views & ', marks: [] },
          { _type: 'span', text: 'light', marks: ['em'] },
          { _type: 'span', text: '.', marks: [] },
        ],
        markDefs: [],
      },
      { _type: 'block', style: 'normal', listItem: 'bullet', level: 1, children: [{ _type: 'span', text: 'Pool', marks: [] }], markDefs: [] },
      { _type: 'block', style: 'normal', listItem: 'bullet', level: 1, children: [{ _type: 'span', text: 'Garden', marks: [] }], markDefs: [] },
      { _type: 'block', style: 'normal', listItem: 'number', level: 1, children: [{ _type: 'span', text: 'One', marks: [] }], markDefs: [] },
    ])
  })

  it('wraps loose text in a paragraph and drops scripts', () => {
    expect(strip(htmlToPortableText('Plain text<script>alert(1)</script>'))).toEqual([
      { _type: 'block', style: 'normal', children: [{ _type: 'span', text: 'Plain text', marks: [] }], markDefs: [] },
    ])
  })

  it('returns no blocks for empty input', () => {
    expect(htmlToPortableText(null)).toEqual([])
    expect(htmlToPortableText('<p> </p>')).toEqual([])
  })
})

describe('portableTextToHtml', () => {
  it('renders blocks and escapes text', () => {
    expect(
      portableTextToHtml([
        { _type: 'block', style: 'h2', children: [{ _type: 'span', text: 'A & B' }] },
        { _type: 'block', style: 'normal', children: [{ _type: 'span', text: '<script>x</script>', marks: ['strong'] }] },
        { _type: 'block', listItem: 'bullet', children: [{ _type: 'span', text: 'Pool' }] },
        { _type: 'block', listItem: 'bullet', children: [{ _type: 'span', text: 'Garden' }] },
        { _type: 'image', asset: {} },
      ]),
    ).toBe('<h2>A &amp; B</h2><p><strong>&lt;script&gt;x&lt;/script&gt;</strong></p><ul><li>Pool</li><li>Garden</li></ul>')
  })

  it('round-trips an imported description', () => {
    const html = '<h2>Views</h2><p>Sea <strong>views</strong>.</p><ul><li>Pool</li></ul>'
    expect(portableTextToHtml(htmlToPortableText(html))).toBe(html)
  })
})
