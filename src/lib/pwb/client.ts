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

  constructor(baseUrl: string) {
    // Strip trailing slash so all paths work with leading slash
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  private get apiBase() {
    return `${this.baseUrl}/api_public/v1`
  }

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.apiBase}${path}`)
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          url.searchParams.set(k, v)
        }
      })
    }
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
    }
    return res.json() as Promise<T>
  }

  async getSiteDetails(): Promise<SiteDetails> {
    return this.get<SiteDetails>('/site_details')
  }

  async searchProperties(params: SearchParams): Promise<SearchResults> {
    const stringParams: Record<string, string> = {}
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) stringParams[k] = String(v)
    })
    return this.get<SearchResults>('/properties/search', stringParams)
  }

  async getProperty(slug: string): Promise<Property> {
    const url = new URL(`${this.apiBase}/properties/${encodeURIComponent(slug)}`)
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
    if (res.status === 404) throw new Error('Property not found')
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
    }
    return res.json() as Promise<Property>
  }

  async getSearchFacets(saleOrRental: 'sale' | 'rental' = 'sale'): Promise<SearchFacets> {
    return this.get<SearchFacets>('/search/facets', { sale_or_rental: saleOrRental })
  }

  async getSearchConfig(locale?: string): Promise<SearchConfig> {
    const params = locale ? { locale } : undefined
    return this.get<SearchConfig>('/search/config', params)
  }

  async getPageBySlug(slug: string): Promise<Page> {
    return this.get<Page>('/pages', { slug, include_rendered: 'true' })
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
export function createPwbClient(): PwbClient {
  const url = import.meta.env.PWB_API_URL
  if (!url) throw new Error('PWB_API_URL environment variable is not set')
  return new PwbClient(url)
}
