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
      { path: '/', label: 'Launch Checklist', icon: 'list' },
      { path: '/settings', label: 'Site Profile', icon: 'building' },
    ],
  }
}
