import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(resolve(process.cwd(), 'src/components/SearchBar.astro'), 'utf8')

describe('SearchBar selected-state conventions', () => {
  it('shows selected property type', () => {
    expect(source).toContain('selected={currentParams.property_type === pt.key}')
  })

  it('shows selected bedrooms', () => {
    expect(source).toContain('selected={currentParams.bedrooms_from === String(b)}')
  })

  it('shows selected minimum price', () => {
    expect(source).toContain('selected={selectedPriceFrom === String(p)}')
  })

  it('shows selected maximum price', () => {
    expect(source).toContain('selected={selectedPriceTo === String(p)}')
  })

  it('shows selected sort option', () => {
    expect(source).toContain('selected={currentParams.sort_by === s.value}')
  })
})
