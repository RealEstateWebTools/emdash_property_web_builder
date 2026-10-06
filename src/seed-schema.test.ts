/**
 * Schema checks `emdash seed --validate` doesn't make.
 *
 * The admin renders a repeater's rows from `validation.subFields`. A repeater
 * declared with `fields` instead passes validation and seeds fine, but every
 * row is an empty box in the admin — nothing can be edited.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const SEED_FILES = ['seed/seed.json', 'seed/profiles/minimal.json', 'seed/profiles/pre-launch.json']

// EmDash 1.1 repeaterSubFieldSchema
const SUB_FIELD_TYPES = ['string', 'text', 'url', 'number', 'integer', 'boolean', 'datetime', 'select', 'image']

interface SeedField {
  slug: string
  type: string
  fields?: unknown
  validation?: { subFields?: { slug: string; type: string }[] }
}

function repeaters(file: string): [string, SeedField][] {
  const seed = JSON.parse(readFileSync(file, 'utf8')) as { collections?: { slug: string; fields: SeedField[] }[] }
  return (seed.collections ?? []).flatMap((collection) =>
    collection.fields
      .filter((field) => field.type === 'repeater')
      .map((field): [string, SeedField] => [`${collection.slug}.${field.slug}`, field]),
  )
}

describe.each(SEED_FILES)('%s repeaters', (file) => {
  it('declare their sub-fields in validation.subFields', () => {
    const found = repeaters(file)
    expect(found.length).toBeGreaterThan(0)
    for (const [name, field] of found) {
      expect(field.fields, `${name} uses "fields"`).toBeUndefined()
      const subFields = field.validation?.subFields ?? []
      expect(subFields.length, `${name} has no sub-fields`).toBeGreaterThan(0)
      for (const sub of subFields) expect(SUB_FIELD_TYPES, `${name}.${sub.slug}`).toContain(sub.type)
    }
  })
})
