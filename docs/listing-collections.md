# Listing Collections

A **Listing Collection** is a Portable Text block (from the `pwb-property-embeds`
plugin) that shows a grid of live PWB listings. Editors can drop it into any
Portable Text field — pages, posts, and the area/landing page patterns — to pair
listings with editorial content.

It complements the single-property **Property** embed from the same plugin.

## Editor fields

| Field | Notes |
|---|---|
| Heading, Intro text | Optional. Shown above the grid. |
| Listings | **Featured** (PWB "highlighted"), **Newest**, or **Hand-picked**. |
| Hand-picked properties | Slugs or property URLs, comma-separated, in display order (max 12). Used only for hand-picked sets. |
| For sale or rent | Featured/newest sets are always one or the other — the PWB search API defaults to sale when unspecified, so there is no "any". |
| Property type | Dropdown filled from the site's own PWB search facets. Featured/newest only. |
| Minimum bedrooms | Featured/newest only. |
| How many | 3, 6, 9 or 12. |
| View-all link label | Optional. Featured/newest sets link to the matching `/properties` search; hand-picked sets have no view-all link. |

A **featured** set with fewer than two results is topped up with the newest
listings matching the same filters, so a site with few highlighted listings
doesn't show a near-empty block. Hand-picked listings that no longer exist are
skipped.

## Area pages and location

The PWB list endpoint returns no location fields and has no location filter
(`app/controllers/api_public/v1/properties_controller.rb` in the Rails app), so a
collection cannot select "all listings in Marbella" automatically. For
location-led pages, use **Hand-picked** listings. A city/locality filter on the
PWB search API would allow automatic area collections later.

## Implementation

- Block definition and the `properties/types` admin route:
  `packages/plugins/pwb-property-embeds/src/index.js`
- Config parsing, PWB queries, fallback logic:
  `packages/plugins/pwb-property-embeds/src/astro/collection.js` (unit tests alongside)
- Rendering: `packages/plugins/pwb-property-embeds/src/astro/ListingCollection.astro`.
  Its styles are scoped under `.listing-collection` so page prose rules
  (`.article-content ul`, `img`, `a`, …) don't leak into the grid.
- End-to-end: `e2e/listing-collection.spec.ts` (mocked backend, `pnpm test:visual`).
  The seeded post `choosing-the-right-neighbourhood` includes a collection.
