export class PwbApiError extends Error {
  status?: number
  url?: string

  constructor(message: string, options: { status?: number; url?: string; cause?: unknown } = {}) {
    super(message)
    this.name = 'PwbApiError'
    this.status = options.status
    this.url = options.url
    this.cause = options.cause
  }
}

export function isPwbNotFoundError(error: unknown): boolean {
  return error instanceof PwbApiError && error.status === 404
}

export function logPwbUnexpectedError(context: string, error: unknown): void {
  if (isPwbNotFoundError(error)) return
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[pwb] ${context}: ${message}`)
}
