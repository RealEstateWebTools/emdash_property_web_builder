import type { APIRoute } from 'astro'
import { isPwbConfigured } from '../../lib/backend'
import { createEmDashEnquiryClient } from '../../lib/enquiries/emdash-store'
import { createPwbClient } from '../../lib/pwb/client'
import { handleEnquiryRequest } from '../../lib/pwb/enquiry-api'

export const prerender = false

/** The visitor's address, or null where the adapter can't tell (it throws). */
function clientIp(context: { clientAddress: string }): string | null {
  try {
    return context.clientAddress || null
  } catch {
    return null
  }
}

export const POST: APIRoute = async (context) => {
  const { request, locals, url } = context
  // With PWB, enquiries go to its leads API; without it, into EmDash.
  if (isPwbConfigured()) return handleEnquiryRequest(request, createPwbClient('en'))

  const emdash = locals.emdash
  if (!emdash?.handlePublicPluginApiRoute) {
    return new Response(JSON.stringify({ success: false, message: 'Enquiries are temporarily unavailable.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return handleEnquiryRequest(request, createEmDashEnquiryClient(emdash, url.origin, clientIp(context)))
}
