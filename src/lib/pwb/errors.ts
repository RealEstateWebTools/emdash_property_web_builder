/**
 * Error from any listing source (PWB or native EmDash). `status` follows HTTP
 * semantics: 404 means the listing doesn't exist.
 */
export class ListingSourceError extends Error {
  status?: number
  url?: string

  constructor(message: string, options: { status?: number; url?: string; cause?: unknown } = {}) {
    super(message)
    this.name = 'ListingSourceError'
    this.status = options.status
    this.url = options.url
    this.cause = options.cause
  }
}

export class PwbApiError extends ListingSourceError {
  constructor(message: string, options: { status?: number; url?: string; cause?: unknown } = {}) {
    super(message, options)
    this.name = 'PwbApiError'
  }
}

/** True for a "not found" from any listing source (name kept for existing callers). */
export function isPwbNotFoundError(error: unknown): boolean {
  return error instanceof ListingSourceError && error.status === 404
}

export function logPwbUnexpectedError(context: string, error: unknown): void {
  if (isPwbNotFoundError(error)) return
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[pwb] ${context}: ${message}`)
}
