import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const mapView = readFileSync(resolve(process.cwd(), 'src/components/MapView.astro'), 'utf8')
const siteHeader = readFileSync(resolve(process.cwd(), 'src/components/SiteHeader.astro'), 'utf8')
const contactForm = readFileSync(resolve(process.cwd(), 'src/components/ContactForm.astro'), 'utf8')

describe('Milestone 6 conventions', () => {
  it('map only renders when markers exist', () => {
    expect(mapView).toContain('markers.length > 0')
  })

  it('map uses locally bundled Leaflet instead of runtime CDN script injection', () => {
    expect(mapView).toContain("import('leaflet')")
    expect(mapView).not.toContain('unpkg.com/leaflet')
  })

  it('mobile nav toggle has aria-controls and initial aria-expanded state', () => {
    expect(siteHeader).toContain('aria-controls="nav-content"')
    expect(siteHeader).toContain('aria-expanded="false"')
    // The toggle script sets aria-expanded explicitly on open and close
    expect(siteHeader).toContain("aria-expanded")
    expect(siteHeader).toContain("openMenu")
    expect(siteHeader).toContain("closeMenu")
  })

  it('contact form field ids are namespaced by formId', () => {
    expect(contactForm).toContain("const nameId = `${formId}-name`")
    expect(contactForm).toContain("const emailId = `${formId}-email`")
    expect(contactForm).toContain("const phoneId = `${formId}-phone`")
    expect(contactForm).toContain("const messageId = `${formId}-message`")
  })
})
