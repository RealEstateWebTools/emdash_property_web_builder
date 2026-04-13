import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { handleEnquiryRequest } from '../../lib/pwb/enquiry-api'

describe('handleEnquiryRequest', () => {
  it('returns success JSON for a valid payload', async () => {
    const client = {
      submitEnquiry: vi.fn().mockResolvedValue({
        success: true,
        message: 'Enquiry sent',
      }),
    }

    const request = new Request('http://localhost/api/enquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '1234',
        message: 'I am interested in this property',
        property_id: '42',
      }),
    })

    const response = await handleEnquiryRequest(request, client)
    const body = await response.json() as { success: boolean; message?: string }

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.message).toBe('Enquiry sent')
  })

  it('returns 400 when required fields are invalid', async () => {
    const client = {
      submitEnquiry: vi.fn(),
    }

    const request = new Request('http://localhost/api/enquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '',
        email: 'not-an-email',
        message: '',
      }),
    })

    const response = await handleEnquiryRequest(request, client)
    const body = await response.json() as { success: boolean; fieldErrors?: Record<string, string> }

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.fieldErrors?.name).toBeDefined()
    expect(body.fieldErrors?.email).toBeDefined()
    expect(body.fieldErrors?.message).toBeDefined()
    expect(client.submitEnquiry).not.toHaveBeenCalled()
  })

  it('forwards valid payload to PWB in the expected shape', async () => {
    const client = {
      submitEnquiry: vi.fn().mockResolvedValue({ success: true }),
    }

    const request = new Request('http://localhost/api/enquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '1234',
        message: 'I am interested in this property',
        property_id: '42',
      }),
    })

    await handleEnquiryRequest(request, client)

    expect(client.submitEnquiry).toHaveBeenCalledWith({
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '1234',
      message: 'I am interested in this property',
      property_id: '42',
    })
  })

  it('maps upstream validation failures to a safe error response', async () => {
    const client = {
      submitEnquiry: vi.fn().mockResolvedValue({
        success: false,
        errors: ['Email is required'],
      }),
    }

    const request = new Request('http://localhost/api/enquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: 'jane@example.com',
        message: 'I am interested in this property',
      }),
    })

    const response = await handleEnquiryRequest(request, client)
    const body = await response.json() as { success: boolean; message?: string; errors?: string[] }

    expect(response.status).toBe(422)
    expect(body.success).toBe(false)
    expect(body.message).toBeDefined()
    expect(body.errors).toEqual(['Email is required'])
  })

  it('returns 502 with generic message for upstream network failures', async () => {
    const client = {
      submitEnquiry: vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.1:443')),
    }

    const request = new Request('http://localhost/api/enquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: 'jane@example.com',
        message: 'I am interested in this property',
      }),
    })

    const response = await handleEnquiryRequest(request, client)
    const body = await response.json() as { success: boolean; message?: string }

    expect(response.status).toBe(502)
    expect(body.success).toBe(false)
    expect(body.message).toBe('Unable to send enquiry at the moment. Please try again.')
    expect(body.message).not.toContain('ECONNREFUSED')
  })
})

describe('ContactForm integration contract', () => {
  it('posts to local /api/enquiries and does not require pwb-api-url meta tag', () => {
    const filePath = resolve(process.cwd(), 'src/components/ContactForm.astro')
    const source = readFileSync(filePath, 'utf8')

    expect(source).toMatch(/fetch\(['\"]\/api\/enquiries['\"]/)
    expect(source).not.toContain('meta[name="pwb-api-url"]')
  })
})
