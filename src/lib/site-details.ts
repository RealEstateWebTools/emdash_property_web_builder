/**
 * Site details (name, logo, description, social handles, analytics) for the
 * page chrome. From PWB when it is configured; otherwise — and as the fallback
 * when PWB is unreachable — from EmDash's own site settings, so the brand an
 * editor sets in the admin is what visitors see.
 */
import { getSiteSettings } from 'emdash'
import { isPwbConfigured } from './backend'
import { createPwbClient } from './pwb/client'
import { logPwbUnexpectedError } from './pwb/errors'
import { fallbackSite } from './pwb/fallback-site'
import type { SiteDetails } from './pwb/types'

type EmDashSettings = Awaited<ReturnType<typeof getSiteSettings>>

/** Map EmDash site settings onto the SiteDetails shape the layout expects. */
export function siteDetailsFromSettings(settings: Partial<EmDashSettings> | null | undefined): SiteDetails {
  const title = settings?.title?.trim() || fallbackSite.title
  const twitter = settings?.social?.twitter?.trim()
  return {
    ...fallbackSite,
    title,
    company_display_name: title,
    meta_description: settings?.tagline?.trim() || null,
    logo_url: settings?.logo?.url ?? null,
    twitter: twitter ? { site: twitter } : {},
  }
}

async function settingsSiteDetails(): Promise<SiteDetails> {
  try {
    return siteDetailsFromSettings(await getSiteSettings())
  } catch (err) {
    console.error('[site-details] EmDash settings unavailable:', err)
    return fallbackSite
  }
}

/**
 * @param context label for error logs (e.g. "property page slug=x")
 */
export async function loadSiteDetails(locale: string, context = 'page'): Promise<SiteDetails> {
  if (!isPwbConfigured()) return settingsSiteDetails()
  try {
    return await createPwbClient(locale).getSiteDetails()
  } catch (err) {
    logPwbUnexpectedError(`site details (${context}) locale=${locale}`, err)
    return settingsSiteDetails()
  }
}
