/**
 * E2E: WCAG text contrast per theme palette.
 *
 * Screenshots alone don't catch unreadable text — the luxury palette shipped
 * with gold and cream text on cream surfaces (~1.1–2.2:1) because it never
 * overrode the base theme's light surface tokens. This walks every visible
 * text node and checks it against WCAG AA (4.5:1, or 3:1 for large text).
 *
 * Runs in the visual suite (`pnpm test:visual`) against the mocked backend.
 * Add a palette to CHECKED_PALETTES once it passes.
 */

import { test, expect } from '@playwright/test'

const CHECKED_PALETTES = ['luxury'] as const
const KEY_PAGES = ['/', '/properties', '/posts'] as const

interface ContrastFailure {
  ratio: number
  text: string
  element: string
  color: string
  background: string
}

test.describe('Text contrast — theme palettes', () => {
  for (const palette of CHECKED_PALETTES) {
    for (const path of KEY_PAGES) {
      test(`${palette} palette — ${path} meets WCAG AA`, async ({ page }) => {
        await page.goto(`${path}?palette=${palette}`, { waitUntil: 'networkidle' })

        const failures: ContrastFailure[] = await page.evaluate(() => {
          type Rgba = { r: number; g: number; b: number; a: number }
          const parse = (value: string): Rgba | null => {
            const m = value.match(/rgba?\(([^)]+)\)/)
            if (!m) return null
            const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number)
            return { r, g, b, a }
          }
          const luminance = ({ r, g, b }: Rgba) => {
            const f = (v: number) => {
              const c = v / 255
              return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
            }
            return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
          }
          // Nearest opaque-ish background. Photos can't be judged, so skip
          // them; gradients are approximated by their first colour stop.
          const backgroundOf = (el: Element): Rgba | null => {
            for (let e: Element | null = el; e; e = e.parentElement) {
              const cs = getComputedStyle(e)
              if (cs.backgroundImage.includes('url(')) return null
              if (cs.backgroundImage.includes('gradient')) {
                const stop = parse(cs.backgroundImage)
                if (stop && stop.a > 0.5) return stop
              }
              const bg = parse(cs.backgroundColor)
              if (bg && bg.a > 0.5) return bg
            }
            return { r: 255, g: 255, b: 255, a: 1 }
          }

          const results: ContrastFailure[] = []
          for (const el of Array.from(document.querySelectorAll('body *'))) {
            const text = Array.from(el.childNodes)
              .filter((n) => n.nodeType === Node.TEXT_NODE)
              .map((n) => n.textContent?.trim() ?? '')
              .join(' ')
              .trim()
            if (!text) continue
            if (el.closest('[aria-hidden="true"], .sr-only, .visually-hidden, script, style, noscript')) continue
            const cs = getComputedStyle(el)
            const rect = el.getBoundingClientRect()
            if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0 || rect.width === 0) continue

            const fg = parse(cs.color)
            const bg = backgroundOf(el)
            if (!fg || !bg) continue
            const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a)
            const ratio = (hi + 0.05) / (lo + 0.05)
            const size = Number.parseFloat(cs.fontSize)
            const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700)
            if (ratio < (large ? 3 : 4.5)) {
              results.push({
                ratio: Math.round(ratio * 100) / 100,
                text: text.slice(0, 50),
                element: `${el.tagName.toLowerCase()}.${el.className?.toString().split(' ')[0] ?? ''}`,
                color: cs.color,
                background: `rgb(${bg.r}, ${bg.g}, ${bg.b})`,
              })
            }
          }
          return results
        })

        const report = failures
          .map((f) => `  ${f.ratio}:1  ${f.element}  "${f.text}"  ${f.color} on ${f.background}`)
          .join('\n')
        expect(failures, `Text below WCAG AA contrast:\n${report}`).toHaveLength(0)
      })
    }
  }
})
