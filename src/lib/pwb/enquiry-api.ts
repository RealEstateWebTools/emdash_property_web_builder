import type { EnquiryInput, EnquiryResponse } from './types'
import { validateEnquiry } from './enquiry-validator'

export interface EnquirySubmitClient {
  submitEnquiry(input: EnquiryInput): Promise<EnquiryResponse>
}

export interface EnquiryAttribution {
  pageType?: string
  propertySlug?: string
  ctaSource?: string
}

const ALLOWED_PAGE_TYPES = new Set(['property', 'contact', 'general'])

function sanitizeTextField(value: unknown, maxLength: number): string | undefined {
  if (value === undefined || value === null) return undefined
  const trimmed = String(value)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, maxLength)
}

function sanitizePageType(value: unknown): string | undefined {
  const pageType = sanitizeTextField(value, 30)
  return pageType && ALLOWED_PAGE_TYPES.has(pageType) ? pageType : undefined
}

interface ErrorBody {
  success: false
  message: string
  errors?: string[]
  fieldErrors?: Record<string, string>
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function buildAttributionNote(attribution: EnquiryAttribution): string {
  const parts: string[] = []
  if (attribution.pageType) parts.push(`Page type: ${attribution.pageType}`)
  if (attribution.propertySlug) parts.push(`Listing: /properties/${attribution.propertySlug}`)
  if (attribution.ctaSource) parts.push(`CTA: ${attribution.ctaSource}`)
  if (parts.length === 0) return ''
  return `\n\n---\n${parts.join('\n')}`
}

export async function handleEnquiryRequest(request: Request, client: EnquirySubmitClient): Promise<Response> {
  let payload: Record<string, unknown>

  try {
    payload = await request.json() as Record<string, unknown>
  } catch {
    return json({
      success: false,
      message: 'Invalid JSON payload.',
    } satisfies ErrorBody, 400)
  }

  const name = String(payload.name ?? '')
  const email = String(payload.email ?? '')
  const message = String(payload.message ?? '')
  const phone = sanitizeTextField(payload.phone, 30)
  const propertyId = sanitizeTextField(payload.property_id, 80)

  const attribution: EnquiryAttribution = {
    pageType: sanitizePageType(payload.page_type),
    propertySlug: sanitizeTextField(payload.property_slug, 120),
    ctaSource: sanitizeTextField(payload.cta_source, 80),
  }

  const validation = validateEnquiry({ name, email, message })
  if (!validation.valid) {
    return json({
      success: false,
      message: 'Please fix the highlighted fields and try again.',
      fieldErrors: Object.fromEntries(
        Object.entries(validation.errors)
          .filter(([, value]) => Boolean(value))
          .map(([key, value]) => [key, value as string]),
      ),
    } satisfies ErrorBody, 400)
  }

  const attributionNote = buildAttributionNote(attribution)

  try {
    const result = await client.submitEnquiry({
      name,
      email,
      phone,
      message: attributionNote ? `${message}${attributionNote}` : message,
      property_id: propertyId,
    })

    if (!result.success) {
      return json({
        success: false,
        message: 'Please check your enquiry details and try again.',
        errors: result.errors ?? ['Unable to send enquiry. Please try again.'],
      } satisfies ErrorBody, 422)
    }

    return json({
      success: true,
      message: result.message ?? 'Your enquiry has been sent!',
      data: result.data,
    })
  } catch (err) {
    console.error(`[pwb] enquiry submission failed: ${err instanceof Error ? err.message : String(err)}`)
    return json({
      success: false,
      message: 'Unable to send enquiry at the moment. Please try again.',
    } satisfies ErrorBody, 502)
  }
}
