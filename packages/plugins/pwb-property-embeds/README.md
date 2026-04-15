# pwb-property-embeds

EmDash plugin — embed live PWB property listings as PortableText blocks.

## What it does

- Registers the **`propertyEmbed`** PortableText block type so editors can embed a live property card inside any rich-text field (e.g. a blog post body or a page section).
- Fetches the property at render time from the PWB public API using the block's `slug` field.
- Supports three display variants: `card` (default), `compact`, and `inline`.
- Provides a **Quick Pick** select in the admin editor, populated via the `properties/list` route, so editors can choose a property by title instead of entering a slug manually.
- Fully i18n-aware — renders labels in `en`, `es`, and `fr`.

## Block type

| Field | Type | Description |
|-------|------|-------------|
| `slug` | text | Property slug or full URL path (e.g. `beautiful-villa-marbella`) |
| `suggestedSlug` | select (dynamic) | Quick Pick from live property list |
| `variant` | select | `card` / `compact` / `inline` |
| `ctaLabel` | text | Optional override for the "View Property" button text |

## Registration

```js
// astro.config.ts
import { pwbPropertyEmbedsPlugin } from 'pwb-property-embeds'

emdash({
  plugins: [pwbPropertyEmbedsPlugin(), ...],
})
```

This plugin runs in `native` format. Register it in the `bundledPlugins` array in `astro.config.ts`.

## Astro renderer

```astro
---
import { PortableText } from 'emdash/ui'
import { blockComponents } from 'pwb-property-embeds/astro'
---
<PortableText value={body} components={blockComponents} />
```

## Seed example

```json
{
  "type": "propertyEmbed",
  "slug": "luxury-penthouse-malaga",
  "variant": "card",
  "ctaLabel": "View full listing"
}
```
