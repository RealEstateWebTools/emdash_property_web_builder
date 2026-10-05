import { describe, expect, it, vi } from 'vitest'
import { buildEnquiryPayload, createEmDashEnquiryClient, sanitizeStoredEnquiry } from './emdash-store'
import { buildEnquiryNotification } from './notification'

const input = { name: 'Ana Lopez', email: 'ana@example.com', phone: '+34 600', message: 'Hi\n\n---\nPage type: property' }
const details = {
  message: 'Hi there, is it available?',
  attribution: { pageType: 'property', propertySlug: 'villa-a', ctaSource: 'book_viewing' },
}

describe('buildEnquiryPayload', () => {
  it('sends the original message and the attribution as separate fields', () => {
    expect(buildEnquiryPayload(input, details)).toEqual({
      name: 'Ana Lopez',
      email: 'ana@example.com',
      phone: '+34 600',
      message: 'Hi there, is it available?',
      property_slug: 'villa-a',
      page_type: 'property',
      cta_source: 'book_viewing',
    })
  })
})

describe('sanitizeStoredEnquiry', () => {
  it('keeps valid fields, trimmed, and marks the lead as new', () => {
    expect(sanitizeStoredEnquiry({ ...buildEnquiryPayload(input, details), name: '  Ana Lopez ' })).toEqual({
      name: 'Ana Lopez',
      email: 'ana@example.com',
      phone: '+34 600',
      message: 'Hi there, is it available?',
      lead_status: 'new',
      property_slug: 'villa-a',
      page_type: 'property',
      cta_source: 'book_viewing',
    })
  })

  it('drops empty optional fields and caps lengths', () => {
    const stored = sanitizeStoredEnquiry({ name: 'A B', email: 'a@b.co', message: 'Hello there', phone: ' ', cta_source: 'x'.repeat(200) })
    expect(stored).not.toHaveProperty('phone')
    expect(stored?.cta_source).toHaveLength(80)
  })

  it('rejects enquiries that fail validation (it is a public route)', () => {
    expect(sanitizeStoredEnquiry(null)).toBeNull()
    expect(sanitizeStoredEnquiry({ name: 'A B', email: 'not-an-email', message: 'Hello there' })).toBeNull()
    expect(sanitizeStoredEnquiry({ name: '', email: 'a@b.co', message: 'Hello there' })).toBeNull()
  })
})

describe('createEmDashEnquiryClient', () => {
  it('calls the lead-reports enquiries route in-process', async () => {
    const handlePublicPluginApiRoute = vi.fn(async () => ({ success: true }))
    const result = await createEmDashEnquiryClient({ handlePublicPluginApiRoute }, 'https://site.test').submitEnquiry(
      input,
      details,
    )

    expect(result.success).toBe(true)
    const [pluginId, method, path, request] = handlePublicPluginApiRoute.mock.calls[0] as unknown as [string, string, string, Request]
    expect([pluginId, method, path]).toEqual(['lead-reports', 'POST', 'enquiries'])
    expect(request.url).toBe('https://site.test/_emdash/api/plugins/lead-reports/enquiries')
    expect(await request.json()).toMatchObject({ name: 'Ana Lopez', message: 'Hi there, is it available?' })
  })

  it('throws when the route fails, so the visitor gets an error', async () => {
    const handlePublicPluginApiRoute = vi.fn(async () => ({ success: false, error: { code: 'BAD_REQUEST', message: 'x' } }))
    await expect(
      createEmDashEnquiryClient({ handlePublicPluginApiRoute }, 'https://site.test').submitEnquiry(input),
    ).rejects.toThrow('BAD_REQUEST')
  })
})

describe('buildEnquiryNotification', () => {
  const data = { ...sanitizeStoredEnquiry(buildEnquiryPayload(input, details)) }

  it('emails the office with the enquirer as reply-to', () => {
    expect(buildEnquiryNotification(data, ' office@agency.test ')).toEqual({
      to: 'office@agency.test',
      replyTo: 'ana@example.com',
      subject: 'New enquiry about villa-a from Ana Lopez',
      text: [
        'Ana Lopez sent an enquiry through the website.',
        '',
        'Name: Ana Lopez',
        'Email: ana@example.com',
        'Phone: +34 600',
        'Listing: /properties/villa-a',
        'Page type: property',
        'CTA: book_viewing',
        '',
        'Hi there, is it available?',
        '',
        'Find it under Enquiries in the website admin.',
      ].join('\n'),
    })
  })

  it('uses a general subject without a listing and skips missing details', () => {
    const message = buildEnquiryNotification({ name: 'B', email: 'not-an-email', message: '' }, 'o@a.test')
    expect(message?.subject).toBe('New website enquiry from B')
    expect(message?.replyTo).toBeUndefined()
    expect(message?.text).not.toContain('Phone:')
  })

  it('returns null without a valid office address', () => {
    expect(buildEnquiryNotification(data, undefined)).toBeNull()
    expect(buildEnquiryNotification(data, 'nope')).toBeNull()
  })
})
