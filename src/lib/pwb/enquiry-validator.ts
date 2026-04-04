import type { EnquiryInput } from './types'

export interface ValidationResult {
  valid: boolean
  errors: Partial<Record<keyof EnquiryInput, string>>
}

export function validateEnquiry(input: Pick<EnquiryInput, 'name' | 'email' | 'message'>): ValidationResult {
  const errors: Partial<Record<keyof EnquiryInput, string>> = {}

  if (!input.name.trim()) {
    errors.name = 'Name is required'
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!input.email.trim() || !emailRegex.test(input.email.trim())) {
    errors.email = 'Please enter a valid email address'
  }

  if (!input.message.trim()) {
    errors.message = 'Message is required'
  } else if (input.message.trim().length < 10) {
    errors.message = 'Message must be at least 10 characters'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}
