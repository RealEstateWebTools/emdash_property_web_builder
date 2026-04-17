import { definePlugin, extractPlainText, getEmDashEntry, getMenu, getPluginSetting, getSiteSettings } from 'emdash'
import {
  DEFAULT_SITE_PROFILE_SETTINGS,
  SITE_PROFILE_PROPERTY_CTA_BODY_KV_KEY,
  SITE_PROFILE_PROPERTY_CTA_LABEL_KV_KEY,
  SITE_PROFILE_PROPERTY_CTA_MOBILE_MODE_KV_KEY,
  SITE_PROFILE_PROPERTY_CTA_TYPE_KV_KEY,
  SITE_PROFILE_BRAND_NAME_KV_KEY,
  SITE_PROFILE_OFFICE_ADDRESS_KV_KEY,
  SITE_PROFILE_OFFICE_EMAIL_KV_KEY,
  SITE_PROFILE_OFFICE_PHONE_KV_KEY,
  SITE_PROFILE_RESPONSE_PLEDGE_KV_KEY,
  SITE_PROFILE_TAGLINE_KV_KEY,
  VALID_PROPERTY_CTA_MOBILE_MODES,
  VALID_PROPERTY_CTA_TYPES,
  sanitizeSiteProfileSettings,
  type SiteProfileSettings,
} from '../lib/site-profile.js'
import { buildSiteLaunchChecklist } from '../lib/site-launch-checklist.js'
import { DEFAULT_THEME_SETTINGS, sanitizeThemeSettings } from './pwb-theme.js'

const PROPERTY_CTA_TYPE_OPTIONS: Array<{ value: (typeof VALID_PROPERTY_CTA_TYPES)[number]; label: string }> = [
  { value: 'book_viewing', label: 'Book viewing — push toward viewing requests' },
  { value: 'general_enquiry', label: 'General enquiry — broad buyer questions' },
  { value: 'valuation_request', label: 'Valuation request — owner capture from listing pages' },
  { value: 'whatsapp_chat', label: 'WhatsApp chat — faster first contact' },
]

const PROPERTY_CTA_MOBILE_OPTIONS: Array<{ value: (typeof VALID_PROPERTY_CTA_MOBILE_MODES)[number]; label: string }> = [
  { value: 'sticky', label: 'Sticky bar — persistent mobile CTA' },
  { value: 'inline', label: 'Inline only — no sticky mobile bar' },
]

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function buildHealthLabel(readyCount: number, totalCount: number): string {
  if (readyCount === totalCount) {
    return 'Ready to launch'
  }
  if (readyCount === 0) {
    return 'Setup required'
  }
  return `${readyCount} of ${totalCount} complete`
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`
}

function buildWebsiteBlocks(input: {
  siteUrl: string
  brandName: string
  officeAddress: string
  homepageTitle: string
  menuCount: number
  themeLabel: string
  propertyStatus: string
  checklistStatus: string
}) {
  return [
    { type: 'header', text: 'Website Control Surface' },
    {
      type: 'context',
      text: 'Use this page as the shortest path to the public website controls that matter most: brand, office details, homepage content, theme, search and listings, SEO, and launch readiness.',
    },
    {
      type: 'stats',
      items: [
        { label: 'Brand', value: input.brandName },
        { label: 'Homepage', value: input.homepageTitle },
        { label: 'Menu Items', value: String(input.menuCount) },
      ],
    },
    { type: 'divider' },
    {
      type: 'section',
      text: `*Launch Checklist*\n${input.checklistStatus}\nReview what is still missing before the site goes live.`,
      accessory: {
        type: 'button',
        text: 'Open checklist',
        url: '/_emdash/admin/plugins/site-profile/launch-checklist',
        style: 'primary',
      },
    },
    { type: 'divider' },
    {
      type: 'section',
      text: `*Brand & Office*\n${input.brandName}\nUpdate the agency name, tagline, address, phone, and email shown in the site shell.`,
      accessory: {
        type: 'button',
        text: 'Edit brand',
        url: '/_emdash/admin/plugins/site-profile/settings',
      },
    },
    {
      type: 'actions',
      elements: [
        { type: 'button', text: 'View homepage', url: joinUrl(input.siteUrl, '/') },
        { type: 'button', text: 'View contact area', url: joinUrl(input.siteUrl, '/') },
      ],
    },
    { type: 'divider' },
    {
      type: 'section',
      text: '*Property page CTAs*\nControl the primary action shown on listing detail pages and how aggressive the mobile CTA should feel.',
      accessory: {
        type: 'button',
        text: 'Edit CTA defaults',
        url: '/_emdash/admin/plugins/site-profile/settings',
      },
    },
    {
      type: 'actions',
      elements: [{ type: 'button', text: 'Preview a property', url: joinUrl(input.siteUrl, '/properties') }],
    },
    { type: 'divider' },
    {
      type: 'section',
      text: `*Homepage*\n${input.homepageTitle}\nEdit the hero and introductory content that shapes the first impression.`,
      accessory: {
        type: 'button',
        text: 'Edit homepage',
        url: '/_emdash/admin/content/pages/homepage',
      },
    },
    {
      type: 'actions',
      elements: [{ type: 'button', text: 'Preview homepage', url: joinUrl(input.siteUrl, '/') }],
    },
    { type: 'divider' },
    {
      type: 'section',
      text: `*Theme*\n${input.themeLabel}\nControl the visual direction, spacing, surface treatment, motion, and header behavior.`,
      accessory: {
        type: 'button',
        text: 'Open theme',
        url: '/_emdash/admin/plugins/pwb-theme/settings',
      },
    },
    {
      type: 'actions',
      elements: [
        { type: 'button', text: 'View homepage', url: joinUrl(input.siteUrl, '/') },
        { type: 'button', text: 'View properties', url: joinUrl(input.siteUrl, '/properties') },
      ],
    },
    { type: 'divider' },
    {
      type: 'section',
      text: `*Search & Listings*\n${input.propertyStatus}\nConnect the PWB backend and review the public browsing experience for inventory-heavy pages.`,
      accessory: {
        type: 'button',
        text: 'Open listings settings',
        url: '/_emdash/admin/plugins/pwb-properties/settings',
      },
    },
    {
      type: 'actions',
      elements: [
        { type: 'button', text: 'Preview search', url: joinUrl(input.siteUrl, '/properties') },
        { type: 'button', text: 'Open listings admin', url: '/_emdash/admin/plugins/pwb-properties/' },
      ],
    },
    { type: 'divider' },
    {
      type: 'section',
      text: `*SEO & Site Settings*\nGlobal metadata, logo, favicon, site URL, and verification settings live in the core settings screen.`,
      accessory: {
        type: 'button',
        text: 'Open settings',
        url: '/_emdash/admin/settings',
      },
    },
    {
      type: 'actions',
      elements: [{ type: 'button', text: 'Preview site', url: joinUrl(input.siteUrl, '/') }],
    },
    { type: 'divider' },
    {
      type: 'section',
      text: `*Navigation*\n${input.menuCount} primary menu item${input.menuCount === 1 ? '' : 's'} configured.\nUpdate the main navigation when the homepage structure or marketing priorities change.`,
      accessory: {
        type: 'button',
        text: 'Edit menus',
        url: '/_emdash/admin/menus',
      },
    },
  ]
}

function buildSettingsBlocks(settings: SiteProfileSettings, siteUrl: string) {
  return [
    { type: 'header', text: 'Brand & Office' },
    {
      type: 'context',
      text: 'Manage the public-facing agency identity and office contact details shown across the site shell. This is the fastest place to replace demo branding and make the business feel real.',
    },
    {
      type: 'fields',
      fields: [
        { label: 'Brand Name', value: settings.brandName },
        { label: 'Tagline', value: settings.tagline },
        { label: 'Office Address', value: settings.officeAddress },
        { label: 'Office Phone', value: settings.officePhone },
        { label: 'Office Email', value: settings.officeEmail },
        { label: 'Response Pledge', value: settings.responsePledge },
        { label: 'Property CTA Type', value: settings.propertyCtaType },
        { label: 'Property CTA Mobile', value: settings.propertyCtaMobileMode },
      ],
    },
    {
      type: 'actions',
      elements: [
        { type: 'button', text: 'View homepage', url: joinUrl(siteUrl, '/') },
        { type: 'button', text: 'Preview properties', url: joinUrl(siteUrl, '/properties') },
      ],
    },
    {
      type: 'form',
      block_id: 'site_profile_settings',
      fields: [
        {
          type: 'text_input',
          action_id: 'brand_name',
          label: 'Brand name',
          initial_value: settings.brandName,
          placeholder: 'Demo Realty',
        },
        {
          type: 'text_input',
          action_id: 'tagline',
          label: 'Top bar tagline',
          initial_value: settings.tagline,
          placeholder: 'Curated homes, rentals, and local insight',
        },
        {
          type: 'text_input',
          action_id: 'office_address',
          label: 'Office address',
          initial_value: settings.officeAddress,
          placeholder: '127 Harbour Street, East Brunswick, NJ 08816',
        },
        {
          type: 'text_input',
          action_id: 'office_phone',
          label: 'Office phone',
          initial_value: settings.officePhone,
          placeholder: '(732) 555-0148',
        },
        {
          type: 'text_input',
          action_id: 'office_email',
          label: 'Office email',
          initial_value: settings.officeEmail,
          placeholder: 'hello@demorealty.com',
        },
        {
          type: 'text_input',
          action_id: 'response_pledge',
          label: 'Response pledge',
          initial_value: settings.responsePledge,
          placeholder: 'We respond to all enquiries within one working day.',
        },
        {
          type: 'select',
          action_id: 'property_cta_type',
          label: 'Property page primary CTA',
          initial_value: settings.propertyCtaType,
          options: PROPERTY_CTA_TYPE_OPTIONS,
        },
        {
          type: 'text_input',
          action_id: 'property_cta_label',
          label: 'Property CTA label override',
          initial_value: settings.propertyCtaLabel,
          placeholder: 'Leave blank to use the default label',
        },
        {
          type: 'text_input',
          action_id: 'property_cta_body',
          label: 'Property CTA intro override',
          initial_value: settings.propertyCtaBody,
          placeholder: 'Optional helper copy shown above the property enquiry area',
        },
        {
          type: 'select',
          action_id: 'property_cta_mobile_mode',
          label: 'Mobile CTA behavior',
          initial_value: settings.propertyCtaMobileMode,
          options: PROPERTY_CTA_MOBILE_OPTIONS,
        },
      ],
      submit: { label: 'Save Brand & Office', action_id: 'save_site_profile' },
    },
    {
      type: 'context',
      text: 'These values affect the site header, footer, office identity, and the default conversion path on property detail pages.',
    },
  ]
}

function buildChecklistBlocks(result: ReturnType<typeof buildSiteLaunchChecklist>) {
  const blocks: any[] = [
    { type: 'header', text: 'Launch Checklist' },
    {
      type: 'context',
      text: 'Review the core website setup items before launch. Each item is derived from the current settings and content state, and links straight to the place where it can be fixed.',
    },
    {
      type: 'stats',
      items: [
        { label: 'Ready', value: String(result.readyCount) },
        { label: 'Remaining', value: String(result.totalCount - result.readyCount) },
        { label: 'Status', value: buildHealthLabel(result.readyCount, result.totalCount) },
      ],
    },
    { type: 'divider' },
  ]

  result.items.forEach((item, index) => {
    blocks.push({
      type: 'section',
      text: `*${item.label}*\n${item.summary}\n${item.detail}`,
      accessory: {
        type: 'button',
        text: item.actionLabel,
        url: item.adminPath,
        style: item.status === 'ready' ? undefined : 'primary',
      },
    })

    if (index < result.items.length - 1) {
      blocks.push({ type: 'divider' })
    }
  })

  return blocks
}

async function readSiteProfileSettings(ctx: any): Promise<SiteProfileSettings> {
  const [
    brandName,
    tagline,
    officeAddress,
    officePhone,
    officeEmail,
    responsePledge,
    propertyCtaType,
    propertyCtaLabel,
    propertyCtaBody,
    propertyCtaMobileMode,
  ] = (await Promise.all([
    ctx.kv.get(SITE_PROFILE_BRAND_NAME_KV_KEY),
    ctx.kv.get(SITE_PROFILE_TAGLINE_KV_KEY),
    ctx.kv.get(SITE_PROFILE_OFFICE_ADDRESS_KV_KEY),
    ctx.kv.get(SITE_PROFILE_OFFICE_PHONE_KV_KEY),
    ctx.kv.get(SITE_PROFILE_OFFICE_EMAIL_KV_KEY),
    ctx.kv.get(SITE_PROFILE_RESPONSE_PLEDGE_KV_KEY),
    ctx.kv.get(SITE_PROFILE_PROPERTY_CTA_TYPE_KV_KEY),
    ctx.kv.get(SITE_PROFILE_PROPERTY_CTA_LABEL_KV_KEY),
    ctx.kv.get(SITE_PROFILE_PROPERTY_CTA_BODY_KV_KEY),
    ctx.kv.get(SITE_PROFILE_PROPERTY_CTA_MOBILE_MODE_KV_KEY),
  ])) as (string | null)[]

  return sanitizeSiteProfileSettings({
    brandName,
    tagline,
    officeAddress,
    officePhone,
    officeEmail,
    responsePledge,
    propertyCtaType,
    propertyCtaLabel,
    propertyCtaBody,
    propertyCtaMobileMode,
  })
}

async function writeSiteProfileSettings(ctx: any, settings: SiteProfileSettings) {
  await Promise.all([
    ctx.kv.set(SITE_PROFILE_BRAND_NAME_KV_KEY, settings.brandName),
    ctx.kv.set(SITE_PROFILE_TAGLINE_KV_KEY, settings.tagline),
    ctx.kv.set(SITE_PROFILE_OFFICE_ADDRESS_KV_KEY, settings.officeAddress),
    ctx.kv.set(SITE_PROFILE_OFFICE_PHONE_KV_KEY, settings.officePhone),
    ctx.kv.set(SITE_PROFILE_OFFICE_EMAIL_KV_KEY, settings.officeEmail),
    ctx.kv.set(SITE_PROFILE_RESPONSE_PLEDGE_KV_KEY, settings.responsePledge),
    ctx.kv.set(SITE_PROFILE_PROPERTY_CTA_TYPE_KV_KEY, settings.propertyCtaType),
    ctx.kv.set(SITE_PROFILE_PROPERTY_CTA_LABEL_KV_KEY, settings.propertyCtaLabel),
    ctx.kv.set(SITE_PROFILE_PROPERTY_CTA_BODY_KV_KEY, settings.propertyCtaBody),
    ctx.kv.set(SITE_PROFILE_PROPERTY_CTA_MOBILE_MODE_KV_KEY, settings.propertyCtaMobileMode),
  ])
}

async function probePropertyConnection(ctx: any, apiUrl: string) {
  const trimmedUrl = safeString(apiUrl).trim().replace(/\/+$/, '')
  if (!trimmedUrl) {
    return { healthy: false, label: null as string | null }
  }

  try {
    const response = await ctx.fetch(`${trimmedUrl}/api_public/v1/en/site_details`, {
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      return { healthy: false, label: `Connection check returned HTTP ${response.status}.` }
    }

    const site = (await response.json()) as { company_display_name?: string | null; title?: string | null }
    const label = safeString(site.company_display_name).trim() || safeString(site.title).trim()
    return {
      healthy: true,
      label: label ? `Connected to ${label}.` : 'The listing feed is connected and responding.',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown network error.'
    return { healthy: false, label: `Connection check failed: ${message}` }
  }
}

async function buildChecklistResult(ctx: any) {
  const [profile, siteSettings, homepageResult, primaryMenu, palette, density, surface, motion, header, pwbApiUrl] =
    await Promise.all([
      readSiteProfileSettings(ctx),
      getSiteSettings(),
      getEmDashEntry('pages', 'homepage', { locale: 'en' }),
      getMenu('primary'),
      getPluginSetting('pwb-theme', 'palette'),
      getPluginSetting('pwb-theme', 'density'),
      getPluginSetting('pwb-theme', 'surface'),
      getPluginSetting('pwb-theme', 'motion'),
      getPluginSetting('pwb-theme', 'header'),
      getPluginSetting('pwb-properties', 'pwbApiUrl'),
    ])

  const themeInput = { palette, density, surface, motion, header }
  const themeSettings = sanitizeThemeSettings(themeInput)
  const hasPersistedThemeSettings = Object.values(themeInput).some((value) => typeof value === 'string' && value.length > 0)
  const propertyConnection = await probePropertyConnection(ctx, safeString(pwbApiUrl))

  return buildSiteLaunchChecklist({
    siteTitle: siteSettings.title,
    hasLogo: Boolean(siteSettings.logo?.mediaId),
    brandName: profile.brandName,
    officeAddress: profile.officeAddress,
    officePhone: profile.officePhone,
    officeEmail: profile.officeEmail,
    homepageTitle: homepageResult.entry?.data.title,
    homepageContentText: extractPlainText(homepageResult.entry?.data.content),
    primaryMenuItemCount: primaryMenu?.items?.length ?? 0,
    themeSettings: hasPersistedThemeSettings ? themeSettings : DEFAULT_THEME_SETTINGS,
    hasPersistedThemeSettings,
    propertyApiUrl: safeString(pwbApiUrl),
    propertyConnectionHealthy: propertyConnection.healthy,
    propertyConnectionLabel: propertyConnection.label,
  })
}

async function buildWebsiteSummary(ctx: any) {
  const [profile, siteSettings, homepageResult, primaryMenu, palette, density, surface, motion, header, pwbApiUrl] =
    await Promise.all([
      readSiteProfileSettings(ctx),
      getSiteSettings(),
      getEmDashEntry('pages', 'homepage', { locale: 'en' }),
      getMenu('primary'),
      getPluginSetting('pwb-theme', 'palette'),
      getPluginSetting('pwb-theme', 'density'),
      getPluginSetting('pwb-theme', 'surface'),
      getPluginSetting('pwb-theme', 'motion'),
      getPluginSetting('pwb-theme', 'header'),
      getPluginSetting('pwb-properties', 'pwbApiUrl'),
    ])

  const themeInput = { palette, density, surface, motion, header }
  const themeSettings = sanitizeThemeSettings(themeInput)
  const hasPersistedThemeSettings = Object.values(themeInput).some(
    (value) => typeof value === 'string' && value.length > 0,
  )
  const propertyConnection = await probePropertyConnection(ctx, safeString(pwbApiUrl))
  const checklist = buildSiteLaunchChecklist({
    siteTitle: siteSettings.title,
    hasLogo: Boolean(siteSettings.logo?.mediaId),
    brandName: profile.brandName,
    officeAddress: profile.officeAddress,
    officePhone: profile.officePhone,
    officeEmail: profile.officeEmail,
    homepageTitle: homepageResult.entry?.data.title,
    homepageContentText: extractPlainText(homepageResult.entry?.data.content),
    primaryMenuItemCount: primaryMenu?.items?.length ?? 0,
    themeSettings: hasPersistedThemeSettings ? themeSettings : DEFAULT_THEME_SETTINGS,
    hasPersistedThemeSettings,
    propertyApiUrl: safeString(pwbApiUrl),
    propertyConnectionHealthy: propertyConnection.healthy,
    propertyConnectionLabel: propertyConnection.label,
  })

  return {
    siteUrl: safeString(ctx.site?.url).trim() || 'http://localhost:4321',
    brandName: profile.brandName,
    officeAddress: profile.officeAddress,
    homepageTitle: safeString(homepageResult.entry?.data.title).trim() || 'Homepage not configured',
    menuCount: primaryMenu?.items?.length ?? 0,
    themeLabel: hasPersistedThemeSettings
      ? `${themeSettings.palette} palette, ${themeSettings.density} spacing, ${themeSettings.header} header`
      : 'Using the default theme configuration',
    propertyStatus:
      propertyConnection.label ??
      (safeString(pwbApiUrl).trim()
        ? 'The listing feed is configured but still needs verification.'
        : 'No PWB API URL has been configured yet.'),
    checklistStatus: buildHealthLabel(checklist.readyCount, checklist.totalCount),
  }
}

export default definePlugin({
  hooks: {
    'plugin:install': {
      handler: async (_event: any, ctx: any) => {
        await writeSiteProfileSettings(ctx, DEFAULT_SITE_PROFILE_SETTINGS)
      },
    },
  },

  routes: {
    admin: {
      handler: async (routeCtx: any, ctx: any) => {
        const interaction = routeCtx.input ?? {}
        const currentPage = safeString(interaction.page) || '/'

        if (interaction.action_id === 'save_site_profile') {
          const settings = sanitizeSiteProfileSettings({
            brandName: interaction.values?.brand_name ?? interaction.value?.brand_name,
            tagline: interaction.values?.tagline ?? interaction.value?.tagline,
            officeAddress: interaction.values?.office_address ?? interaction.value?.office_address,
            officePhone: interaction.values?.office_phone ?? interaction.value?.office_phone,
            officeEmail: interaction.values?.office_email ?? interaction.value?.office_email,
            responsePledge: interaction.values?.response_pledge ?? interaction.value?.response_pledge,
            propertyCtaType: interaction.values?.property_cta_type ?? interaction.value?.property_cta_type,
            propertyCtaLabel: interaction.values?.property_cta_label ?? interaction.value?.property_cta_label,
            propertyCtaBody: interaction.values?.property_cta_body ?? interaction.value?.property_cta_body,
            propertyCtaMobileMode:
              interaction.values?.property_cta_mobile_mode ?? interaction.value?.property_cta_mobile_mode,
          })
          await writeSiteProfileSettings(ctx, settings)
          return {
            blocks: buildSettingsBlocks(settings, safeString(ctx.site?.url).trim() || 'http://localhost:4321'),
            toast: { message: 'Site profile saved.', type: 'success' },
          }
        }

        if (currentPage === '/launch-checklist') {
          const result = await buildChecklistResult(ctx)
          return { blocks: buildChecklistBlocks(result) }
        }

        if (currentPage === '/') {
          const website = await buildWebsiteSummary(ctx)
          return { blocks: buildWebsiteBlocks(website) }
        }

        const current = await readSiteProfileSettings(ctx)
        return {
          blocks: buildSettingsBlocks(current, safeString(ctx.site?.url).trim() || 'http://localhost:4321'),
        }
      },
    },
  },
})
