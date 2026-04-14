import { describe, expect, it } from 'vitest'
import { buildPropertyCtaModel } from './property-cta'
import { DEFAULT_SITE_PROFILE_SETTINGS } from './site-profile'

describe('buildPropertyCtaModel', () => {
  it('builds a viewing-focused CTA by default', () => {
    const result = buildPropertyCtaModel({
      locale: 'en',
      settings: DEFAULT_SITE_PROFILE_SETTINGS,
      propertyTitle: 'Harbour View Apartment',
      formId: 'enquiry-form-123',
    })

    expect(result.type).toBe('book_viewing')
    expect(result.primaryLabel).toBe('Book a Viewing')
    expect(result.primaryHref).toBe('#enquiry-form-123')
    expect(result.formSubmitLabel).toBe('Request Viewing')
    expect(result.showsMobileStickyBar).toBe(true)
  })

  it('builds a WhatsApp CTA when a phone number is available', () => {
    const result = buildPropertyCtaModel({
      locale: 'en',
      settings: {
        ...DEFAULT_SITE_PROFILE_SETTINGS,
        propertyCtaType: 'whatsapp_chat',
        officePhone: '(732) 555-0148',
      },
      propertyTitle: 'Harbour View Apartment',
      formId: 'enquiry-form-123',
    })

    expect(result.primaryLabel).toBe('Chat on WhatsApp')
    expect(result.primaryHref).toContain('https://wa.me/7325550148')
    expect(result.secondaryHref).toBe('#enquiry-form-123')
  })

  it('falls back to a viewing CTA when WhatsApp has no usable phone number', () => {
    const result = buildPropertyCtaModel({
      locale: 'en',
      settings: {
        ...DEFAULT_SITE_PROFILE_SETTINGS,
        propertyCtaType: 'whatsapp_chat',
        officePhone: '',
      },
      propertyTitle: 'Harbour View Apartment',
      formId: 'enquiry-form-123',
    })

    expect(result.type).toBe('book_viewing')
    expect(result.primaryLabel).toBe('Book a Viewing')
  })
})
