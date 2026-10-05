import type { PluginDescriptor } from 'emdash'
import { fileURLToPath } from 'node:url'

/**
 * Lead & CTA reporting baseline: records CTA clicks and successful enquiries
 * (no personal data) and reports them in the admin. See src/lib/lead-reports.ts.
 * Also emails the office about enquiries stored in EmDash when there's no PWB.
 */
export function leadReportsPlugin(): PluginDescriptor {
  return {
    id: 'lead-reports',
    version: '1.0.0',
    format: 'standard',
    entrypoint: fileURLToPath(new URL('./lead-reports.sandbox.js', import.meta.url)),
    options: {},
    // Stores enquiries in EmDash and emails the office (sites without PWB).
    capabilities: ['content:read', 'content:write', 'email:send'],
    storage: {
      events: {
        indexes: ['kind', 'createdAt'],
      },
    },
    adminPages: [{ path: '/', label: 'Leads & CTAs', icon: 'chart-column' }],
  }
}
