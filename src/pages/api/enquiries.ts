import type { APIRoute } from 'astro'
import { createPwbClient } from '../../lib/pwb/client'
import { handleEnquiryRequest } from '../../lib/pwb/enquiry-api'

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  const client = createPwbClient('en')
  return handleEnquiryRequest(request, client)
}
