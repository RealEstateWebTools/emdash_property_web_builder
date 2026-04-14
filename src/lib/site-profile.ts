import type { SiteDetails } from './pwb/types'

export const SITE_PROFILE_BRAND_NAME_KV_KEY = 'settings:brand_name'
export const SITE_PROFILE_TAGLINE_KV_KEY = 'settings:tagline'
export const SITE_PROFILE_OFFICE_ADDRESS_KV_KEY = 'settings:office_address'
export const SITE_PROFILE_OFFICE_PHONE_KV_KEY = 'settings:office_phone'
export const SITE_PROFILE_OFFICE_EMAIL_KV_KEY = 'settings:office_email'
export const SITE_PROFILE_PROPERTY_CTA_TYPE_KV_KEY = 'settings:property_cta_type'
export const SITE_PROFILE_PROPERTY_CTA_LABEL_KV_KEY = 'settings:property_cta_label'
export const SITE_PROFILE_PROPERTY_CTA_BODY_KV_KEY = 'settings:property_cta_body'
export const SITE_PROFILE_PROPERTY_CTA_MOBILE_MODE_KV_KEY = 'settings:property_cta_mobile_mode'

export const VALID_PROPERTY_CTA_TYPES = [
  'book_viewing',
  'general_enquiry',
  'valuation_request',
  'whatsapp_chat',
] as const

export const VALID_PROPERTY_CTA_MOBILE_MODES = ['sticky', 'inline'] as const

export type PropertyCtaType = (typeof VALID_PROPERTY_CTA_TYPES)[number]
export type PropertyCtaMobileMode = (typeof VALID_PROPERTY_CTA_MOBILE_MODES)[number]

export interface SiteProfileSettings {
  brandName: string
  tagline: string
  officeAddress: string
  officePhone: string
  officeEmail: string
  propertyCtaType: PropertyCtaType
  propertyCtaLabel: string
  propertyCtaBody: string
  propertyCtaMobileMode: PropertyCtaMobileMode
}

export const DEFAULT_SITE_PROFILE_SETTINGS: SiteProfileSettings = {
  brandName: 'Demo Realty',
  tagline: 'Curated homes, rentals, and local insight',
  officeAddress: '127 Harbour Street, East Brunswick, NJ 08816',
  officePhone: '(732) 555-0148',
  officeEmail: 'hello@demorealty.com',
  propertyCtaType: 'book_viewing',
  propertyCtaLabel: '',
  propertyCtaBody: '',
  propertyCtaMobileMode: 'sticky',
}

function sanitizeText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function sanitizeOptionalText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function sanitizePropertyCtaType(value: unknown): PropertyCtaType {
  return typeof value === 'string' &&
    (VALID_PROPERTY_CTA_TYPES as readonly string[]).includes(value)
    ? (value as PropertyCtaType)
    : DEFAULT_SITE_PROFILE_SETTINGS.propertyCtaType
}

function sanitizePropertyCtaMobileMode(value: unknown): PropertyCtaMobileMode {
  return typeof value === 'string' &&
    (VALID_PROPERTY_CTA_MOBILE_MODES as readonly string[]).includes(value)
    ? (value as PropertyCtaMobileMode)
    : DEFAULT_SITE_PROFILE_SETTINGS.propertyCtaMobileMode
}

export function sanitizeSiteProfileSettings(
  input: Partial<Record<keyof SiteProfileSettings, unknown>>,
): SiteProfileSettings {
  return {
    brandName: sanitizeText(input.brandName, DEFAULT_SITE_PROFILE_SETTINGS.brandName),
    tagline: sanitizeText(input.tagline, DEFAULT_SITE_PROFILE_SETTINGS.tagline),
    officeAddress: sanitizeText(input.officeAddress, DEFAULT_SITE_PROFILE_SETTINGS.officeAddress),
    officePhone: sanitizeText(input.officePhone, DEFAULT_SITE_PROFILE_SETTINGS.officePhone),
    officeEmail: sanitizeText(input.officeEmail, DEFAULT_SITE_PROFILE_SETTINGS.officeEmail),
    propertyCtaType: sanitizePropertyCtaType(input.propertyCtaType),
    propertyCtaLabel: sanitizeOptionalText(input.propertyCtaLabel),
    propertyCtaBody: sanitizeOptionalText(input.propertyCtaBody),
    propertyCtaMobileMode: sanitizePropertyCtaMobileMode(input.propertyCtaMobileMode),
  }
}

export function applySiteProfileToSite(site: SiteDetails, profile: SiteProfileSettings): SiteDetails {
  return {
    ...site,
    title: profile.brandName,
    company_display_name: profile.brandName,
  }
}

export async function readSiteProfileSettingsFromDb(db: any): Promise<SiteProfileSettings> {
  if (!db) return DEFAULT_SITE_PROFILE_SETTINGS

  try {
    const rows = await db
      .selectFrom('options')
      .select(['name', 'value'])
      .where('name', 'in', [
        `plugin:site-profile:${SITE_PROFILE_BRAND_NAME_KV_KEY}`,
        `plugin:site-profile:${SITE_PROFILE_TAGLINE_KV_KEY}`,
        `plugin:site-profile:${SITE_PROFILE_OFFICE_ADDRESS_KV_KEY}`,
        `plugin:site-profile:${SITE_PROFILE_OFFICE_PHONE_KV_KEY}`,
        `plugin:site-profile:${SITE_PROFILE_OFFICE_EMAIL_KV_KEY}`,
        `plugin:site-profile:${SITE_PROFILE_PROPERTY_CTA_TYPE_KV_KEY}`,
        `plugin:site-profile:${SITE_PROFILE_PROPERTY_CTA_LABEL_KV_KEY}`,
        `plugin:site-profile:${SITE_PROFILE_PROPERTY_CTA_BODY_KV_KEY}`,
        `plugin:site-profile:${SITE_PROFILE_PROPERTY_CTA_MOBILE_MODE_KV_KEY}`,
      ])
      .execute()

    const rawSettings = Object.fromEntries(
      rows.map((row: { name: string; value: unknown }) => {
        const key = row.name.split(':').slice(-1)[0]
        const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : null
        return [key, parsed]
      }),
    )

    return sanitizeSiteProfileSettings({
      brandName: rawSettings.brand_name,
      tagline: rawSettings.tagline,
      officeAddress: rawSettings.office_address,
      officePhone: rawSettings.office_phone,
      officeEmail: rawSettings.office_email,
      propertyCtaType: rawSettings.property_cta_type,
      propertyCtaLabel: rawSettings.property_cta_label,
      propertyCtaBody: rawSettings.property_cta_body,
      propertyCtaMobileMode: rawSettings.property_cta_mobile_mode,
    })
  } catch {
    return DEFAULT_SITE_PROFILE_SETTINGS
  }
}
