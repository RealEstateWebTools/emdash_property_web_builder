import { definePlugin } from 'emdash'
import type { PluginDescriptor, ResolvedPlugin } from 'emdash'
import { fileURLToPath } from 'node:url'

export const VALID_PALETTES = [
  'default',
  'coastal',
  'countryside',
  'luxury',
  'mediterranean',
  'nordic',
  'urban',
] as const

export type Palette = typeof VALID_PALETTES[number]

/** Key used to store the palette choice in plugin KV (prefix: `plugin:pwb-theme:`) */
export const PALETTE_KV_KEY = 'settings:palette'

/**
 * Factory for use in astro.config.mjs.
 * Returns a PluginDescriptor — emdash's virtual module imports `createPlugin`
 * from this file at runtime.
 */
export function pwbThemePlugin(): PluginDescriptor {
  return {
    id: 'pwb-theme',
    // Points back to this file so emdash can import createPlugin at runtime
    entrypoint: fileURLToPath(import.meta.url),
    version: '1.0.0',
  }
}

/**
 * Called at runtime by the virtual:emdash/plugins module.
 * Returns the fully-resolved plugin with hooks, routes, and admin schema.
 */
export function createPlugin(): ResolvedPlugin {
  return definePlugin({
    id: 'pwb-theme',
    version: '1.0.0',

    admin: {
      settingsSchema: {
        palette: {
          type: 'select',
          label: 'Property Theme',
          description: 'Visual style applied to property listings',
          options: [
            { value: 'default',       label: 'Default — Standard layout' },
            { value: 'coastal',       label: 'Coastal — Ocean blues, 3-col grid' },
            { value: 'countryside',   label: 'Countryside — Sage green, warm stone' },
            { value: 'luxury',        label: 'Luxury — Dark charcoal, warm gold' },
            { value: 'mediterranean', label: 'Mediterranean — Terracotta, portrait cards' },
            { value: 'nordic',        label: 'Nordic — Ultra-minimal, 4-col grid' },
            { value: 'urban',         label: 'Urban — Cool slate, indigo accent' },
          ],
          default: 'default',
        },
      },
    },

    hooks: {
      'plugin:install': async (_event, ctx) => {
        await ctx.kv.set(PALETTE_KV_KEY, 'default')
      },
    },

    routes: {
      // Public route — returns the current palette for server-side reading
      palette: {
        handler: async (ctx) => {
          const raw = await ctx.kv.get<string>(PALETTE_KV_KEY)
          const palette: Palette = (VALID_PALETTES as readonly string[]).includes(raw ?? '')
            ? (raw as Palette)
            : 'default'
          return { palette }
        },
      },
    },
  }) as ResolvedPlugin
}

export default createPlugin
