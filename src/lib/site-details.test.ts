import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('emdash', () => ({ getSiteSettings: vi.fn() }))

import { getSiteSettings } from 'emdash'
import { fallbackSite } from './pwb/fallback-site'
import { loadSiteDetails, siteDetailsFromSettings } from './site-details'

const mockedSettings = vi.mocked(getSiteSettings)

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  mockedSettings.mockResolvedValue({
    title: 'Harbour Homes',
    tagline: 'Coastal property specialists',
    logo: { mediaId: 'm1', url: '/_emdash/api/media/file/logo.png' },
    social: { twitter: '@harbourhomes' },
  } as never)
})

describe('siteDetailsFromSettings', () => {
  it('maps EmDash settings onto the layout shape', () => {
    expect(
      siteDetailsFromSettings({ title: 'Harbour Homes', tagline: 'Coastal', logo: { mediaId: 'm', url: '/logo.png' } }),
    ).toMatchObject({
      title: 'Harbour Homes',
      company_display_name: 'Harbour Homes',
      meta_description: 'Coastal',
      logo_url: '/logo.png',
    })
  })

  it('falls back to defaults for missing settings', () => {
    expect(siteDetailsFromSettings(null)).toMatchObject({ title: fallbackSite.title, logo_url: null, twitter: {} })
  })
})

describe('loadSiteDetails', () => {
  it('uses EmDash settings when PWB is not configured, without calling PWB', async () => {
    vi.stubEnv('PWB_API_URL', '')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const site = await loadSiteDetails('en')

    expect(site.title).toBe('Harbour Homes')
    expect(site.twitter).toEqual({ site: '@harbourhomes' })
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('uses PWB site details when PWB is configured', async () => {
    vi.stubEnv('PWB_API_URL', 'http://localhost:3001') // msw fixture server
    const site = await loadSiteDetails('en')
    expect(site.title).not.toBe('Harbour Homes')
    expect(mockedSettings).not.toHaveBeenCalled()
  })

  it('falls back to EmDash settings (not a hard-coded brand) when PWB fails', async () => {
    vi.stubEnv('PWB_API_URL', 'http://localhost:3001')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('down'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect((await loadSiteDetails('en')).title).toBe('Harbour Homes')

    fetchSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('uses the built-in fallback when both are unavailable', async () => {
    vi.stubEnv('PWB_API_URL', '')
    mockedSettings.mockRejectedValue(new Error('no db'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await loadSiteDetails('en')).toEqual(fallbackSite)
    errorSpy.mockRestore()
  })
})
