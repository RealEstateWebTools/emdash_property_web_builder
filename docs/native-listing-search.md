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
production route-cache invalidation have not been measured here.
