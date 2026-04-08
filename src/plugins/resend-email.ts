import type { PluginDescriptor } from 'emdash'
import { fileURLToPath } from 'node:url'

export function resendEmailPlugin(): PluginDescriptor {
  return {
    id: 'resend-email',
    version: '1.0.0',
    format: 'standard',
    entrypoint: fileURLToPath(new URL('./resend-email.sandbox.js', import.meta.url)),
    options: {},
    capabilities: ['email:provide', 'network:fetch'],
    allowedHosts: ['api.resend.com'],
    adminPages: [{ path: '/settings', label: 'Resend Email', icon: 'mail' }],
  }
}
