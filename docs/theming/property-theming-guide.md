# Property Theming Guide

This document covers all options for creating different visual presentations of the
property site — from simple colour changes to fully separate market-specific themes.

The EmDash themes overview describes themes as **complete Astro projects**. That is the
ceiling of the theming model. Within that model, there are six distinct options, ranging
from one-file CSS changes to separate deployable sites. The `pwb-theme` plugin adds
runtime palette switching via the admin panel for the CSS-variable layer (Option 1).

---

## The Theming Stack

Understanding what controls visual appearance in this codebase:

```
src/styles/theme.css          ← CSS custom properties (colors, fonts, spacing, layout)
        ↓ consumed by
src/layouts/BaseLayout.astro  ← HTML shell, header, footer
src/layouts/Base.astro        ← EmDash-wired layout (menus, search, page contributions)
        ↓ consumed by
src/pages/properties/         ← index.astro (search/grid), [slug].astro (detail)
        ↓ uses
src/components/
  PropertyCard.astro          ← single card in the grid (props: PropertyCardData)
  PropertyGrid.astro          ← renders a list of PropertyCard
  PropertyDetail.astro        ← full detail page body (props: PropertyDetailData)
  SearchBar.astro             ← filter UI on the listing page
  SimilarProperties.astro     ← related listings on the detail page
  ContactForm.astro           ← enquiry form on the detail page
  MapView.astro               ← map markers on the listing page
  SiteHeader.astro            ← global nav
  SiteFooter.astro            ← global footer
        ↓
packages/plugins/pwb-property-embeds/src/astro/PropertyEmbed.astro
                              ← card/compact/inline embed in blog/page content
```

The data pipeline (PWB API fetches, formatting) is separate from the visual layer:

```
src/lib/pwb/
  client.ts                   ← API calls (searchProperties, getProperty, etc.)
  formatters.ts               ← PropertyCardData interface + formatPropertyCard()
  detail-formatter.ts         ← PropertyDetailData interface + formatPropertyDetail()
  search-params.ts            ← URL param → API param mapping
  site-config.ts              ← buildPageMeta() for <head>
```

The formatters are the contract between the data layer and the component layer. Any
component replacement only needs to consume the same typed interface.

---

## Option 1: CSS Variable Overrides

**File:** `src/styles/theme.css`
**Effort:** Minutes
**Scope:** Color palette, typography, spacing, borders, shadows — the full visual texture

`theme.css` defines the complete set of CSS custom properties consumed across all
components. Every property-specific component (`PropertyCard`, `PropertyDetail`,
`PropertyEmbed`) references these variables rather than hardcoding values.

### Full variable reference

```css
:root {
  /* Colors */
  --color-bg: #ffffff;
  --color-bg-subtle: #fafafa;
  --color-text: #1a1a1a;
  --color-text-secondary: #525252;
  --color-muted: #8b8b8b;
  --color-border: #e5e5e5;
  --color-border-subtle: #f0f0f0;
  --color-surface: #f7f7f7;
  --color-accent: #0066cc;        /* buttons, badges, CTA links */
  --color-accent-hover: #0052a3;
  --color-on-accent: white;

  /* Fonts */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* Type scale */
  --font-size-xs: 0.8125rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 2rem;
  --font-size-4xl: 2.5rem;
  --font-size-5xl: 3.5rem;

  /* Layout */
  --content-width: 680px;         /* article body column */
  --wide-width: 1200px;           /* listing page container */
  --nav-height: 64px;

  /* Borders */
  --radius: 4px;
  --radius-lg: 8px;
}
```

### Example themes via variable overrides only

**Luxury dark:**
```css
:root {
  --color-bg: #0f0e0c;
  --color-bg-subtle: #1a1916;
  --color-text: #f5f0e8;
  --color-text-secondary: #c4bfb4;
  --color-muted: #7a7268;
  --color-border: #2a2824;
  --color-surface: #1a1916;
  --color-accent: #c9a84c;        /* gold */
  --color-accent-hover: #b8963e;
  --color-on-accent: #0f0e0c;
  --font-sans: 'Cormorant Garamond', Georgia, serif;
  --radius: 0px;
  --radius-lg: 2px;
}
```

**Mediterranean warm:**
```css
:root {
  --color-bg: #fdf8f3;
  --color-bg-subtle: #f5ece0;
  --color-text: #2c1f0e;
  --color-border: #e0d0bc;
  --color-surface: #f0e4d0;
  --color-accent: #c0521a;        /* terracotta */
  --color-accent-hover: #a8451a;
  --font-sans: 'Lora', Georgia, serif;
  --radius: 6px;
  --radius-lg: 12px;
}
```

**Modern minimal:**
```css
:root {
  --color-bg: #ffffff;
  --color-text: #111111;
  --color-border: #ebebeb;
  --color-surface: #f8f8f8;
  --color-accent: #111111;        /* black on white */
  --color-on-accent: #ffffff;
  --font-sans: 'DM Sans', system-ui, sans-serif;
  --radius: 0px;
  --radius-lg: 0px;
}
```

### Dark mode

`Base.astro` defines explicit dark mode overrides. To customise dark mode, add a
`@media` block alongside your light-mode overrides in `theme.css`:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0f0e0c;
    --color-text: #f5f0e8;
    /* ... */
  }
}
```

### What CSS variables cannot change

Variable overrides only affect colour, font, spacing, and border styling. They cannot:
- Change layout structure (grid vs list vs map-first)
- Reorder page sections (photos above or below specs)
- Add or remove fields displayed on a card or detail page
- Change the number of columns in `PropertyGrid`

For structural changes, use Options 2 or 3.

---

## Option 2: Replace Property Components

**Files:** `src/components/Property*.astro`
**Effort:** Hours per component
**Scope:** Layout structure, field ordering, markup semantics

### The data contract

Each component receives a typed props interface from the formatter layer. Any
replacement component must accept the same interface. The PWB fetch and formatting
code is unchanged.

**`PropertyCard.astro`** receives `PropertyCardData`:
```ts
interface PropertyCardData {
  id: number
  slug: string
  title: string
  price: string | null
  image: string | null
  href: string
  bedrooms: number | null
  bathrooms: number | null
  area: string | null
  featured: boolean
  forSale: boolean
  forRent: boolean
}
```

**`PropertyDetail.astro`** receives `PropertyDetailData`:
```ts
interface PropertyDetailData {
  id: number
  slug: string
  title: string
  description: string | null
  price: string | null
  bedrooms: number | null
  bathrooms: number | null
  garages: number | null
  area: string | null
  propertyTypeLabel: string
  city: string | null
  region: string | null
  fullAddress: string
  coordinates: { lat: number; lng: number } | null
  photos: PropPhoto[]
  featured: boolean
  forSale: boolean
  forRent: boolean
  currency: string | null
}
```

### Example alternative layouts

**Horizontal list card** (replaces the default vertical card):
```astro
---
// PropertyCardHorizontal.astro
import type { PropertyCardData } from '../lib/pwb/formatters'
interface Props { card: PropertyCardData }
const { card } = Astro.props
---
<article class="prop-row">
  {card.image && <img class="prop-row__image" src={card.image} alt={card.title} loading="lazy" />}
  <div class="prop-row__body">
    <p class="prop-row__price">{card.price}</p>
    <h2><a href={card.href}>{card.title}</a></h2>
    <p>{[card.bedrooms && `${card.bedrooms} bed`, card.bathrooms && `${card.bathrooms} bath`, card.area].filter(Boolean).join(' · ')}</p>
  </div>
  <a class="prop-row__cta" href={card.href}>View →</a>
</article>
```

**Magazine detail** (photos as a horizontal scroll strip, price in hero):
```astro
---
// PropertyDetailMagazine.astro
import type { PropertyDetailData } from '../lib/pwb/detail-formatter'
interface Props { detail: PropertyDetailData }
const { detail } = Astro.props
---
<article>
  <div class="magazine-hero">
    <h1>{detail.title}</h1>
    <p class="hero-price">{detail.price}</p>
    <p class="hero-location">{detail.fullAddress}</p>
  </div>
  <div class="photo-strip">
    {detail.photos.map((p, i) => <img src={p.url} alt={p.alt ?? ''} loading={i < 2 ? 'eager' : 'lazy'} />)}
  </div>
  <div class="specs-bar">
    {detail.bedrooms != null && <span>{detail.bedrooms} Bedrooms</span>}
    {detail.bathrooms != null && <span>{detail.bathrooms} Bathrooms</span>}
    {detail.area && <span>{detail.area}</span>}
  </div>
  <div set:html={detail.description} />
</article>
```

### Adding a `variant` prop

Rather than replacing a component outright, accept a `variant` prop to select between
multiple layouts in one file:

```astro
---
import type { PropertyCardData } from '../lib/pwb/formatters'
interface Props {
  card: PropertyCardData
  variant?: 'card' | 'horizontal' | 'minimal' | 'luxury'
}
const { card, variant = 'card' } = Astro.props
---
{variant === 'horizontal' && <article class="prop-row">...</article>}
{variant === 'luxury' && <article class="prop-luxury">...</article>}
{variant === 'minimal' && <article class="prop-minimal">...</article>}
{variant === 'card' && <article class="property-card">...</article>}
```

Usage in `PropertyGrid.astro`:
```astro
{cards.map(card => <PropertyCard card={card} variant="luxury" />)}
```

This is particularly useful for a homepage hero that uses a different card style than
the archive grid — pass `variant="luxury"` to the featured property and `variant="card"`
to the rest.

---

## Option 3: Swap the Layout Shell

**File:** `src/layouts/BaseLayout.astro`
**Effort:** Hours
**Scope:** Header, footer, global navigation, `<head>` structure

`BaseLayout.astro` is the HTML shell used by all property pages. It imports
`SiteHeader` and `SiteFooter` and provides the `<head>` (title, meta, OG, JSON-LD,
GA4). A different layout can use completely different navigation, a sticky sidebar,
a fullscreen hero wrapper, or a dark global chrome.

The `pwbValuationIntegration` and any future `pwbEnquiryIntegration` accept a `layout`
option so injected plugin pages pick up the right layout:

```js
// astro.config.mjs
pwbValuationIntegration({
  layout: './src/layouts/BaseLayoutDark.astro',
})
```

This means layout changes propagate automatically to plugin-injected pages.

---

## Option 4: Separate EmDash Projects per Market Segment

**Effort:** Days (new project, shared plugins)
**Scope:** Complete visual and content schema divergence

For radically different sites targeting different markets, the cleanest model is a
separate EmDash project per theme that shares the same PWB Rails backend:

```
emdash-luxury/          → high-end residential (dark, serif, gold accents)
emdash-rentals/         → urban rentals (clean, sans-serif, fast search UX)
emdash-commercial/      → investor/B2B (data-dense, tabular, map-first)
```

All three point `PWB_API_URL` at the same Rails backend. Each is a separate Cloudflare
Worker on its own domain or subdomain.

### What is shared

The `pwb-*` plugin packages are reusable dependencies. Each project installs them:

```json
{
  "dependencies": {
    "pwb-properties": "workspace:*",
    "pwb-property-embeds": "workspace:*",
    "pwb-valuation": "workspace:*"
  }
}
```

The data client (`src/lib/pwb/client.ts`), formatters (`formatters.ts`,
`detail-formatter.ts`), and search params logic can be extracted into a shared
workspace package (e.g. `packages/lib/pwb-client`) rather than duplicated.

### What diverges per project

| | Luxury theme | Rentals theme | Commercial theme |
|---|---|---|---|
| `theme.css` | Dark, gold, serif | Light, sans, clean | Neutral, dense, tabular |
| `PropertyCard.astro` | Large photo, price hero | Compact, transit-friendly meta | Text-heavy, investor stats |
| `PropertyDetail.astro` | Magazine gallery, editorial copy | Map-first, public transit proximity | Financial metrics, yield |
| `SearchBar.astro` | Minimal, price-range slider | Facet-heavy, commute time filter | Sector, size band, yield filter |
| `seed/seed.json` | Luxury-market taxonomy and sample content | Rental-market taxonomy | Commercial sector taxonomy |
| `SiteHeader.astro` | Dark nav, serif logo | Light sticky nav | Plain header, B2B feel |

### Seed file divergence

The seed file controls what content schema editors see in the admin. Different markets
need different taxonomies:

```json
// Luxury seed: taxonomy focused on property style and location prestige
{ "name": "style", "labels": ["Penthouse", "Villa", "Estate", "Townhouse"] }
{ "name": "location", "labels": ["Marbella", "Puerto Banús", "Sotogrande"] }

// Rentals seed: taxonomy focused on practical criteria
{ "name": "duration", "labels": ["Short-term", "Long-term", "Student", "Corporate"] }
{ "name": "amenities", "labels": ["Pets allowed", "Furnished", "Bills included"] }

// Commercial seed: taxonomy focused on sector and use
{ "name": "sector", "labels": ["Office", "Retail", "Industrial", "Mixed-use"] }
{ "name": "tenure", "labels": ["Freehold", "Leasehold"] }
```

These diverge at the seed level. All three still query the same PWB backend via the
same `PWB_API_URL`.

---

## Option 5: Seed Profiles as Theme Presets

**File:** `seed/profiles/`
**Effort:** Low per profile (extend existing system)
**Scope:** Initial content schema + sample data per market segment

The project already has three seed profiles:
```
seed/profiles/
  full.json         → full sample content for development
  minimal.json      → bare schema, no sample content
  pre-launch.json   → coming-soon configuration
```

This system can be extended with market-specific profiles that combine:
- A targeted taxonomy (see above)
- Market-appropriate sample blog posts and pages
- Pre-configured menus and widgets

Applied during initial setup:
```bash
npx emdash seed seed/profiles/luxury.json
```

Combined with a matching `theme.css` variable set committed alongside the profile,
bootstrapping a new market-segment site becomes a two-step process:
1. `npx emdash seed seed/profiles/luxury.json`
2. Uncomment the luxury variable set in `theme.css`

---

## Option 6: `PropertyEmbed` Variants in Blog Content

**File:** `packages/plugins/pwb-property-embeds/src/astro/PropertyEmbed.astro`
**Effort:** Low per variant
**Scope:** How embedded properties appear inside blog posts and pages

`PropertyEmbed.astro` already supports three variants via the `node.variant` prop
set in the admin editor:

| Variant | Appearance |
|---|---|
| `card` | Full card with image, price, CTA (default) |
| `compact` | Smaller card without image |
| `inline` | Inline text link with price in parentheses |

The embed also consumes theme CSS variables directly:
```css
--embed-border:   color-mix(in srgb, var(--color-border) 80%, white)
--embed-surface:  color-mix(in srgb, var(--color-surface) 92%, white)
--embed-accent:   var(--color-accent)
--embed-text:     var(--color-text)
--embed-muted:    var(--color-muted)
```

So CSS variable overrides (Option 1) automatically retheme the embed. No code changes
needed for colour/typography variations.

To add new structural embed variants (e.g. `"hero"` — fullwidth image with overlaid
price and CTA):
1. Add the option to the `variant` select field in `pwb-property-embeds/src/index.js`:
   ```js
   { label: "Hero", value: "hero" }
   ```
2. Add the markup branch in `PropertyEmbed.astro`:
   ```astro
   {variant === 'hero' && (
     <aside class="property-embed property-embed--hero">
       {image && <img class="property-embed__hero-image" src={image} alt={title} />}
       <div class="property-embed__hero-overlay">
         <h3>{title}</h3>
         {price && <p class="property-embed__hero-price">{price}</p>}
         <a href={href}>{ctaLabel}</a>
       </div>
     </aside>
   )}
   ```

---

---

## Switching Palettes

Palettes can be switched in two ways: via the admin panel (no redeploy needed) or via
the `PUBLIC_PALETTE` environment variable (deploy-time fallback).

The valid values are:

| Value | File | Character |
|---|---|---|
| `default` | *(base theme.css only)* | Blue accent, clean, system font |
| `luxury` | `palettes/luxury.css` | Dark charcoal, gold, Cormorant Garamond serif |
| `mediterranean` | `palettes/mediterranean.css` | Terracotta, aged-paper, Lora serif |
| `coastal` | `palettes/coastal.css` | Ocean blue, rounded, DM Sans |
| `countryside` | `palettes/countryside.css` | Sage green, earthy, Source Serif 4 |
| `urban` | `palettes/urban.css` | Cool slate, sharp edges, indigo accent |
| `nordic` | `palettes/nordic.css` | Near-white, ultra-minimal, Inter |

### Via the admin panel (recommended)

The `pwb-theme` plugin adds a **Theme** settings page to the admin panel at
`/_emdash/admin/plugins/pwb-theme/settings`. Select a palette from the dropdown and
click Save. The change takes effect immediately on the next request — no redeploy needed.

The admin setting takes precedence over the `PUBLIC_PALETTE` env var.

### Via environment variable (fallback)

If no palette has been set in the admin, `BaseLayout.astro` falls back to
`PUBLIC_PALETTE`.

In development, add to `.env` and restart the dev server:

```
PUBLIC_PALETTE=luxury
```

In production (Cloudflare Worker), set it in `wrangler.jsonc`:

```jsonc
"vars": {
  "PUBLIC_PALETTE": "luxury"
}
```

Then redeploy:

```bash
pnpm run deploy
```

### How the switching works

`BaseLayout.astro` resolves the active palette at render time using this priority order:

1. The value stored in the admin panel (read from the `options` DB table via the `pwb-theme` plugin KV)
2. `PUBLIC_PALETTE` environment variable
3. `default` (no extra stylesheet)

When a non-default palette is active, a second `<link>` tag is injected after `theme.css`:

```html
<link rel="stylesheet" href="/styles/theme.css" />
<link rel="stylesheet" href="/styles/palettes/luxury.css" />
```

The palette file overrides `:root` custom properties. Because it loads second, its
values win over `theme.css` defaults.

### Adding a new palette

1. Create `public/styles/palettes/<name>.css` overriding any `:root` variables.
2. Add `'<name>'` to the `VALID_PALETTES` array in `src/plugins/pwb-theme.ts` (the descriptor) and `src/plugins/pwb-theme.sandbox.ts` (the admin Block Kit handler).
3. Run `pnpm run test:run -- src/docs-validation.test.ts` — the test will catch any
   mismatch between the arrays and files on disk.

---

## Recommended Progression

### Phase 1 — Immediate (CSS variables)

Establish `theme.css` as the primary theming surface. Document which variables control
which aspects of the property UI specifically. Consider committing named variable sets
(luxury, minimal, mediterranean) as commented blocks in `theme.css` that can be
switched by uncommenting.

### Phase 2 — Short-term (component variants)

Add a `variant` prop to `PropertyCard` supporting at least `card` (current),
`horizontal`, and `minimal`. Update `PropertyGrid` to accept and pass through a
`cardVariant` prop. This enables the homepage to use a different layout from the
archive without duplicating components.

Add at least one new `PropertyEmbed` variant (`hero` or `featured`) to give content
editors richer embed options.

### Phase 3 — Medium-term (market profiles)

Create `seed/profiles/luxury.json` and `seed/profiles/rentals.json` alongside matching
CSS variable sets in `theme.css` (commented blocks). Document the bootstrap steps for
each.

### Phase 4 — Long-term (separate projects)

If multiple distinct market segments need to be served from separate domains with
independent editorial teams, extract the shared PWB data layer into a workspace
package and create separate EmDash projects per segment.

---

## What Theming Cannot Do

- **Per-property visual overrides**: all properties on a given site use the same
  component and variable set. A "featured" badge is the only built-in visual
  differentiation today.
- **Structural changes via palette**: palette switching only changes CSS custom
  properties (colours, fonts, spacing). It cannot change layout structure, column
  counts, field ordering, or markup — use Options 2 or 3 for those.
- **Marketplace theme installation**: installing a completely new theme after site
  creation still requires deploying new code. Palette switching via the admin panel
  is scoped to the set of palettes shipped with the deployment.

---

## Related Docs

- [docs/architecture/pwb-emdash-data-architecture.md](../architecture/pwb-emdash-data-architecture.md)
- [docs/plugin-ideas/README.md](../plugin-ideas/README.md)
- `src/styles/theme.css` — full variable catalogue with comments
- `src/components/PropertyCard.astro` — `PropertyCardData` consumer
- `src/components/PropertyDetail.astro` — `PropertyDetailData` consumer
- `src/lib/pwb/formatters.ts` — `PropertyCardData` interface
- `src/lib/pwb/detail-formatter.ts` — `PropertyDetailData` interface
