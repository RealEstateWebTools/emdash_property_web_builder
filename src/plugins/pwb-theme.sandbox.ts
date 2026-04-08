import { definePlugin } from 'emdash'

const VALID_PALETTES = [
  'default',
  'coastal',
  'countryside',
  'luxury',
  'mediterranean',
  'nordic',
  'urban',
] as const

const PALETTE_KV_KEY = 'settings:palette'

const PALETTE_OPTIONS = [
  { value: 'default',       label: 'Default — Standard layout' },
  { value: 'coastal',       label: 'Coastal — Ocean blues, 3-col grid' },
  { value: 'countryside',   label: 'Countryside — Sage green, warm stone' },
  { value: 'luxury',        label: 'Luxury — Dark charcoal, warm gold' },
  { value: 'mediterranean', label: 'Mediterranean — Terracotta, portrait cards' },
  { value: 'nordic',        label: 'Nordic — Ultra-minimal, 4-col grid' },
  { value: 'urban',         label: 'Urban — Cool slate, indigo accent' },
]

function buildSettingsBlocks(current: string) {
  return [
    { type: 'header', text: 'Property Theme' },
    { type: 'context', text: 'Choose the visual palette applied to property listings.' },
    {
      type: 'form',
      block_id: 'theme_settings',
      fields: [
        {
          type: 'select',
          action_id: 'palette',
          label: 'Palette',
          initial_value: current,
          options: PALETTE_OPTIONS,
        },
      ],
      submit: { label: 'Save', action_id: 'save_palette' },
    },
  ]
}

export default definePlugin({
  hooks: {
    'plugin:install': {
      handler: async (_event: any, ctx: any) => {
        await ctx.kv.set(PALETTE_KV_KEY, 'default')
      },
    },
  },

  routes: {
    admin: {
      handler: async (routeCtx: any, ctx: any) => {
        const interaction = routeCtx.input ?? {}

        if (interaction.action_id === 'save_palette') {
          const raw = interaction.values?.palette ?? interaction.value?.palette ?? 'default'
          const palette = (VALID_PALETTES as readonly string[]).includes(raw) ? raw : 'default'
          await ctx.kv.set(PALETTE_KV_KEY, palette)
          return {
            blocks: buildSettingsBlocks(palette),
            toast: { message: 'Theme saved.', type: 'success' },
          }
        }

        const current = (await ctx.kv.get<string>(PALETTE_KV_KEY)) ?? 'default'
        return { blocks: buildSettingsBlocks(current) }
      },
    },
  },
})
