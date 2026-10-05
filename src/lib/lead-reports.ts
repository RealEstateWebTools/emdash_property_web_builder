/**
 * Lead & CTA reporting baseline (lead-reports plugin).
 *
 * Two event kinds, both sent from the browser to the plugin's public `track`
 * route:
 *   - cta_click  a click on any element marked `data-cta="<id>"`
 *   - enquiry    a successful contact-form submission, with the form's
 *                attribution (page type, CTA source, listing)
 *
 * No personal data is stored — only ids, paths and page types. Events are
 * unauthenticated by nature, so the report is an operational signal, not an
 * audit log.
 */

export const LEAD_EVENT_KINDS = ['cta_click', 'enquiry'] as const
export type LeadEventKind = (typeof LEAD_EVENT_KINDS)[number]

export interface LeadEvent {
  kind: LeadEventKind
  /** CTA id (data-cta) or the enquiry form's CTA source. */
  cta?: string
  pageType?: string
  pagePath: string
  propertySlug?: string
  /** ISO timestamp */
  createdAt: string
}

export const REPORT_RANGES = [7, 30, 90] as const
export type ReportRange = (typeof REPORT_RANGES)[number]

const ID_PATTERN = /^[a-z0-9][a-z0-9_.:-]*$/i

function cleanId(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim().slice(0, maxLength)
  return trimmed && ID_PATTERN.test(trimmed) ? trimmed : undefined
}

/** Keep only the path: no query string or fragment (they can carry PII). */
function cleanPath(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const path = value.split(/[?#]/, 1)[0]?.trim() ?? ''
  if (!path.startsWith('/') || path.startsWith('//') || path.length > 200) return undefined
  // biome-ignore lint/suspicious/noControlCharactersInRegex: reject control characters in untrusted input
  return /[\u0000-\u001f\u007f\s]/.test(path) ? undefined : path
}

/** Validate an incoming event; returns null for anything malformed. */
export function sanitizeLeadEvent(input: unknown, now: Date = new Date()): LeadEvent | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Record<string, unknown>
  const kind = LEAD_EVENT_KINDS.find((k) => k === raw.kind)
  const pagePath = cleanPath(raw.pagePath)
  if (!kind || !pagePath) return null

  const cta = cleanId(raw.cta, 80)
  if (kind === 'cta_click' && !cta) return null

  return {
    kind,
    cta,
    pageType: cleanId(raw.pageType, 30),
    pagePath,
    propertySlug: cleanId(raw.propertySlug, 120),
    createdAt: now.toISOString(),
  }
}

export function sanitizeReportRange(value: unknown): ReportRange {
  const n = Number(value)
  return REPORT_RANGES.find((range) => range === n) ?? 30
}

export function rangeStart(days: number, now: Date = new Date()): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString()
}

interface Count {
  key: string
  enquiries: number
  clicks: number
}

export interface LeadSummary {
  days: number
  totals: { enquiries: number; clicks: number }
  byCta: Count[]
  byPageType: Count[]
  byPage: Count[]
  /** One point per day, oldest first: [dayStartMs, enquiries, clicks] */
  daily: Array<[number, number, number]>
}

function tally(events: LeadEvent[], keyOf: (event: LeadEvent) => string | undefined): Count[] {
  const map = new Map<string, Count>()
  for (const event of events) {
    const key = keyOf(event) ?? '(none)'
    const row = map.get(key) ?? { key, enquiries: 0, clicks: 0 }
    if (event.kind === 'enquiry') row.enquiries++
    else row.clicks++
    map.set(key, row)
  }
  return [...map.values()].sort((a, b) => b.enquiries - a.enquiries || b.clicks - a.clicks || a.key.localeCompare(b.key))
}

export function summarizeLeadEvents(events: LeadEvent[], days: number, now: Date = new Date()): LeadSummary {
  const dayMs = 86_400_000
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const daily: Array<[number, number, number]> = Array.from({ length: days }, (_, i) => [today - (days - 1 - i) * dayMs, 0, 0])
  const first = daily[0][0]

  for (const event of events) {
    const t = Date.parse(event.createdAt)
    const index = Math.floor((t - first) / dayMs)
    if (index < 0 || index >= days) continue
    daily[index][event.kind === 'enquiry' ? 1 : 2]++
  }

  return {
    days,
    totals: {
      enquiries: events.filter((e) => e.kind === 'enquiry').length,
      clicks: events.filter((e) => e.kind === 'cta_click').length,
    },
    byCta: tally(events, (e) => e.cta),
    byPageType: tally(events, (e) => e.pageType),
    byPage: tally(events, (e) => e.pagePath),
    daily,
  }
}

function countRows(rows: Count[], limit: number) {
  return rows.slice(0, limit).map((row) => ({ key: row.key, enquiries: row.enquiries, clicks: row.clicks }))
}

function table(label: string, rows: Count[], limit: number) {
  return {
    type: 'table',
    columns: [
      { key: 'key', label },
      { key: 'enquiries', label: 'Enquiries', format: 'number' },
      { key: 'clicks', label: 'CTA clicks', format: 'number' },
    ],
    rows: countRows(rows, limit),
    // Required by Block Kit; these tables show a fixed top-N, no paging.
    page_action_id: 'noop',
  }
}

/** Block Kit blocks for the plugin's admin page. */
export function buildLeadReportBlocks(summary: LeadSummary) {
  const { totals } = summary
  const rate = totals.clicks > 0 ? `${Math.round((totals.enquiries / totals.clicks) * 100)}%` : '—'

  const blocks: Array<Record<string, unknown>> = [
    { type: 'header', text: 'Leads & CTAs' },
    {
      type: 'context',
      text: 'Enquiries sent through the site and clicks on calls to action, with where they came from. Counts come from visitors’ browsers, so script blockers are not counted.',
    },
    {
      type: 'actions',
      elements: REPORT_RANGES.map((range) => ({
        type: 'button',
        label: `Last ${range} days`,
        action_id: 'set_range',
        value: range,
        style: range === summary.days ? 'primary' : 'secondary',
      })),
    },
    {
      type: 'stats',
      items: [
        { label: `Enquiries (${summary.days} days)`, value: String(totals.enquiries) },
        { label: 'CTA clicks', value: String(totals.clicks) },
        { label: 'Enquiries per CTA click', value: rate },
      ],
    },
  ]

  if (totals.enquiries + totals.clicks === 0) {
    blocks.push({
      type: 'banner',
      variant: 'default',
      title: 'No activity yet',
      description: 'Events appear here as visitors click calls to action and send enquiries.',
    })
    return blocks
  }

  blocks.push(
    {
      type: 'chart',
      config: {
        chart_type: 'timeseries',
        series: [
          { name: 'Enquiries', data: summary.daily.map(([t, enquiries]) => [t, enquiries]) },
          { name: 'CTA clicks', data: summary.daily.map(([t, , clicks]) => [t, clicks]) },
        ],
        x_axis_name: 'Day',
        y_axis_name: 'Count',
        style: 'bar',
        height: 260,
      },
    },
    { type: 'header', text: 'By call to action' },
    table('CTA', summary.byCta, 15),
    { type: 'header', text: 'By page type' },
    table('Page type', summary.byPageType, 10),
    { type: 'header', text: 'Top pages' },
    table('Page', summary.byPage, 15),
  )
  return blocks
}

/** Coarse page type from a URL path (locale prefix ignored), for CTA clicks. */
export function pageTypeFromPath(path: string, locales: readonly string[] = ['es', 'fr']): string {
  const segments = path.split('/').filter(Boolean)
  if (segments[0] && locales.includes(segments[0])) segments.shift()
  const [first, second] = segments
  if (!first) return 'home'
  if (first === 'properties') return second ? 'property' : 'listings'
  if (first === 'posts') return second ? 'post' : 'posts'
  if (first === 'areas') return second ? 'area' : 'areas'
  if (first === 'pages') return second === 'contact' ? 'contact' : 'page'
  if (first === 'search') return 'search'
  if (first === 'valuation') return 'valuation'
  return 'page'
}
