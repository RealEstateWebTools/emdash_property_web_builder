import { localePath } from '../locale'

/**
 * Both listing sources return default-locale marker URLs (`/properties/<slug>`);
 * point them at the page's locale. Absolute URLs are left alone.
 */
export function localizeMarkerUrls<T extends { url: string }>(markers: T[], locale: string): T[] {
  return markers.map((marker) => ({ ...marker, url: localePath(locale, marker.url) }))
}

interface PopupMarker {
  url: string
  title: string
  price: string | null
}

function sanitizeHref(url: string): string {
  if (url.startsWith('/') || /^https?:\/\//i.test(url)) {
    return url
  }
  return '#'
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function buildMarkerPopupHtml(marker: PopupMarker): string {
  const href = escapeHtml(sanitizeHref(marker.url))
  const title = escapeHtml(marker.title)
  const price = marker.price ? `<br>${escapeHtml(marker.price)}` : ''
  return `<a href="${href}"><strong>${title}</strong>${price}</a>`
}
