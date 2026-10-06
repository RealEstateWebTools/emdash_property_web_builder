/**
 * Defaults for a new `properties` entry, applied by the property-listings
 * plugin's content:beforeSave hook.
 *
 * EmDash only applies a field's `defaultValue` to required fields; the admin
 * leaves an untouched optional field out of the saved data. Without this a
 * listing created in the admin has no for_sale, currency or area unit, and
 * its toggles never reflect how the site treats it. Values mirror the field
 * defaults in seed/seed.json (a test keeps them in step).
 */
export const NEW_LISTING_DEFAULTS = {
  for_rent: false,
  highlighted: false,
  currency: 'EUR',
  area_unit: 'sqm',
} as const

function unset(value: unknown): boolean {
  return value == null || (typeof value === 'string' && value.trim() === '')
}

/** Fill unset defaults. A listing marked for rent isn't for sale unless the editor says so. */
export function withNewListingDefaults(data: Record<string, unknown>): Record<string, unknown> {
  const out = { ...data }
  for (const [field, value] of Object.entries(NEW_LISTING_DEFAULTS)) {
    if (unset(out[field])) out[field] = value
  }
  if (unset(out.for_sale)) out.for_sale = !out.for_rent
  return out
}
