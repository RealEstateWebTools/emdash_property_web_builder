import { DEFAULT_THEME_SETTINGS, type ThemeSettings } from '../plugins/pwb-theme'

export type LaunchChecklistStatus = 'ready' | 'attention'

export interface LaunchChecklistItem {
  id: string
  label: string
  status: LaunchChecklistStatus
  summary: string
  detail: string
  adminPath: string
  actionLabel: string
}

export interface LaunchChecklistInput {
  siteTitle?: string | null
  hasLogo?: boolean
  brandName?: string | null
  officeAddress?: string | null
  officePhone?: string | null
  officeEmail?: string | null
  homepageTitle?: string | null
  homepageContentText?: string | null
  primaryMenuItemCount?: number
  themeSettings?: ThemeSettings
  hasPersistedThemeSettings?: boolean
  propertyApiUrl?: string | null
  propertyConnectionHealthy?: boolean
  propertyConnectionLabel?: string | null
}

export interface LaunchChecklistResult {
  items: LaunchChecklistItem[]
  readyCount: number
  totalCount: number
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function humanize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function buildSiteLaunchChecklist(input: LaunchChecklistInput): LaunchChecklistResult {
  const brandReady = hasText(input.brandName) && hasText(input.siteTitle)
  const officeReady =
    hasText(input.officeAddress) && hasText(input.officePhone) && hasText(input.officeEmail)
  const homepageReady =
    hasText(input.homepageTitle) && hasText(input.homepageContentText)
  const menuReady = (input.primaryMenuItemCount ?? 0) > 0
  const themeSettings = input.themeSettings ?? DEFAULT_THEME_SETTINGS
  const themeReady = Boolean(input.hasPersistedThemeSettings)
  const propertyUrlReady = hasText(input.propertyApiUrl)
  const propertyReady = propertyUrlReady && input.propertyConnectionHealthy === true

  const items: LaunchChecklistItem[] = [
    {
      id: 'brand',
      label: 'Brand identity',
      status: brandReady ? 'ready' : 'attention',
      summary: brandReady
        ? `${input.brandName?.trim()} is configured as the public brand.`
        : 'Add the public brand name and site title before launch.',
      detail: brandReady
        ? input.hasLogo
          ? 'Brand name, site title, and logo are in place.'
          : 'Brand name and site title are set. A logo can still strengthen recognition.'
        : 'The header and metadata should not depend on placeholder identity settings.',
      adminPath: '/_emdash/admin/plugins/site-profile/settings',
      actionLabel: 'Edit brand',
    },
    {
      id: 'office',
      label: 'Office details',
      status: officeReady ? 'ready' : 'attention',
      summary: officeReady
        ? 'Address, phone, and email are populated.'
        : 'Complete the address, phone, and email shown across the site shell.',
      detail: officeReady
        ? `${input.officeAddress?.trim()}`
        : 'These details reinforce trust and give buyers a direct path to contact the agency.',
      adminPath: '/_emdash/admin/plugins/site-profile/settings',
      actionLabel: 'Edit office',
    },
    {
      id: 'homepage',
      label: 'Homepage hero and intro',
      status: homepageReady ? 'ready' : 'attention',
      summary: homepageReady
        ? 'The homepage has headline copy and introductory content.'
        : 'The homepage needs a clear hero title and supporting content.',
      detail: homepageReady
        ? `${input.homepageTitle?.trim()}`
        : 'First-time visitors should immediately understand the agency, market, and call to action.',
      adminPath: '/_emdash/admin/content/pages/homepage',
      actionLabel: 'Edit homepage',
    },
    {
      id: 'menu',
      label: 'Primary navigation',
      status: menuReady ? 'ready' : 'attention',
      summary: menuReady
        ? `${input.primaryMenuItemCount} menu item${input.primaryMenuItemCount === 1 ? '' : 's'} configured.`
        : 'Create the primary navigation so key pages are reachable.',
      detail: menuReady
        ? 'The main header navigation is populated.'
        : 'Launching without a clear primary menu makes the site feel unfinished.',
      adminPath: '/_emdash/admin/menus',
      actionLabel: 'Edit menus',
    },
    {
      id: 'theme',
      label: 'Theme direction',
      status: themeReady ? 'ready' : 'attention',
      summary: themeReady
        ? `${humanize(themeSettings.palette)} palette with ${themeSettings.density} spacing is active.`
        : 'Review and save a theme preset before launch.',
      detail: themeReady
        ? `Surface: ${themeSettings.surface}. Motion: ${themeSettings.motion}. Header: ${themeSettings.header}.`
        : 'Choosing the theme explicitly makes the visual direction intentional rather than accidental default state.',
      adminPath: '/_emdash/admin/plugins/pwb-theme/settings',
      actionLabel: 'Choose theme',
    },
    {
      id: 'properties',
      label: 'Property connection',
      status: propertyReady ? 'ready' : 'attention',
      summary: propertyReady
        ? input.propertyConnectionLabel?.trim() || 'The listing feed is connected and responding.'
        : propertyUrlReady
          ? 'The listing feed is configured but the connection check failed.'
          : 'Set the PWB API URL and verify the listing feed is reachable.',
      detail: propertyReady
        ? `Source: ${input.propertyApiUrl?.trim()}`
        : propertyUrlReady
          ? 'The frontend depends on a healthy PWB connection for live inventory.'
          : 'Without a configured API URL the public property pages cannot load live inventory.',
      adminPath: '/_emdash/admin/plugins/pwb-properties/settings',
      actionLabel: 'Fix connection',
    },
  ]

  return {
    items,
    readyCount: items.filter((item) => item.status === 'ready').length,
    totalCount: items.length,
  }
}
