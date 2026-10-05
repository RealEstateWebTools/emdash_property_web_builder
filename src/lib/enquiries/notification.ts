/**
 * Email notification for a new enquiry stored in EmDash (no-PWB sites).
 * Sent by the lead-reports plugin's content:afterSave hook to the office
 * email from the site-profile settings, with Reply-To set to the enquirer.
 */
export interface EnquiryNotification {
  to: string
  replyTo?: string
  subject: string
  text: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function field(data: Record<string, unknown>, key: string): string {
  const value = data[key]
  return typeof value === 'string' ? value.trim() : ''
}

/** Returns null when there is no valid office address to send to. */
export function buildEnquiryNotification(
  data: Record<string, unknown>,
  officeEmail: unknown,
): EnquiryNotification | null {
  const to = typeof officeEmail === 'string' ? officeEmail.trim() : ''
  if (!EMAIL_PATTERN.test(to)) return null

  const name = field(data, 'name') || 'Someone'
  const email = field(data, 'email')
  const property = field(data, 'property_slug')
  const details = [
    ['Name', name],
    ['Email', email],
    ['Phone', field(data, 'phone')],
    ['Listing', property && `/properties/${property}`],
    ['Page type', field(data, 'page_type')],
    ['CTA', field(data, 'cta_source')],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
  const message = field(data, 'message')

  return {
    to,
    replyTo: EMAIL_PATTERN.test(email) ? email : undefined,
    subject: property ? `New enquiry about ${property} from ${name}` : `New website enquiry from ${name}`,
    text: [
      `${name} sent an enquiry through the website.`,
      '',
      ...details,
      ...(message ? ['', message] : []),
      '',
      'Find it under Enquiries in the website admin.',
    ].join('\n'),
  }
}
