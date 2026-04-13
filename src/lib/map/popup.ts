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
