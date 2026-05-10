import { describe, expect, it } from 'vitest'
import { safeJsonLd } from './safe-json-ld'

describe('safeJsonLd', () => {
  it('serializes JSON while escaping HTML-significant characters', () => {
    const result = safeJsonLd({
      name: '</script><img src=x onerror=alert(1)>',
      description: 'A & B',
    })

    expect(result).toContain('\\u003c/script\\u003e')
    expect(result).toContain('\\u003cimg src=x onerror=alert(1)\\u003e')
    expect(result).toContain('A \\u0026 B')
    expect(result).not.toContain('</script>')
  })
})
