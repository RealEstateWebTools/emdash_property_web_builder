import type { EnquiryInput, EnquiryResponse } from './types'
import { validateEnquiry } from './enquiry-validator'

export interface EnquirySubmitClient {
  submitEnquiry(input: EnquiryInput): Promise<EnquiryResponse>
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
  const phone = payload.phone ? String(payload.phone) : undefined
  const propertyId = payload.property_id ? String(payload.property_id) : undefined

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

  try {
    const result = await client.submitEnquiry({
      name,
      email,
      phone,
      message,
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
  } catch {
    return json({
      success: false,
      message: 'Unable to send enquiry at the moment. Please try again.',
    } satisfies ErrorBody, 502)
  }
}
