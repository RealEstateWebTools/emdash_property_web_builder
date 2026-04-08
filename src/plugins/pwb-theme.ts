import type { PluginDescriptor } from 'emdash'
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

/** Key used to store the palette choice in plugin KV */
export const PALETTE_KV_KEY = 'settings:palette'

export function pwbThemePlugin(): PluginDescriptor {
  return {
    id: 'pwb-theme',
    version: '1.0.0',
    format: 'standard',
    entrypoint: fileURLToPath(new URL('./pwb-theme.sandbox.js', import.meta.url)),
    options: {},
    adminPages: [{ path: '/settings', label: 'Theme', icon: 'settings' }],
  }
}
