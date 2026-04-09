import { definePlugin } from 'emdash'
import {
  buildThemePreviewDataUrl,
  DEFAULT_THEME_SETTINGS,
  PALETTE_PREVIEWS,
  PALETTE_KV_KEY,
  THEME_DENSITY_KV_KEY,
  THEME_HEADER_KV_KEY,
  THEME_MOTION_KV_KEY,
  THEME_SURFACE_KV_KEY,
  type ThemeSettings,
  sanitizeThemeSettings,
} from './pwb-theme.js'

const VALID_PALETTES = [
  'default',
  'coastal',
  'countryside',
  'luxury',
  'mediterranean',
  'nordic',
  'urban',
] as const

const PALETTE_OPTIONS = [
  { value: 'default',       label: 'Default — Standard layout' },
  { value: 'coastal',       label: 'Coastal — Ocean blues, 3-col grid' },
  { value: 'countryside',   label: 'Countryside — Sage green, warm stone' },
  { value: 'luxury',        label: 'Luxury — Dark charcoal, warm gold' },
  { value: 'mediterranean', label: 'Mediterranean — Terracotta, portrait cards' },
  { value: 'nordic',        label: 'Nordic — Ultra-minimal, 4-col grid' },
  { value: 'urban',         label: 'Urban — Cool slate, indigo accent' },
]

const DENSITY_OPTIONS = [
  { value: 'comfortable', label: 'Comfortable — balanced spacing' },
  { value: 'compact', label: 'Compact — tighter cards and grids' },
  { value: 'spacious', label: 'Spacious — more breathing room' },
]

const SURFACE_OPTIONS = [
  { value: 'soft', label: 'Soft — keep rounded cards and shadows' },
  { value: 'sharp', label: 'Sharp — square edges throughout' },
  { value: 'flat', label: 'Flat — lighter shadows, restrained surfaces' },
]

const MOTION_OPTIONS = [
  { value: 'calm', label: 'Calm — almost no hover movement' },
  { value: 'standard', label: 'Standard — current hover feel' },
  { value: 'expressive', label: 'Expressive — stronger lift and emphasis' },
]

const HEADER_OPTIONS = [
  { value: 'sticky', label: 'Sticky — stays visible while browsing' },
  { value: 'static', label: 'Static — traditional document flow' },
  { value: 'compact', label: 'Compact — sticky with reduced height' },
]

function buildSummaryFields(settings: ThemeSettings) {
  return [
    { label: 'Palette', value: settings.palette },
    { label: 'Density', value: settings.density },
    { label: 'Surface', value: settings.surface },
    { label: 'Motion', value: settings.motion },
    { label: 'Header', value: settings.header },
  ]
}

function buildEffectFields(settings: ThemeSettings) {
  const preview = PALETTE_PREVIEWS[settings.palette]
  return [
    { label: 'Palette Mood', value: preview.mood },
    {
      label: 'Layout Effect',
      value:
        settings.density === 'compact'
          ? 'Tighter cards and less whitespace'
          : settings.density === 'spacious'
            ? 'More open spacing and larger rhythm'
            : 'Balanced spacing for mixed content pages',
    },
    {
      label: 'Surface Effect',
      value:
        settings.surface === 'sharp'
          ? 'Square edges and crisper framing'
          : settings.surface === 'flat'
            ? 'Reduced shadowing and quieter cards'
            : 'Rounded cards with standard depth',
    },
    {
      label: 'Interaction Effect',
      value:
        settings.motion === 'calm'
          ? 'Minimal hover movement'
          : settings.motion === 'expressive'
            ? 'Stronger hover lift and emphasis'
            : 'Moderate hover feedback',
    },
  ]
}

function buildSettingsBlocks(settings: ThemeSettings) {
  return [
    { type: 'header', text: 'Property Theme' },
    {
      type: 'context',
      text: 'Shape the property browsing experience with palette, spacing, surface, motion, and header controls. These settings apply site-wide wherever the shared property UI uses theme variables.',
    },
    {
      type: 'fields',
      fields: buildSummaryFields(settings),
    },
    {
      type: 'image',
      url: buildThemePreviewDataUrl(settings),
      alt: `${PALETTE_PREVIEWS[settings.palette].title} theme preview`,
      title: 'Theme Preview',
    },
    {
      type: 'section',
      text: 'Palettes control the broad art direction. The other controls are palette-safe refinements layered on top.',
    },
    {
      type: 'fields',
      fields: buildEffectFields(settings),
    },
    {
      type: 'form',
      block_id: 'theme_settings',
      fields: [
        {
          type: 'select',
          action_id: 'palette',
          label: 'Palette',
          initial_value: settings.palette,
          options: PALETTE_OPTIONS,
        },
        {
          type: 'select',
          action_id: 'density',
          label: 'Density',
          initial_value: settings.density,
          options: DENSITY_OPTIONS,
        },
        {
          type: 'select',
          action_id: 'surface',
          label: 'Surface Style',
          initial_value: settings.surface,
          options: SURFACE_OPTIONS,
        },
        {
          type: 'select',
          action_id: 'motion',
          label: 'Interaction Tone',
          initial_value: settings.motion,
          options: MOTION_OPTIONS,
        },
        {
          type: 'select',
          action_id: 'header',
          label: 'Header Behavior',
          initial_value: settings.header,
          options: HEADER_OPTIONS,
        },
      ],
      submit: { label: 'Save Theme Settings', action_id: 'save_theme' },
    },
    {
      type: 'context',
      text: 'Use palettes for visual identity, density for grid rhythm, surface style for edge and shadow treatment, interaction tone for hover intensity, and header behavior for browsing ergonomics.',
    },
  ]
}

async function readThemeSettings(ctx: any): Promise<ThemeSettings> {
  const [palette, density, surface, motion, header] = await Promise.all([
    ctx.kv.get<string>(PALETTE_KV_KEY),
    ctx.kv.get<string>(THEME_DENSITY_KV_KEY),
    ctx.kv.get<string>(THEME_SURFACE_KV_KEY),
    ctx.kv.get<string>(THEME_MOTION_KV_KEY),
    ctx.kv.get<string>(THEME_HEADER_KV_KEY),
  ])

  return sanitizeThemeSettings({ palette, density, surface, motion, header })
}

async function writeThemeSettings(ctx: any, settings: ThemeSettings) {
  await Promise.all([
    ctx.kv.set(PALETTE_KV_KEY, settings.palette),
    ctx.kv.set(THEME_DENSITY_KV_KEY, settings.density),
    ctx.kv.set(THEME_SURFACE_KV_KEY, settings.surface),
    ctx.kv.set(THEME_MOTION_KV_KEY, settings.motion),
    ctx.kv.set(THEME_HEADER_KV_KEY, settings.header),
  ])
}

export default definePlugin({
  hooks: {
    'plugin:install': {
      handler: async (_event: any, ctx: any) => {
        await writeThemeSettings(ctx, DEFAULT_THEME_SETTINGS)
      },
    },
  },

  routes: {
    admin: {
      handler: async (routeCtx: any, ctx: any) => {
        const interaction = routeCtx.input ?? {}

        if (interaction.action_id === 'save_theme') {
          const settings = sanitizeThemeSettings({
            palette: interaction.values?.palette ?? interaction.value?.palette,
            density: interaction.values?.density ?? interaction.value?.density,
            surface: interaction.values?.surface ?? interaction.value?.surface,
            motion: interaction.values?.motion ?? interaction.value?.motion,
            header: interaction.values?.header ?? interaction.value?.header,
          })
          await writeThemeSettings(ctx, settings)
          return {
            blocks: buildSettingsBlocks(settings),
            toast: { message: 'Theme settings saved.', type: 'success' },
          }
        }

        const current = await readThemeSettings(ctx)
        return { blocks: buildSettingsBlocks(current) }
      },
    },
  },
})
