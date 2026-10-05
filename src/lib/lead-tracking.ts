/**
 * Browser side of the lead-reports plugin (loaded by BaseLayout).
 *
 * - Clicks on any element with `data-cta="<id>"` are recorded as cta_click.
 * - ContactForm dispatches a `pwb:enquiry-sent` event after a successful
 *   submission; it is recorded as an enquiry with the form's attribution.
 *
 * Fire-and-forget: tracking failures never affect the page.
 */
import { pageTypeFromPath } from './lead-reports'

export const LEAD_TRACK_URL = '/_emdash/api/plugins/lead-reports/track'
export const ENQUIRY_SENT_EVENT = 'pwb:enquiry-sent'

export interface EnquirySentDetail {
  pageType?: string
  ctaSource?: string
  propertySlug?: string
}

function send(event: Record<string, unknown>) {
  try {
    void fetch(LEAD_TRACK_URL, {
      method: 'POST',
      // keepalive lets the request finish when the click navigates away.
      keepalive: true,
      headers: { 'Content-Type': 'application/json', 'X-EmDash-Request': '1' },
      body: JSON.stringify(event),
    }).catch(() => {})
  } catch {
    // Older browsers without keepalive support: ignore.
  }
}

export function initLeadTracking(doc: Document = document) {
  const pagePath = doc.location.pathname
  const pageType = pageTypeFromPath(pagePath)

  doc.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-cta]') : null
    const cta = target?.dataset.cta
    if (cta) send({ kind: 'cta_click', cta, pagePath, pageType })
  })

  doc.addEventListener(ENQUIRY_SENT_EVENT, (event) => {
    const detail = (event as CustomEvent<EnquirySentDetail>).detail ?? {}
    send({
      kind: 'enquiry',
      cta: detail.ctaSource,
      pageType: detail.pageType || pageType,
      propertySlug: detail.propertySlug,
      pagePath,
    })
  })
}
