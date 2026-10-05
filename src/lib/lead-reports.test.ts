import { describe, expect, it } from 'vitest'
import {
  buildLeadReportBlocks,
  type LeadEvent,
  pageTypeFromPath,
  rangeStart,
  sanitizeLeadEvent,
  sanitizeReportRange,
  summarizeLeadEvents,
} from './lead-reports'

const NOW = new Date('2026-10-05T12:00:00Z')

function ev(kind: LeadEvent['kind'], overrides: Partial<LeadEvent> = {}): LeadEvent {
  return { kind, pagePath: '/', createdAt: NOW.toISOString(), ...overrides }
}

describe('sanitizeLeadEvent', () => {
  it('accepts a CTA click and stamps the server time', () => {
    expect(
      sanitizeLeadEvent({ kind: 'cta_click', cta: 'header_contact', pagePath: '/es/areas/x', pageType: 'area' }, NOW),
    ).toEqual({
      kind: 'cta_click',
      cta: 'header_contact',
      pageType: 'area',
      pagePath: '/es/areas/x',
      propertySlug: undefined,
      createdAt: NOW.toISOString(),
    })
  })

  it('accepts an enquiry without a CTA', () => {
    expect(sanitizeLeadEvent({ kind: 'enquiry', pagePath: '/pages/contact', pageType: 'contact' }, NOW)).toMatchObject({
      kind: 'enquiry',
      cta: undefined,
    })
  })

  it('drops query strings and fragments, which can carry personal data', () => {
    expect(sanitizeLeadEvent({ kind: 'enquiry', pagePath: '/pages/contact?email=a@b.c#x' })?.pagePath).toBe('/pages/contact')
  })

  it('rejects malformed or hostile input', () => {
    expect(sanitizeLeadEvent(null)).toBeNull()
    expect(sanitizeLeadEvent({ kind: 'pageview', pagePath: '/' })).toBeNull()
    expect(sanitizeLeadEvent({ kind: 'enquiry', pagePath: 'https://evil.test/' })).toBeNull()
    expect(sanitizeLeadEvent({ kind: 'enquiry', pagePath: '//evil.test/' })).toBeNull()
    expect(sanitizeLeadEvent({ kind: 'enquiry', pagePath: `/${'a'.repeat(300)}` })).toBeNull()
    expect(sanitizeLeadEvent({ kind: 'cta_click', pagePath: '/' })).toBeNull() // click without a CTA id
    expect(sanitizeLeadEvent({ kind: 'cta_click', cta: '<script>', pagePath: '/' })).toBeNull()
  })

  it('discards invalid optional ids instead of storing them', () => {
    expect(sanitizeLeadEvent({ kind: 'enquiry', pagePath: '/', pageType: 'x y', propertySlug: 'bad slug!' })).toMatchObject({
      pageType: undefined,
      propertySlug: undefined,
    })
  })
})

describe('sanitizeReportRange / rangeStart', () => {
  it('allows 7, 30 or 90 days, defaulting to 30', () => {
    expect(sanitizeReportRange(7)).toBe(7)
    expect(sanitizeReportRange('90')).toBe(90)
    expect(sanitizeReportRange(365)).toBe(30)
  })

  it('computes the window start', () => {
    expect(rangeStart(7, NOW)).toBe('2026-09-28T12:00:00.000Z')
  })
})

describe('summarizeLeadEvents', () => {
  const events = [
    ev('cta_click', { cta: 'book_viewing', pageType: 'property', pagePath: '/properties/a' }),
    ev('cta_click', { cta: 'book_viewing', pageType: 'property', pagePath: '/properties/a' }),
    ev('enquiry', { cta: 'book_viewing', pageType: 'property', pagePath: '/properties/a' }),
    ev('cta_click', { cta: 'header_contact', pageType: 'home', pagePath: '/' }),
    ev('enquiry', { pageType: 'contact', pagePath: '/pages/contact', createdAt: '2026-10-03T09:00:00Z' }),
  ]

  it('totals enquiries and clicks', () => {
    expect(summarizeLeadEvents(events, 7, NOW).totals).toEqual({ enquiries: 2, clicks: 3 })
  })

  it('puts clicks and the enquiries they led to on the same CTA row, most enquiries first', () => {
    expect(summarizeLeadEvents(events, 7, NOW).byCta).toEqual([
      { key: 'book_viewing', enquiries: 1, clicks: 2 },
      { key: '(none)', enquiries: 1, clicks: 0 },
      { key: 'header_contact', enquiries: 0, clicks: 1 },
    ])
  })

  it('breaks down by page type and page', () => {
    const summary = summarizeLeadEvents(events, 7, NOW)
    expect(summary.byPageType.map((r) => r.key)).toEqual(['property', 'contact', 'home'])
    expect(summary.byPage[0]).toEqual({ key: '/properties/a', enquiries: 1, clicks: 2 })
  })

  it('buckets events into one point per UTC day, oldest first', () => {
    const { daily } = summarizeLeadEvents(events, 7, NOW)
    expect(daily).toHaveLength(7)
    expect(daily[6]).toEqual([Date.UTC(2026, 9, 5), 1, 3]) // today
    expect(daily[4]).toEqual([Date.UTC(2026, 9, 3), 1, 0]) // two days ago
  })
})

describe('buildLeadReportBlocks', () => {
  it('shows totals and an empty-state banner when there is no activity', () => {
    const blocks = buildLeadReportBlocks(summarizeLeadEvents([], 30, NOW))
    expect(blocks.find((b) => b.type === 'stats')).toMatchObject({
      items: [
        { label: 'Enquiries (30 days)', value: '0' },
        { label: 'CTA clicks', value: '0' },
        { label: 'Enquiries per CTA click', value: '—' },
      ],
    })
    expect(blocks.some((b) => b.type === 'banner')).toBe(true)
    expect(blocks.some((b) => b.type === 'table')).toBe(false)
  })

  it('marks the active range button and includes chart and tables when there is data', () => {
    const blocks = buildLeadReportBlocks(summarizeLeadEvents([ev('enquiry'), ev('cta_click', { cta: 'x' })], 7, NOW))
    const actions = blocks.find((b) => b.type === 'actions') as { elements: Array<{ value: number; style: string }> }
    expect(actions.elements.find((e) => e.value === 7)?.style).toBe('primary')
    expect(blocks.filter((b) => b.type === 'table')).toHaveLength(3)
    // Block Kit requires page_action_id on tables.
    expect(blocks.filter((b) => b.type === 'table').every((b) => b.page_action_id)).toBe(true)
    expect(blocks.some((b) => b.type === 'chart')).toBe(true)
  })
})

describe('pageTypeFromPath', () => {
  it.each([
    ['/', 'home'],
    ['/es/', 'home'],
    ['/properties', 'listings'],
    ['/fr/properties/villa-a', 'property'],
    ['/posts', 'posts'],
    ['/posts/x', 'post'],
    ['/areas', 'areas'],
    ['/es/areas/east-brunswick', 'area'],
    ['/pages/contact', 'contact'],
    ['/pages/about', 'page'],
    ['/about-us', 'page'],
  ])('%s → %s', (path, type) => {
    expect(pageTypeFromPath(path)).toBe(type)
  })
})
