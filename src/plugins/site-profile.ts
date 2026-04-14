import type { PluginDescriptor } from 'emdash'
import { fileURLToPath } from 'node:url'

export function siteProfilePlugin(): PluginDescriptor {
  return {
    id: 'site-profile',
    version: '1.0.0',
    format: 'standard',
    entrypoint: fileURLToPath(new URL('./site-profile.sandbox.js', import.meta.url)),
    options: {},
    adminPages: [
      { path: '/', label: 'Website', icon: 'settings' },
      { path: '/launch-checklist', label: 'Launch Checklist', icon: 'list' },
      { path: '/settings', label: 'Brand & Office', icon: 'building' },
    ],
  }
}
