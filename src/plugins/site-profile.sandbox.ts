import { definePlugin } from 'emdash'
import {
  DEFAULT_SITE_PROFILE_SETTINGS,
  SITE_PROFILE_BRAND_NAME_KV_KEY,
  SITE_PROFILE_OFFICE_ADDRESS_KV_KEY,
  SITE_PROFILE_OFFICE_EMAIL_KV_KEY,
  SITE_PROFILE_OFFICE_PHONE_KV_KEY,
  SITE_PROFILE_TAGLINE_KV_KEY,
  sanitizeSiteProfileSettings,
  type SiteProfileSettings,
} from '../lib/site-profile.js'

function buildSettingsBlocks(settings: SiteProfileSettings) {
  return [
    { type: 'header', text: 'Site Profile' },
    {
      type: 'context',
      text: 'Manage the public-facing brand and office contact details shown across the site shell. These settings are intended for demo or small-site editorial updates without code changes.',
    },
    {
      type: 'fields',
      fields: [
        { label: 'Brand Name', value: settings.brandName },
        { label: 'Tagline', value: settings.tagline },
        { label: 'Office Address', value: settings.officeAddress },
        { label: 'Office Phone', value: settings.officePhone },
        { label: 'Office Email', value: settings.officeEmail },
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
      ],
      submit: { label: 'Save Site Profile', action_id: 'save_site_profile' },
    },
  ]
}

async function readSiteProfileSettings(ctx: any): Promise<SiteProfileSettings> {
  const [brandName, tagline, officeAddress, officePhone, officeEmail] = (await Promise.all([
    ctx.kv.get(SITE_PROFILE_BRAND_NAME_KV_KEY),
    ctx.kv.get(SITE_PROFILE_TAGLINE_KV_KEY),
    ctx.kv.get(SITE_PROFILE_OFFICE_ADDRESS_KV_KEY),
    ctx.kv.get(SITE_PROFILE_OFFICE_PHONE_KV_KEY),
    ctx.kv.get(SITE_PROFILE_OFFICE_EMAIL_KV_KEY),
  ])) as (string | null)[]

  return sanitizeSiteProfileSettings({
    brandName,
    tagline,
    officeAddress,
    officePhone,
    officeEmail,
  })
}

async function writeSiteProfileSettings(ctx: any, settings: SiteProfileSettings) {
  await Promise.all([
    ctx.kv.set(SITE_PROFILE_BRAND_NAME_KV_KEY, settings.brandName),
    ctx.kv.set(SITE_PROFILE_TAGLINE_KV_KEY, settings.tagline),
    ctx.kv.set(SITE_PROFILE_OFFICE_ADDRESS_KV_KEY, settings.officeAddress),
    ctx.kv.set(SITE_PROFILE_OFFICE_PHONE_KV_KEY, settings.officePhone),
    ctx.kv.set(SITE_PROFILE_OFFICE_EMAIL_KV_KEY, settings.officeEmail),
  ])
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

        if (interaction.action_id === 'save_site_profile') {
          const settings = sanitizeSiteProfileSettings({
            brandName: interaction.values?.brand_name ?? interaction.value?.brand_name,
            tagline: interaction.values?.tagline ?? interaction.value?.tagline,
            officeAddress: interaction.values?.office_address ?? interaction.value?.office_address,
            officePhone: interaction.values?.office_phone ?? interaction.value?.office_phone,
            officeEmail: interaction.values?.office_email ?? interaction.value?.office_email,
          })
          await writeSiteProfileSettings(ctx, settings)
          return {
            blocks: buildSettingsBlocks(settings),
            toast: { message: 'Site profile saved.', type: 'success' },
          }
        }

        const current = await readSiteProfileSettings(ctx)
        return { blocks: buildSettingsBlocks(current) }
      },
    },
  },
})
