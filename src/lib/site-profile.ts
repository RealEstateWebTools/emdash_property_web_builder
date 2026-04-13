import type { SiteDetails } from './pwb/types'

export const SITE_PROFILE_BRAND_NAME_KV_KEY = 'settings:brand_name'
export const SITE_PROFILE_TAGLINE_KV_KEY = 'settings:tagline'
export const SITE_PROFILE_OFFICE_ADDRESS_KV_KEY = 'settings:office_address'
export const SITE_PROFILE_OFFICE_PHONE_KV_KEY = 'settings:office_phone'
export const SITE_PROFILE_OFFICE_EMAIL_KV_KEY = 'settings:office_email'

export interface SiteProfileSettings {
  brandName: string
  tagline: string
  officeAddress: string
  officePhone: string
  officeEmail: string
}

export const DEFAULT_SITE_PROFILE_SETTINGS: SiteProfileSettings = {
  brandName: 'Demo Realty',
  tagline: 'Curated homes, rentals, and local insight',
  officeAddress: '127 Harbour Street, East Brunswick, NJ 08816',
  officePhone: '(732) 555-0148',
  officeEmail: 'hello@demorealty.com',
}

function sanitizeText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
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
  }
}

export function applySiteProfileToSite(site: SiteDetails, profile: SiteProfileSettings): SiteDetails {
  return {
    ...site,
    title: profile.brandName,
    company_display_name: profile.brandName,
  }
}
