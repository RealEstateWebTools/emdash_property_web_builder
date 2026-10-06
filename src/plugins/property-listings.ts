import type { PluginDescriptor } from 'emdash'
import { fileURLToPath } from 'node:url'

/**
 * Fills defaults on listings created in EmDash (sites without PWB). See
 * src/lib/listings/new-listing-defaults.ts.
 */
export function propertyListingsPlugin(): PluginDescriptor {
  return {
    id: 'property-listings',
    version: '1.0.0',
    format: 'standard',
    entrypoint: fileURLToPath(new URL('./property-listings.sandbox.js', import.meta.url)),
    options: {},
    // content:beforeSave hooks are skipped without content:write.
    capabilities: ['content:write'],
  }
}
