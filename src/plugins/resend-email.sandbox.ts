import { definePlugin } from 'emdash'

const API_KEY_KV = 'settings:api_key'
const FROM_ADDRESS_KV = 'settings:from_address'

function buildSettingsBlocks(fromAddress: string, hasApiKey: boolean) {
  return [
    { type: 'header', text: 'Resend Email' },
    {
      type: 'context',
      text: 'Configure your Resend API key to enable transactional email (magic links, invites, comment notifications).',
    },
    {
      type: 'form',
      block_id: 'resend_settings',
      fields: [
        {
          type: 'string',
          action_id: 'api_key',
          label: 'API Key',
          placeholder: hasApiKey ? '(saved — paste to replace)' : 're_••••••••',
          description: 'Your Resend API key from resend.com/api-keys',
        },
        {
          type: 'string',
          action_id: 'from_address',
          label: 'From address',
          initial_value: fromAddress,
          placeholder: 'noreply@yourdomain.com',
          description: 'Must be a verified sender in Resend.',
        },
      ],
      submit: { label: 'Save', action_id: 'save_settings' },
    },
    ...(hasApiKey
      ? [{ type: 'context', text: '✓ API key is configured. Use Settings > Email to send a test.' }]
      : [{ type: 'context', text: '⚠ No API key saved yet — email delivery is not active.' }]),
  ]
}

export default definePlugin({
  hooks: {
    'plugin:install': {
      handler: async (_event: any, ctx: any) => {
        await ctx.kv.set(FROM_ADDRESS_KV, '')
        ctx.log.info('Resend email plugin installed')
      },
    },

    'email:deliver': {
      handler: async (event: any, ctx: any) => {
        const apiKey = await ctx.kv.get<string>(API_KEY_KV)
        const fromAddress = await ctx.kv.get<string>(FROM_ADDRESS_KV)

        if (!apiKey) {
          throw new Error('Resend API key is not configured. Go to Plugins > Resend Email > Settings.')
        }
        if (!fromAddress) {
          throw new Error('Resend "from" address is not configured. Go to Plugins > Resend Email > Settings.')
        }

        const { message } = event

        const body: Record<string, unknown> = {
          from: fromAddress,
          to: [message.to],
          subject: message.subject,
          text: message.text,
        }
        if (message.html) {
          body.html = message.html
        }

        const response = await ctx.http.fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const text = await response.text()
          throw new Error(`Resend API error ${response.status}: ${text}`)
        }

        ctx.log.info(`Email delivered via Resend to ${message.to}`)
      },
    },
  },

  routes: {
    admin: {
      handler: async (routeCtx: any, ctx: any) => {
        const interaction = routeCtx.input ?? {}

        if (interaction.action_id === 'save_settings') {
          const values = interaction.values ?? {}
          const rawKey: string = values.api_key ?? ''
          const rawFrom: string = values.from_address ?? ''

          if (rawKey.trim()) {
            await ctx.kv.set(API_KEY_KV, rawKey.trim())
          }
          if (rawFrom.trim()) {
            await ctx.kv.set(FROM_ADDRESS_KV, rawFrom.trim())
          }

          const hasApiKey = !!(await ctx.kv.get<string>(API_KEY_KV))
          const fromAddress = (await ctx.kv.get<string>(FROM_ADDRESS_KV)) ?? ''

          return {
            blocks: buildSettingsBlocks(fromAddress, hasApiKey),
            toast: { message: 'Settings saved.', type: 'success' },
          }
        }

        const hasApiKey = !!(await ctx.kv.get<string>(API_KEY_KV))
        const fromAddress = (await ctx.kv.get<string>(FROM_ADDRESS_KV)) ?? ''

        return { blocks: buildSettingsBlocks(fromAddress, hasApiKey) }
      },
    },
  },
})
