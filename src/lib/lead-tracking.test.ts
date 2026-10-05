import { afterEach, describe, expect, it, vi } from 'vitest'
import { ENQUIRY_SENT_EVENT, initLeadTracking, LEAD_TRACK_URL } from './lead-tracking'

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

function click(doc: Document, selector: string) {
  const el = doc.querySelector(selector)
  if (!el) throw new Error(`missing ${selector}`)
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

function setup(path: string) {
  window.history.pushState({}, '', path)
  const fetchMock = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(new Response('{}')))
  vi.stubGlobal('fetch', fetchMock)
  // A fresh document per test so listeners don't accumulate.
  const doc = document.implementation.createHTMLDocument('t')
  Object.defineProperty(doc, 'location', { value: window.location })
  initLeadTracking(doc)
  const sent = () => fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)))
  return { doc, fetchMock, sent }
}

describe('initLeadTracking', () => {
  it('records clicks on data-cta elements, including clicks on their children', () => {
    const { doc, fetchMock, sent } = setup('/es/areas/east-brunswick')
    doc.body.innerHTML = '<a href="#" data-cta="area_cta"><span>Talk to us</span></a>'
    click(doc, 'span')

    expect(fetchMock).toHaveBeenCalledWith(LEAD_TRACK_URL, expect.objectContaining({ method: 'POST', keepalive: true }))
    expect(sent()).toEqual([{ kind: 'cta_click', cta: 'area_cta', pagePath: '/es/areas/east-brunswick', pageType: 'area' }])
  })

  it('ignores clicks outside data-cta elements', () => {
    const { doc, fetchMock } = setup('/')
    doc.body.innerHTML = '<a href="#">plain</a>'
    click(doc, 'a')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('records enquiries with the form attribution', () => {
    const { doc, sent } = setup('/properties/villa-a')
    doc.dispatchEvent(
      new CustomEvent(ENQUIRY_SENT_EVENT, { detail: { pageType: 'property', ctaSource: 'book_viewing', propertySlug: 'villa-a' } }),
    )
    expect(sent()).toEqual([
      { kind: 'enquiry', cta: 'book_viewing', pageType: 'property', propertySlug: 'villa-a', pagePath: '/properties/villa-a' },
    ])
  })

  it('never throws into the page when the request fails', () => {
    const { doc, fetchMock } = setup('/')
    fetchMock.mockImplementation(() => Promise.reject(new Error('offline')))
    doc.body.innerHTML = '<button data-cta="x">x</button>'
    expect(() => click(doc, 'button')).not.toThrow()
  })
})
