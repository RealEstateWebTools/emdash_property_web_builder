# pwb-page-parts

EmDash plugin — PortableText block types for real-estate page merchandising.

## What it does

Registers 7 visual block types that editors can insert into any EmDash Portable Text field (e.g. a page `body` field). Each block renders as a self-contained, styled Astro component.

## Block types

| Type | Icon | Description |
|------|------|-------------|
| `pwb-hero` | image | Full-width hero with headline, subtitle, background image, and up to two CTA buttons |
| `pwb-cta` | bell | Compact CTA banner with heading, body copy, and one button |
| `pwb-features` | layout-grid | Three-card feature row for core services |
| `pwb-stats` | chart-column | Four-up metrics block (e.g. "500+ sales") |
| `pwb-testimonials` | message-square | Three testimonial cards with quote, name, and role |
| `pwb-local-expertise` | map-pinned | Office credibility block with three key points and a contact CTA |
| `pwb-valuation-cta` | calculator | Valuation request CTA — links to the `/valuation` page |

## Registration

```js
// astro.config.ts
import { pwbPagePartsPlugin } from 'pwb-page-parts'

emdash({
  plugins: [pwbPagePartsPlugin(), ...],
})
```

This plugin runs in `native` format, installed with the host site and registered in
`emdash({ plugins: [...] })`. The `bundledPlugins` variable is only this site's local grouping. Native rendering components distribute through npm, not the
EmDash registry. Supports EmDash `^1.1.0`; licensing, release packaging, and
unpatched host/editor verification remain pending. See the
[readiness report](../../../docs/plugin-release-readiness.md).

## Astro renderer

The `pwb-page-parts/astro` entry exports a `blockComponents` map that the PortableText renderer imports:

```astro
---
import { PortableText } from 'emdash/ui'
import { blockComponents } from 'pwb-page-parts/astro'
---
<PortableText value={body} components={blockComponents} />
```

## i18n

Block labels and default strings are translated via `packages/plugins/pwb-page-parts/src/i18n.js`. Currently supports `en` and `es`.

## Seed example

```json
{
  "type": "pwb-hero",
  "title": "Find your perfect home",
  "subtitle": "Browse hundreds of listings across the region.",
  "primaryLabel": "Search properties",
  "primaryHref": "/properties",
  "overlay": "dark"
}
```
