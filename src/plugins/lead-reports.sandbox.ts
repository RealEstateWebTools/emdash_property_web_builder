import { getPluginSetting, PluginRouteError } from 'emdash'
import type { SandboxedPlugin } from 'emdash/plugin'
import {
  buildLeadReportBlocks,
  type LeadEvent,
  rangeStart,
  sanitizeLeadEvent,
  sanitizeReportRange,
  summarizeLeadEvents,
} from '../lib/lead-reports.js'
import { ENQUIRIES_COLLECTION, sanitizeStoredEnquiry } from '../lib/enquiries/emdash-store.js'
import { buildEnquiryNotification } from '../lib/enquiries/notification.js'
import { consumeRateLimit, RATE_LIMITS, type RateLimitRule } from '../lib/rate-limit.js'

/** Upper bound on events read for one report (90 days on a busy site). */
const MAX_REPORT_EVENTS = 20_000

/** Throws a 429 when this client has used up the route's allowance. */
async function throttle(routeCtx: { requestMeta?: unknown }, ctx: { storage: Record<string, unknown> }, rule: RateLimitRule) {
  // Typed `unknown` for sandboxed plugins; EmDash fills in { ip, userAgent, ... }.
  const ip = (routeCtx.requestMeta as { ip?: unknown } | undefined)?.ip
  const store = ctx.storage.rate_limits as Parameters<typeof consumeRateLimit>[0]
  if (!(await consumeRateLimit(store, typeof ip === 'string' ? ip : null, rule))) {
    throw new PluginRouteError('RATE_LIMITED', 'Too many requests. Please try again later.', 429)
  }
}

/**
 * Routes:
 *   POST /_emdash/api/plugins/lead-reports/track      (public) — record one event
 *   POST /_emdash/api/plugins/lead-reports/enquiries  (public) — store an enquiry
 *        in EmDash and email the office; used by /api/enquiries when there's no PWB
 *   POST /_emdash/api/plugins/lead-reports/admin      (Block Kit admin page)
 */
export default {
  routes: {
    enquiries: {
      public: true,
      handler: async (routeCtx, ctx) => {
        // Publicly reachable, so throttle and validate here (not only in /api/enquiries).
        await throttle(routeCtx, ctx, RATE_LIMITS.enquiries)
        const enquiry = sanitizeStoredEnquiry(routeCtx.input)
        if (!enquiry) throw PluginRouteError.badRequest('invalid enquiry')
        if (!ctx.content?.create) throw PluginRouteError.internal('content write access unavailable')

        // content.create makes an unpublished draft: never public.
        await ctx.content.create(ENQUIRIES_COLLECTION, { ...enquiry })

        // Notify the office. A missing provider or address doesn't fail the
        // enquiry — it's stored either way.
        try {
          const message = buildEnquiryNotification({ ...enquiry }, await getPluginSetting('site-profile', 'office_email'))
          if (!ctx.email) ctx.log.warn('lead-reports: no email provider configured; enquiry stored without notification')
          else if (!message) ctx.log.warn('lead-reports: no valid office email in Website settings; enquiry stored without notification')
          else await ctx.email.send(message)
        } catch (err) {
          ctx.log.error('lead-reports: enquiry notification failed', { error: String(err) })
        }
        return { ok: true }
      },
    },

    track: {
      public: true,
      handler: async (routeCtx, ctx) => {
        await throttle(routeCtx, ctx, RATE_LIMITS.track)
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
