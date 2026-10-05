import { PluginRouteError } from 'emdash'
import type { SandboxedPlugin } from 'emdash/plugin'
import {
  buildLeadReportBlocks,
  type LeadEvent,
  rangeStart,
  sanitizeLeadEvent,
  sanitizeReportRange,
  summarizeLeadEvents,
} from '../lib/lead-reports.js'

/** Upper bound on events read for one report (90 days on a busy site). */
const MAX_REPORT_EVENTS = 20_000

/**
 * Routes:
 *   POST /_emdash/api/plugins/lead-reports/track  (public) — record one event
 *   POST /_emdash/api/plugins/lead-reports/admin  (Block Kit admin page)
 */
export default {
  routes: {
    track: {
      public: true,
      handler: async (routeCtx, ctx) => {
        const event = sanitizeLeadEvent(routeCtx.input)
        if (!event) {
          throw PluginRouteError.badRequest('invalid event')
        }
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
        await ctx.storage.events.put(id, event)
        return { ok: true }
      },
    },

    admin: {
      handler: async (routeCtx, ctx) => {
        const interaction = (routeCtx.input ?? {}) as { action_id?: string; value?: unknown }
        const days = interaction.action_id === 'set_range' ? sanitizeReportRange(interaction.value) : 30

        const events: LeadEvent[] = []
        let cursor: string | undefined
        do {
          const page = await ctx.storage.events.query({
            where: { createdAt: { gte: rangeStart(days) } },
            orderBy: { createdAt: 'asc' },
            limit: 500,
            cursor,
          })
          for (const item of page.items) events.push(item.data as LeadEvent)
          cursor = page.hasMore ? page.cursor : undefined
        } while (cursor && events.length < MAX_REPORT_EVENTS)

        return { blocks: buildLeadReportBlocks(summarizeLeadEvents(events, days)) }
      },
    },
  },
} satisfies SandboxedPlugin
