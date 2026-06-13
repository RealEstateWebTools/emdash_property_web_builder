import type {
  SiteDetails,
  SearchResults,
  SearchParams,
  Property,
  SearchFacets,
  SearchConfig,
  EnquiryInput,
  EnquiryResponse,
  Page,
} from './types'
import { PwbApiError } from './errors'

// Cap every backend call so a slow or hung PWB instance can't tie up a Worker
// invocation until Cloudflare's own subrequest limit fires. Pages that call the
// client already degrade gracefully (see fallbackSite), so an abort surfaces as
// a normal PwbApiError.
const DEFAULT_TIMEOUT_MS = 8000

export class PwbClient {
  baseUrl: string
  locale: string

  constructor(baseUrl: string, locale = 'en') {
    // Strip trailing slash so all paths work with leading slash
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.locale = locale
  }

  private get apiBase() {
    return `${this.baseUrl}/api_public/v1`
  }

  private get localizedApiBase() {
    return `${this.baseUrl}/api_public/v1/${this.locale}`
  }

  private async get<T>(path: string, params?: Record<string, string>, localized = false): Promise<T> {
    const base = localized ? this.localizedApiBase : this.apiBase
    const url = new URL(`${base}${path}`)
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          url.searchParams.set(k, v)
        }
      })
    }
    const urlStr = url.toString()
    if (import.meta.env.DEV) {
      console.info(`[pwb] GET ${urlStr}`)
    }
    let res: Response
    try {
      res = await fetch(urlStr, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      })
    } catch (err) {
      console.error(`[pwb] fetch failed for ${urlStr}: ${err instanceof Error ? err.message : String(err)}`)
      throw new PwbApiError(`Network failure for ${urlStr}`, { url: urlStr, cause: err })
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const cfRay = res.headers.get('cf-ray') ?? 'none'
      const server = res.headers.get('server') ?? 'unknown'
      const msg = (body as { error?: string }).error ?? `HTTP ${res.status} ${urlStr}`
      console.error(`[pwb] ${msg} | cf-ray: ${cfRay} | server: ${server}`)
      throw new PwbApiError(msg, { status: res.status, url: urlStr })
    }
    return res.json() as Promise<T>
  }

  async getSiteDetails(): Promise<SiteDetails> {
    return this.get<SiteDetails>('/site_details', undefined, true)
  }

  async searchProperties(params: SearchParams): Promise<SearchResults> {
    const stringParams: Record<string, string> = {}
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) stringParams[k] = String(v)
    })
    return this.get<SearchResults>('/properties', stringParams, true)
  }

  async getProperty(slug: string): Promise<Property> {
    const url = new URL(`${this.localizedApiBase}/properties/${encodeURIComponent(slug)}`)
    const urlStr = url.toString()
    let res: Response
    try {
      res = await fetch(urlStr, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      })
    } catch (err) {
      console.error(`[pwb] fetch failed for ${urlStr}: ${err instanceof Error ? err.message : String(err)}`)
      throw new PwbApiError(`Network failure for ${urlStr}`, { url: urlStr, cause: err })
    }
    if (res.status === 404) throw new PwbApiError('Property not found', { status: 404, url: urlStr })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new PwbApiError((body as { error?: string }).error ?? `HTTP ${res.status}`, {
        status: res.status,
        url: urlStr,
      })
    }
    return res.json() as Promise<Property>
  }

  async getSearchFacets(saleOrRental: 'sale' | 'rental' = 'sale'): Promise<SearchFacets> {
    return this.get<SearchFacets>('/search/facets', { sale_or_rental: saleOrRental }, true)
  }

  async getSearchConfig(): Promise<SearchConfig> {
    return this.get<SearchConfig>('/search/config', undefined, true)
  }

  async getPageBySlug(slug: string): Promise<Page> {
    return this.get<Page>(`/localized_page/by_slug/${encodeURIComponent(slug)}`, undefined, true)
  }

  async submitEnquiry(input: EnquiryInput): Promise<EnquiryResponse> {
    const url = `${this.apiBase}/enquiries`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ enquiry: input }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    })
    // Enquiry endpoint returns 201 on success or 422 on validation failure.
    // Both return parseable JSON — do not throw on those statuses. But a 5xx or
    // an edge/proxy error page may return HTML; guard so res.json() doesn't throw
    // an opaque SyntaxError. The caller treats a thrown error as a 502.
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      throw new PwbApiError(`Unexpected ${res.status} response from enquiry endpoint`, {
        status: res.status,
        url,
      })
    }
    return res.json() as Promise<EnquiryResponse>
  }
}

// Singleton used by all Astro pages at runtime.
// In tests, create a new PwbClient(testBaseUrl) directly.
export function createPwbClient(locale = 'en'): PwbClient {
  const url = import.meta.env.PWB_API_URL
  if (!url) throw new Error('PWB_API_URL environment variable is not set')
  return new PwbClient(url, locale)
}
