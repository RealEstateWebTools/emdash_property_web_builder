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

// Mirror of VALID_PALETTES in pwb-theme.ts — kept in sync so the sandbox
// option list is validated against the descriptor's palette set at type-check time.
const VALID_PALETTES = [
  'default', 'coastal', 'countryside', 'luxury', 'mediterranean', 'nordic', 'urban',
] as const

const PALETTE_OPTIONS: Array<{ value: (typeof VALID_PALETTES)[number]; label: string }> = [
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

const APPLY_PRESET_ACTION_PREFIX = 'apply_theme_preset:'
const RESET_THEME_ACTION_ID = 'reset_theme'

const THEME_PRESETS = [
  {
    id: 'editorial',
    label: 'Editorial',
    description: 'Balanced default for broad inventory sites.',
    settings: {
      palette: 'default',
      density: 'comfortable',
      surface: 'soft',
      motion: 'standard',
      header: 'sticky',
    },
  },
  {
    id: 'coastal-showcase',
    label: 'Coastal Showcase',
    description: 'Airy spacing for premium coastal listings.',
    settings: {
      palette: 'coastal',
      density: 'spacious',
      surface: 'soft',
      motion: 'calm',
      header: 'sticky',
    },
  },
  {
    id: 'luxury-brochure',
    label: 'Luxury Brochure',
    description: 'Sharper framing and stronger contrast for prestige stock.',
    settings: {
      palette: 'luxury',
      density: 'comfortable',
      surface: 'sharp',
      motion: 'standard',
      header: 'compact',
    },
  },
  {
    id: 'urban-compact',
    label: 'Urban Compact',
    description: 'Dense, modern browsing for apartment-heavy portfolios.',
    settings: {
      palette: 'urban',
      density: 'compact',
      surface: 'flat',
      motion: 'expressive',
      header: 'compact',
    },
  },
  {
    id: 'nordic-minimal',
    label: 'Nordic Minimal',
    description: 'Quiet, minimal framing with more breathing room.',
    settings: {
      palette: 'nordic',
      density: 'spacious',
      surface: 'flat',
      motion: 'calm',
      header: 'static',
    },
  },
] as const satisfies ReadonlyArray<{
  id: string
  label: string
  description: string
  settings: ThemeSettings
}>

function settingsEqual(left: ThemeSettings, right: ThemeSettings) {
  return (
    left.palette === right.palette &&
    left.density === right.density &&
    left.surface === right.surface &&
    left.motion === right.motion &&
    left.header === right.header
  )
}

function findMatchingPreset(settings: ThemeSettings) {
  return THEME_PRESETS.find((preset) => settingsEqual(preset.settings, settings))
}

function humanizeSetting(value: string) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function buildSummaryFields(settings: ThemeSettings) {
  const matchedPreset = findMatchingPreset(settings)
  return [
    { label: 'Preset', value: matchedPreset?.label ?? 'Custom' },
    { label: 'Palette', value: settings.palette },
    { label: 'Density', value: settings.density },
    { label: 'Surface', value: settings.surface },
    { label: 'Motion', value: settings.motion },
    { label: 'Header', value: settings.header },
  ]
}

function buildPresetFields(settings: ThemeSettings) {
  const matchedPreset = findMatchingPreset(settings)
  return THEME_PRESETS.map((preset) => ({
    label: preset.label,
    value: matchedPreset?.id === preset.id ? `${preset.description} Active now.` : preset.description,
  }))
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
    {
      label: 'Header Effect',
      value:
        settings.header === 'static'
          ? 'Header scrolls away with the page'
          : settings.header === 'compact'
            ? 'Sticky header with reduced height'
            : 'Sticky header with the full brand treatment',
    },
  ]
}

function buildPresetActionRows(settings: ThemeSettings) {
  return [
    THEME_PRESETS.slice(0, 3),
    THEME_PRESETS.slice(3),
  ].map((row) => ({
    type: 'actions',
    elements: row.map((preset) => ({
      type: 'button',
      label: preset.label,
      action_id: `${APPLY_PRESET_ACTION_PREFIX}${preset.id}`,
      style: findMatchingPreset(settings)?.id === preset.id ? 'primary' : undefined,
    })),
  }))
}

function buildThemeFormBlockId(settings: ThemeSettings) {
  return [
    'theme_settings',
    settings.palette,
    settings.density,
    settings.surface,
    settings.motion,
    settings.header,
  ].join(':')
}

function buildThemeFieldActionId(field: keyof ThemeSettings, settings: ThemeSettings) {
  return `${field}:${buildThemeFormBlockId(settings)}`
}

function readInteractionValue(values: Record<string, unknown> | undefined, fallback: any, field: keyof ThemeSettings) {
  if (values && typeof values === 'object') {
    const direct = values[field]
    if (direct !== undefined) {
      return direct
    }

    const prefix = `${field}:`
    const dynamicEntry = Object.entries(values).find(([key]) => key.startsWith(prefix))
    if (dynamicEntry) {
      return dynamicEntry[1]
    }
  }

  return fallback?.[field]
}

function buildSettingsBlocks(settings: ThemeSettings) {
  const currentPreset = findMatchingPreset(settings)
  const preview = PALETTE_PREVIEWS[settings.palette]
  return [
    { type: 'header', text: 'Property Theme' },
    {
      type: 'context',
      text: 'Shape the property browsing experience with palette, spacing, surface, motion, and header controls. Use a preset when you want a coherent direction quickly, then fine-tune below if needed.',
    },
    {
      type: 'fields',
      fields: buildSummaryFields(settings),
    },
    {
      type: 'section',
      text: currentPreset
        ? `Current direction: *${currentPreset.label}*. ${currentPreset.description}`
        : `Current direction: *Custom*. Built from ${humanizeSetting(settings.palette)} palette, ${humanizeSetting(settings.density)} density, ${humanizeSetting(settings.surface)} surfaces, ${humanizeSetting(settings.motion)} motion, and a ${humanizeSetting(settings.header)} header.`,
      accessory: {
        type: 'button',
        label: 'Reset to Default',
        action_id: RESET_THEME_ACTION_ID,
      },
    },
    {
      type: 'section',
      text: 'Quick presets',
    },
    ...buildPresetActionRows(settings),
    {
      type: 'fields',
      fields: buildPresetFields(settings),
    },
    {
      type: 'image',
      url: buildThemePreviewDataUrl(settings),
      alt: `${preview.title} theme preview`,
      title: 'Theme Preview',
    },
    {
      type: 'section',
      text: `${preview.title} sets the overall mood. The controls below tune spacing, edge treatment, interaction energy, and header behavior without forcing a full redesign.`,
    },
    {
      type: 'fields',
      fields: buildEffectFields(settings),
    },
    {
      type: 'form',
      block_id: buildThemeFormBlockId(settings),
      fields: [
        {
          type: 'select',
          action_id: buildThemeFieldActionId('palette', settings),
          label: 'Palette',
          initial_value: settings.palette,
          options: PALETTE_OPTIONS,
        },
        {
          type: 'select',
          action_id: buildThemeFieldActionId('density', settings),
          label: 'Density',
          initial_value: settings.density,
          options: DENSITY_OPTIONS,
        },
        {
          type: 'select',
          action_id: buildThemeFieldActionId('surface', settings),
          label: 'Surface Style',
          initial_value: settings.surface,
          options: SURFACE_OPTIONS,
        },
        {
          type: 'select',
          action_id: buildThemeFieldActionId('motion', settings),
          label: 'Interaction Tone',
          initial_value: settings.motion,
          options: MOTION_OPTIONS,
        },
        {
          type: 'select',
          action_id: buildThemeFieldActionId('header', settings),
          label: 'Header Behavior',
          initial_value: settings.header,
          options: HEADER_OPTIONS,
        },
      ],
      submit: { label: 'Save Theme Settings', action_id: 'save_theme' },
    },
    {
      type: 'context',
      text: 'Use presets to move fast. Use the form when the site needs a custom mix that does not fit one of the preset directions.',
    },
  ]
}

async function readThemeSettings(ctx: any): Promise<ThemeSettings> {
  const [palette, density, surface, motion, header] = (await Promise.all([
    ctx.kv.get(PALETTE_KV_KEY),
    ctx.kv.get(THEME_DENSITY_KV_KEY),
    ctx.kv.get(THEME_SURFACE_KV_KEY),
    ctx.kv.get(THEME_MOTION_KV_KEY),
    ctx.kv.get(THEME_HEADER_KV_KEY),
  ])) as (string | null)[]

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

        if (typeof interaction.action_id === 'string' && interaction.action_id.startsWith(APPLY_PRESET_ACTION_PREFIX)) {
          const presetId = interaction.action_id.slice(APPLY_PRESET_ACTION_PREFIX.length)
          const preset = THEME_PRESETS.find((candidate) => candidate.id === presetId)
          const settings = preset?.settings ?? DEFAULT_THEME_SETTINGS
          await writeThemeSettings(ctx, settings)
          return {
            blocks: buildSettingsBlocks(settings),
            toast: { message: `${preset?.label ?? 'Default'} preset applied.`, type: 'success' },
          }
        }

        if (interaction.action_id === RESET_THEME_ACTION_ID) {
          await writeThemeSettings(ctx, DEFAULT_THEME_SETTINGS)
          return {
            blocks: buildSettingsBlocks(DEFAULT_THEME_SETTINGS),
            toast: { message: 'Theme reset to default.', type: 'success' },
          }
        }

        if (interaction.action_id === 'save_theme') {
          const settings = sanitizeThemeSettings({
            palette: readInteractionValue(interaction.values, interaction.value, 'palette'),
            density: readInteractionValue(interaction.values, interaction.value, 'density'),
            surface: readInteractionValue(interaction.values, interaction.value, 'surface'),
            motion: readInteractionValue(interaction.values, interaction.value, 'motion'),
            header: readInteractionValue(interaction.values, interaction.value, 'header'),
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
