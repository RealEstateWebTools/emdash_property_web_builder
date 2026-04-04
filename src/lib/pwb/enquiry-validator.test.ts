import { describe, it, expect } from 'vitest'
import { validateEnquiry } from './enquiry-validator'

describe('validateEnquiry', () => {
  it('passes with all required fields', () => {
    const result = validateEnquiry({
      name: 'Jane Smith',
      email: 'jane@example.com',
      message: 'I am interested',
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual({})
  })

  it('rejects missing name', () => {
    const result = validateEnquiry({ name: '', email: 'jane@example.com', message: 'Hi there!' })
    expect(result.valid).toBe(false)
    expect(result.errors.name).toBeDefined()
  })

  it('rejects invalid email format', () => {
    const result = validateEnquiry({ name: 'Jane', email: 'not-an-email', message: 'Hi there!' })
    expect(result.valid).toBe(false)
    expect(result.errors.email).toMatch(/valid email/i)
  })

  it('rejects empty message', () => {
    const result = validateEnquiry({ name: 'Jane', email: 'jane@example.com', message: '' })
    expect(result.valid).toBe(false)
    expect(result.errors.message).toBeDefined()
  })

  it('rejects message shorter than 10 characters', () => {
    const result = validateEnquiry({ name: 'Jane', email: 'jane@example.com', message: 'Hi' })
    expect(result.valid).toBe(false)
    expect(result.errors.message).toMatch(/10 character/i)
  })

  it('trims whitespace before validating', () => {
    const result = validateEnquiry({ name: '  ', email: 'jane@example.com', message: 'Hello there' })
    expect(result.valid).toBe(false)
    expect(result.errors.name).toBeDefined()
  })
})
