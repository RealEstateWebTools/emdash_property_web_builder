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
    console.info(`[pwb] GET ${urlStr}`)
    let res: Response
    try {
      res = await fetch(urlStr, {
        headers: { Accept: 'application/json' },
      })
    } catch (err) {
      console.error(`[pwb] fetch failed for ${urlStr}: ${err instanceof Error ? err.message : String(err)}`)
      throw err
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const cfRay = res.headers.get('cf-ray') ?? 'none'
      const server = res.headers.get('server') ?? 'unknown'
      const msg = (body as { error?: string }).error ?? `HTTP ${res.status} ${urlStr}`
      console.error(`[pwb] ${msg} | cf-ray: ${cfRay} | server: ${server}`)
      throw new Error(msg)
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
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
    if (res.status === 404) throw new Error('Property not found')
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
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
    })
    // Enquiry endpoint returns 201 on success or 422 on validation failure.
    // Both return parseable JSON — do not throw on non-ok here.
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
