import { describe, expect, it } from 'vitest'
import plugin from './property-listings.sandbox'

const beforeSave = plugin.hooks['content:beforeSave'].handler

describe('property-listings content:beforeSave', () => {
  it('fills defaults on a new listing', async () => {
    const result = await beforeSave({ collection: 'properties', isNew: true, content: { title: 'Studio', for_rent: true } })
    expect(result).toMatchObject({ title: 'Studio', for_sale: false, for_rent: true, currency: 'EUR' })
  })

  it('leaves updates alone, which may carry only the changed fields', async () => {
    expect(await beforeSave({ collection: 'properties', isNew: false, content: { title: 'Renamed' } })).toBeUndefined()
  })

  it('ignores other collections', async () => {
    expect(await beforeSave({ collection: 'posts', isNew: true, content: { title: 'Hello' } })).toBeUndefined()
  })
})
