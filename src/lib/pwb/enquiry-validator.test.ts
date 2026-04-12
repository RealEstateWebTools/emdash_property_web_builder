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

  it('reports all errors simultaneously when all fields invalid', () => {
    const result = validateEnquiry({ name: '', email: 'bad', message: 'short' })
    expect(result.valid).toBe(false)
    expect(result.errors.name).toBeDefined()
    expect(result.errors.email).toBeDefined()
    expect(result.errors.message).toBeDefined()
  })

  it('accepts message of exactly 10 characters', () => {
    const result = validateEnquiry({ name: 'Jane', email: 'jane@example.com', message: '1234567890' })
    expect(result.valid).toBe(true)
  })

  it('rejects message of exactly 9 characters', () => {
    const result = validateEnquiry({ name: 'Jane', email: 'jane@example.com', message: '123456789' })
    expect(result.valid).toBe(false)
    expect(result.errors.message).toMatch(/10 character/i)
  })
})
