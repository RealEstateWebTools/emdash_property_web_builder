/**
 * Enquiry delivery when no PWB backend is configured: each enquiry becomes an
 * unpublished entry in the EmDash `enquiries` collection, where agents read
 * and triage it in the admin, and the office gets an email.
 *
 * Anonymous requests can't write content directly (EmDash gives public
 * requests no database access), so the write happens in the lead-reports
 * plugin's public `enquiries` route, which /api/enquiries calls in-process
 * via `locals.emdash.handlePublicPluginApiRoute`.
 */
import type { EnquiryDetails, EnquirySubmitClient } from '../pwb/enquiry-api'
import { validateEnquiry } from '../pwb/enquiry-validator'
import type { EnquiryInput, EnquiryResponse } from '../pwb/types'

export const ENQUIRIES_COLLECTION = 'enquiries'
export const ENQUIRY_PLUGIN_ID = 'lead-reports'
export const ENQUIRY_ROUTE = 'enquiries'

/** Fields of an `enquiries` entry. */
export interface StoredEnquiry {
  name: string
  email: string
  message: string
  lead_status: 'new'
  phone?: string
  property_slug?: string
  page_type?: string
  cta_source?: string
}

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim().slice(0, max)
  return trimmed || undefined
}

/**
 * Validate and normalize an enquiry for storage. Runs in the plugin route,
 * which is publicly reachable, so it doesn't trust its caller.
 * Returns null when the enquiry is invalid.
 */
export function sanitizeStoredEnquiry(input: unknown): StoredEnquiry | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Record<string, unknown>
  const name = text(raw.name, 120) ?? ''
  const email = text(raw.email, 200) ?? ''
  const message = text(raw.message, 5000) ?? ''
  if (!validateEnquiry({ name, email, message }).valid) return null

  const stored: StoredEnquiry = { name, email, message, lead_status: 'new' }
  const optional = {
    phone: text(raw.phone, 30),
    property_slug: text(raw.property_slug, 120),
    page_type: text(raw.page_type, 30),
    cta_source: text(raw.cta_source, 80),
  }
  for (const [key, value] of Object.entries(optional)) {
    if (value) (stored as unknown as Record<string, string>)[key] = value
  }
  return stored
}

/** The payload /api/enquiries sends to the plugin route. */
export function buildEnquiryPayload(input: EnquiryInput, details?: EnquiryDetails): Record<string, unknown> {
  const attribution = details?.attribution ?? {}
  return {
    name: input.name,
    email: input.email,
    phone: input.phone,
    message: details?.message ?? input.message,
    property_slug: attribution.propertySlug,
    page_type: attribution.pageType,
    cta_source: attribution.ctaSource,
  }
}

interface PublicPluginRouteCaller {
  handlePublicPluginApiRoute(
    pluginId: string,
    method: string,
    path: string,
    request: Request,
  ): Promise<{ success: boolean; error?: { code: string; message: string } }>
}

export function createEmDashEnquiryClient(emdash: PublicPluginRouteCaller, origin: string): EnquirySubmitClient {
  return {
    async submitEnquiry(input: EnquiryInput, details?: EnquiryDetails): Promise<EnquiryResponse> {
      const request = new Request(new URL(`/_emdash/api/plugins/${ENQUIRY_PLUGIN_ID}/${ENQUIRY_ROUTE}`, origin), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildEnquiryPayload(input, details)),
      })
      const result = await emdash.handlePublicPluginApiRoute(ENQUIRY_PLUGIN_ID, 'POST', ENQUIRY_ROUTE, request)
      if (!result.success) {
        // Surfaced by handleEnquiryRequest as a 502 "could not send" response.
        throw new Error(`Could not store enquiry: ${result.error?.code ?? 'unknown'} ${result.error?.message ?? ''}`)
      }
      return { success: true, message: 'Your enquiry has been sent!' }
    },
  }
}
