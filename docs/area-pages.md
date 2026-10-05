# Area & Lifestyle Pages

Location-led and lifestyle landing pages live in the EmDash **Areas & Lifestyle**
collection (`areas`). Every entry renders through one template, so an agency can
publish a strong local page by filling in fields — no per-page assembly.

| URL | What |
|---|---|
| `/areas` | Index of all entries, grouped into area guides and lifestyle pages |
| `/areas/<slug>` | One entry |
| `/es/areas/…`, `/fr/areas/…` | Localized versions |

## The template

Sections render in this order and are omitted when empty:

1. **Hero** — page type eyebrow ("Area guide" / "Lifestyle"), title, tagline, hero image
2. **Introduction** — Portable Text
3. **Local highlights** — label/value pairs (e.g. "Into Manhattan" / "About 50 minutes by express bus")
4. **Curated listings** — a [Listing Collection](listing-collections.md) built from the
   `listings_*` fields (featured, newest, or hand-picked; sale or rent; property type; count)
5. **More content** — Portable Text for anything else: page parts, property embeds, extra listing collections
6. **Testimonials** — up to three featured entries from the `testimonials` collection
   (toggle with "Show Client Testimonials"; skipped on sites without that collection)
7. **Local FAQs** — question/answer pairs, also emitted as `FAQPage` JSON-LD
8. **Call to action** — heading, text, button; defaults to "Talk to a local expert" → the contact page

Because the PWB list API has no location filter, an area's listings are
**hand-picked** when they need to be strictly local (see
[listing-collections.md](listing-collections.md#area-pages-and-location)).

## Translations

EmDash walks the i18n fallback chain (`es`/`fr` → `en`) for single entries, so an
area with no Spanish translation still renders at `/es/areas/<slug>` in Spanish site
chrome, with a short "not yet available in your language" notice and a canonical
link to the English page. The `/areas` index shows the default-locale entries when a
locale has none of its own (collection queries don't fall back by themselves).

## PWB pages under `/areas/`

The static `/areas/[slug]` route takes precedence over the `[lang]` catch-all that
serves PWB CMS pages. So that a PWB site with its own pages under `areas/…` keeps
them, `/areas/<slug>` falls back to the PWB page `areas/<slug>` when there is no
EmDash entry, and renders the styled 404 when neither exists (`loadAreaRoute` in
`src/lib/page-loaders.ts`).

## Navigation

The seed doesn't add `/areas` to the primary menu. Editors can add it under
**Menus** in the admin when they have area pages to show.

## Implementation

- Schema: `areas` collection in `seed/seed.json` and both `seed/profiles/*.json`
  (the demo profile also seeds `east-brunswick` and `first-homes`)
- Field helpers: `src/lib/areas.ts` (tests: `src/lib/areas.test.ts`)
- Loaders: `loadAreaEntry` / `loadAreaRoute` in `src/lib/page-loaders.ts`
- Templates: `src/components/pages/AreaPage.astro`, `src/components/pages/AreasIndexPage.astro`
- Routes: `src/pages/areas/`, `src/pages/[lang]/areas/`
- End-to-end: `e2e/areas.spec.ts` (mocked backend, `pnpm test:visual`); both area
  URLs are also covered by `e2e/contrast.spec.ts`
