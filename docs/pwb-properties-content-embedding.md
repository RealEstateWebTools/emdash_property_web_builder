# PWB Properties as Content

This document defines how PWB properties should be embedded inside EmDash-managed Portable Text.

The core model is unchanged:

- PWB remains the source of truth for listing data.
- EmDash content stores only a lightweight reference.
- the public site resolves that reference at render time.

This file is intentionally structured as an implementation guide for this repository, not a general architecture essay.

For the local EmDash editor patch that made richer plugin-block attrs durable in this repo, see
[docs/emdash-plugin-block-attr-patch.md](emdash-plugin-block-attr-patch.md).

---

## Purpose

Property embedding exists so editors can place live listings inside posts and pages without duplicating property data into the CMS.

Primary use cases:

- insert a featured listing in a blog post
- add a property callout inside a CMS landing page
- reference a live listing in market commentary or area guides
- keep property price, status, and media fresh without manual sync

The system should optimize for:

- easy editorial insertion
- durable stored content
- consistent rendering
- graceful failure when a property disappears
- minimal data duplication

---

## Current Implementation

Property embedding is already implemented in this repository as a native plugin.

Current package:

- `packages/plugins/pwb-property-embeds`

Current block type:

- `_type: "propertyEmbed"`

Current renderer entry:

- `pwb-property-embeds/astro`

Current shipped behavior:

- editors can type `/` in Portable Text and choose `Property`
- the insert modal accepts `slug`, `variant`, and `ctaLabel`
- the block is stored in Portable Text data and survives the local editor roundtrip
- the site renderer fetches live property data from PWB at render time
- the renderer supports `card`, `compact`, and `inline`
- the renderer still accepts legacy `id` values for backward compatibility

Current implementation files:

- `packages/plugins/pwb-property-embeds/src/index.js`
- `packages/plugins/pwb-property-embeds/src/astro/index.js`
- `packages/plugins/pwb-property-embeds/src/astro/PropertyEmbed.astro`
- `packages/plugins/pwb-property-embeds/src/astro/pwb.js`

---

## Current Block Contract

### Canonical stored shape

This is the preferred stored block shape in this repository:

```json
{
  "_type": "propertyEmbed",
  "_key": "abc123",
  "slug": "beautiful-villa-marbella",
  "variant": "compact",
  "ctaLabel": "View Property"
}
```

### Field rules

| Field | Required | Meaning |
|---|---|---|
| `slug` | Yes | Canonical property reference |
| `variant` | No | Render mode; defaults to `card` |
| `ctaLabel` | No | CTA override; defaults to `View Property` |
| `id` | No | Legacy compatibility only |

### Backward compatibility

Older draft content may still contain:

```json
{
  "_type": "propertyEmbed",
  "_key": "abc123",
  "id": "beautiful-villa-marbella"
}
```

The renderer should continue to tolerate this, but new content should store `slug`.

### Non-goals for stored content

Do not store property snapshots inside Portable Text.

Avoid storing:

- title
- price
- beds
- baths
- image
- location
- sale/rental status

Those belong to the live PWB record.

---

## Rendering Contract

### Current renderer behavior

The renderer currently:

- reads `node.id` first, then `node.slug`
- fetches the live property from PWB
- renders one of `card`, `compact`, or `inline`
- defaults `variant` to `card`
- defaults `ctaLabel` to `View Property`
- renders a non-fatal missing-state when the property cannot be loaded

### Current weaknesses in the renderer contract

The renderer is functionally correct, but it is still underspecified in two important ways:

1. locale behavior is not explicit
2. multiple-embed performance is not managed beyond simple per-embed fetches

### Locale gap

The current helper in `packages/plugins/pwb-property-embeds/src/astro/pwb.js` defaults to English and builds unprefixed property URLs.

That is acceptable for the current implementation, but it is not aligned with the repository's broader locale-aware routing work.

The next version of the embed contract should define:

- whether an embed on `/es/...` fetches Spanish property data
- whether property links become `/es/properties/[slug]` and `/fr/properties/[slug]`
- whether property data falls back to English when a locale-specific record is unavailable

### Fallback behavior

The correct public-site rule is:

- one broken property embed must never break the whole page render

The doc should treat this as a hard requirement.

Preferred public behavior:

- render a muted unavailable state during development
- consider a quieter placeholder or no-op in production if design requires it

---

## Current Editor Experience

The current insertion flow is functional but not ideal.

What editors do today:

1. type `/`
2. choose `Property`
3. enter a property slug manually
4. optionally choose a variant
5. optionally override CTA label
6. insert the block

This works, but manual slug entry is the main UX weakness.

The document should treat slug entry as a temporary editor workflow, not the target product experience.

---

## Improvement Priorities

These are the highest-value improvements, in order.

### 1. Add a real property picker

This is the most important improvement.

The next milestone should replace manual slug entry with a search-driven picker that lets editors:

- search PWB listings
- browse likely matches
- preview a selection before insertion
- write the selected `slug` into the block

Minimum useful result fields:

- title
- formatted price
- sale/rental mode
- beds and baths
- location
- thumbnail

This change would make the feature usable for non-technical editors.

### 2. Make embeds locale-aware

The repository now has locale-aware routes across the site, so property embeds should stop behaving like an English-only subsystem.

Concrete improvements:

- derive locale from the rendering page
- fetch locale-aware property data where available
- generate locale-aware property links
- define fallback rules when localized property content does not exist

This is the biggest product gap after the picker.

### 3. Add request-scoped deduping and batching

The current renderer fetches one property per embed.

That is fine for one embed on a page, but it will become a latency problem if editors add several listings to a long article or landing page.

Improvements:

- dedupe repeated slugs within one page render
- cache property lookups for the duration of the request
- add batched fetch support if the PWB API can support it later

### 4. Reuse more of the existing property presentation model

This repo already has established property display logic:

- `src/components/PropertyCard.astro`
- `src/lib/pwb/formatters.ts`
- `src/lib/pwb/detail-formatter.ts`

The embed system should stay visually and semantically aligned with those assumptions.

That does not necessarily mean importing site components directly into the plugin package, but it does mean:

- keep price/location/meta formatting consistent
- use the same field assumptions
- avoid a second, drifting property card language

### 5. Tighten the test plan around real risks

The doc currently lists good ideas, but it should make three tests mandatory:

- renderer behavior for a missing property
- repeated embeds on the same page
- locale-aware property link generation once locale support is added

Those are the places most likely to regress.

---

## Recommended Next Milestone

The next concrete milestone should be a picker-driven `v2`, not a broader query-builder.

### Goal

Let editors insert a single live property without manually typing a slug.

### Scope

- keep one block type: `propertyEmbed`
- keep single-property embeds only
- add admin-side search route
- add picker modal or picker-style block flow
- keep current render variants
- preserve current stored shape

### Explicitly out of scope

- multi-property query blocks
- carousel/grid query builders
- editorial snapshot storage
- fully custom admin React surface if EmDash block config can carry the picker UX adequately

This keeps the next implementation narrow and valuable.

---

## Implementation Plan

This is the recommended execution plan for the next milestone in this repository.

### Phase 1: make the renderer locale-aware

Goal:

- embedded properties should behave like the rest of the localized site

Primary code targets:

- `packages/plugins/pwb-property-embeds/src/astro/pwb.js`
- `packages/plugins/pwb-property-embeds/src/astro/PropertyEmbed.astro`
- `src/lib/locale.ts`

Recommended changes:

- derive the current locale from the Astro page context instead of hard-defaulting to English
- fetch property data from the matching locale-specific PWB endpoint when available
- build locale-aware public hrefs using the same route rules as the rest of the site
- define one explicit fallback rule when localized property data is unavailable

Expected acceptance:

- embeds on English pages link to `/properties/[slug]`
- embeds on Spanish pages link to `/es/properties/[slug]`
- embeds on French pages link to `/fr/properties/[slug]`
- the page still renders if the localized property cannot be fetched

### Phase 2: remove manual slug entry from normal editor usage

Goal:

- editors should choose a property from search results, not type a slug from memory

Primary code targets:

- `packages/plugins/pwb-property-embeds/src/index.js`
- a new plugin-private lookup route in `packages/plugins/pwb-property-embeds/src/`
- existing PWB client helpers or a plugin-local normalized lookup helper

Recommended changes:

- add a lightweight property search route for admin-only lookup
- normalize result payloads for editor use instead of leaking raw backend responses
- replace the plain slug-first flow with a search-and-select flow
- keep manual slug entry available only as a fallback or validation path if needed

Expected acceptance:

- editors can find a property by title, location, or other obvious terms
- search results contain enough metadata to disambiguate similar listings
- inserting a selection still stores the same canonical block shape with `slug`

### Phase 3: reduce repeated fetch cost

Goal:

- multiple embeds on one page should not cause avoidable repeated work

Primary code targets:

- `packages/plugins/pwb-property-embeds/src/astro/pwb.js`
- `packages/plugins/pwb-property-embeds/src/astro/PropertyEmbed.astro`

Recommended changes:

- add request-scoped deduping for repeated slugs
- avoid issuing the same property fetch twice in one render
- leave full API batching as a later improvement unless the PWB API already supports it cleanly

Expected acceptance:

- repeated embeds of the same slug do not perform duplicate fetches within one page render
- one failed property fetch still does not break the rest of the page

### Phase 4: align embed presentation with site property UI

Goal:

- embedded listings should feel like part of the same site, not a parallel component family

Primary code targets:

- `packages/plugins/pwb-property-embeds/src/astro/PropertyEmbed.astro`
- `src/components/PropertyCard.astro`
- `src/lib/pwb/formatters.ts`
- `src/lib/pwb/detail-formatter.ts`

Recommended changes:

- align price, location, and meta formatting with the main property components
- reuse naming and display assumptions where practical
- keep variant styling distinct only when it serves a real editorial use case

Expected acceptance:

- embed output uses the same core property vocabulary and formatting as the rest of the site
- editors are not forced to understand two different property presentation models

### Phase 5: strengthen tests around the real failure modes

Goal:

- lock down the contract that is most likely to regress

Primary code targets:

- `src/lib/pwb-property-embed-roundtrip.test.ts`
- a new plugin renderer test file if needed

Recommended additions:

- test locale-aware link generation
- test legacy `id` compatibility until old content is migrated away
- test missing-property fallback behavior
- test repeated slug deduping once it exists

Expected acceptance:

- the block contract remains stable through editor roundtrip
- localized pages emit localized property links
- renderer fallback remains non-fatal

---

## Suggested Route and API Design For The Picker

Once the picker is built, the plugin should expose lightweight private routes for admin lookup.

Suggested routes:

| Route | Method | Purpose |
|---|---|---|
| `properties/search` | GET | Search and browse listings for the picker |
| `properties/get` | GET | Fetch one property for preview/validation |

Suggested search response shape:

```json
{
  "items": [
    {
      "slug": "beautiful-villa-marbella",
      "title": "Beautiful Villa Marbella",
      "formatted_price": "€1,250,000",
      "count_bedrooms": 4,
      "count_bathrooms": 3,
      "city": "Marbella",
      "region": "Malaga",
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

The route contract should stay normalized and editor-friendly, not leak raw backend complexity into the UI.

---

## Acceptance Criteria

This document should distinguish current acceptance from future acceptance.

### Current acceptance

These are the conditions the current implementation should satisfy:

| Check | Expected |
|---|---|
| Editor can insert a `Property` block from Portable Text | Yes |
| Stored block uses `slug` for new content | Yes |
| Legacy `id` blocks still render | Yes |
| Public page renders `card`, `compact`, and `inline` variants | Yes |
| Missing property does not crash the page | Yes |
| Property data is resolved live from PWB | Yes |

### Future acceptance

These are not fully true yet, and should not be described as if they are already shipped:

| Check | Expected |
|---|---|
| Editors can choose a property without typing a slug manually | Yes |
| Picker search returns enough metadata to disambiguate listings | Yes |
| Property links are locale-aware on localized pages | Yes |
| Multiple embeds on one page avoid duplicate fetches | Yes |

---

## Recommended Test Strategy

The doc should push tests toward the actual risk profile of this feature.

### Block contract tests

Verify:

- the registered block type is `propertyEmbed`
- the configured fields match the intended insertion flow
- persisted block shape remains stable

### Renderer tests

Verify:

- `card`, `compact`, and `inline` output remain valid
- missing property fallback is stable
- legacy `id` compatibility still works until migration is complete

### Next tests to add

When the feature evolves, add tests for:

- locale-aware links
- locale-aware property fetches
- repeated slug deduping within one render
- picker route normalization

---

## Known Limitations

These are the most important current limitations.

### Manual slug entry is still required

This is the main UX limitation today.

### Locale behavior is not yet first-class

Embeds should eventually participate in the repo's locale-aware routing model.

### Performance work has not started yet

The current implementation is fine for occasional embeds, but not yet optimized for pages with many embedded listings.

### The richer attr persistence depends on a local EmDash patch

This repository can persist richer plugin-block attrs because of the local editor patch documented in
[docs/emdash-plugin-block-attr-patch.md](emdash-plugin-block-attr-patch.md).

That means:

- the current local contract is valid here
- it should not be assumed to work unchanged in an unpatched upstream EmDash install

---

## Historical Context

The first working version of this feature was narrower because EmDash previously did not preserve arbitrary plugin-block attrs safely through the editor roundtrip.

That is why early content used `id` as a workaround field.

That workaround is now legacy behavior in this repository.

Current rule:

- use `slug` for new content
- tolerate `id` only for older saved content

If the local patch is later upstreamed or replaced with an official release, this document should be updated to remove repository-specific cautions and treat the richer block shape as standard behavior.

---

## Summary

The current system is already good enough for practical editorial use, but the document should steer the next work toward three concrete improvements:

1. picker-driven property selection
2. locale-aware embeds
3. request-scoped performance controls for multiple embeds

Everything else is secondary.
