import { describe, it, expect } from 'vitest'
import { formatPropertyDetail } from './detail-formatter'
import property from '../../test/fixtures/property.json'
import type { Property } from './types'

const raw = property as Property

describe('formatPropertyDetail', () => {
  it('extracts address components', () => {
    const detail = formatPropertyDetail(raw)
    expect(detail.city).toBe('Marbella')
    expect(detail.region).toBe('Andalusia')
  })

  it('builds structured address string', () => {
    const detail = formatPropertyDetail(raw)
    expect(detail.fullAddress).toContain('Marbella')
    expect(detail.fullAddress).toContain('Andalusia')
  })

  it('includes coordinates for map', () => {
    const detail = formatPropertyDetail(raw)
    expect(detail.coordinates?.lat).toBe(36.51)
    expect(detail.coordinates?.lng).toBe(-4.88)
  })

  it('returns null coordinates when lat/lng missing', () => {
    const detail = formatPropertyDetail({ ...raw, latitude: null, longitude: null })
    expect(detail.coordinates).toBeNull()
  })

  it('normalises property type label from key', () => {
    const detail = formatPropertyDetail(raw)
    // "propertyTypes.villa" → "Villa"
    expect(detail.propertyTypeLabel).toBe('Villa')
  })

  it('returns all photo URLs in order', () => {
    const detail = formatPropertyDetail({
      ...raw,
      prop_photos: [
        { id: 1, url: 'https://a.com/1.jpg', alt: null, position: 1, variants: {} },
        { id: 2, url: 'https://a.com/2.jpg', alt: null, position: 2, variants: {} },
      ],
    })
    expect(detail.photos).toHaveLength(2)
    expect(detail.photos[0].url).toBe('https://a.com/1.jpg')
  })
})
