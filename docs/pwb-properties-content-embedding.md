# PWB Properties as Content — Embedding Properties Inside Posts and Pages

This document describes how to expose PWB properties inside EmDash-managed content so
editors can insert listings into posts, pages, and other Portable Text fields.

The goal is to let editors reference and render live PWB listings inside EmDash content
without turning PWB properties into native EmDash entries.

This is the recommended approach if you want to:

- insert a property card inside a blog post
- add featured listings inside an EmDash page body
- create editorial content that references live inventory
- keep listing data fresh without duplicating it into the CMS

This document now covers both:

- the recommended long-term architecture
- the current implemented `v1` in this repository

The two are not identical. The original `v1` implementation was deliberately narrower
because of a real limitation in EmDash's plugin-block editor roundtrip.

That limitation has now been patched locally in this repository's EmDash source, so the
current implementation is richer than the first shipped workaround.

---

## Current Status

Property embedding is now implemented in this repository as a native plugin:

- package: `packages/plugins/pwb-property-embeds`
- plugin id: `pwb-property-embeds`
- block type: `propertyEmbed`
- render entry: `pwb-property-embeds/astro`

The plugin is registered in `astro.config.mjs` and is active in trusted mode.

### What works today

- editors can type `/` in Portable Text and choose `Property`
- the insert modal accepts a PWB property slug
- the insert modal also accepts `variant` and `ctaLabel`
- the editor inserts a `propertyEmbed` block
- the block persists in the draft revision data for content with revisions
- the site-side renderer fetches live property data from PWB at render time
- embedded output links to the existing public route `/properties/[slug]`

### Current persisted block shape

The current working stored block contract is:

```json
{
  "_type": "propertyEmbed",
  "_key": "abc123",
  "slug": "beautiful-villa-marbella",
  "variant": "compact",
  "ctaLabel": "View Property"
}
```

This is now the preferred stored shape in the local repository.

### Historical note

The first working workaround in this repo stored:

```json
{
  "_type": "propertyEmbed",
  "_key": "abc123",
  "id": "beautiful-villa-marbella"
}
```

That was only necessary because EmDash previously preserved `id` but not arbitrary custom
plugin block attrs. The local EmDash editor has now been patched to preserve arbitrary attrs,
so that workaround is no longer the recommended contract.

### Renderer compatibility behavior

The renderer currently reads:

- `node.id` first
- `node.slug` second

This allows compatibility with both:

- the original `id`-based workaround
- the current preferred `slug`-based shape

### Current visual behavior

The site renderer currently supports:

- `card`
- `compact`
- `inline`

All three variants are now durable in the local repository because the editor roundtrip
has been patched to preserve arbitrary plugin-block attrs.

---

## Core Recommendation

Expose PWB properties as **content references-by-proxy**, not as real EmDash content
records.

That means:

- PWB remains the source of truth for listing data
- EmDash content stores only a lightweight pointer to a property
- the frontend resolves that pointer against PWB at render time

This is the safest and most coherent model for the current architecture.

---

## What To Avoid

Do not:

- import all properties into EmDash collections just to make them selectable
- copy titles, prices, beds, baths, and images into post bodies as stored content
- create a second listing database inside EmDash
- rely on editors manually typing fragile URLs or slugs in free text

Those approaches drift quickly and break the “one source of truth per concern” rule.

---

## Recommended User Experience

The best editor experience is:

1. the editor is writing a post or page in EmDash
2. they type `/` in Portable Text
3. they choose a block like `Property`
4. a property picker opens
5. they search or browse PWB listings
6. they select a property
7. they optionally choose a visual variant
8. the block is inserted
9. the public site renders live property data from PWB

This is much better than a shortcode or free-text URL paste.

### Important note about this repo

The current implementation does **not** have the full search/browse picker yet.

The implemented `v1` experience is:

1. editor types `/`
2. editor chooses `Property`
3. modal asks for `Property Slug`
4. editor can also choose `Display Variant` and set `CTA Label`
5. block is inserted with those attrs
6. frontend resolves the property live from PWB

This is a practical first step, not the final target UX.

---

## Recommended Implementation Model

Use a **trusted/native plugin** that provides:

- a Portable Text block type
- an editor-side selection flow
- site-side rendering components
- optional plugin routes for property lookup/search

Why native/trusted:

- EmDash Portable Text block rendering requires site-side components via `componentsEntry`
- sandboxed/marketplace plugins cannot provide those components
- this feature needs editor UX and rendering integration, not just admin API routes

This aligns with the EmDash plugin guidance that Portable Text blocks are for trusted
plugins only.

---

## High-Level Architecture

```text
Portable Text Editor
  │
  ├── slash command: "Property"
  ├── block config modal / picker UI
  └── stores a lightweight block payload
       ▼
Portable Text JSON in EmDash content
  │
  └── contains only:
      - property slug or id
      - variant / display mode
      - optional override metadata
       ▼
Frontend Portable Text renderer
  │
  ├── sees block type "propertyEmbed"
  ├── resolves property from PWB
  └── renders a live component
       ▼
Public page HTML
```

Critical rule:

- the block stores a property reference, not a property snapshot

---

## Product Goal

Allow editors to embed PWB listings inside EmDash content in a way that is:

- easy to insert
- resilient to listing updates
- visually consistent
- reusable across posts and pages

The embed system should support both editorial storytelling and merchandising use cases.

Examples:

- “See this featured villa in Marbella”
- “Properties in this area”
- “Recently listed apartments”
- “Luxury property callout in a market report”

---

## Recommended Scope

Start with a single-property embed block, not a full query-builder.

### v1 scope

- insert one property by slug/id
- one block type: `propertyEmbed`
- a few display variants
- live rendering from PWB

### v2 scope

- “property collection” or “property query” block
- multiple-property carousels or grids
- query by area/type/sale-rental mode

### v3 scope

- richer editorial override options
- automated related properties inside content
- analytics on embedded property clicks

---

## Block Type Design

Recommended Portable Text block type:

- `_type: "propertyEmbed"`

### Long-term target stored shape

```json
{
  "_type": "propertyEmbed",
  "_key": "abc123",
  "slug": "beautiful-villa-marbella",
  "variant": "card"
}
```

### Suggested extended shape

```json
{
  "_type": "propertyEmbed",
  "_key": "abc123",
  "slug": "beautiful-villa-marbella",
  "variant": "card",
  "ctaLabel": "View Property",
  "showPrice": true,
  "showLocation": true,
  "showMeta": true
}
```

### Historical `v1` workaround in this repo

```json
{
  "_type": "propertyEmbed",
  "_key": "abc123",
  "id": "beautiful-villa-marbella"
}
```

### Why `id` was used in the first workaround

This is not because a PWB numeric ID is preferred.

It is because EmDash's current plugin-block ProseMirror roundtrip preserves:

- `_type`
- `_key`
- `id`

but does not currently preserve arbitrary custom attrs like:

- `slug`
- `variant`
- `ctaLabel`

when they pass through the editor's `pluginBlock` conversion layer.

So the first working workaround encoded the slug into `id`.

### Current preferred stored shape

The local repository now supports the richer shape:

```json
{
  "_type": "propertyEmbed",
  "_key": "abc123",
  "slug": "beautiful-villa-marbella",
  "variant": "compact",
  "ctaLabel": "View Property"
}
```

### Required field

- `slug`

Prefer `slug` over raw numeric `id` because:

- the public site already routes properties by slug
- editors and developers can reason about slugs more easily
- links and rendering are simpler

If PWB eventually requires immutable internal IDs for reliability, store both:

```json
{
  "_type": "propertyEmbed",
  "id": 123,
  "slug": "beautiful-villa-marbella",
  "variant": "card"
}
```

But keep `slug` as the primary render key unless there is a strong reason not to.

For the current repository implementation, the practical rule is:

- use `slug` as the canonical property reference
- keep renderer support for `id` only as backward compatibility for older draft content

---

## Why Proxy References Are Better Than Stored Snapshots

If you stored a full snapshot of a property in the post, it would immediately create drift:

- price changes in PWB would not appear
- status changes would not appear
- image changes would not appear
- title changes would not appear

A reference-by-proxy model avoids all of that:

- editors insert once
- render stays live
- listing data stays canonical in PWB

The only thing stored in EmDash should be:

- which property
- how it should be rendered

---

## Plugin Structure

Recommended package structure:

```text
packages/plugins/pwb-property-embeds/
└── src/
    ├── index.js
    ├── astro/
    │   ├── index.js
    │   ├── PropertyEmbed.astro
    │   └── pwb.js
```

### What each part does

#### `index.js`

- plugin descriptor
- `componentsEntry`
- Portable Text block registration

#### `astro/`

- site-side renderers for Portable Text blocks
- PWB fetch helpers for live rendering

### Implemented structure in this repo

The current implementation is intentionally smaller than the idealized structure:

- no `adminEntry`
- no custom React picker
- no plugin search routes
- no admin-side preview fetches

That is because the current `v1` goal was:

- prove native plugin registration
- prove slash-menu insertion
- prove save persistence for a plugin block
- prove live frontend rendering from PWB

Those goals are now met.

---

## Descriptor Requirements

The descriptor must provide site-side block rendering.

Conceptually:

```js
export function pwbPropertyEmbedsPlugin() {
  return {
    id: "pwb-property-embeds",
    version: "0.1.0",
    format: "native",
    entrypoint: "pwb-property-embeds",
    componentsEntry: "pwb-property-embeds/astro"
  };
}
```

The exact field names should follow the plugin API you implement against, but the key
requirements are:

- trusted/native plugin format
- `componentsEntry` for Portable Text rendering

### Actual descriptor in this repo

The current plugin descriptor does **not** include `adminEntry`.

That is intentional. The current block uses EmDash's native Portable Text block modal with
Block Kit-style field configuration rather than a custom React admin surface.

---

## Portable Text Block Registration

The long-term block registration could look like:

```js
admin: {
  portableTextBlocks: [
    {
      type: "propertyEmbed",
      label: "Property",
      icon: "link-external",
      description: "Embed a live property listing from PWB",
      fields: [
        { type: "text_input", action_id: "slug", label: "Property Slug" },
        {
          type: "select",
          action_id: "variant",
          label: "Display Variant",
          options: [
            { label: "Card", value: "card" },
            { label: "Compact", value: "compact" },
            { label: "Inline", value: "inline" }
          ]
        },
        { type: "text_input", action_id: "ctaLabel", label: "CTA Label" }
      ]
    }
  ]
}
```

This is the minimum shape. It will work, but it is not the ideal editor UX because it asks
for a slug manually.

For a better experience, use a picker.

### Actual block registration in this repo

The local block registration is now:

```js
admin: {
  portableTextBlocks: [
    {
      type: "propertyEmbed",
      label: "Property",
      icon: "link-external",
      description: "Embed a live property listing from PWB",
      fields: [
        {
          type: "text_input",
          action_id: "slug",
          label: "Property Slug"
        },
        {
          type: "select",
          action_id: "variant",
          label: "Display Variant"
        },
        {
          type: "text_input",
          action_id: "ctaLabel",
          label: "CTA Label"
        }
      ]
    }
  ]
}
```

---

## Recommended Picker UX

The best version of this feature is not a plain slug field.

Instead:

- editors open a property picker modal
- the modal uses a search route backed by PWB
- the editor chooses a property visually
- the modal writes the selected slug/id into the block

### Picker flow

1. editor inserts `Property`
2. modal opens
3. editor types search term
4. plugin route queries PWB
5. list of matching properties appears
6. editor picks one
7. editor chooses variant
8. block stores the selected reference

### Search result fields

Each result should show enough metadata to disambiguate:

- title
- formatted price
- sale/rental mode
- beds/baths
- location
- thumbnail if practical

This avoids slug-guessing and makes the feature usable by non-technical editors.

### Why the full picker is not implemented yet

The blocker is not fetching from PWB.

The remaining blocker is search/browse UX work, not editor persistence.

The local EmDash editor has already been patched so plugin blocks can persist arbitrary attrs.
That means a richer picker is now technically safe to build.

---

## Route Architecture for the Picker

The long-term plugin should expose at least these private routes:

| Route | Method | Purpose |
|---|---|---|
| `properties/search` | GET | Search or browse properties for the picker |
| `properties/get` | GET | Fetch one property for preview or validation |

Optional:

| Route | Method | Purpose |
|---|---|---|
| `properties/embed-preview` | GET | Return a normalized preview model for the embed UI |

### `GET properties/search`

Query params:

- `q`
- `page`
- `perPage`
- `saleOrRental` optional

Response:

```json
{
  "items": [
    {
      "slug": "beautiful-villa-marbella",
      "title": "Beautiful Villa Marbella",
      "formatted_price": "€1,250,000",
      "for_sale": true,
      "for_rent": false,
      "count_bedrooms": 4,
      "count_bathrooms": 3,
      "city": "Marbella",
      "region": "Malaga",
      "country_code": "ES",
      "primary_image_url": "https://..."
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 123,
    "total_pages": 7
  }
}
```

### `GET properties/get`

Query params:

- `slug`

Response:

```json
{
  "property": {
    "slug": "beautiful-villa-marbella",
    "title": "Beautiful Villa Marbella",
    "description": "<p>...</p>",
    "formatted_price": "€1,250,000",
    "count_bedrooms": 4,
    "count_bathrooms": 3,
    "city": "Marbella",
    "region": "Malaga",
    "country_code": "ES",
    "primary_image_url": "https://..."
  }
}
```

The picker or editor modal can use this to confirm the selected property and show a preview.

### Current implementation

The current `v1` does **not** expose plugin lookup/search routes.

Instead, the frontend renderer fetches directly from PWB at render time using
`import.meta.env.PWB_API_URL`.

That is acceptable for the current scope because:

- the insert UI is still manual rather than search-driven
- the site already has a PWB base URL environment contract
- the immediate goal was embed rendering, not picker search UX

Search routes become relevant once a picker is added.

---

## Site-Side Rendering Strategy

The frontend should render these blocks via plugin-provided Astro components.

Recommended `astro/index.js`:

```js
import PropertyEmbed from "./PropertyEmbed.astro";

export const blockComponents = {
  propertyEmbed: PropertyEmbed,
};
```

Then `PropertyEmbed.astro` can delegate to variants.

### Suggested renderer flow

```text
PortableText sees block type "propertyEmbed"
  -> PropertyEmbed.astro receives node
  -> reads node.slug and node.variant
  -> fetches live property from PWB
  -> renders the chosen visual variant
```

### Where the PWB fetch should happen

Preferred options:

1. reuse an existing shared PWB client helper if it can be imported safely
2. add a plugin-local fetch helper that mirrors the existing `src/lib/pwb/client.ts` contract

The important thing is consistency with the site’s existing PWB model.

### Actual renderer behavior in this repo

The current renderer:

- accepts `node.slug` as the primary property identifier
- accepts `node.id` as a compatibility fallback
- fetches the live property from PWB
- renders `card`, `compact`, or `inline`
- defaults to `card`
- falls back gracefully when the property is missing or the API URL is not set

The implementation lives in:

- `packages/plugins/pwb-property-embeds/src/astro/index.js`
- `packages/plugins/pwb-property-embeds/src/astro/PropertyEmbed.astro`
- `packages/plugins/pwb-property-embeds/src/astro/pwb.js`

---

## Issues Identified During Implementation

These are the important issues uncovered while implementing and verifying the feature.

### 1. EmDash plugin-block persistence was narrower than the insert UI suggested

This was the main issue during the first implementation pass.

Observed behavior:

- the editor slash menu correctly registered `propertyEmbed`
- the insert modal initially accepted multiple fields
- the save request initially sent `{ slug, variant, ctaLabel, _type, _key }`
- after editor roundtrips, EmDash converted plugin blocks through a simplified
  `pluginBlock` representation
- only `id` was preserved reliably

Impact:

- `slug`, `variant`, and `ctaLabel` were not safe persisted fields in the original editor code
- a richer-looking block config would have given false confidence
- the first implementation had to be reduced to a single `id` field

Evidence:

- the old manifest exposed only `action_id: "id"`
- the old save request used `{ "_type": "propertyEmbed", "id": "<slug>" }`
- the old persisted draft revision retained that block shape

Resolution in this repo:

- local EmDash source was patched so plugin blocks preserve arbitrary attrs
- the property embed plugin has now restored `slug`, `variant`, and `ctaLabel`
- the renderer still accepts `id` for backward compatibility

### 2. Draft-revision storage can make persistence look broken if you inspect the wrong table

This repo's content collections support revisions.

That means:

- published/base data remains in `ec_posts` / `ec_pages`
- draft edits are stored in `revisions.data`

During verification, inspecting only `ec_posts.content` made it look like the embed was
being stripped out, when in fact the real saved draft state was in the revision row.

Impact:

- debugging content persistence in EmDash requires checking revision rows for draft edits
- documentation should not imply that `ec_*` content columns always reflect current editor state

### 3. Dev-server restarts are mandatory when plugin descriptors change

Changes to:

- `astro.config.mjs`
- native plugin registration
- plugin descriptor metadata
- Portable Text block definitions

did not reliably appear in a running dev session until `npx emdash dev` was restarted.

Impact:

- stale admin manifests can make the implementation look broken when the code is actually correct
- restart must be part of the verification procedure for plugin work

### 4. The original doc described an ideal picker-driven architecture, not the first shipped workaround

Before implementation, this document described:

- stored `slug`
- stored `variant`
- stored `ctaLabel`
- picker routes
- richer admin flows

Those are still reasonable goals, but they were not what the code actually implemented
before the local editor patch.

Impact:

- this document must distinguish clearly between current state and future design

### 5. Raw Node import of the Astro renderer is not a meaningful verification step

The package entrypoint can be verified with plain Node ESM import.

The Astro renderer entrypoint cannot, because `.astro` files require Astro/Vite handling.

Impact:

- verification of `componentsEntry` should happen through Astro/EmDash runtime, not plain Node import

### 6. The renderer temporarily supported more than the editor safely persisted

The renderer supported:

- `variant`
- `ctaLabel`

But the original editor workaround no longer asked for those fields because they were not durable.

Impact:

- those renderer branches were compatibility scaffolding during the workaround phase
- after the local editor patch, those fields are part of the local editor feature contract

---

## Verification Notes

The following checks were performed during implementation:

- workspace package installed successfully with `pnpm install --no-frozen-lockfile`
- native plugin descriptor imported successfully in Node
- live EmDash manifest confirmed `pwb-property-embeds` registration
- slash-menu item `Property` appeared in the Portable Text editor
- insert modal opened from the slash menu
- save requests included the expected plugin block payload
- persisted draft revision data contained the `propertyEmbed` block
- rich plugin attrs were preserved through the local EmDash editor roundtrip
- renderer contract remained aligned with the public property route `/properties/[slug]`

### Important verification nuance

When verifying persistence for content with revisions, inspect:

- `ec_posts.draft_revision_id` or `ec_pages.draft_revision_id`
- then the matching row in `revisions.data`

Do not rely only on `ec_posts.content` / `ec_pages.content` for draft-state verification.

---

## Current Recommended Next Steps

The implementation is now good enough for a practical local `v2`, but the next sensible work items are:

1. move the local EmDash plugin-block attr patch upstream or into a maintained fork
2. add a proper property picker backed by PWB search
3. add an admin-side preview in the insert/edit modal
4. decide whether `ctaLabel` should remain per-embed or become mostly theme-driven
5. document the upgraded block contract anywhere else it is referenced

Until that editor patch is upstreamed, the correct product stance is:

- treat the richer attr persistence as a local repository capability
- avoid assuming third-party/default EmDash installs will have the same behavior

---

## Variant Strategy

Start with a small set of variants that cover most use cases.

### `card`

Use for:

- in-post property highlights
- editorial callouts
- featured listing insertion

Show:

- image
- title
- formatted price
- beds/baths
- location
- CTA button

### `compact`

Use for:

- shorter content blocks
- right-rail or inline supporting references

Show:

- title
- price
- location
- small CTA

### `inline`

Use for:

- lightweight text references inside articles

Show:

- title as link
- optional price

### `cta`

Optional later variant for:

- conversion-oriented content sections

Show:

- title
- short summary
- strong CTA button

Keep the first implementation small: `card`, `compact`, and `inline` are enough.

---

## Stored Field Design

A good embed block stores only what is required for rendering choices.

Recommended fields:

| Field | Required | Purpose |
|---|---|---|
| `slug` | Yes | property reference |
| `variant` | Yes | rendering mode |
| `ctaLabel` | No | override CTA copy |
| `showPrice` | No | UI toggle |
| `showLocation` | No | UI toggle |
| `showMeta` | No | UI toggle |

Avoid storing:

- `title`
- `price`
- `bedrooms`
- `bathrooms`
- `image`
- `location`

Those belong to the live property record in PWB.

---

## Fallback Behavior

Embeds must fail gracefully.

There are several possible failure cases:

- property slug no longer exists
- property is unpublished or withdrawn
- PWB API is temporarily unavailable
- property data is incomplete

### Recommended admin-side behavior

Inside the editor:

- show a clear “property unavailable” warning
- keep the stored block data visible
- let the editor replace or remove the embed

### Recommended public-site behavior

Choose one explicit fallback:

1. render nothing
2. render a muted unavailable placeholder
3. render a generic CTA to the properties index

For most public pages, option 2 is best during development and option 1 or 3 may be best in
production depending on tone.

Do not hard-fail the page render because one embedded property is missing.

---

## Performance Strategy

Embedding live properties into Portable Text adds PWB fetches to CMS pages.

That needs to be managed deliberately.

### Risks

- multiple embeds on one page can cause N additional property fetches
- page latency increases
- PWB outages affect richer editorial content

### Recommended mitigations

#### 1. Batch when possible

If you later support multiple property embeds on one page, consider:

- collecting all referenced slugs
- issuing one batched request if PWB supports it
- or at least caching repeated slugs during the request lifecycle

#### 2. Request-level caching

If the same slug appears twice in a page render, do not fetch it twice.

#### 3. Graceful fallback

Do not let one bad property response break the entire page.

#### 4. Consider page caching carefully

If CMS pages containing property embeds are cached, make sure cache invalidation behavior is
still acceptable when the property changes in PWB.

You may need:

- shorter TTL for pages with embeds
- or a future hook/webhook from PWB to purge affected pages

---

## Relationship to Existing Site Components

This project already has property display components and formatting logic:

- `src/components/PropertyCard.astro`
- `src/lib/pwb/formatters.ts`
- `src/lib/pwb/detail-formatter.ts`

The embed system should reuse those ideas where practical instead of inventing a second
visual language for properties.

That does not necessarily mean importing site components directly into the plugin renderer,
but it does mean:

- use the same property data assumptions
- keep pricing/location/meta display consistent
- avoid a visibly different embed card style unless intentional

---

## Editorial Use Cases

This feature becomes much more valuable if you design it for specific editorial workflows.

### Use case 1: blog post about an area

An editor writes an article about Marbella and inserts:

- one featured villa embed
- one compact apartment embed

### Use case 2: homepage rich content page

An editor writes a sales page and embeds:

- a hero property card
- one inline mention in body copy

### Use case 3: market update article

An editor compares recent listings and inserts:

- several compact embeds
- optional later “collection” block

The embed system should support these flows naturally.

---

## Security and Auth

Public page rendering should not require secret admin credentials in the browser.

The rendering layer should use the same server-side PWB access model the site already uses.

That means:

- server-side fetch from Astro/plugin renderer
- no browser-side direct fetch with secrets

If the plugin uses search routes for the picker, those routes are private admin routes and
can use plugin-side auth to PWB as needed.

---

## Testing Strategy

The content-embedding feature should have coverage across three layers.

### 1. Block data shape tests

Verify:

- inserted block data matches expected schema
- variant defaults are stable
- required fields exist

### 2. Picker route tests

Verify:

- property search returns normalized results
- property lookup returns the expected preview shape
- invalid slug errors are handled

### 3. Renderer tests

Verify:

- `propertyEmbed` renders correctly for each variant
- missing property fallback is stable
- repeated embeds do not fail unexpectedly

### 4. Manual editorial checklist

Verify:

- editors can insert a property without typing a slug manually
- embedded property data updates when the underlying PWB listing changes
- invalid property references degrade gracefully

---

## Manual Acceptance Checklist

The feature should not be considered complete until all of the following pass:

| Check | Expected |
|---|---|
| Editor can insert a `Property` block from Portable Text | Yes |
| Editor can search PWB listings from a picker | Yes |
| Selected property is stored as a reference, not a snapshot | Yes |
| Public page renders the property correctly | Yes |
| Variant selection changes output style | Yes |
| Deleted or unavailable property degrades gracefully | Yes |
| Multiple embeds do not break page rendering | Yes |
| Editors do not need to hand-type slugs in normal usage | Yes |

---

## Phased Delivery Plan

### Phase 1: Foundation

- add trusted/native plugin support for `componentsEntry`
- add `propertyEmbed` PT block registration
- implement simple slug-based rendering

### Phase 2: Picker UX

- add `properties/search` route
- build picker modal
- remove manual slug entry from normal editorial flow

### Phase 3: Variants and polish

- add `card`, `compact`, `inline` variants
- improve preview inside the editor
- improve fallback behavior

### Phase 4: Richer embeds

- add multi-property or query-driven embed blocks
- add curated list blocks
- add analytics or click tracking if needed

---

## Recommended First Implementation

If you want the shortest useful path, build this first:

1. a trusted/native `propertyEmbed` Portable Text block
2. store `slug` + `variant`
3. render one `card` variant on the public site
4. add a private plugin search route for the picker
5. add the picker UI so editors choose listings visually

That gives you immediate editorial value without changing the source-of-truth model.

---

## Summary

The right way to expose PWB properties inside EmDash content is:

- not as imported CMS entries
- not as copied listing snapshots
- but as live property references rendered through a trusted plugin

That preserves architectural clarity while giving editors a much better content authoring
experience.
