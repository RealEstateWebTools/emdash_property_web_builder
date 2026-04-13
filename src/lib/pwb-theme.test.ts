import { describe, expect, it } from 'vitest'

import themePlugin from '../plugins/pwb-theme.sandbox'
import {
  PALETTE_PREVIEWS,
  DEFAULT_THEME_SETTINGS,
  buildThemePreviewDataUrl,
  buildThemeStyleOverrides,
  sanitizeThemeSettings,
} from '../plugins/pwb-theme'

function createKvStore(initial = new Map<string, string>()) {
  return {
    store: initial,
    async get<T>(key: string): Promise<T | undefined> {
      return this.store.get(key) as T | undefined
    },
    async set(key: string, value: string) {
      this.store.set(key, value)
    },
  }
}

describe('pwb-theme settings helpers', () => {
  it('sanitizes unknown settings back to defaults', () => {
    expect(
      sanitizeThemeSettings({
        palette: 'unknown',
        density: 'tiny',
        surface: 'glass',
        motion: 'wild',
        header: 'floating',
      }),
    ).toEqual(DEFAULT_THEME_SETTINGS)
  })

  it('builds CSS variable overrides for non-default settings', () => {
    expect(
      buildThemeStyleOverrides({
        palette: 'luxury',
        density: 'compact',
        surface: 'flat',
        motion: 'expressive',
        header: 'compact',
      }),
    ).toContain('--grid-gap: 1rem;')

    expect(
      buildThemeStyleOverrides({
        palette: 'luxury',
        density: 'compact',
        surface: 'flat',
        motion: 'expressive',
        header: 'compact',
      }),
    ).toContain('--header-logo-size: 1rem;')
  })

  it('builds an inline preview image for the current theme settings', () => {
    const preview = buildThemePreviewDataUrl({
      palette: 'luxury',
      density: 'compact',
      surface: 'flat',
      motion: 'expressive',
      header: 'compact',
    })

    expect(preview.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true)
    expect(preview).toContain(encodeURIComponent(PALETTE_PREVIEWS.luxury.samplePrice).replace(/%20/g, ' '))
  })
})

describe('pwb-theme admin route', () => {
  it('renders the expanded settings form from stored values', async () => {
    const kv = createKvStore(
      new Map([
        ['settings:palette', 'nordic'],
        ['settings:density', 'spacious'],
        ['settings:surface', 'sharp'],
        ['settings:motion', 'calm'],
        ['settings:header', 'static'],
      ]),
    )

    const result = await themePlugin.routes!.admin.handler({ input: {} }, { kv })

    expect(result.blocks[2].fields).toEqual([
      { label: 'Palette', value: 'nordic' },
      { label: 'Density', value: 'spacious' },
      { label: 'Surface', value: 'sharp' },
      { label: 'Motion', value: 'calm' },
      { label: 'Header', value: 'static' },
    ])
    expect(result.blocks[3].type).toBe('image')
    expect(result.blocks[5].fields).toHaveLength(4)
    expect(result.blocks[6].fields).toHaveLength(5)
  })

  it('persists the expanded settings set on save', async () => {
    const kv = createKvStore()

    const result = await themePlugin.routes!.admin.handler(
      {
        input: {
          action_id: 'save_theme',
          values: {
            palette: 'urban',
            density: 'compact',
            surface: 'flat',
            motion: 'expressive',
            header: 'compact',
          },
        },
      },
      { kv },
    )

    expect(await kv.get('settings:palette')).toBe('urban')
    expect(await kv.get('settings:density')).toBe('compact')
    expect(await kv.get('settings:surface')).toBe('flat')
    expect(await kv.get('settings:motion')).toBe('expressive')
    expect(await kv.get('settings:header')).toBe('compact')
    expect(result.toast).toEqual({ message: 'Theme settings saved.', type: 'success' })
  })
})