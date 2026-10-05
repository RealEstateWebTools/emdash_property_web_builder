/**
 * Which backends this site uses.
 *
 * PWB (the Rails listings backend) is optional: set `PWB_API_URL` to use it.
 * Without it, site details come from EmDash settings, CMS pages from EmDash,
 * and enquiries are stored in EmDash (see docs/pwb-optional.md).
 */
export function isPwbConfigured(env: Record<string, unknown> = import.meta.env as Record<string, unknown>): boolean {
  // Read the same way as createPwbClient (src/lib/pwb/client.ts).
  const url = env.PWB_API_URL
  return typeof url === 'string' && url.trim().length > 0
}
