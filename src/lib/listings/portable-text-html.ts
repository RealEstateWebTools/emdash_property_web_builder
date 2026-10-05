/**
 * Minimal Portable Text ↔ HTML conversion for listing descriptions.
 *
 * Native listings store descriptions as Portable Text (editable in the EmDash
 * admin); the property page renders HTML. PWB descriptions arrive as HTML and
 * are converted on import. Only the structures descriptions use are handled:
 * paragraphs, h2–h4, blockquotes, bullet/numbered lists, bold and italic.
 * Plain .ts (no DOM) so it runs in the import script and in Workers.
 */

interface Span {
  _type: 'span'
  _key?: string
  text: string
  marks?: string[]
}

export interface TextBlock {
  _type: 'block'
  _key?: string
  style?: string
  listItem?: 'bullet' | 'number'
  level?: number
  children: Span[]
  markDefs?: unknown[]
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : match
    }
    return ENTITIES[code.toLowerCase()] ?? match
  })
}

function spanHtml(span: Span): string {
  let html = escapeHtml(span.text ?? '').replace(/\n/g, '<br>')
  if (span.marks?.includes('em')) html = `<em>${html}</em>`
  if (span.marks?.includes('strong')) html = `<strong>${html}</strong>`
  return html
}

const BLOCK_TAGS: Record<string, string> = { normal: 'p', h2: 'h2', h3: 'h3', h4: 'h4', blockquote: 'blockquote' }

/** Render Portable Text to HTML. Unknown block types are skipped. */
export function portableTextToHtml(value: unknown): string {
  if (!Array.isArray(value)) return ''
  const out: string[] = []
  let openList: 'ul' | 'ol' | null = null

  for (const block of value as TextBlock[]) {
    if (block?._type !== 'block' || !Array.isArray(block.children)) continue
    const inner = block.children.map(spanHtml).join('')
    const listTag = block.listItem === 'number' ? 'ol' : block.listItem === 'bullet' ? 'ul' : null

    if (openList && openList !== listTag) {
      out.push(`</${openList}>`)
      openList = null
    }
    if (listTag) {
      if (!openList) {
        out.push(`<${listTag}>`)
        openList = listTag
      }
      out.push(`<li>${inner}</li>`)
      continue
    }
    if (!inner.trim()) continue
    const tag = BLOCK_TAGS[block.style ?? 'normal'] ?? 'p'
    out.push(`<${tag}>${inner}</${tag}>`)
  }
  if (openList) out.push(`</${openList}>`)
  return out.join('')
}

let keyCounter = 0
function key(): string {
  keyCounter = (keyCounter + 1) % 1_000_000
  return `k${Date.now().toString(36)}${keyCounter.toString(36)}`
}

/** Inline HTML → spans: <strong>/<b> and <em>/<i> become marks; other tags are dropped. */
function inlineSpans(html: string): Span[] {
  const spans: Span[] = []
  const marks: string[] = []
  for (const part of html.split(/(<\/?[a-z][^>]*>)/i)) {
    const tag = part.match(/^<(\/?)([a-z0-9]+)/i)
    if (tag) {
      const name = tag[2].toLowerCase()
      const mark = name === 'strong' || name === 'b' ? 'strong' : name === 'em' || name === 'i' ? 'em' : null
      if (name === 'br') spans.push({ _type: 'span', _key: key(), text: '\n', marks: [...marks] })
      else if (mark && tag[1]) marks.splice(marks.lastIndexOf(mark), 1)
      else if (mark) marks.push(mark)
      continue
    }
    const text = decodeEntities(part).replace(/\s+/g, ' ')
    if (text) spans.push({ _type: 'span', _key: key(), text, marks: [...new Set(marks)] })
  }
  // Trim the outer whitespace of the block.
  if (spans.length) {
    spans[0].text = spans[0].text.replace(/^\s+/, '')
    spans[spans.length - 1].text = spans[spans.length - 1].text.replace(/\s+$/, '')
  }
  return spans.filter((span) => span.text.length > 0)
}

/** Convert description HTML to Portable Text blocks. */
export function htmlToPortableText(html: string | null | undefined): TextBlock[] {
  if (!html?.trim()) return []
  const blocks: TextBlock[] = []
  const source = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<!--[\s\S]*?-->/g, '')
  const pattern = /<(p|h[1-6]|blockquote|li|div)\b[^>]*>([\s\S]*?)<\/\1>|<(ul|ol)\b[^>]*>|<\/(ul|ol)>|([^<]+|<(?!\/?(?:p|h[1-6]|blockquote|li|div|ul|ol)\b)[^>]*>)/gi
  let list: 'bullet' | 'number' | null = null
  let loose = ''

  const flushLoose = () => {
    const children = inlineSpans(loose)
    if (children.length) blocks.push({ _type: 'block', _key: key(), style: 'normal', children, markDefs: [] })
    loose = ''
  }

  for (const match of source.matchAll(pattern)) {
    const [, tag, inner, listOpen, listClose, text] = match
    if (text !== undefined) {
      loose += text
      continue
    }
    flushLoose()
    if (listOpen) list = listOpen.toLowerCase() === 'ol' ? 'number' : 'bullet'
    else if (listClose) list = null
    else if (tag) {
      const name = tag.toLowerCase()
      const children = inlineSpans(inner)
      if (!children.length) continue
      const style = name === 'h1' || name === 'h2' ? 'h2' : name === 'h3' ? 'h3' : /^h[4-6]$/.test(name) ? 'h4' : name === 'blockquote' ? 'blockquote' : 'normal'
      const block: TextBlock = { _type: 'block', _key: key(), style, children, markDefs: [] }
      if (name === 'li') {
        block.style = 'normal'
        block.listItem = list ?? 'bullet'
        block.level = 1
      }
      blocks.push(block)
    }
  }
  flushLoose()
  return blocks
}
