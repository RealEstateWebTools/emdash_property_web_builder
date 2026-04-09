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
export const THEME_DENSITY_KV_KEY = 'settings:density'
export const THEME_SURFACE_KV_KEY = 'settings:surface'
export const THEME_MOTION_KV_KEY = 'settings:motion'
export const THEME_HEADER_KV_KEY = 'settings:header'

export const VALID_THEME_DENSITIES = ['comfortable', 'compact', 'spacious'] as const
export const VALID_THEME_SURFACES = ['soft', 'sharp', 'flat'] as const
export const VALID_THEME_MOTIONS = ['calm', 'standard', 'expressive'] as const
export const VALID_THEME_HEADERS = ['sticky', 'static', 'compact'] as const

export type ThemeDensity = typeof VALID_THEME_DENSITIES[number]
export type ThemeSurface = typeof VALID_THEME_SURFACES[number]
export type ThemeMotion = typeof VALID_THEME_MOTIONS[number]
export type ThemeHeader = typeof VALID_THEME_HEADERS[number]

export interface ThemeSettings {
  palette: Palette
  density: ThemeDensity
  surface: ThemeSurface
  motion: ThemeMotion
  header: ThemeHeader
}

export interface PalettePreview {
  title: string
  mood: string
  accent: string
  surface: string
  text: string
  samplePrice: string
}

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  palette: 'default',
  density: 'comfortable',
  surface: 'soft',
  motion: 'standard',
  header: 'sticky',
}

export const THEME_SETTING_KEYS = {
  palette: PALETTE_KV_KEY,
  density: THEME_DENSITY_KV_KEY,
  surface: THEME_SURFACE_KV_KEY,
  motion: THEME_MOTION_KV_KEY,
  header: THEME_HEADER_KV_KEY,
} as const

export const PALETTE_PREVIEWS: Record<Palette, PalettePreview> = {
  default: {
    title: 'Default',
    mood: 'Balanced, editorial, and neutral.',
    accent: '#1a4f8a',
    surface: '#ffffff',
    text: '#1a1a2e',
    samplePrice: 'EUR1.25M',
  },
  coastal: {
    title: 'Coastal',
    mood: 'Bright, relaxed, and sea-facing.',
    accent: '#1d6fa5',
    surface: '#f4fbff',
    text: '#173042',
    samplePrice: 'EUR2.10M',
  },
  countryside: {
    title: 'Countryside',
    mood: 'Organic, soft, and grounded.',
    accent: '#6d7b4f',
    surface: '#f7f4ec',
    text: '#2f3627',
    samplePrice: 'EUR890K',
  },
  luxury: {
    title: 'Luxury',
    mood: 'Dark, polished, and high-contrast.',
    accent: '#c9a84c',
    surface: '#0f0e0c',
    text: '#f0ebe2',
    samplePrice: 'EUR4.80M',
  },
  mediterranean: {
    title: 'Mediterranean',
    mood: 'Warm, sunlit, and textured.',
    accent: '#b84a2a',
    surface: '#fdf8f2',
    text: '#2c1f0e',
    samplePrice: 'EUR1.75M',
  },
  nordic: {
    title: 'Nordic',
    mood: 'Minimal, cool, and airy.',
    accent: '#2f5b7c',
    surface: '#f8fbfc',
    text: '#17212b',
    samplePrice: 'EUR960K',
  },
  urban: {
    title: 'Urban',
    mood: 'Crisp, modern, and metropolitan.',
    accent: '#4f46e5',
    surface: '#f5f7fb',
    text: '#18202c',
    samplePrice: 'EUR1.48M',
  },
}

function isAllowedValue<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && allowed.includes(value as T)
}

export function sanitizeThemeSettings(input: Partial<Record<keyof ThemeSettings, unknown>>): ThemeSettings {
  return {
    palette: isAllowedValue(input.palette, VALID_PALETTES) ? input.palette : DEFAULT_THEME_SETTINGS.palette,
    density: isAllowedValue(input.density, VALID_THEME_DENSITIES) ? input.density : DEFAULT_THEME_SETTINGS.density,
    surface: isAllowedValue(input.surface, VALID_THEME_SURFACES) ? input.surface : DEFAULT_THEME_SETTINGS.surface,
    motion: isAllowedValue(input.motion, VALID_THEME_MOTIONS) ? input.motion : DEFAULT_THEME_SETTINGS.motion,
    header: isAllowedValue(input.header, VALID_THEME_HEADERS) ? input.header : DEFAULT_THEME_SETTINGS.header,
  }
}

export function buildThemeStyleOverrides(settings: ThemeSettings): string {
  const variables: Record<string, string> = {}

  if (settings.density === 'compact') {
    variables['--spacing-page'] = '1rem'
    variables['--grid-gap'] = '1rem'
    variables['--grid-padding'] = '1rem'
    variables['--card-body-padding'] = '0.85rem'
    variables['--detail-specs-gap'] = '1rem'
  } else if (settings.density === 'spacious') {
    variables['--spacing-page'] = '2rem'
    variables['--grid-gap'] = '2rem'
    variables['--grid-padding'] = '2rem'
    variables['--card-body-padding'] = '1.35rem'
    variables['--detail-specs-gap'] = '2rem'
  }

  if (settings.surface === 'sharp') {
    variables['--radius-sm'] = '0px'
    variables['--radius-md'] = '0px'
    variables['--radius-lg'] = '0px'
  } else if (settings.surface === 'flat') {
    variables['--radius-sm'] = '2px'
    variables['--radius-md'] = '4px'
    variables['--radius-lg'] = '8px'
    variables['--shadow-card'] = '0 0 0 rgba(0,0,0,0)'
    variables['--shadow-hover'] = '0 0 0 rgba(0,0,0,0)'
  }

  if (settings.motion === 'calm') {
    variables['--card-hover-lift'] = '0px'
    variables['--shadow-hover'] = 'var(--shadow-card)'
  } else if (settings.motion === 'expressive') {
    variables['--card-hover-lift'] = '-6px'
    variables['--shadow-hover'] = '0 16px 36px rgba(0,0,0,0.18)'
  }

  if (settings.header === 'static') {
    variables['--header-position'] = 'static'
    variables['--header-padding-y'] = '1rem'
  } else if (settings.header === 'compact') {
    variables['--header-position'] = 'sticky'
    variables['--header-padding-y'] = '0.45rem'
    variables['--header-logo-size'] = '1rem'
  }

  const entries = Object.entries(variables)
  if (entries.length === 0) {
    return ''
  }

  return `:root {\n${entries.map(([name, value]) => `  ${name}: ${value};`).join('\n')}\n}`
}

function encodeSvg(value: string): string {
  return value
    .replace(/%/g, '%25')
    .replace(/#/g, '%23')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')
    .replace(/"/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildThemePreviewDataUrl(settings: ThemeSettings): string {
  const preview = PALETTE_PREVIEWS[settings.palette]
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720" role="img" aria-label="${preview.title} theme preview">
      <rect width="1200" height="720" rx="32" fill="${preview.surface}" />
      <rect x="40" y="40" width="1120" height="640" rx="28" fill="${preview.surface}" stroke="${preview.accent}" stroke-width="3" />
      <text x="84" y="112" font-family="Arial, sans-serif" font-size="44" font-weight="700" fill="${preview.text}">${preview.title}</text>
      <text x="84" y="152" font-family="Arial, sans-serif" font-size="24" fill="${preview.text}" opacity="0.78">${preview.mood}</text>
      <rect x="84" y="204" width="330" height="320" rx="${settings.surface === 'sharp' ? 0 : settings.surface === 'flat' ? 10 : 18}" fill="${preview.accent}" opacity="0.18" />
      <rect x="84" y="204" width="330" height="320" rx="${settings.surface === 'sharp' ? 0 : settings.surface === 'flat' ? 10 : 18}" fill="${preview.accent}" opacity="0.52" />
      <rect x="454" y="204" width="622" height="320" rx="${settings.surface === 'sharp' ? 0 : settings.surface === 'flat' ? 10 : 18}" fill="${preview.surface}" stroke="${preview.accent}" stroke-width="2" />
      <text x="498" y="270" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="${preview.text}">${preview.samplePrice}</text>
      <text x="498" y="322" font-family="Arial, sans-serif" font-size="34" font-weight="600" fill="${preview.text}">Harbour Villa Residence</text>
      <text x="498" y="366" font-family="Arial, sans-serif" font-size="22" fill="${preview.text}" opacity="0.76">4 bed  •  3 bath  •  Sea views  •  New listing</text>
      <rect x="498" y="408" width="160" height="44" rx="${settings.surface === 'sharp' ? 0 : 12}" fill="${preview.accent}" />
      <text x="578" y="437" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${preview.surface}">View Property</text>
      <text x="84" y="594" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="${preview.text}">Current Settings</text>
      <text x="84" y="632" font-family="Arial, sans-serif" font-size="18" fill="${preview.text}" opacity="0.82">Density: ${settings.density}   |   Surface: ${settings.surface}   |   Motion: ${settings.motion}   |   Header: ${settings.header}</text>
    </svg>
  `

  return `data:image/svg+xml;charset=utf-8,${encodeSvg(svg)}`
}

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
