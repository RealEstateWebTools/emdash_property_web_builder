import { describe, expect, it } from 'vitest'

import { buildSiteLaunchChecklist } from './site-launch-checklist'

describe('buildSiteLaunchChecklist', () => {
  it('marks all launch items as ready when the site is configured', () => {
    const result = buildSiteLaunchChecklist({
      siteTitle: 'Demo Realty',
      hasLogo: true,
      brandName: 'Demo Realty',
      officeAddress: '127 Harbour Street, East Brunswick, NJ 08816',
      officePhone: '(732) 555-0148',
      officeEmail: 'hello@demorealty.com',
      homepageTitle: 'Find your next move',
      homepageContentText: 'Curated homes and rentals across the local market.',
      primaryMenuItemCount: 4,
      hasPersistedThemeSettings: true,
      themeSettings: {
        palette: 'coastal',
        density: 'spacious',
        surface: 'soft',
        motion: 'calm',
        header: 'sticky',
      },
      propertyApiUrl: 'https://example.com',
      propertyConnectionHealthy: true,
      propertyConnectionLabel: 'Connected to Demo Realty inventory.',
    })

    expect(result.readyCount).toBe(result.totalCount)
    expect(result.items.every((item) => item.status === 'ready')).toBe(true)
  })

  it('flags missing setup items with actionable status', () => {
    const result = buildSiteLaunchChecklist({
      siteTitle: '',
      brandName: '',
      officeAddress: '127 Harbour Street',
      officePhone: '',
      officeEmail: '',
      homepageTitle: 'Welcome',
      homepageContentText: '',
      primaryMenuItemCount: 0,
      hasPersistedThemeSettings: false,
      propertyApiUrl: 'https://example.com',
      propertyConnectionHealthy: false,
    })

    expect(result.readyCount).toBe(0)
    expect(result.items.find((item) => item.id === 'brand')?.status).toBe('attention')
    expect(result.items.find((item) => item.id === 'office')?.status).toBe('attention')
    expect(result.items.find((item) => item.id === 'homepage')?.status).toBe('attention')
    expect(result.items.find((item) => item.id === 'menu')?.status).toBe('attention')
    expect(result.items.find((item) => item.id === 'theme')?.status).toBe('attention')
    expect(result.items.find((item) => item.id === 'properties')?.summary).toContain('connection check failed')
  })
})
