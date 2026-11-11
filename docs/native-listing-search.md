# Native listing search

Implemented locally on 2026-10-27. This describes the native EmDash backend;
PWB mode still delegates to the existing API client.

## Query behaviour

[The native query adapter](../src/lib/listings/native-query.ts) uses EmDash's
`getDb()` from `emdash/runtime`. This preserves the configured SQLite or D1
connection, including request-scoped database overrides. Queries target the
`ec_properties` collection table inspected in EmDash 1.3.1.

Filters, stable sorting, counts and numbered pagination run in SQL over all
published, non-trashed entries in the selected locale. The previous 1,000-entry
collection load has been removed. Sale/rental defaults, featured selection,
price bounds, bedroom/bathroom minima and free-text property-type normalisation
remain supported. Missing prices sort last in either direction; ties use slug
and database ID for deterministic pagination.

Only the current result page is hydrated through `getEmDashEntry()`, retaining
EmDash's image and Portable Text conversion. Detail pages query their slug
independently of search results. Missing, draft, archived, deleted, wrong-locale
and wrong-slug results are rejected. Translated entry IDs such as `es/villa`
are normalised to the public property slug `villa`.

Locale fallback remains inventory-wide: English is used only when the requested
locale has no published, non-trashed listings. A missing individual translation
or an empty filtered search does not trigger English fallback when translated
inventory exists.

Facets describe the full sale or rental inventory, independently of the current
search filters. Map markers cover every matching listing with valid coordinates,
including listings outside the current page. Marker queries select summary data
rather than full descriptions. Large map payloads remain a separate scaling
consideration.

## Caching and schema coupling

`getListingSource(locale, onCacheHint)` accepts an optional cache-hint callback.
Native queries report the `properties` collection dependency, including empty
results and locale selection; hydrated entries also forward EmDash's hints.
Property routes, homepage sections, listing blocks and the property sitemap pass
these hints to Astro's cache API when available. Data and lookup memoisation are
scoped to a source instance, not shared across requests.

This adapter relies on EmDash's collection-table layout and integer boolean
storage. Recheck it when upgrading EmDash. It uses the existing EmDash indexes,
including locale and deleted/status indexes; it creates no indexes or schema
objects during requests. Price sorting and grouped facets can still scan and sort
eligible rows. Further index tuning should use production query plans and workload
measurements.

The property sitemap retains its separate ten-page limit per sale/rental mode.
Removing the native search cap does not remove that sitemap limit.

## Verification

```bash
pnpm run test:run src/lib/listings/native-query.test.ts src/lib/listings/native-source.test.ts src/lib/listings/source.test.ts
pnpm run test:native --workers=1
pnpm run typecheck
pnpm run build
```

The query tests use real in-memory SQLite and compare results through the
Cloudflare D1 driver against Wrangler's local workerd/D1 runtime. They cover
inventory beyond 1,000, filters, totals, facets, map completeness, tied sorts,
locale fallback, publication visibility, independent detail lookup, error
propagation, cache hints and changes between requests. Entry hydration is mocked
in these adapter tests; the native browser suite exercises actual EmDash entry
hydration, public pages, filters, enquiries and admin-created listings.

Local verification passed the full unit suite, typechecking and the Worker build.
All 12 native browser checks passed with one worker. An initial parallel run
passed 11 checks and hit a duplicate-user constraint during dev-bypass sign-in;
serial execution avoided that test setup race. Typechecking reports two existing
hints for embed-renderer declarations and a layout `onload` expression. The build
reports its existing large-client-chunk warning.

The default local Node 22.16.0 is below this project's declared minimum. Astro
checks, the build and browser verification used the already installed Node
24.21.0, without changing the global Node selection. TypeScript is now an explicit
dev dependency so Astro's checker can resolve it without an installation prompt.
Kysely is an explicit application dependency for the SQL adapter.

## Local scale measurement

Measured on 2026-10-27 with Node 24.21.0, Astro 7.4.2, EmDash 1.3.1 and
better-sqlite3 13.0.3 on the local macOS development machine. An isolated copy of
the native browser-test database held synthetic published English sale listings
with prices, type and room counts, one town/region, no photos and no coordinates.
The developer's main database was not changed. Only EmDash's existing indexes
were present.

| Published listings | Price-sorted page SQL median | Search-page HTTP median |
| --- | --- | --- |
| 1,000 | 0.18 ms | 27 ms |
| 5,000 | 0.83 ms | 46 ms |
| 20,000 | 3.48 ms | 105 ms |

SQL timing covers the price-sorted twelve-slug page query over 30 runs, excluding
counts, facets and hydration. HTTP timing covers the complete response body for
`/properties?sort=price_asc`, including rendering, counts, facets and hydration,
over five requests after a warm-up at each size. It is development-server timing,
not browser paint timing. Direct detail URLs for the last inserted listing and
the final numbered search page returned HTTP 200 at each size; detail responses
were checked for the expected listing title.

These are local observations, not latency targets or production D1 benchmarks.
The synthetic inventory excludes the cost of large galleries and all-match map
payloads. D1 result equivalence is tested separately; remote D1 latency and
production route-cache invalidation were not measured in that local run. Remote
preview measurements follow below.

## Remote preview verification — 2026-11-02

Commit `2a51a60` passed all 519 unit tests, typechecking (zero errors, two existing
hints), the Worker build and all 12 native browser tests with one worker, using
Node 24.21.0. The build retains its existing large-client-chunk warning.

A native-mode Worker version was uploaded for preview, without routing production
traffic to it. Its alias is `native-search` on the existing Worker. Dedicated
preview resources are named `emdash-native-search-preview` (D1),
`emdash-native-search-preview-media` (R2) and
`emdash-native-search-preview-session` (KV). The database contains the default
seed, the three native listing fixtures and synthetic scale listings. Property
fixtures have no gallery images; seeded blog media files were not copied to R2.
Preview configuration and raw results are local, gitignored files under
`.tmp/native-search-preview/`; they are not deployment defaults.

Remote checks against the three listing fixtures confirmed sale/rental selection,
type and minimum-price filters, property title and description hydration,
independent missing-slug HTTP 404, and sale/rental sitemap inclusion.

Two localized requests, `/es/properties` and
`/fr/properties/harbour-view-villa`, rendered the expected English inventory but
returned **HTTP 302 with no Location header**. This is an unresolved release
issue: rendered fallback content alone is not a successful locale HTTP check.

### Remote scale observations

The isolated remote D1 database was grown incrementally to 1,000, 5,000 and
20,000 synthetic published English sale listings, retaining the three original
fixtures. Synthetic rows have prices, types, room counts and town/region fields,
but no photos or coordinates. Only existing EmDash indexes were used.

| Synthetic listings | Total published listings | Price-page SQL median | Full search HTTP median |
| --- | --- | --- | --- |
| 1,000 | 1,003 | 0.65 ms | 601 ms |
| 5,000 | 5,003 | 1.89 ms | 643 ms |
| 20,000 | 20,003 | 8.35 ms | 883 ms |

SQL medians use D1's reported execution duration for five twelve-slug,
price-ascending page queries. HTTP medians use five complete response-body reads
after a warm-up, from the development machine to the preview Worker at
`/properties?sort=price_asc`. They include network time, counts, facets, entry
hydration and server rendering. The final numbered sale page and the detail URL
for the last synthetic listing returned HTTP 200 with expected content at every
size. These measurements are observations, not latency targets; large galleries
and large all-match marker payloads remain unmeasured.

### Release prerequisites and setup findings

- The existing production D1 database has **no `ec_properties` table**. Production
  currently uses PWB. Native mode requires a deliberate properties-schema and
  content rollout before switching backends; no production data was changed in
  this verification.
- The current Astro configuration has no route-cache provider. Search and detail
  responses exposed no cache-control or cache-tag headers. The sitemap exposed
  its existing `public, max-age=3600` header but no cache tags. Publish/edit/delete
  route-cache invalidation therefore remains unverified; forwarding hints alone
  does not establish a working cache-purge path.
- Resolve the localized HTTP 302 responses before native-mode release.
- A shell `PWB_API_URL` override alone did not produce a native Worker build:
  the Cloudflare adapter reloads Wrangler/local environment values during setup.
  The successful preview used a separate Astro configuration pointing the
  adapter at a dedicated Wrangler build config, with an empty `PWB_API_URL` and
  no adjacent local environment file. The compiled backend selector was checked
  before upload.
- The existing full SQLite export failed on empty D1 with
  `no such table: main.media_folders`: inserts preceded referenced table creation.
  For this fixture import, all schema statements were placed before data, with
  foreign-key checks deferred until transaction completion as described in
  [Cloudflare's foreign-key documentation](https://developers.cloudflare.com/d1/sql-api/foreign-keys/).
  The shared export utility has not been changed and needs a separate fix before
  relying on it to initialize a fresh production database.
- The sitemap's separate 1,000-listing limit per sale/rental mode remains.
