import { localePath, translateLabel } from './locale'
import type { PropertyCtaType, SiteProfileSettings } from './site-profile'

export interface PropertyCtaModel {
  type: PropertyCtaType
  eyebrow: string
  title: string
  body: string
  primaryLabel: string
  primaryHref: string
  secondaryLabel: string | null
  secondaryHref: string | null
  formTitle: string
  formSubmitLabel: string
  inlineFormIntro: string
  showsMobileStickyBar: boolean
}

function digitsOnly(value: string): string {
  return value.replace(/\D+/g, '')
}

export function buildPropertyCtaModel(input: {
  locale: string
  settings: SiteProfileSettings
  propertyTitle: string
  formId: string
}): PropertyCtaModel {
  const { locale, settings, propertyTitle, formId } = input
  const formHref = `#${formId}`
  const customBody = settings.propertyCtaBody.trim()
  const customLabel = settings.propertyCtaLabel.trim()
  const whatsappDigits = digitsOnly(settings.officePhone)

  if (settings.propertyCtaType === 'valuation_request') {
    return {
      type: settings.propertyCtaType,
      eyebrow: translateLabel(locale, 'Primary action'),
      title: translateLabel(locale, 'Thinking of selling something similar?'),
      body:
        customBody ||
        translateLabel(
          locale,
          'Invite owners and landlords to request a valuation while keeping the enquiry form available for buyer questions.',
        ),
      primaryLabel: customLabel || translateLabel(locale, 'Request Valuation'),
      primaryHref: localePath(locale, '/valuation'),
      secondaryLabel: translateLabel(locale, 'Ask about this property'),
      secondaryHref: formHref,
      formTitle: `${translateLabel(locale, 'Enquire about')} ${propertyTitle}`,
      formSubmitLabel: translateLabel(locale, 'Send Enquiry'),
      inlineFormIntro: translateLabel(
        locale,
        'If you still want details on this listing, use the enquiry form below and the team will come back to you.',
      ),
      showsMobileStickyBar: settings.propertyCtaMobileMode === 'sticky',
    }
  }

  if (settings.propertyCtaType === 'whatsapp_chat' && whatsappDigits) {
    return {
      type: settings.propertyCtaType,
      eyebrow: translateLabel(locale, 'Primary action'),
      title: translateLabel(locale, 'Chat with the office about this listing'),
      body:
        customBody ||
        translateLabel(
          locale,
          'Use WhatsApp for a faster first contact, then fall back to the enquiry form below if you need a fuller message.',
        ),
      primaryLabel: customLabel || translateLabel(locale, 'Chat on WhatsApp'),
      primaryHref: `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
        `${translateLabel(locale, 'I am interested in')} ${propertyTitle}`,
      )}`,
      secondaryLabel: translateLabel(locale, 'Send Enquiry'),
      secondaryHref: formHref,
      formTitle: `${translateLabel(locale, 'Enquire about')} ${propertyTitle}`,
      formSubmitLabel: translateLabel(locale, 'Send Enquiry'),
      inlineFormIntro: translateLabel(
        locale,
        'Prefer email instead? Use the form below for viewing requests, floorplans, or availability questions.',
      ),
      showsMobileStickyBar: settings.propertyCtaMobileMode === 'sticky',
    }
  }

  if (settings.propertyCtaType === 'general_enquiry') {
    return {
      type: settings.propertyCtaType,
      eyebrow: translateLabel(locale, 'Primary action'),
      title: translateLabel(locale, 'Ask for details or latest availability'),
      body:
        customBody ||
        translateLabel(
          locale,
          'Use the enquiry form to ask questions, request floorplans, or confirm the latest availability with the team.',
        ),
      primaryLabel: customLabel || translateLabel(locale, 'Send Enquiry'),
      primaryHref: formHref,
      secondaryLabel: null,
      secondaryHref: null,
      formTitle: `${translateLabel(locale, 'Enquire about')} ${propertyTitle}`,
      formSubmitLabel: translateLabel(locale, 'Send Enquiry'),
      inlineFormIntro: translateLabel(
        locale,
        'Share the details you need and the office can reply with the next step or the latest status.',
      ),
      showsMobileStickyBar: settings.propertyCtaMobileMode === 'sticky',
    }
  }

  return {
    type: 'book_viewing',
    eyebrow: translateLabel(locale, 'Primary action'),
    title: translateLabel(locale, 'Arrange a viewing or ask for details'),
    body:
      customBody ||
      translateLabel(
        locale,
        'Use the enquiry form to request a viewing, ask for floorplans, or confirm the latest availability with the team.',
      ),
    primaryLabel: customLabel || translateLabel(locale, 'Book a Viewing'),
    primaryHref: formHref,
    secondaryLabel: null,
    secondaryHref: null,
    formTitle: translateLabel(locale, 'Arrange a viewing or ask for details'),
    formSubmitLabel: translateLabel(locale, 'Request Viewing'),
    inlineFormIntro: translateLabel(
      locale,
      'Share a preferred day or time if you want the team to come back with viewing availability.',
    ),
    showsMobileStickyBar: settings.propertyCtaMobileMode === 'sticky',
  }
}
